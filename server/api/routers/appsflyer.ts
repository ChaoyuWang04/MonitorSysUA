/**
 * AppsFlyer tRPC Router
 *
 * Exposes AppsFlyer cohort data via type-safe API:
 * - Event queries (IAP + Ad Revenue)
 * - Cohort KPI queries (installs, cost, retention)
 * - Baseline calculations (median ROAS/RET)
 * - Sync management (logs + trigger)
 */

import { z } from 'zod'
import { createTRPCRouter, publicProcedure } from '../trpc'
import * as af from '@/server/db/queries-appsflyer'

function formatDateYYYYMMDD(date: Date): string {
  return date.toISOString().split('T')[0]
}

function getDefaultDateRange(days: number): { start: string; end: string } {
  const end = new Date()
  end.setDate(end.getDate() - 1)
  const start = new Date(end)
  start.setDate(start.getDate() - (days - 1))
  return {
    start: formatDateYYYYMMDD(start),
    end: formatDateYYYYMMDD(end),
  }
}

async function startManualSync(params: {
  syncType: 'events' | 'cohort_kpi'
  dateRangeStart: string
  dateRangeEnd: string
}) {
  const syncLog = await af.createSyncLog({
    syncType: params.syncType,
    dateRangeStart: new Date(params.dateRangeStart),
    dateRangeEnd: new Date(params.dateRangeEnd),
  })

  const { spawn } = await import('child_process')
  const { join } = await import('path')
  const afDir = ['server', 'appsflyer'].join('/')
  const pythonPath = join(process.cwd(), afDir, '.venv', 'bin', 'python')
  const scriptPath = join(process.cwd(), afDir, 'sync_af_data.py')

  const args = [
    '--from-date',
    params.dateRangeStart,
    '--to-date',
    params.dateRangeEnd,
    params.syncType === 'events' ? '--events-only' : '--kpi-only',
  ]

  const child = spawn(pythonPath, [scriptPath, ...args], {
    detached: true,
    stdio: 'ignore',
  })
  child.unref()

  return {
    success: true as const,
    syncLogId: syncLog.id,
    message: `Started ${params.syncType} sync for ${params.dateRangeStart} to ${params.dateRangeEnd}`,
  }
}

export const appsflyerRouter = createTRPCRouter({
  // ============================================
  // EVENT PROCEDURES
  // ============================================

  /**
   * Get events within a date range with pagination
   */
  getEventsByDateRange: publicProcedure
    .input(
      z.object({
        startDate: z.coerce.date(),
        endDate: z.coerce.date(),
        eventName: z.enum(['iap_purchase', 'af_ad_revenue']).optional(),
        appId: z.string().optional(),
        geo: z.string().optional(),
        mediaSource: z.string().optional(),
        limit: z.number().min(1).max(1000).default(100),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input }) => {
      return await af.getEventsByDateRange(input)
    }),

  /**
   * Get all events for users who installed on a specific date (cohort lifecycle)
   */
  getEventsByInstallDate: publicProcedure
    .input(
      z.object({
        installDate: z.coerce.date(),
        appId: z.string().optional(),
        geo: z.string().optional(),
        mediaSource: z.string().optional(),
        campaign: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      return await af.getEventsByInstallDate(input)
    }),

  /**
   * Get cumulative revenue for a cohort from D0 to Dn (for ROAS calculation)
   */
  getRevenueByCohort: publicProcedure
    .input(
      z.object({
        installDate: z.coerce.date(),
        daysSinceInstall: z.number().min(0).max(180),
        appId: z.string().optional(),
        geo: z.string().optional(),
        mediaSource: z.string().optional(),
        campaign: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      return await af.getRevenueByCohort(input)
    }),

  // ============================================
  // COHORT KPI PROCEDURES
  // ============================================

  /**
   * Get cohort KPI data with flexible filtering
   */
  getCohortKpi: publicProcedure
    .input(
      z.object({
        appId: z.string().optional(),
        geo: z.string().optional(),
        mediaSource: z.string().optional(),
        campaign: z.string().optional(),
        installDate: z.coerce.date().optional(),
        installDateStart: z.coerce.date().optional(),
        installDateEnd: z.coerce.date().optional(),
        daysSinceInstall: z.number().optional(),
        limit: z.number().min(1).max(1000).default(100),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input }) => {
      return await af.getCohortKpi(input)
    }),

  /**
   * Get complete cohort metrics from af_cohort_metrics_daily view
   */
  getCohortMetrics: publicProcedure
    .input(
      z.object({
        installDate: z.coerce.date(),
        daysSinceInstall: z.number().min(0).max(180),
        appId: z.string().optional(),
        geo: z.string().optional(),
        mediaSource: z.string().optional(),
        campaign: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      return await af.getCohortMetrics(input)
    }),

  /**
   * Get most recent cohort data within N days (for dashboards)
   */
  getLatestCohortData: publicProcedure
    .input(
      z.object({
        daysBack: z.number().min(1).max(365).default(30),
        appId: z.string().optional(),
        geo: z.string().optional(),
        mediaSource: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      return await af.getLatestCohortData(input)
    }),

  // ============================================
  // BASELINE PROCEDURES
  // ============================================

  /**
   * Calculate median D7 ROAS from historical cohorts (180-210 days ago)
   */
  calculateBaselineRoas: publicProcedure
    .input(
      z.object({
        appId: z.string(),
        geo: z.string(),
        mediaSource: z.string(),
        baselineDays: z.number().min(30).max(365).default(180),
      })
    )
    .query(async ({ input }) => {
      const baseline = await af.calculateBaselineRoas(input)
      const window = af.getBaselineWindow(input.baselineDays)
      return {
        baselineRoas: baseline,
        hasData: baseline !== null,
        window: {
          start: window.start.toISOString().split('T')[0],
          end: window.end.toISOString().split('T')[0],
        },
      }
    }),

  /**
   * Calculate median retention rate from historical cohorts
   */
  calculateBaselineRetention: publicProcedure
    .input(
      z.object({
        appId: z.string(),
        geo: z.string(),
        mediaSource: z.string(),
        daysSinceInstall: z.number().refine((d) => [1, 3, 5, 7].includes(d), {
          message: 'daysSinceInstall must be 1, 3, 5, or 7',
        }),
        baselineDays: z.number().min(30).max(365).default(180),
      })
    )
    .query(async ({ input }) => {
      const baseline = await af.calculateBaselineRetention(input)
      const window = af.getBaselineWindow(input.baselineDays)
      return {
        baselineRetention: baseline,
        hasData: baseline !== null,
        window: {
          start: window.start.toISOString().split('T')[0],
          end: window.end.toISOString().split('T')[0],
        },
      }
    }),

  // ============================================
  // SYNC MANAGEMENT PROCEDURES
  // ============================================

  /**
   * Get sync status and history
   */
  getSyncStatus: publicProcedure
    .input(
      z.object({
        syncType: z.enum(['events', 'cohort_kpi', 'baseline']).optional(),
        status: z.enum(['running', 'success', 'failed']).optional(),
        limit: z.number().min(1).max(100).default(50),
      })
    )
    .query(async ({ input }) => {
      const logs = await af.getSyncLogs(input)
      const latest = input.syncType ? await af.getLatestSyncLog(input.syncType) : null
      return { logs, latest }
    }),

  /**
   * Trigger manual sync (async background execution)
   * Returns immediately with syncLogId, frontend can poll getSyncStatus
   */
  triggerManualSync: publicProcedure
    .input(
      z.object({
        syncType: z.enum(['events', 'cohort_kpi']),
        dateRangeStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
          message: 'Date must be in YYYY-MM-DD format',
        }),
        dateRangeEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
          message: 'Date must be in YYYY-MM-DD format',
        }),
      })
    )
    .mutation(async ({ input }) => {
      return await startManualSync({
        syncType: input.syncType,
        dateRangeStart: input.dateRangeStart,
        dateRangeEnd: input.dateRangeEnd,
      })
    }),

  /**
   * Trigger AppsFlyer cohort KPI sync for the last N days (default 7)
   * Reuses Python ETL via startManualSync with --kpi-only
   */
  syncAppsFlyerData: publicProcedure
    .input(
      z.object({
        days: z.number().min(1).max(30).default(7),
      })
    )
    .mutation(async ({ input }) => {
      const range = getDefaultDateRange(input.days)
      const result = await startManualSync({
        syncType: 'cohort_kpi',
        dateRangeStart: range.start,
        dateRangeEnd: range.end,
      })

      return {
        ...result,
        dateRange: range,
      }
    }),
})
