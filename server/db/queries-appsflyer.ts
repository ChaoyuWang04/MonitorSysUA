/**
 * AppsFlyer Query Layer
 *
 * Provides typed query functions for AppsFlyer cohort data:
 * - Event queries (IAP + Ad Revenue)
 * - Cohort KPI queries (installs, cost, retention)
 * - Baseline calculations (median of historical ROAS/RET)
 * - Sync log management
 *
 * @module queries-appsflyer
 * @description Type-safe database queries for AppsFlyer cohort data using Drizzle ORM.
 *
 * @example
 * ```typescript
 * import { getEventsByDateRange, calculateBaselineRoas } from './queries-appsflyer';
 *
 * // Get events for last 7 days
 * const events = await getEventsByDateRange({
 *   startDate: new Date('2025-11-01'),
 *   endDate: new Date('2025-11-07')
 * });
 *
 * // Calculate safety baseline
 * const baseline = await calculateBaselineRoas({
 *   appId: 'com.example.app',
 *   geo: 'US',
 *   mediaSource: 'googleadwords_int'
 * });
 * ```
 */

import { db } from './index'
import {
  afEvents,
  afCohortKpiDaily,
  afSyncLog,
  baselineMetrics,
  BASELINE_DIMENSION_ALL,
  type NewBaselineMetrics,
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
 * Get events within a date range with pagination.
 *
 * Queries `af_events` table for IAP purchases and ad revenue events.
 * Supports filtering by event type, app, geo, and media source.
 *
 * @param params - Query parameters
 * @param params.startDate - Start of date range (inclusive)
 * @param params.endDate - End of date range (inclusive)
 * @param params.eventName - Filter by event type: 'iap_purchase' or 'af_ad_revenue'
 * @param params.appId - Filter by app identifier
 * @param params.geo - Filter by country code (e.g., 'US')
 * @param params.mediaSource - Filter by attribution source (e.g., 'googleadwords_int')
 * @param params.limit - Maximum rows to return (default: 100, max: 1000)
 * @param params.offset - Pagination offset (default: 0)
 * @returns Promise with data array and total count for pagination
 *
 * @example
 * ```typescript
 * const result = await getEventsByDateRange({
 *   startDate: new Date('2025-11-01'),
 *   endDate: new Date('2025-11-07'),
 *   eventName: 'iap_purchase',
 *   limit: 50
 * });
 * console.log(`Page 1 of ${Math.ceil(result.total / 50)}`);
 * ```
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
 * Get all events for users who installed on a specific date.
 *
 * Returns all events (IAP + ad revenue) for a specific install cohort,
 * ordered by days_since_install. Useful for cohort lifecycle analysis.
 *
 * @param params - Query parameters
 * @param params.installDate - The install date defining the cohort
 * @param params.appId - Filter by app identifier
 * @param params.geo - Filter by country code
 * @param params.mediaSource - Filter by attribution source
 * @param params.campaign - Filter by campaign name
 * @returns Array of events ordered by days_since_install, event_time
 *
 * @example
 * ```typescript
 * // Analyze Nov 1 cohort lifecycle
 * const events = await getEventsByInstallDate({
 *   installDate: new Date('2025-11-01'),
 *   geo: 'US'
 * });
 *
 * // Group by day
 * const byDay = events.reduce((acc, e) => {
 *   acc[e.daysSinceInstall] = acc[e.daysSinceInstall] || [];
 *   acc[e.daysSinceInstall].push(e);
 *   return acc;
 * }, {});
 * ```
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
 * Get CUMULATIVE revenue for a cohort from D0 to Dn.
 *
 * Calculates total revenue accumulated from install day (D0) through the specified day.
 * This is the standard definition for ROAS calculation in mobile UA.
 *
 * **Important**: Revenue is cumulative, not daily. D7 revenue includes D0-D6.
 *
 * @param params - Query parameters
 * @param params.installDate - Cohort install date
 * @param params.daysSinceInstall - Calculate revenue from D0 through this day (0-180)
 * @param params.appId - Filter by app identifier
 * @param params.geo - Filter by country code
 * @param params.mediaSource - Filter by attribution source
 * @param params.campaign - Filter by campaign name
 * @returns Revenue breakdown by type (IAP vs ad revenue)
 *
 * @example
 * ```typescript
 * // Calculate D7 ROAS
 * const revenue = await getRevenueByCohort({
 *   installDate: new Date('2025-11-01'),
 *   daysSinceInstall: 7,  // Cumulative D0-D7
 *   geo: 'US'
 * });
 *
 * const cost = 1000; // From getCohortKpi
 * const roas7 = revenue.totalRevenueUsd / cost;
 * console.log(`ROAS_D7: ${(roas7 * 100).toFixed(1)}%`);
 * ```
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
 * Calculate median ROAS (up to target day, default D7) from historical cohorts (safety baseline).
 *
 * This now uses the PRD 6.2.5 baseline_metrics model with four-level fallback:
 * Level1: app + geo + media_source
 * Level2: app + geo + ALL
 * Level3: app + ALL + media_source
 * Level4: app + ALL + ALL
 *
 * Window: [today - (baselineDays + 30), today - baselineDays]
 * Method: cost-weighted ROAS over the window (no P50), stored in baseline_metrics.
 *
 * @param params - Baseline parameters
 * @param params.appId - App identifier (required)
 * @param params.geo - Country code (required)
 * @param params.mediaSource - Attribution source (required)
 * @param params.baselineDays - Days back for baseline window (default: 180)
 * @returns Median ROAS_D7 or null if insufficient data
 *
 * @example
 * ```typescript
 * const baseline = await calculateBaselineRoas({
 *   appId: 'solitaire.patience.card.games.klondike.free',
 *   geo: 'US',
 *   mediaSource: 'googleadwords_int',
 *   baselineDays: 180
 * });
 *
 * if (baseline !== null) {
 *   console.log(`Safety ROAS: ${(baseline * 100).toFixed(1)}%`);
 * } else {
 *   console.log('Insufficient historical data');
 * }
 * ```
 */
export async function calculateBaselineRoas(params: {
  appId: string
  geo: string
  mediaSource: string
  baselineDays?: number
  daysSinceInstall?: number
}): Promise<number | null> {
  const { appId, geo, mediaSource, baselineDays = 180, daysSinceInstall = 7 } = params
  const baseline = await getBaselineMetrics({
    appId,
    geo,
    mediaSource,
    daysSinceInstall,
    baselineDays,
  })

  return baseline?.baselineRoas ?? null
}

/**
 * Calculate median retention rate from historical cohorts (safety baseline).
 *
 * Uses the PRD 6.2.5 baseline_metrics model with four-level fallback (see above).
 * Window: [today - (baselineDays + 30), today - baselineDays]
 * Method: install-weighted average retention over the window (no P50).
 *
 * @param params - Baseline parameters
 * @param params.appId - App identifier (required)
 * @param params.geo - Country code (required)
 * @param params.mediaSource - Attribution source (required)
 * @param params.daysSinceInstall - Retention day: 1, 3, 5, or 7
 * @param params.baselineDays - Days back for baseline window (default: 180)
 * @returns Median retention rate or null if insufficient data
 *
 * @example
 * ```typescript
 * const baseline = await calculateBaselineRetention({
 *   appId: 'solitaire.patience.card.games.klondike.free',
 *   geo: 'US',
 *   mediaSource: 'googleadwords_int',
 *   daysSinceInstall: 7,  // D7 retention baseline
 *   baselineDays: 180
 * });
 *
 * if (baseline !== null) {
 *   console.log(`Safety RET_D7: ${(baseline * 100).toFixed(1)}%`);
 * }
 * ```
 */
export async function calculateBaselineRetention(params: {
  appId: string
  geo: string
  mediaSource: string
  daysSinceInstall: number // 1, 3, 5, or 7
  baselineDays?: number
}): Promise<number | null> {
  const { appId, geo, mediaSource, daysSinceInstall, baselineDays = 180 } = params
  const baseline = await getBaselineMetrics({
    appId,
    geo,
    mediaSource,
    daysSinceInstall,
    baselineDays,
  })

  return baseline?.baselineRetention ?? null
}

// ============================================
// BASELINE METRICS (PRD 6.2.5)
// ============================================

export interface BaselineMetricResult {
  baselineRoas: number | null
  baselineRetention: number | null
  baselineCpi: number | null
  sampleSize: number
  sampleStartDate: string
  sampleEndDate: string
  levelUsed: 'L1' | 'L2' | 'L3' | 'L4'
}

interface BaselineParams {
  appId: string
  geo: string
  mediaSource: string
  daysSinceInstall: number
  baselineDays?: number
  lookbackWindowDays?: number
}

const BASELINE_LOOKBACK_WINDOW_DAYS = 30

type BaselineLevel = {
  label: BaselineMetricResult['levelUsed']
  geo: string
  mediaSource: string
}

const BASELINE_LEVELS = (geo: string, mediaSource: string): BaselineLevel[] => [
  { label: 'L1', geo, mediaSource },
  { label: 'L2', geo, mediaSource: BASELINE_DIMENSION_ALL },
  { label: 'L3', geo: BASELINE_DIMENSION_ALL, mediaSource },
  { label: 'L4', geo: BASELINE_DIMENSION_ALL, mediaSource: BASELINE_DIMENSION_ALL },
]

function mapStageToColumns(
  stageDays: number
): { roasColumn: 'baseline_roas_d3' | 'baseline_roas_d7'; retColumn: 'baseline_ret_d3' | 'baseline_ret_d7' } {
  // Use D3 bucket for early stages (T+1/T+3), D7 for later
  if (stageDays <= 3) {
    return {
      roasColumn: 'baseline_roas_d3',
      retColumn: 'baseline_ret_d3',
    }
  }

  return {
    roasColumn: 'baseline_roas_d7',
    retColumn: 'baseline_ret_d7',
  }
}

async function computeBaselineForLevel(params: {
  appId: string
  geo: string
  mediaSource: string
  daysSinceInstall: number
  baselineDays: number
  lookbackWindowDays: number
}): Promise<{
  baselineRoas: number | null
  baselineRetention: number | null
  baselineCpi: number | null
  sampleSize: number
  sampleStartDate: string
  sampleEndDate: string
  } | null> {
  const { appId, geo, mediaSource, daysSinceInstall, baselineDays, lookbackWindowDays } = params

  const buildWhere = (startStr: string, endStr: string) => {
    const whereClauses = [
      sql`app_id = ${appId}`,
      sql`install_date BETWEEN ${startStr} AND ${endStr}`,
    ]

    if (geo !== BASELINE_DIMENSION_ALL) {
      whereClauses.push(sql`geo = ${geo}`)
    }

    if (mediaSource !== BASELINE_DIMENSION_ALL) {
      whereClauses.push(sql`media_source = ${mediaSource}`)
    }

    return whereClauses.reduce((acc, clause, idx) => {
      if (idx === 0) return clause
      return sql`${acc} AND ${clause}`
    })
  }

  const runWindow = async (startStr: string, endStr: string) => {
    const whereSql = buildWhere(startStr, endStr)
    const result = await db.execute(sql`
      SELECT
        SUM(CASE WHEN days_since_install = 0 THEN cost_usd ELSE 0 END) AS total_cost_usd,
        SUM(CASE WHEN days_since_install = 0 THEN installs ELSE 0 END) AS total_installs,
        SUM(CASE WHEN days_since_install <= ${daysSinceInstall} THEN total_revenue_usd ELSE 0 END) AS total_revenue_usd,
        SUM(CASE WHEN days_since_install = ${daysSinceInstall} THEN retention_rate * installs ELSE 0 END) AS retention_weighted,
        SUM(CASE WHEN days_since_install = ${daysSinceInstall} THEN installs ELSE 0 END) AS retention_installs,
        COUNT(DISTINCT install_date) AS sample_size
      FROM af_cohort_metrics_daily
      WHERE ${whereSql}
    `)

    const row = result.rows[0] as Record<string, unknown> | undefined
    if (!row) return null

    const totalCost = Number(row.total_cost_usd || 0)
    const totalRevenue = Number(row.total_revenue_usd || 0)
    const totalInstalls = Number(row.total_installs || 0)
    const retentionWeighted = Number(row.retention_weighted || 0)
    const retentionInstalls = Number(row.retention_installs || 0)
    const sampleSize = Number(row.sample_size || 0)

    if (sampleSize === 0) return null

    const baselineRoas = totalCost > 0 ? totalRevenue / totalCost : null
    const baselineRetention =
      retentionInstalls > 0 ? retentionWeighted / retentionInstalls : null
    const baselineCpi = totalInstalls > 0 ? totalCost / totalInstalls : null

    if (baselineRoas === null && baselineRetention === null) {
      return null
    }

    return {
      baselineRoas,
      baselineRetention,
      baselineCpi,
      sampleSize,
      sampleStartDate: startStr,
      sampleEndDate: endStr,
    }
  }

  // Primary window (baselineDays anchor)
  const end = new Date()
  end.setDate(end.getDate() - baselineDays)
  const start = new Date(end)
  start.setDate(end.getDate() - lookbackWindowDays)

  const baseResult = await runWindow(
    start.toISOString().split('T')[0],
    end.toISOString().split('T')[0]
  )
  if (baseResult) return baseResult

  // Fallback to most recent available window if baseline window has no data
  const availableRange = await db.execute(sql`
    SELECT MIN(install_date) AS min_date, MAX(install_date) AS max_date
    FROM af_cohort_kpi_daily
    WHERE ${buildWhere('1900-01-01', '2999-12-31')}
  `)

  const rangeRow = availableRange.rows[0] as Record<string, unknown> | undefined
  if (!rangeRow || !rangeRow.max_date) {
    return null
  }

  const maxDate = new Date(rangeRow.max_date as string)
  const minDate = rangeRow.min_date ? new Date(rangeRow.min_date as string) : null
  const fallbackStart = new Date(maxDate)
  fallbackStart.setDate(fallbackStart.getDate() - lookbackWindowDays)
  const fallbackStartStr =
    minDate && fallbackStart < minDate ? minDate.toISOString().split('T')[0] : fallbackStart.toISOString().split('T')[0]
  const fallbackEndStr = maxDate.toISOString().split('T')[0]

  return await runWindow(fallbackStartStr, fallbackEndStr)
}

async function upsertBaselineMetricsRow(params: {
  appId: string
  geo: string
  mediaSource: string
  platform?: string
  daysSinceInstall: number
  baselineDays: number
  lookbackWindowDays: number
  levelUsed: BaselineMetricResult['levelUsed']
}): Promise<BaselineMetricResult | null> {
  const {
    appId,
    geo,
    mediaSource,
    platform = BASELINE_DIMENSION_ALL,
    daysSinceInstall,
    baselineDays,
    lookbackWindowDays,
    levelUsed,
  } = params

  const computed = await computeBaselineForLevel({
    appId,
    geo,
    mediaSource,
    daysSinceInstall,
    baselineDays,
    lookbackWindowDays,
  })

  if (!computed) return null

  const { roasColumn, retColumn } = mapStageToColumns(daysSinceInstall)

  const insertValues: NewBaselineMetrics = {
    appId,
    geo,
    mediaSource,
    platform,
    baselineRoasD3: null,
    baselineRoasD7: null,
    baselineRetD3: null,
    baselineRetD7: null,
    baselineCpi: computed.baselineCpi !== null ? computed.baselineCpi.toString() : null,
    sampleStartDate: computed.sampleStartDate,
    sampleEndDate: computed.sampleEndDate,
    sampleSize: computed.sampleSize,
    nextUpdateDate: computed.sampleEndDate || null,
  }

  const updateValues: Partial<NewBaselineMetrics> = {
    baselineCpi: computed.baselineCpi !== null ? computed.baselineCpi.toString() : null,
    sampleStartDate: computed.sampleStartDate,
    sampleEndDate: computed.sampleEndDate,
    sampleSize: computed.sampleSize,
    updatedAt: new Date(),
  }

  if (roasColumn === 'baseline_roas_d3') {
    insertValues.baselineRoasD3 = computed.baselineRoas !== null ? computed.baselineRoas.toString() : null
    updateValues.baselineRoasD3 = computed.baselineRoas !== null ? computed.baselineRoas.toString() : null
  } else {
    insertValues.baselineRoasD7 = computed.baselineRoas !== null ? computed.baselineRoas.toString() : null
    updateValues.baselineRoasD7 = computed.baselineRoas !== null ? computed.baselineRoas.toString() : null
  }

  if (retColumn === 'baseline_ret_d3') {
    insertValues.baselineRetD3 = computed.baselineRetention !== null ? computed.baselineRetention.toString() : null
    updateValues.baselineRetD3 = computed.baselineRetention !== null ? computed.baselineRetention.toString() : null
  } else {
    insertValues.baselineRetD7 = computed.baselineRetention !== null ? computed.baselineRetention.toString() : null
    updateValues.baselineRetD7 = computed.baselineRetention !== null ? computed.baselineRetention.toString() : null
  }

  await db
    .insert(baselineMetrics)
    .values(insertValues)
    .onConflictDoUpdate({
      target: [
        baselineMetrics.appId,
        baselineMetrics.mediaSource,
        baselineMetrics.geo,
        baselineMetrics.platform,
      ],
      set: updateValues,
    })

  return {
    baselineRoas: computed.baselineRoas,
    baselineRetention: computed.baselineRetention,
    baselineCpi: computed.baselineCpi,
    sampleSize: computed.sampleSize,
    sampleStartDate: computed.sampleStartDate,
    sampleEndDate: computed.sampleEndDate,
    levelUsed,
  }
}

export async function getBaselineMetrics(params: BaselineParams): Promise<BaselineMetricResult | null> {
  const {
    appId,
    geo,
    mediaSource,
    daysSinceInstall,
    baselineDays = 180,
    lookbackWindowDays = BASELINE_LOOKBACK_WINDOW_DAYS,
  } = params

  const { roasColumn, retColumn } = mapStageToColumns(daysSinceInstall)

  for (const level of BASELINE_LEVELS(geo, mediaSource)) {
    const roasSelector =
      roasColumn === 'baseline_roas_d3'
        ? baselineMetrics.baselineRoasD3
        : baselineMetrics.baselineRoasD7
    const retSelector =
      retColumn === 'baseline_ret_d3'
        ? baselineMetrics.baselineRetD3
        : baselineMetrics.baselineRetD7

    // 1) Try existing baseline
    const existing = await db
      .select({
        roas: roasSelector,
        ret: retSelector,
        cpi: baselineMetrics.baselineCpi,
        sampleStartDate: baselineMetrics.sampleStartDate,
        sampleEndDate: baselineMetrics.sampleEndDate,
        sampleSize: baselineMetrics.sampleSize,
      })
      .from(baselineMetrics)
      .where(
        and(
          eq(baselineMetrics.appId, appId),
          eq(baselineMetrics.geo, level.geo),
          eq(baselineMetrics.mediaSource, level.mediaSource),
          eq(baselineMetrics.platform, BASELINE_DIMENSION_ALL)
        )
      )
      .limit(1)

    const row = existing[0]
    if (row && (row.roas !== null || row.ret !== null)) {
      return {
        baselineRoas: row.roas !== null ? Number(row.roas) : null,
        baselineRetention: row.ret !== null ? Number(row.ret) : null,
        baselineCpi: row.cpi !== null ? Number(row.cpi) : null,
        sampleSize: Number(row.sampleSize || 0),
        sampleStartDate: row.sampleStartDate || '',
        sampleEndDate: row.sampleEndDate || '',
        levelUsed: level.label,
      }
    }

    // 2) Compute and upsert if missing
    const computed = await upsertBaselineMetricsRow({
      appId,
      geo: level.geo,
      mediaSource: level.mediaSource,
      daysSinceInstall,
      baselineDays,
      lookbackWindowDays,
      levelUsed: level.label,
    })

    if (computed) {
      return {
        ...computed,
        levelUsed: level.label,
      }
    }
  }

  return null
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
