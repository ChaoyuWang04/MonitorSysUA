/**
 * AppsFlyer Query Layer
 *
 * Provides typed query functions for AppsFlyer cohort data:
 * - Event queries (IAP + Ad Revenue)
 * - Cohort KPI queries (installs, cost, retention)
 * - Baseline calculations (median of historical ROAS/RET)
 * - Sync log management
 */

import { db } from './index'
import {
  afEvents,
  afCohortKpiDaily,
  afSyncLog,
  type AfEvent,
  type AfCohortKpiDaily,
  type AfSyncLog,
  type NewAfSyncLog,
} from './schema'
import { and, desc, eq, gte, lte, sql } from 'drizzle-orm'

// ============================================
// TYPE DEFINITIONS
// ============================================

/**
 * Cohort metrics from af_cohort_metrics_daily view
 * (View is not in Drizzle schema, so we define the type here)
 */
export interface CohortMetrics {
  appId: string
  geo: string | null
  mediaSource: string | null
  campaign: string | null
  adset: string | null
  installDate: string // Date as string from SQL
  daysSinceInstall: number
  iapRevenueUsd: number
  adRevenueUsd: number
  totalRevenueUsd: number
  installs: number | null
  costUsd: number | null
  retentionRate: number | null
}

/**
 * Revenue breakdown by type
 */
export interface RevenueBreakdown {
  iapRevenueUsd: number
  adRevenueUsd: number
  totalRevenueUsd: number
}

// ============================================
// EVENT QUERIES
// ============================================

/**
 * Get events within a date range with pagination
 */
export async function getEventsByDateRange(params: {
  startDate: Date
  endDate: Date
  eventName?: 'iap_purchase' | 'af_ad_revenue'
  appId?: string
  geo?: string
  mediaSource?: string
  limit?: number
  offset?: number
}): Promise<{ data: AfEvent[]; total: number }> {
  const { startDate, endDate, eventName, appId, geo, mediaSource, limit = 100, offset = 0 } = params

  // Build WHERE conditions
  const conditions = [
    gte(afEvents.eventDate, startDate.toISOString().split('T')[0]),
    lte(afEvents.eventDate, endDate.toISOString().split('T')[0]),
  ]

  if (eventName) conditions.push(eq(afEvents.eventName, eventName))
  if (appId) conditions.push(eq(afEvents.appId, appId))
  if (geo) conditions.push(eq(afEvents.geo, geo))
  if (mediaSource) conditions.push(eq(afEvents.mediaSource, mediaSource))

  const where = and(...conditions)

  // Query data with pagination
  const data = await db
    .select()
    .from(afEvents)
    .where(where)
    .orderBy(desc(afEvents.eventDate), desc(afEvents.eventTime))
    .limit(limit)
    .offset(offset)

  // Get total count
  const totalResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(afEvents)
    .where(where)

  const total = Number(totalResult[0]?.count || 0)

  return { data, total }
}

/**
 * Get all events for users who installed on a specific date
 */
export async function getEventsByInstallDate(params: {
  installDate: Date
  appId?: string
  geo?: string
  mediaSource?: string
  campaign?: string
}): Promise<AfEvent[]> {
  const { installDate, appId, geo, mediaSource, campaign } = params

  const conditions = [
    eq(afEvents.installDate, installDate.toISOString().split('T')[0]),
  ]

  if (appId) conditions.push(eq(afEvents.appId, appId))
  if (geo) conditions.push(eq(afEvents.geo, geo))
  if (mediaSource) conditions.push(eq(afEvents.mediaSource, mediaSource))
  if (campaign) conditions.push(eq(afEvents.campaign, campaign))

  const where = and(...conditions)

  return await db
    .select()
    .from(afEvents)
    .where(where)
    .orderBy(afEvents.daysSinceInstall, afEvents.eventTime)
}

/**
 * Get CUMULATIVE revenue for a cohort from D0 to Dn
 * Used for ROAS calculation: ROAS_Dn = cumulative revenue / cost
 */
export async function getRevenueByCohort(params: {
  installDate: Date
  daysSinceInstall: number
  appId?: string
  geo?: string
  mediaSource?: string
  campaign?: string
}): Promise<RevenueBreakdown> {
  const { installDate, daysSinceInstall, appId, geo, mediaSource, campaign } = params

  // Build WHERE clause parts
  const installDateStr = installDate.toISOString().split('T')[0]

  let whereClause = sql`install_date = ${installDateStr} AND days_since_install <= ${daysSinceInstall}`

  if (appId) whereClause = sql`${whereClause} AND app_id = ${appId}`
  if (geo) whereClause = sql`${whereClause} AND geo = ${geo}`
  if (mediaSource) whereClause = sql`${whereClause} AND media_source = ${mediaSource}`
  if (campaign) whereClause = sql`${whereClause} AND campaign = ${campaign}`

  const result = await db.execute(sql`
    SELECT
      COALESCE(SUM(CASE WHEN event_name = 'iap_purchase' THEN event_revenue_usd ELSE 0 END), 0) as iap_revenue_usd,
      COALESCE(SUM(CASE WHEN event_name = 'af_ad_revenue' THEN event_revenue_usd ELSE 0 END), 0) as ad_revenue_usd,
      COALESCE(SUM(event_revenue_usd), 0) as total_revenue_usd
    FROM af_events
    WHERE ${whereClause}
  `)

  const row = result.rows[0] as Record<string, unknown> | undefined

  return {
    iapRevenueUsd: Number(row?.iap_revenue_usd || 0),
    adRevenueUsd: Number(row?.ad_revenue_usd || 0),
    totalRevenueUsd: Number(row?.total_revenue_usd || 0),
  }
}

// ============================================
// COHORT KPI QUERIES
// ============================================

/**
 * Get cohort KPI data with flexible filtering
 */
export async function getCohortKpi(filters: {
  appId?: string
  geo?: string
  mediaSource?: string
  campaign?: string
  installDate?: Date
  installDateStart?: Date
  installDateEnd?: Date
  daysSinceInstall?: number
  limit?: number
  offset?: number
}): Promise<{ data: AfCohortKpiDaily[]; total: number }> {
  const {
    appId,
    geo,
    mediaSource,
    campaign,
    installDate,
    installDateStart,
    installDateEnd,
    daysSinceInstall,
    limit = 100,
    offset = 0,
  } = filters

  const conditions = []

  if (appId) conditions.push(eq(afCohortKpiDaily.appId, appId))
  if (geo) conditions.push(eq(afCohortKpiDaily.geo, geo))
  if (mediaSource) conditions.push(eq(afCohortKpiDaily.mediaSource, mediaSource))
  if (campaign) conditions.push(eq(afCohortKpiDaily.campaign, campaign))

  if (installDate) {
    conditions.push(eq(afCohortKpiDaily.installDate, installDate.toISOString().split('T')[0]))
  }
  if (installDateStart) {
    conditions.push(gte(afCohortKpiDaily.installDate, installDateStart.toISOString().split('T')[0]))
  }
  if (installDateEnd) {
    conditions.push(lte(afCohortKpiDaily.installDate, installDateEnd.toISOString().split('T')[0]))
  }

  if (daysSinceInstall !== undefined) {
    conditions.push(eq(afCohortKpiDaily.daysSinceInstall, daysSinceInstall))
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined

  const data = await db
    .select()
    .from(afCohortKpiDaily)
    .where(where)
    .orderBy(desc(afCohortKpiDaily.installDate), afCohortKpiDaily.daysSinceInstall)
    .limit(limit)
    .offset(offset)

  const totalResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(afCohortKpiDaily)
    .where(where)

  const total = Number(totalResult[0]?.count || 0)

  return { data, total }
}

/**
 * Get complete cohort metrics from af_cohort_metrics_daily view
 */
export async function getCohortMetrics(params: {
  installDate: Date
  daysSinceInstall: number
  appId?: string
  geo?: string
  mediaSource?: string
  campaign?: string
}): Promise<CohortMetrics[]> {
  const { installDate, daysSinceInstall, appId, geo, mediaSource, campaign } = params

  const installDateStr = installDate.toISOString().split('T')[0]

  let whereClause = sql`install_date = ${installDateStr} AND days_since_install = ${daysSinceInstall}`

  if (appId) whereClause = sql`${whereClause} AND app_id = ${appId}`
  if (geo) whereClause = sql`${whereClause} AND geo = ${geo}`
  if (mediaSource) whereClause = sql`${whereClause} AND media_source = ${mediaSource}`
  if (campaign) whereClause = sql`${whereClause} AND campaign = ${campaign}`

  const result = await db.execute(sql`
    SELECT
      app_id,
      geo,
      media_source,
      campaign,
      adset,
      install_date,
      days_since_install,
      iap_revenue_usd,
      ad_revenue_usd,
      total_revenue_usd,
      installs,
      cost_usd,
      retention_rate
    FROM af_cohort_metrics_daily
    WHERE ${whereClause}
  `)

  return (result.rows as Record<string, unknown>[]).map((row) => ({
    appId: String(row.app_id || ''),
    geo: row.geo ? String(row.geo) : null,
    mediaSource: row.media_source ? String(row.media_source) : null,
    campaign: row.campaign ? String(row.campaign) : null,
    adset: row.adset ? String(row.adset) : null,
    installDate: String(row.install_date || ''),
    daysSinceInstall: Number(row.days_since_install || 0),
    iapRevenueUsd: Number(row.iap_revenue_usd || 0),
    adRevenueUsd: Number(row.ad_revenue_usd || 0),
    totalRevenueUsd: Number(row.total_revenue_usd || 0),
    installs: row.installs !== null ? Number(row.installs) : null,
    costUsd: row.cost_usd !== null ? Number(row.cost_usd) : null,
    retentionRate: row.retention_rate !== null ? Number(row.retention_rate) : null,
  }))
}

/**
 * Get most recent cohort data within N days (for dashboards)
 */
export async function getLatestCohortData(params: {
  daysBack?: number
  appId?: string
  geo?: string
  mediaSource?: string
}): Promise<AfCohortKpiDaily[]> {
  const { daysBack = 30, appId, geo, mediaSource } = params

  const startDate = new Date()
  startDate.setDate(startDate.getDate() - daysBack)
  const startDateStr = startDate.toISOString().split('T')[0]

  const conditions = [gte(afCohortKpiDaily.installDate, startDateStr)]

  if (appId) conditions.push(eq(afCohortKpiDaily.appId, appId))
  if (geo) conditions.push(eq(afCohortKpiDaily.geo, geo))
  if (mediaSource) conditions.push(eq(afCohortKpiDaily.mediaSource, mediaSource))

  const where = and(...conditions)

  return await db
    .select()
    .from(afCohortKpiDaily)
    .where(where)
    .orderBy(desc(afCohortKpiDaily.installDate), afCohortKpiDaily.daysSinceInstall)
}

// ============================================
// BASELINE CALCULATION QUERIES
// ============================================

/**
 * Calculate baseline window dates
 * Baseline = cohorts from 180-210 days ago (mature, stable performance)
 */
export function getBaselineWindow(baselineDays: number = 180): {
  start: Date
  end: Date
} {
  const now = new Date()

  const end = new Date(now)
  end.setDate(end.getDate() - baselineDays)

  const start = new Date(end)
  start.setDate(start.getDate() - 30)

  return { start, end }
}

/**
 * Calculate median D7 ROAS from historical cohorts (180-210 days ago)
 * 安全线 = app + geo + media_source 维度的 ROAS_D7 中位数
 * NOTE: 不含 campaign 维度 - 安全线是宏观基准线
 */
export async function calculateBaselineRoas(params: {
  appId: string
  geo: string
  mediaSource: string
  baselineDays?: number
}): Promise<number | null> {
  const { appId, geo, mediaSource, baselineDays = 180 } = params

  const { start, end } = getBaselineWindow(baselineDays)
  const startStr = start.toISOString().split('T')[0]
  const endStr = end.toISOString().split('T')[0]

  // Calculate median ROAS_D7 across all cohorts in the baseline window
  // Aggregate by install_date (NOT by campaign) for stability
  const result = await db.execute(sql`
    WITH cohort_roas AS (
      SELECT
        install_date,
        SUM(total_revenue_usd) as total_revenue,
        SUM(cost_usd) as total_cost,
        CASE
          WHEN SUM(cost_usd) > 0 THEN SUM(total_revenue_usd) / SUM(cost_usd)
          ELSE NULL
        END as roas_d7
      FROM af_cohort_metrics_daily
      WHERE app_id = ${appId}
        AND geo = ${geo}
        AND media_source = ${mediaSource}
        AND install_date BETWEEN ${startStr} AND ${endStr}
        AND days_since_install <= 7
      GROUP BY install_date
      HAVING SUM(cost_usd) > 0
    )
    SELECT
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY roas_d7) as baseline_roas,
      COUNT(*) as sample_count
    FROM cohort_roas
    WHERE roas_d7 IS NOT NULL
  `)

  const row = result.rows[0] as Record<string, unknown> | undefined

  if (!row || row.baseline_roas === null) {
    return null
  }

  return Number(row.baseline_roas)
}

/**
 * Calculate median retention rate from historical cohorts
 * 安全线 = app + geo + media_source 维度的 RET_Dn 中位数
 */
export async function calculateBaselineRetention(params: {
  appId: string
  geo: string
  mediaSource: string
  daysSinceInstall: number // 1, 3, 5, or 7
  baselineDays?: number
}): Promise<number | null> {
  const { appId, geo, mediaSource, daysSinceInstall, baselineDays = 180 } = params

  const { start, end } = getBaselineWindow(baselineDays)
  const startStr = start.toISOString().split('T')[0]
  const endStr = end.toISOString().split('T')[0]

  // Calculate weighted median retention rate
  // Weight by installs for more accurate baseline
  const result = await db.execute(sql`
    WITH cohort_retention AS (
      SELECT
        install_date,
        SUM(installs * retention_rate) / NULLIF(SUM(installs), 0) as weighted_retention,
        SUM(installs) as total_installs
      FROM af_cohort_kpi_daily
      WHERE app_id = ${appId}
        AND geo = ${geo}
        AND media_source = ${mediaSource}
        AND install_date BETWEEN ${startStr} AND ${endStr}
        AND days_since_install = ${daysSinceInstall}
        AND retention_rate IS NOT NULL
      GROUP BY install_date
      HAVING SUM(installs) > 0
    )
    SELECT
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY weighted_retention) as baseline_retention,
      COUNT(*) as sample_count
    FROM cohort_retention
    WHERE weighted_retention IS NOT NULL
  `)

  const row = result.rows[0] as Record<string, unknown> | undefined

  if (!row || row.baseline_retention === null) {
    return null
  }

  return Number(row.baseline_retention)
}

// ============================================
// SYNC MANAGEMENT QUERIES
// ============================================

/**
 * Get most recent sync log entry by type
 */
export async function getLatestSyncLog(
  syncType: 'events' | 'cohort_kpi' | 'baseline'
): Promise<AfSyncLog | null> {
  const result = await db
    .select()
    .from(afSyncLog)
    .where(eq(afSyncLog.syncType, syncType))
    .orderBy(desc(afSyncLog.startedAt))
    .limit(1)

  return result[0] || null
}

/**
 * Create new sync log entry (called at start of sync)
 */
export async function createSyncLog(data: {
  syncType: 'events' | 'cohort_kpi' | 'baseline'
  dateRangeStart?: Date
  dateRangeEnd?: Date
}): Promise<AfSyncLog> {
  const insertData: NewAfSyncLog = {
    syncType: data.syncType,
    dateRangeStart: data.dateRangeStart?.toISOString().split('T')[0],
    dateRangeEnd: data.dateRangeEnd?.toISOString().split('T')[0],
    status: 'running',
  }

  const result = await db.insert(afSyncLog).values(insertData).returning()

  return result[0]
}

/**
 * Update sync log with completion status
 */
export async function updateSyncLog(
  id: number,
  updates: {
    status?: 'running' | 'success' | 'failed'
    recordsProcessed?: number
    errorMessage?: string
    completedAt?: Date
  }
): Promise<AfSyncLog | null> {
  const updateData: Partial<AfSyncLog> = {}

  if (updates.status) updateData.status = updates.status
  if (updates.recordsProcessed !== undefined) updateData.recordsProcessed = updates.recordsProcessed
  if (updates.errorMessage) updateData.errorMessage = updates.errorMessage
  if (updates.completedAt) updateData.completedAt = updates.completedAt

  const result = await db
    .update(afSyncLog)
    .set(updateData)
    .where(eq(afSyncLog.id, id))
    .returning()

  return result[0] || null
}

/**
 * Get all sync logs with optional status filter
 */
export async function getSyncLogs(params?: {
  syncType?: 'events' | 'cohort_kpi' | 'baseline'
  status?: 'running' | 'success' | 'failed'
  limit?: number
}): Promise<AfSyncLog[]> {
  const { syncType, status, limit = 50 } = params || {}

  const conditions = []
  if (syncType) conditions.push(eq(afSyncLog.syncType, syncType))
  if (status) conditions.push(eq(afSyncLog.status, status))

  const where = conditions.length > 0 ? and(...conditions) : undefined

  return await db
    .select()
    .from(afSyncLog)
    .where(where)
    .orderBy(desc(afSyncLog.startedAt))
    .limit(limit)
}

// ============================================
// UTILITY QUERIES
// ============================================

/**
 * Get all unique app/geo/mediaSource combinations from AppsFlyer data
 * Used by batch baseline calculation
 */
export async function getUniqueAppGeoMediaCombinations(): Promise<
  Array<{ appId: string; geo: string; mediaSource: string }>
> {
  const result = await db
    .selectDistinct({
      appId: afCohortKpiDaily.appId,
      geo: afCohortKpiDaily.geo,
      mediaSource: afCohortKpiDaily.mediaSource,
    })
    .from(afCohortKpiDaily)
    .where(
      and(
        sql`${afCohortKpiDaily.appId} IS NOT NULL`,
        sql`${afCohortKpiDaily.geo} IS NOT NULL`,
        sql`${afCohortKpiDaily.mediaSource} IS NOT NULL`
      )
    )
    .orderBy(afCohortKpiDaily.appId, afCohortKpiDaily.geo, afCohortKpiDaily.mediaSource)

  return result.map((row) => ({
    appId: row.appId!,
    geo: row.geo!,
    mediaSource: row.mediaSource!,
  }))
}
