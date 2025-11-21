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
} from './schema'
import { and, desc, eq, sql } from 'drizzle-orm'

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
  page?: number
  pageSize?: number
}) {
  const { optimizerEmail, campaignId, page = 1, pageSize = 50 } = params

  const conditions = []
  if (optimizerEmail) {
    conditions.push(eq(operationScore.optimizerEmail, optimizerEmail))
  }
  if (campaignId) {
    conditions.push(eq(operationScore.campaignId, campaignId))
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

  return {
    data,
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
  const result = await db.insert(operationScore).values(score).returning()

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
