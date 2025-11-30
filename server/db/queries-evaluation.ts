/**
 * Evaluation System Query Functions
 *
 * Database operations for the evaluation system (A1-A5).
 * These functions are called by the evaluation engines and tRPC routers.
 */

import { db } from './index'
import {
  safetyBaseline,
  type SafetyBaseline,
  type NewSafetyBaseline,
  baselineSettings,
  type BaselineSettings,
  type NewBaselineSettings,
  creativeTestBaseline,
  type CreativeTestBaseline,
  type NewCreativeTestBaseline,
  campaignEvaluation,
  type CampaignEvaluation,
  type NewCampaignEvaluation,
  creativeEvaluation,
  type CreativeEvaluation,
  type NewCreativeEvaluation,
  operationScore,
  type OperationScore,
  type NewOperationScore,
  actionRecommendation,
  type ActionRecommendation,
  type NewActionRecommendation,
  afCohortKpiDaily,
  afEvents,
} from './schema'
import { and, desc, eq, sql, gte, lte, sum } from 'drizzle-orm'

// ============================================
// SAFETY BASELINE FUNCTIONS
// ============================================

/**
 * Get safety baseline for a specific product/country/platform/channel
 */
export async function getSafetyBaseline(params: {
  productName: string
  countryCode: string
  platform?: string
  channel?: string
}) {
  const { productName, countryCode, platform = 'Android', channel = 'Google' } = params

  const result = await db
    .select()
    .from(safetyBaseline)
    .where(
      and(
        eq(safetyBaseline.productName, productName),
        eq(safetyBaseline.countryCode, countryCode),
        eq(safetyBaseline.platform, platform),
        eq(safetyBaseline.channel, channel)
      )
    )
    .limit(1)

  return result[0] || null
}

/**
 * Get all safety baselines
 */
export async function getAllSafetyBaselines() {
  return await db
    .select()
    .from(safetyBaseline)
    .orderBy(safetyBaseline.productName, safetyBaseline.countryCode)
}

/**
 * Upsert safety baseline (create or update)
 */
export async function upsertSafetyBaseline(baseline: NewSafetyBaseline) {
  const result = await db
    .insert(safetyBaseline)
    .values(baseline)
    .onConflictDoUpdate({
      target: [
        safetyBaseline.productName,
        safetyBaseline.countryCode,
        safetyBaseline.platform,
        safetyBaseline.channel,
      ],
      set: {
        baselineRoas7: baseline.baselineRoas7,
        baselineRet7: baseline.baselineRet7,
        referencePeriod: baseline.referencePeriod,
        lastUpdated: sql`now()`,
      },
    })
    .returning()

  return result[0]
}

// ============================================
// BASELINE SETTINGS FUNCTIONS
// ============================================

/**
 * Get baseline settings for a specific app/geo/mediaSource
 */
export async function getBaselineSettings(params: {
  appId: string
  geo: string
  mediaSource: string
}) {
  const { appId, geo, mediaSource } = params

  const result = await db
    .select()
    .from(baselineSettings)
    .where(
      and(
        eq(baselineSettings.appId, appId),
        eq(baselineSettings.geo, geo),
        eq(baselineSettings.mediaSource, mediaSource)
      )
    )
    .limit(1)

  return result[0] || null
}

/**
 * Get all baseline settings
 */
export async function getAllBaselineSettings() {
  return await db
    .select()
    .from(baselineSettings)
    .orderBy(baselineSettings.appId, baselineSettings.geo)
}

/**
 * Upsert baseline settings (create or update)
 */
export async function upsertBaselineSettings(settings: NewBaselineSettings) {
  const result = await db
    .insert(baselineSettings)
    .values(settings)
    .onConflictDoUpdate({
      target: [baselineSettings.appId, baselineSettings.geo, baselineSettings.mediaSource],
      set: {
        baselineDays: settings.baselineDays,
        minSampleSize: settings.minSampleSize,
        updatedAt: sql`now()`,
      },
    })
    .returning()

  return result[0]
}

// ============================================
// CREATIVE TEST BASELINE FUNCTIONS
// ============================================

/**
 * Get creative test baseline for a specific product/country/platform/channel
 */
export async function getCreativeTestBaseline(params: {
  productName: string
  countryCode: string
  platform?: string
  channel?: string
}) {
  const { productName, countryCode, platform = 'Android', channel = 'Google' } = params

  const result = await db
    .select()
    .from(creativeTestBaseline)
    .where(
      and(
        eq(creativeTestBaseline.productName, productName),
        eq(creativeTestBaseline.countryCode, countryCode),
        eq(creativeTestBaseline.platform, platform),
        eq(creativeTestBaseline.channel, channel)
      )
    )
    .limit(1)

  return result[0] || null
}

/**
 * Get all creative test baselines
 */
export async function getAllCreativeTestBaselines() {
  return await db
    .select()
    .from(creativeTestBaseline)
    .orderBy(creativeTestBaseline.productName, creativeTestBaseline.countryCode)
}

/**
 * Upsert creative test baseline (create or update)
 */
export async function upsertCreativeTestBaseline(baseline: NewCreativeTestBaseline) {
  const result = await db
    .insert(creativeTestBaseline)
    .values(baseline)
    .onConflictDoUpdate({
      target: [
        creativeTestBaseline.productName,
        creativeTestBaseline.countryCode,
        creativeTestBaseline.platform,
        creativeTestBaseline.channel,
      ],
      set: {
        maxCpi: baseline.maxCpi,
        minRoasD3: baseline.minRoasD3,
        minRoasD7: baseline.minRoasD7,
        excellentCvr: baseline.excellentCvr,
        lastUpdated: sql`now()`,
      },
    })
    .returning()

  return result[0]
}

// ============================================
// CAMPAIGN EVALUATION FUNCTIONS
// ============================================

/**
 * Get campaign evaluations with pagination and filtering
 */
export async function getCampaignEvaluations(params: {
  campaignId?: string
  status?: string
  page?: number
  pageSize?: number
}) {
  const { campaignId, status, page = 1, pageSize = 50 } = params

  // Build conditions
  const conditions = []
  if (campaignId) {
    conditions.push(eq(campaignEvaluation.campaignId, campaignId))
  }
  if (status) {
    conditions.push(eq(campaignEvaluation.status, status))
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined

  // Get data with pagination
  const data = await db
    .select()
    .from(campaignEvaluation)
    .where(where)
    .orderBy(desc(campaignEvaluation.evaluationDate))
    .limit(pageSize)
    .offset((page - 1) * pageSize)

  // Get total count
  const totalResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(campaignEvaluation)
    .where(where)

  const total = Number(totalResult[0]?.count || 0)
  const totalPages = Math.ceil(total / pageSize)

  return {
    data,
    total,
    page,
    pageSize,
    totalPages,
  }
}

/**
 * Get latest evaluation for a campaign
 */
export async function getLatestCampaignEvaluation(campaignId: string) {
  const result = await db
    .select()
    .from(campaignEvaluation)
    .where(eq(campaignEvaluation.campaignId, campaignId))
    .orderBy(desc(campaignEvaluation.evaluationDate))
    .limit(1)

  return result[0] || null
}

/**
 * Get evaluations by status
 */
export async function getCampaignEvaluationsByStatus(status: string) {
  return await db
    .select()
    .from(campaignEvaluation)
    .where(eq(campaignEvaluation.status, status))
    .orderBy(desc(campaignEvaluation.minAchievementRate))
}

/**
 * Create campaign evaluation
 */
export async function createCampaignEvaluation(evaluation: NewCampaignEvaluation) {
  const result = await db.insert(campaignEvaluation).values(evaluation).returning()

  return result[0]
}

/**
 * Get campaign evaluation statistics
 */
export async function getCampaignEvaluationStats() {
  const [statusCounts, avgAchievementRate] = await Promise.all([
    // Count by status
    db
      .select({
        status: campaignEvaluation.status,
        count: sql<number>`count(*)`,
      })
      .from(campaignEvaluation)
      .groupBy(campaignEvaluation.status),

    // Average achievement rate
    db
      .select({
        avgRate: sql<number>`avg(${campaignEvaluation.minAchievementRate})`,
      })
      .from(campaignEvaluation),
  ])

  return {
    statusCounts: statusCounts.map((row) => ({
      status: row.status || 'unknown',
      count: Number(row.count),
    })),
    avgAchievementRate: Number(avgAchievementRate[0]?.avgRate || 0),
  }
}

// ============================================
// CREATIVE EVALUATION FUNCTIONS
// ============================================

/**
 * Get creative evaluations for a campaign with pagination
 */
export async function getCreativeEvaluations(params: {
  campaignId?: string
  creativeId?: string
  evaluationDay?: string
  page?: number
  pageSize?: number
}) {
  const { campaignId, creativeId, evaluationDay, page = 1, pageSize = 50 } = params

  const conditions = []
  if (campaignId) {
    conditions.push(eq(creativeEvaluation.campaignId, campaignId))
  }
  if (creativeId) {
    conditions.push(eq(creativeEvaluation.creativeId, creativeId))
  }
  if (evaluationDay) {
    conditions.push(eq(creativeEvaluation.evaluationDay, evaluationDay))
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined

  const data = await db
    .select()
    .from(creativeEvaluation)
    .where(where)
    .orderBy(desc(creativeEvaluation.evaluationDate))
    .limit(pageSize)
    .offset((page - 1) * pageSize)

  const totalResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(creativeEvaluation)
    .where(where)

  const total = Number(totalResult[0]?.count || 0)
  const totalPages = Math.ceil(total / pageSize)

  return {
    data,
    total,
    page,
    pageSize,
    totalPages,
  }
}

/**
 * Get creative evaluation by creative ID
 */
export async function getCreativeEvaluation(params: {
  campaignId: string
  creativeId: string
  evaluationDay: string
}) {
  const { campaignId, creativeId, evaluationDay } = params

  const result = await db
    .select()
    .from(creativeEvaluation)
    .where(
      and(
        eq(creativeEvaluation.campaignId, campaignId),
        eq(creativeEvaluation.creativeId, creativeId),
        eq(creativeEvaluation.evaluationDay, evaluationDay)
      )
    )
    .limit(1)

  return result[0] || null
}

/**
 * Create creative evaluation
 */
export async function createCreativeEvaluation(evaluation: NewCreativeEvaluation) {
  const result = await db.insert(creativeEvaluation).values(evaluation).returning()

  return result[0]
}

/**
 * Update creative status
 */
export async function updateCreativeStatus(id: number, status: string) {
  const result = await db
    .update(creativeEvaluation)
    .set({ creativeStatus: status })
    .where(eq(creativeEvaluation.id, id))
    .returning()

  return result[0] || null
}

/**
 * Get excellent creatives (出量好素材)
 */
export async function getExcellentCreatives(campaignId?: string) {
  const conditions = [eq(creativeEvaluation.creativeStatus, '出量好素材')]

  if (campaignId) {
    conditions.push(eq(creativeEvaluation.campaignId, campaignId))
  }

  return await db
    .select()
    .from(creativeEvaluation)
    .where(and(...conditions))
    .orderBy(desc(creativeEvaluation.cvr))
}

// ============================================
// OPERATION SCORE FUNCTIONS
// ============================================

/**
 * Get operation scores with pagination and filtering
 */
export async function getOperationScores(params: {
  optimizerEmail?: string
  campaignId?: string
  scoreStage?: string
  page?: number
  pageSize?: number
}) {
  const { optimizerEmail, campaignId, scoreStage = 'T+7', page = 1, pageSize = 50 } = params

  const conditions = []
  if (optimizerEmail) {
    conditions.push(eq(operationScore.optimizerEmail, optimizerEmail))
  }
  if (campaignId) {
    conditions.push(eq(operationScore.campaignId, campaignId))
  }
  if (scoreStage) {
    conditions.push(eq(operationScore.scoreStage, scoreStage))
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined

  const data = await db
    .select()
    .from(operationScore)
    .where(where)
    .orderBy(desc(operationScore.evaluationDate))
    .limit(pageSize)
    .offset((page - 1) * pageSize)

  const totalResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(operationScore)
    .where(where)

  const total = Number(totalResult[0]?.count || 0)
  const totalPages = Math.ceil(total / pageSize)

  const normalizedData = data.map((row) => ({
    ...row,
    totalScore: row.finalScore ?? row.baseScore ?? null,
    status: (row as unknown as { riskLevel?: string }).riskLevel || (row as unknown as { status?: string }).status || null,
  }))

  return {
    data: normalizedData,
    total,
    page,
    pageSize,
    totalPages,
  }
}

/**
 * Create operation score
 */
export async function createOperationScore(score: NewOperationScore) {
  const { createdAt, ...updatable } = score as Record<string, unknown>

  const result = await db
    .insert(operationScore)
    .values(score)
    .onConflictDoUpdate({
      target: [operationScore.operationId, operationScore.scoreStage],
      set: updatable,
    })
    .returning()

  return result[0]
}

/**
 * Get optimizer leaderboard
 */
export async function getOptimizerLeaderboard() {
  const result = await db
    .select({
      optimizerEmail: operationScore.optimizerEmail,
      totalOperations: sql<number>`count(*)`,
      avgRoasAchievementRate: sql<number>`avg(${operationScore.roasAchievementRate})`,
      avgRetAchievementRate: sql<number>`avg(${operationScore.retAchievementRate})`,
      excellentCount: sql<number>`count(*) filter (where ${operationScore.roasAchievementRate} >= 110 and ${operationScore.retAchievementRate} >= 110)`,
      failureCount: sql<number>`count(*) filter (where ${operationScore.roasAchievementRate} < 85 or ${operationScore.retAchievementRate} < 85)`,
    })
    .from(operationScore)
    .groupBy(operationScore.optimizerEmail)
    .orderBy(desc(sql`avg(${operationScore.roasAchievementRate})`))

  return result.map((row) => ({
    optimizerEmail: row.optimizerEmail || 'unknown',
    totalOperations: Number(row.totalOperations),
    avgRoasAchievementRate: Number(row.avgRoasAchievementRate || 0),
    avgRetAchievementRate: Number(row.avgRetAchievementRate || 0),
    excellentCount: Number(row.excellentCount),
    failureCount: Number(row.failureCount),
    excellentRate: Number(row.totalOperations) > 0
      ? (Number(row.excellentCount) / Number(row.totalOperations)) * 100
      : 0,
    failureRate: Number(row.totalOperations) > 0
      ? (Number(row.failureCount) / Number(row.totalOperations)) * 100
      : 0,
  }))
}

// ============================================
// ACTION RECOMMENDATION FUNCTIONS
// ============================================

/**
 * Get action recommendations with filtering
 */
export async function getActionRecommendations(params: {
  campaignId?: string
  executed?: boolean
  page?: number
  pageSize?: number
}) {
  const { campaignId, executed, page = 1, pageSize = 50 } = params

  const conditions = []
  if (campaignId) {
    conditions.push(eq(actionRecommendation.campaignId, campaignId))
  }
  if (executed !== undefined) {
    conditions.push(eq(actionRecommendation.executed, executed))
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined

  const data = await db
    .select()
    .from(actionRecommendation)
    .where(where)
    .orderBy(desc(actionRecommendation.recommendationDate))
    .limit(pageSize)
    .offset((page - 1) * pageSize)

  const totalResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(actionRecommendation)
    .where(where)

  const total = Number(totalResult[0]?.count || 0)
  const totalPages = Math.ceil(total / pageSize)

  return {
    data,
    total,
    page,
    pageSize,
    totalPages,
  }
}

/**
 * Get pending recommendations
 */
export async function getPendingRecommendations() {
  return await db
    .select()
    .from(actionRecommendation)
    .where(eq(actionRecommendation.executed, false))
    .orderBy(desc(actionRecommendation.recommendationDate))
}

/**
 * Create action recommendation
 */
export async function createActionRecommendation(recommendation: NewActionRecommendation) {
  const result = await db.insert(actionRecommendation).values(recommendation).returning()

  return result[0]
}

/**
 * Mark recommendation as executed
 */
export async function markRecommendationAsExecuted(
  id: number,
  selectedAction: Record<string, unknown>
) {
  const result = await db
    .update(actionRecommendation)
    .set({
      executed: true,
      executedAt: sql`now()`,
      selectedAction,
    })
    .where(eq(actionRecommendation.id, id))
    .returning()

  return result[0] || null
}

// ============================================
// APPSFLYER BRIDGE FUNCTIONS
// ============================================
// These functions bridge the evaluation system with real AppsFlyer cohort data
// replacing the mock_campaign_performance queries

/**
 * Aggregated campaign metrics from AppsFlyer cohort data
 */
export interface AggregatedCampaignMetrics {
  totalCostUsd: number
  totalRevenueUsd: number
  totalInstalls: number
  roas: number | null
  retention: number | null
  cohortCount: number
  installDateRange: { start: Date; end: Date }
}

/**
 * Operation cohort metrics for T+7 evaluation
 */
export interface OperationCohortMetrics {
  actualRoas7: number | null
  actualRet7: number | null
  totalCostUsd: number
  totalRevenueUsd: number
  totalInstalls: number
  cohortCount: number
  stageDays: number
}

/**
 * Get aggregated campaign metrics from AppsFlyer cohort data
 * Uses raw SQL for proper date handling and revenue calculation
 * Used by A3 campaign evaluator
 */
export async function getAggregatedCampaignMetrics(params: {
  campaign: string
  appId: string
  geo: string
  mediaSource: string
  installDateStart: Date
  installDateEnd: Date
  daysSinceInstall?: number
}): Promise<AggregatedCampaignMetrics> {
  const {
    campaign,
    appId,
    geo,
    mediaSource,
    installDateStart,
    installDateEnd,
    daysSinceInstall = 7,
  } = params

  // Convert dates to string format for SQL comparison
  const startDateStr = installDateStart.toISOString().split('T')[0]
  const endDateStr = installDateEnd.toISOString().split('T')[0]

  const result = await db.execute(sql`
    WITH cohort AS (
      SELECT
        install_date,
        SUM(CASE WHEN days_since_install = 0 THEN cost_usd ELSE 0 END) as cost_usd,
        SUM(CASE WHEN days_since_install = 0 THEN installs ELSE 0 END) as installs,
        SUM(CASE WHEN days_since_install <= ${daysSinceInstall} THEN total_revenue_usd ELSE 0 END) as revenue_usd,
        MAX(CASE WHEN days_since_install = ${daysSinceInstall} THEN retention_rate END) as retention_rate
      FROM af_cohort_metrics_daily
      WHERE campaign = ${campaign}
        AND app_id = ${appId}
        AND geo = ${geo}
        AND media_source = ${mediaSource}
        AND install_date >= ${startDateStr}
        AND install_date <= ${endDateStr}
      GROUP BY install_date
    )
    SELECT
      COALESCE(SUM(cost_usd), 0) as total_cost_usd,
      COALESCE(SUM(installs), 0) as total_installs,
      COALESCE(SUM(revenue_usd), 0) as total_revenue_usd,
      AVG(retention_rate) as avg_retention,
      COUNT(*) as cohort_count
    FROM cohort
  `)

  const row = result.rows[0] as Record<string, unknown> | undefined

  const totalCostUsd = Number(row?.total_cost_usd || 0)
  const totalRevenueUsd = Number(row?.total_revenue_usd || 0)
  const totalInstalls = Number(row?.total_installs || 0)
  const cohortCount = Number(row?.cohort_count || 0)
  const retention = row?.avg_retention !== undefined && row?.avg_retention !== null
    ? Number(row.avg_retention)
    : null

  const roas = totalCostUsd > 0 ? totalRevenueUsd / totalCostUsd : null

  return {
    totalCostUsd,
    totalRevenueUsd,
    totalInstalls,
    roas,
    retention,
    cohortCount,
    installDateRange: { start: installDateStart, end: installDateEnd },
  }
}

/**
 * Get cohort metrics for operation evaluation (T+7)
 * Used by A7 operation evaluator
 */
export async function getOperationCohortMetrics(params: {
  campaign: string
  operationDate: Date // T+0
  appId: string
  geo: string
  mediaSource: string
  daysSinceInstall?: number
}): Promise<OperationCohortMetrics | null> {
  const { campaign, operationDate, appId, geo, mediaSource, daysSinceInstall = 7 } = params

  // Cohort window: install dates from T+0 to T+6 (7 days of installs)
  const installDateStart = operationDate
  const installDateEnd = new Date(operationDate)
  installDateEnd.setDate(installDateEnd.getDate() + 6)

  // Check if we have D7 data for the latest cohort in window
  const today = new Date()
  const requiredDataDate = new Date(installDateEnd)
  requiredDataDate.setDate(requiredDataDate.getDate() + daysSinceInstall) // Dn for last cohort

  if (today < requiredDataDate) {
    // Not enough time elapsed for D7 evaluation
    return null
  }

  // Get aggregated metrics for the operation window
  const metrics = await getAggregatedCampaignMetrics({
    campaign,
    appId,
    geo,
    mediaSource,
    installDateStart,
    installDateEnd,
    daysSinceInstall,
  })

  if (metrics.cohortCount === 0) {
    return null
  }

  return {
    actualRoas7: metrics.roas,
    actualRet7: metrics.retention,
    totalCostUsd: metrics.totalCostUsd,
    totalRevenueUsd: metrics.totalRevenueUsd,
    totalInstalls: metrics.totalInstalls,
    cohortCount: metrics.cohortCount,
    stageDays: daysSinceInstall,
  }
}

/**
 * Get campaign list with their latest metrics from AppsFlyer
 * Uses raw SQL for proper date handling
 * Used to retrieve all campaigns for evaluation dashboard
 */
export async function getCampaignsFromAF(params: {
  appId?: string
  geo?: string
  mediaSource?: string
  installDateStart: Date
  installDateEnd: Date
}) {
  const { appId, geo, mediaSource, installDateStart, installDateEnd } = params

  // Convert dates to string format
  const startDateStr = installDateStart.toISOString().split('T')[0]
  const endDateStr = installDateEnd.toISOString().split('T')[0]

  // Build dynamic WHERE clause
  let whereClause = `days_since_install = 0 AND install_date >= '${startDateStr}' AND install_date <= '${endDateStr}'`
  if (appId) whereClause += ` AND app_id = '${appId}'`
  if (geo) whereClause += ` AND geo = '${geo}'`
  if (mediaSource) whereClause += ` AND media_source = '${mediaSource}'`

  const result = await db.execute(sql.raw(`
    SELECT
      campaign,
      app_id,
      geo,
      media_source,
      COALESCE(SUM(cost_usd), 0) as total_cost_usd,
      COALESCE(SUM(installs), 0) as total_installs,
      MAX(install_date) as latest_install_date
    FROM af_cohort_kpi_daily
    WHERE ${whereClause}
    GROUP BY campaign, app_id, geo, media_source
    ORDER BY MAX(install_date) DESC
  `))

  return result.rows.map((row: Record<string, unknown>) => ({
    campaign: String(row.campaign || ''),
    appId: String(row.app_id || ''),
    geo: String(row.geo || ''),
    mediaSource: String(row.media_source || ''),
    totalCostUsd: Number(row.total_cost_usd || 0),
    totalInstalls: Number(row.total_installs || 0),
    latestInstallDate: row.latest_install_date as Date,
  }))
}
