/**
 * A7: Operation Evaluator - TypeScript Wrapper
 *
 * Phase 5: Refactored to use real AppsFlyer cohort data.
 * The Python-based evaluation is kept for backward compatibility but deprecated.
 */

import { spawn } from 'child_process'
import path from 'path'
import {
  getOperationCohortMetrics,
  getSafetyBaseline,
  createOperationScore,
} from '../../db/queries-evaluation'
import { calculateBaselineFromAF } from './baseline-calculator'

// ============================================
// TYPE DEFINITIONS
// ============================================

export type OperationScore = '优秀' | '合格' | '失败'

export interface OperationEvaluationResult {
  operation_id: number
  campaign_id: string
  campaign_name: string
  optimizer_email: string
  operation_type: string
  operation_date: string
  evaluation_date: string
  actual_roas7: number | null
  actual_ret7: number | null
  baseline_roas7: number | null
  baseline_ret7: number | null
  roas_achievement_rate: number | null
  ret_achievement_rate: number | null
  min_achievement_rate: number | null
  score: OperationScore
  error?: string
  dataSource?: 'appsflyer' | 'mock'
  dataIncomplete?: boolean
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
    score?: string
    min_achievement_rate?: number
    error?: string
    pending?: boolean
  }>
  error?: string
  dataSource?: 'appsflyer' | 'mock'
}

export interface EvaluateOperationFromAFParams {
  operationId: number
  campaign: string
  optimizerEmail: string
  operationType: string
  operationDate: Date
  appId: string
  geo: string
  mediaSource: string
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Map achievement rate to operation score
 * Per PRD: ≥110% = 优秀, ≥85% = 合格, <85% = 失败
 */
function mapAchievementToScore(rate: number | null): OperationScore {
  if (rate === null) return '合格' // Default to qualified if no data
  if (rate >= 110) return '优秀'
  if (rate >= 85) return '合格'
  return '失败'
}

// ============================================
// APPSFLYER-BASED EVALUATION (PRIMARY)
// ============================================

/**
 * Evaluate an operation using real AppsFlyer cohort data (T+7 evaluation)
 *
 * This is the primary function for Phase 5+, replacing mock data.
 * Evaluates operations 7 days after execution based on cohort performance.
 *
 * @param params - Operation evaluation parameters
 * @returns Operation evaluation result with score
 *
 * @example
 * ```typescript
 * const result = await evaluateOperationFromAF({
 *   operationId: 12345,
 *   campaign: "my_campaign",
 *   optimizerEmail: "optimizer@company.com",
 *   operationType: "bid_adjustment",
 *   operationDate: new Date("2024-01-15"),
 *   appId: "id123456789",
 *   geo: "US",
 *   mediaSource: "googleadwords_int",
 * });
 * console.log(`Score: ${result.score}`);
 * ```
 */
export async function evaluateOperationFromAF(
  params: EvaluateOperationFromAFParams
): Promise<OperationEvaluationResult> {
  const {
    operationId,
    campaign,
    optimizerEmail,
    operationType,
    operationDate,
    appId,
    geo,
    mediaSource,
  } = params

  const evaluationDate = new Date()

  try {
    // Get cohort metrics for the operation window (T+0 to T+6, evaluated at T+7)
    const metrics = await getOperationCohortMetrics({
      campaign,
      operationDate,
      appId,
      geo,
      mediaSource,
    })

    // Check if we have enough time for D7 evaluation
    if (metrics === null) {
      // Not enough time elapsed or no data
      const daysElapsed = Math.floor(
        (evaluationDate.getTime() - operationDate.getTime()) / (1000 * 60 * 60 * 24)
      )

      if (daysElapsed < 14) {
        // Need at least 14 days (7 days install window + 7 days maturation)
        return {
          operation_id: operationId,
          campaign_id: campaign,
          campaign_name: campaign,
          optimizer_email: optimizerEmail,
          operation_type: operationType,
          operation_date: operationDate.toISOString().split('T')[0],
          evaluation_date: evaluationDate.toISOString().split('T')[0],
          actual_roas7: null,
          actual_ret7: null,
          baseline_roas7: null,
          baseline_ret7: null,
          roas_achievement_rate: null,
          ret_achievement_rate: null,
          min_achievement_rate: null,
          score: '合格',
          dataSource: 'appsflyer',
          dataIncomplete: true,
          error: `Need ${14 - daysElapsed} more days for D7 evaluation`,
        }
      }

      // Enough time but no data
      return {
        operation_id: operationId,
        campaign_id: campaign,
        campaign_name: campaign,
        optimizer_email: optimizerEmail,
        operation_type: operationType,
        operation_date: operationDate.toISOString().split('T')[0],
        evaluation_date: evaluationDate.toISOString().split('T')[0],
        actual_roas7: null,
        actual_ret7: null,
        baseline_roas7: null,
        baseline_ret7: null,
        roas_achievement_rate: null,
        ret_achievement_rate: null,
        min_achievement_rate: null,
        score: '合格',
        dataSource: 'appsflyer',
        dataIncomplete: true,
        error: 'No cohort data for operation window',
      }
    }

    // Get or calculate baseline
    let baseline = await getSafetyBaseline({
      productName: appId,
      countryCode: geo,
      platform: 'AppsFlyer',
      channel: mediaSource,
    })

    if (!baseline) {
      const baselineResult = await calculateBaselineFromAF({ appId, geo, mediaSource })
      if (baselineResult.hasData) {
        baseline = {
          id: 0,
          productName: appId,
          countryCode: geo,
          platform: 'AppsFlyer',
          channel: mediaSource,
          baselineRoas7: baselineResult.baseline_roas7?.toString() || null,
          baselineRet7: baselineResult.baseline_ret7?.toString() || null,
          referencePeriod: baselineResult.reference_period,
          lastUpdated: new Date(),
        }
      }
    }

    const baselineRoas7 = baseline?.baselineRoas7 ? parseFloat(baseline.baselineRoas7) : null
    const baselineRet7 = baseline?.baselineRet7 ? parseFloat(baseline.baselineRet7) : null

    // Calculate achievement rates
    let roasAchievementRate: number | null = null
    let retAchievementRate: number | null = null

    if (metrics.actualRoas7 !== null && baselineRoas7 && baselineRoas7 > 0) {
      roasAchievementRate = (metrics.actualRoas7 / baselineRoas7) * 100
    }

    if (metrics.actualRet7 !== null && baselineRet7 && baselineRet7 > 0) {
      retAchievementRate = (metrics.actualRet7 / baselineRet7) * 100
    }

    // Min achievement rate
    let minAchievementRate: number | null = null
    if (roasAchievementRate !== null && retAchievementRate !== null) {
      minAchievementRate = Math.min(roasAchievementRate, retAchievementRate)
    } else if (roasAchievementRate !== null) {
      minAchievementRate = roasAchievementRate
    } else if (retAchievementRate !== null) {
      minAchievementRate = retAchievementRate
    }

    // Determine score
    const score = mapAchievementToScore(minAchievementRate)

    // Store operation score (note: score is derived, not stored in DB)
    if (minAchievementRate !== null) {
      await createOperationScore({
        operationId,
        optimizerEmail,
        campaignId: campaign,
        operationType,
        operationDate: operationDate.toISOString().split('T')[0],
        evaluationDate: evaluationDate.toISOString().split('T')[0],
        actualRoas7: metrics.actualRoas7?.toString() || null,
        actualRet7: metrics.actualRet7?.toString() || null,
        roasAchievementRate: roasAchievementRate?.toString() || null,
        retAchievementRate: retAchievementRate?.toString() || null,
      })
    }

    return {
      operation_id: operationId,
      campaign_id: campaign,
      campaign_name: campaign,
      optimizer_email: optimizerEmail,
      operation_type: operationType,
      operation_date: operationDate.toISOString().split('T')[0],
      evaluation_date: evaluationDate.toISOString().split('T')[0],
      actual_roas7: metrics.actualRoas7,
      actual_ret7: metrics.actualRet7,
      baseline_roas7: baselineRoas7,
      baseline_ret7: baselineRet7,
      roas_achievement_rate: roasAchievementRate,
      ret_achievement_rate: retAchievementRate,
      min_achievement_rate: minAchievementRate,
      score,
      dataSource: 'appsflyer',
      dataIncomplete: false,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return {
      operation_id: operationId,
      campaign_id: campaign,
      campaign_name: campaign,
      optimizer_email: optimizerEmail,
      operation_type: operationType,
      operation_date: operationDate.toISOString().split('T')[0],
      evaluation_date: evaluationDate.toISOString().split('T')[0],
      actual_roas7: null,
      actual_ret7: null,
      baseline_roas7: null,
      baseline_ret7: null,
      roas_achievement_rate: null,
      ret_achievement_rate: null,
      min_achievement_rate: null,
      score: '合格',
      error: errorMessage,
      dataSource: 'appsflyer',
      dataIncomplete: true,
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
  // Import dynamically to avoid circular dependency
  const { db } = await import('../../db/index')
  const { changeEvents } = await import('../../db/schema')
  const { and, gte, lte } = await import('drizzle-orm')

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
    // Query change_events for operations on target date
    const operations = await db
      .select()
      .from(changeEvents)
      .where(and(gte(changeEvents.timestamp, startOfDay), lte(changeEvents.timestamp, endOfDay)))

    const results: BatchEvaluationResult['results'] = []
    let successCount = 0
    let failedCount = 0
    let pendingCount = 0

    // NOTE: Current change_events schema lacks appId/geo/mediaSource fields
    // which are required for AppsFlyer cohort matching.
    // All operations will be marked as skipped until schema is extended.
    for (const op of operations) {
      // Current change_events doesn't have AppsFlyer fields
      // Skip with informative message
      results.push({
        operation_id: op.id,
        optimizer: op.userEmail,
        error: 'AppsFlyer fields (appId, geo, mediaSource) not available in change_events',
      })
      failedCount++
    }

    return {
      success: operations.length === 0, // Success if no operations to process
      target_date: target.toISOString().split('T')[0],
      total_operations: operations.length,
      success_count: successCount,
      failed_count: failedCount,
      pending_count: pendingCount,
      results,
      dataSource: 'appsflyer',
      error:
        operations.length > 0
          ? 'change_events table needs appId, geo, mediaSource fields for AppsFlyer integration'
          : undefined,
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

  const input = {
    action: 'evaluate',
    operationId,
  }

  const result = await runPythonScript<OperationEvaluationResult>('operation_evaluator.py', input)
  return { ...result, dataSource: 'mock' }
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
