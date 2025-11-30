/**
 * A7: Operation Evaluator - TypeScript Wrapper
 *
 * Phase 5: Refactored to use real AppsFlyer cohort data.
 * The Python-based evaluation is kept for backward compatibility but deprecated.
 */

import { spawn } from 'child_process'
import path from 'path'
import { and, eq, gte, lte, sql } from 'drizzle-orm'
import { db } from '../../db'
import {
  campaigns,
  changeEvents,
  type ChangeEvent,
  type NewOperationScore,
} from '../../db/schema'
import {
  getOperationCohortMetrics,
  createOperationScore,
} from '../../db/queries-evaluation'
import { calculateBaselineRoas, calculateBaselineRetention } from '../../db/queries-appsflyer'
import { getOrCreateBaselineSettings } from './baseline-calculator'

// ============================================
// TYPE DEFINITIONS
// ============================================

export type ScoreStage = 'T+1' | 'T+3' | 'T+7'

export interface OperationStageResult {
  stage: ScoreStage
  stageDays: number
  baseScore: number | null
  finalScore: number | null
  minAchievement: number | null
  roasAchievement: number | null
  retentionAchievement: number | null
  riskLevel: 'danger' | 'warning' | 'observe' | 'healthy' | 'excellent' | null
  operationScoreId?: number
  dataStatus: 'complete' | 'pending' | 'missing'
  error?: string
}

export interface OperationEvaluationResult {
  operationId: number
  campaignId: string
  campaignName?: string
  optimizerEmail: string
  operationType: string
  operationDate: string
  stages: OperationStageResult[]
  dataSource?: 'appsflyer' | 'mock'
  context?: {
    appId: string
    geo: string
    mediaSource: string
    campaignKey: string
  }
}

export interface OptimizerStats {
  optimizer_email: string
  total_operations: number
  avg_roas_achievement: number
  avg_ret_achievement: number
  avg_min_achievement: number
  excellent_count: number
  excellent_rate: number
  good_count: number
  good_rate: number
  failed_count: number
  failed_rate: number
}

export interface LeaderboardResult {
  period_days: number
  start_date: string
  end_date: string
  total_optimizers: number
  leaderboard: OptimizerStats[]
  error?: string
  dataSource?: 'appsflyer' | 'mock'
}

export interface BatchEvaluationResult {
  success: boolean
  target_date: string
  total_operations: number
  success_count: number
  failed_count: number
  pending_count: number
  results: Array<{
    operation_id: number
    optimizer?: string
    stages?: OperationStageResult[]
    error?: string
    pending?: boolean
  }>
  error?: string
  dataSource?: 'appsflyer' | 'mock'
}

// ============================================
// HELPER FUNCTIONS
// ============================================

const STAGE_DAY_MAP: Record<ScoreStage, number> = {
  'T+1': 1,
  'T+3': 3,
  'T+7': 7,
}

const STAGE_FACTOR: Record<ScoreStage, number> = {
  'T+1': 0.5,
  'T+3': 0.8,
  'T+7': 1,
}

const DEFAULT_STAGES: ScoreStage[] = ['T+1', 'T+3', 'T+7']

function mapToBaseScore(achievement: number | null): number | null {
  if (achievement === null || Number.isNaN(achievement)) return null
  if (achievement < 0.6) return 0
  if (achievement < 0.85) return 40
  if (achievement < 1.0) return 60
  if (achievement < 1.1) return 80
  return 100
}

function getRiskLevel(
  achievement: number | null
): OperationStageResult['riskLevel'] {
  if (achievement === null || Number.isNaN(achievement)) return null
  if (achievement < 0.6) return 'danger'
  if (achievement < 0.85) return 'warning'
  if (achievement < 1.0) return 'observe'
  if (achievement < 1.1) return 'healthy'
  return 'excellent'
}

function mapSuggestionType(riskLevel: OperationStageResult['riskLevel']): string | null {
  switch (riskLevel) {
    case 'danger':
      return 'stop'
    case 'warning':
      return 'shrink'
    case 'observe':
      return 'observe'
    case 'healthy':
    case 'excellent':
      return 'expand'
    default:
      return null
  }
}

function classifyOperationMagnitude(changePercentage: number | null | undefined) {
  if (changePercentage === null || changePercentage === undefined) return { magnitude: null, label: null }
  const absChange = Math.abs(changePercentage)
  if (absChange <= 0.05) return { magnitude: absChange, label: '微调' }
  if (absChange <= 0.2) return { magnitude: absChange, label: '常规调整' }
  return { magnitude: absChange, label: '大胆操作' }
}

// ============================================
// APPSFLYER-BASED EVALUATION (PRIMARY)
// ============================================
interface OperationContext {
  changeEvent: ChangeEvent
  campaignId: string
  campaignName?: string
  appId: string
  geo: string
  mediaSource: string
  campaignKey: string
}

async function pickAfContext(campaignIdentifiers: string[]): Promise<{
  appId: string
  geo: string
  mediaSource: string
  campaignKey: string
} | null> {
  for (const identifier of campaignIdentifiers) {
    const res = await db.execute(sql`
      SELECT app_id, geo, media_source, SUM(installs) AS installs
      FROM af_cohort_kpi_daily
      WHERE campaign = ${identifier} AND days_since_install = 0
      GROUP BY app_id, geo, media_source
      ORDER BY SUM(installs) DESC
      LIMIT 1
    `)

    const row = res.rows[0] as Record<string, unknown> | undefined
    if (row) {
      return {
        appId: String(row.app_id),
        geo: String(row.geo),
        mediaSource: String(row.media_source),
        campaignKey: identifier,
      }
    }
  }
  return null
}

async function resolveOperationContext(operationId: number): Promise<OperationContext> {
  const [operation] = await db
    .select()
    .from(changeEvents)
    .where(eq(changeEvents.id, operationId))
    .limit(1)

  if (!operation) {
    throw new Error(`Operation ${operationId} not found`)
  }

  const campaignId = operation.campaign || operation.resourceName

  let campaignName: string | undefined
  if (campaignId) {
    const campaignRow = await db
      .select({ name: campaigns.name })
      .from(campaigns)
      .where(and(eq(campaigns.accountId, operation.accountId), eq(campaigns.resourceName, campaignId)))
      .limit(1)

    campaignName = campaignRow[0]?.name || undefined
  }

  const campaignIdentifiers = [campaignId, campaignName].filter(Boolean) as string[]
  const afContext = await pickAfContext(campaignIdentifiers)

  const fallbackAppId = process.env.AF_APP_ID
  const fallbackGeo = process.env.AF_DEFAULT_GEO
  const fallbackMediaSource = process.env.AF_DEFAULT_MEDIA_SOURCE

  const appId = afContext?.appId || fallbackAppId
  const geo = afContext?.geo || fallbackGeo
  const mediaSource = afContext?.mediaSource || fallbackMediaSource
  const campaignKey = afContext?.campaignKey || campaignIdentifiers[0]

  if (!appId || !geo || !mediaSource || !campaignKey) {
    throw new Error('Missing AppsFlyer context for operation scoring')
  }

  return {
    changeEvent: operation,
    campaignId,
    campaignName,
    appId,
    geo,
    mediaSource,
    campaignKey,
  }
}

async function evaluateStage(params: {
  context: OperationContext
  stage: ScoreStage
  baselineDays: number
}): Promise<OperationStageResult & { operationScoreId?: number }> {
  const { context, stage, baselineDays } = params
  const stageDays = STAGE_DAY_MAP[stage]

  const operationDate = new Date(context.changeEvent.timestamp)

  const metrics = await getOperationCohortMetrics({
    campaign: context.campaignKey,
    operationDate,
    appId: context.appId,
    geo: context.geo,
    mediaSource: context.mediaSource,
    daysSinceInstall: stageDays,
  })

  if (!metrics) {
    return {
      stage,
      stageDays,
      baseScore: null,
      finalScore: null,
      minAchievement: null,
      roasAchievement: null,
      retentionAchievement: null,
      riskLevel: null,
      dataStatus: 'pending',
      error: 'Insufficient cohort data for this stage',
    }
  }

  const [baselineRoas, baselineRet] = await Promise.all([
    calculateBaselineRoas({
      appId: context.appId,
      geo: context.geo,
      mediaSource: context.mediaSource,
      baselineDays,
      daysSinceInstall: stageDays,
    }),
    calculateBaselineRetention({
      appId: context.appId,
      geo: context.geo,
      mediaSource: context.mediaSource,
      daysSinceInstall: stageDays,
      baselineDays,
    }),
  ])

  const roasAchievement = baselineRoas && baselineRoas > 0 && metrics.actualRoas7 !== null
    ? metrics.actualRoas7 / baselineRoas
    : null

  const retentionAchievement = baselineRet && baselineRet > 0 && metrics.actualRet7 !== null
    ? metrics.actualRet7 / baselineRet
    : null

  const minAchievement = [roasAchievement, retentionAchievement]
    .filter((v): v is number => v !== null && !Number.isNaN(v))
    .reduce<number | null>((acc, curr) => {
      if (acc === null) return curr
      return Math.min(acc, curr)
    }, null)

  const baseScore = mapToBaseScore(minAchievement)
  const stageFactor = STAGE_FACTOR[stage]
  const finalScore = baseScore !== null ? baseScore * stageFactor : null
  const riskLevel = getRiskLevel(minAchievement)
  const suggestionType = mapSuggestionType(riskLevel)

  // Operation magnitude (optional)
  const changePct = (
    context.changeEvent.fieldChanges as Record<string, unknown> | null | undefined
  )?.change_percentage as number | undefined
  const operationMagnitude = classifyOperationMagnitude(changePct ?? null)

  // Score date = operation date + stageDays
  const evaluationDate = new Date(operationDate)
  evaluationDate.setDate(evaluationDate.getDate() + stageDays)

  let savedScoreId: number | undefined
  const shouldPersist = metrics !== null && baseScore !== null

  if (shouldPersist) {
    const payload: NewOperationScore = {
      operationId: context.changeEvent.id,
      campaignId: context.campaignId,
      optimizerEmail: context.changeEvent.userEmail,
      operationType: context.changeEvent.operationType,
      operationDate: operationDate.toISOString().split('T')[0],
      evaluationDate: evaluationDate.toISOString().split('T')[0],
      scoreStage: stage,
      stageFactor: stageFactor.toString(),
      actualRoas: metrics.actualRoas7 !== null ? metrics.actualRoas7.toString() : null,
      actualRet: metrics.actualRet7 !== null ? metrics.actualRet7.toString() : null,
      baselineRoas: baselineRoas !== null && baselineRoas !== undefined ? baselineRoas.toString() : null,
      baselineRet: baselineRet !== null && baselineRet !== undefined ? baselineRet.toString() : null,
      roasAchievement: roasAchievement !== null ? roasAchievement.toString() : null,
      retentionAchievement: retentionAchievement !== null ? retentionAchievement.toString() : null,
      minAchievement: minAchievement !== null ? minAchievement.toString() : null,
      roasAchievementRate: roasAchievement !== null ? (roasAchievement * 100).toString() : null,
      retAchievementRate: retentionAchievement !== null ? (retentionAchievement * 100).toString() : null,
      riskLevel,
      baseScore,
      finalScore: finalScore !== null ? Number(finalScore).toFixed(2) : null,
      valueBefore: null,
      valueAfter: null,
      changePercentage: changePct !== undefined && changePct !== null ? changePct.toString() : null,
      operationMagnitude: operationMagnitude.magnitude !== null ? operationMagnitude.magnitude.toString() : null,
      operationTypeLabel: operationMagnitude.label,
      isBoldSuccess: baseScore !== null && baseScore >= 80 && (operationMagnitude.magnitude || 0) > 0.2,
      specialRecognition:
        baseScore !== null && baseScore >= 80 && (operationMagnitude.magnitude || 0) > 0.2
          ? '🌟 大胆创新奖'
          : baseScore !== null && baseScore >= 80 && (operationMagnitude.magnitude || 0) <= 0.05
            ? '🎯 精准调优奖'
            : baseScore !== null && baseScore >= 100
              ? '🏆 卓越表现奖'
              : null,
      suggestionType,
      suggestionDetail: suggestionType ? `Auto-suggest: ${suggestionType}` : null,

      // Legacy columns for compatibility
      actualRoas7: metrics.actualRoas7 !== null ? metrics.actualRoas7.toString() : null,
      actualRet7: metrics.actualRet7 !== null ? metrics.actualRet7.toString() : null,
      baselineRoas7: baselineRoas !== null && baselineRoas !== undefined ? baselineRoas.toString() : null,
      baselineRet7: baselineRet !== null && baselineRet !== undefined ? baselineRet.toString() : null,
    }

    const saved = await createOperationScore(payload)
    savedScoreId = saved?.id
  }

  return {
    stage,
    stageDays,
    baseScore,
    finalScore,
    minAchievement,
    roasAchievement,
    retentionAchievement,
    riskLevel,
    operationScoreId: savedScoreId,
    dataStatus: baseScore === null ? 'missing' : 'complete',
    error:
      baseScore === null
        ? 'Baseline missing or insufficient to compute score'
        : undefined,
  }
}

export async function evaluateOperationFromAF(params: {
  operationId: number
  stages?: ScoreStage[]
}): Promise<OperationEvaluationResult> {
  const { operationId, stages = DEFAULT_STAGES } = params

  try {
    const context = await resolveOperationContext(operationId)
    const baselineSettings = await getOrCreateBaselineSettings({
      appId: context.appId,
      geo: context.geo,
      mediaSource: context.mediaSource,
    })

    const stageResults: OperationStageResult[] = []

    for (const stage of stages) {
      const result = await evaluateStage({
        context,
        stage,
        baselineDays: baselineSettings.baselineDays,
      })
      stageResults.push(result)
    }

    // Update change_events.operation_scores for quick lookup
    await db
      .update(changeEvents)
      .set({
        operationScores: stageResults.map((stage) => ({
          stage: stage.stage,
          finalScore: stage.finalScore,
          baseScore: stage.baseScore,
          minAchievement: stage.minAchievement,
          riskLevel: stage.riskLevel,
          operationScoreId: stage.operationScoreId,
          dataStatus: stage.dataStatus,
          error: stage.error,
        })),
      })
      .where(eq(changeEvents.id, operationId))

    return {
      operationId,
      campaignId: context.campaignId,
      campaignName: context.campaignName,
      optimizerEmail: context.changeEvent.userEmail,
      operationType: context.changeEvent.operationType,
      operationDate: new Date(context.changeEvent.timestamp).toISOString().split('T')[0],
      stages: stageResults,
      dataSource: 'appsflyer',
      context: {
        appId: context.appId,
        geo: context.geo,
        mediaSource: context.mediaSource,
        campaignKey: context.campaignKey,
      },
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return {
      operationId,
      campaignId: '',
      optimizerEmail: '',
      operationType: '',
      operationDate: '',
      stages: [
        {
          stage: 'T+7',
          stageDays: 7,
          baseScore: null,
          finalScore: null,
          minAchievement: null,
          roasAchievement: null,
          retentionAchievement: null,
          riskLevel: null,
          dataStatus: 'missing',
          error: message,
        },
      ],
      dataSource: 'appsflyer',
    }
  }
}

/**
 * Batch evaluate all operations from 7 days ago using AppsFlyer data
 *
 * This should be run daily to evaluate operations that were made 7 days ago.
 * Requires change_events table to track operations.
 *
 * NOTE: Current change_events schema doesn't have appId/geo/mediaSource fields.
 * This function is designed for future use when change_events is extended with
 * AppsFlyer-related fields. Currently returns empty results with a note.
 *
 * @param targetDate - The date to evaluate operations for (default: 7 days ago)
 * @returns Batch evaluation summary
 */
export async function evaluateOperations7DaysAgoFromAF(
  targetDate?: Date
): Promise<BatchEvaluationResult> {
  // Target date is 7 days ago by default
  const target = targetDate || new Date()
  if (!targetDate) {
    target.setDate(target.getDate() - 7)
  }

  // Get operations from the target date using timestamp field
  const startOfDay = new Date(target)
  startOfDay.setHours(0, 0, 0, 0)
  const endOfDay = new Date(target)
  endOfDay.setHours(23, 59, 59, 999)

  try {
    const operations = await db
      .select()
      .from(changeEvents)
      .where(
        and(
          gte(changeEvents.timestamp, startOfDay),
          lte(changeEvents.timestamp, endOfDay),
          eq(changeEvents.resourceType, 'campaign')
        )
      )

    const results: BatchEvaluationResult['results'] = []
    let successCount = 0
    let failedCount = 0
    let pendingCount = 0

    for (const op of operations) {
      const evaluation = await evaluateOperationFromAF({ operationId: op.id, stages: ['T+7'] })
      const stage = evaluation.stages[0]

      if (stage.dataStatus === 'complete') {
        successCount++
      } else if (stage.dataStatus === 'pending') {
        pendingCount++
      } else {
        failedCount++
      }

      results.push({
        operation_id: op.id,
        optimizer: op.userEmail,
        stages: evaluation.stages,
        error: stage.error,
        pending: stage.dataStatus === 'pending',
      })
    }

    return {
      success: failedCount === 0,
      target_date: target.toISOString().split('T')[0],
      total_operations: operations.length,
      success_count: successCount,
      failed_count: failedCount,
      pending_count: pendingCount,
      results,
      dataSource: 'appsflyer',
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return {
      success: false,
      target_date: target.toISOString().split('T')[0],
      total_operations: 0,
      success_count: 0,
      failed_count: 0,
      pending_count: 0,
      results: [],
      error: `Batch evaluation failed: ${errorMessage}`,
      dataSource: 'appsflyer',
    }
  }
}

// ============================================
// LEGACY PYTHON-BASED FUNCTIONS (DEPRECATED)
// ============================================

/**
 * Run Python script and return parsed JSON output
 *
 * @deprecated Use evaluateOperationFromAF instead
 */
async function runPythonScript<T>(scriptName: string, input: Record<string, unknown>): Promise<T> {
  console.warn(
    '[DEPRECATED] Using Python-based operation evaluation. Switch to evaluateOperationFromAF for real AppsFlyer data.'
  )

  return new Promise((resolve, reject) => {
    const scriptPath = path.join(process.cwd(), 'server', 'evaluation', 'python', scriptName)

    const pythonProcess = spawn('python3', [scriptPath])

    let stdoutData = ''
    let stderrData = ''

    pythonProcess.stdout.on('data', (data) => {
      stdoutData += data.toString()
    })

    pythonProcess.stderr.on('data', (data) => {
      stderrData += data.toString()
    })

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Python script exited with code ${code}\nStderr: ${stderrData}`))
        return
      }

      try {
        const result = JSON.parse(stdoutData)
        resolve(result)
      } catch (error) {
        reject(
          new Error(
            `Failed to parse Python output: ${error}\nOutput: ${stdoutData}\nStderr: ${stderrData}`
          )
        )
      }
    })

    pythonProcess.on('error', (error) => {
      reject(new Error(`Failed to start Python process: ${error.message}`))
    })

    pythonProcess.stdin.write(JSON.stringify(input))
    pythonProcess.stdin.end()
  })
}

/**
 * Evaluate an operation 7 days after execution
 *
 * @deprecated Use evaluateOperationFromAF instead. This function uses mock data via Python.
 *
 * Calculates ROAS7/RET7 achievement rates 7 days post-operation and scores it.
 *
 * @param operationId - Operation ID from change_events table
 * @returns Operation evaluation result with score
 */
export async function evaluateOperation(operationId: number): Promise<OperationEvaluationResult> {
  console.warn(
    '[DEPRECATED] evaluateOperation uses mock data. Use evaluateOperationFromAF instead.'
  )

  return evaluateOperationFromAF({ operationId })
}

/**
 * Get optimizer leaderboard
 *
 * @deprecated Use getOptimizerLeaderboardFromDb instead.
 *
 * Returns ranked list of optimizers based on their operation performance
 *
 * @param days - Look back period in days (default: 30)
 * @param limit - Maximum number of optimizers to return (default: 20)
 * @returns Leaderboard with optimizer statistics
 */
export async function getOptimizerLeaderboard(
  days: number = 30,
  limit: number = 20
): Promise<LeaderboardResult> {
  console.warn(
    '[DEPRECATED] getOptimizerLeaderboard uses mock data. Use getOptimizerLeaderboardFromDb instead.'
  )

  const input = {
    action: 'leaderboard',
    days,
    limit,
  }

  const result = await runPythonScript<LeaderboardResult>('operation_evaluator.py', input)
  return { ...result, dataSource: 'mock' }
}

/**
 * Batch evaluate all operations from 7 days ago
 *
 * @deprecated Use evaluateOperations7DaysAgoFromAF instead. This function uses mock data via Python.
 *
 * This should be run daily to evaluate operations that were made 7 days ago.
 *
 * @returns Batch evaluation summary
 */
export async function evaluateOperations7DaysAgo(): Promise<BatchEvaluationResult> {
  console.warn(
    '[DEPRECATED] evaluateOperations7DaysAgo uses mock data. Use evaluateOperations7DaysAgoFromAF instead.'
  )

  const input = {
    action: 'evaluate_7days_ago',
  }

  const result = await runPythonScript<BatchEvaluationResult>('operation_evaluator.py', input)
  return { ...result, dataSource: 'mock', pending_count: 0 }
}

/**
 * Re-export database functions for direct access
 */
export {
  getOperationScores,
  getOptimizerLeaderboard as getOptimizerLeaderboardFromDb,
} from '../../db/queries-evaluation'
