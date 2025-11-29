/**
 * A3: Campaign Evaluator - TypeScript Wrapper
 *
 * Phase 5: Refactored to use real AppsFlyer cohort data.
 * The Python-based evaluation is kept for backward compatibility but deprecated.
 */

import { spawn } from 'child_process'
import path from 'path'
import {
  getAggregatedCampaignMetrics,
  getCampaignsFromAF,
} from '../../db/queries-evaluation'
import { getSafetyBaseline, createCampaignEvaluation } from '../../db/queries-evaluation'
import { calculateBaselineFromAF, getOrCreateBaselineSettings } from './baseline-calculator'

// ============================================
// TYPE DEFINITIONS
// ============================================

export type CampaignStatus = 'danger' | 'warning' | 'observation' | 'healthy' | 'excellent'

export interface CampaignEvaluationResult {
  campaign_id: string
  campaign_name: string
  campaign_type: 'test' | 'mature'
  total_spend: number
  actual_roas7: number | null
  actual_ret7: number | null
  baseline_roas7: number | null
  baseline_ret7: number | null
  roas_achievement_rate: number | null
  ret_achievement_rate: number | null
  min_achievement_rate: number | null
  recommendation_type: string
  recommendation_desc: string
  status: CampaignStatus
  action_options: ActionOption[]
  error?: string
  dataSource?: 'appsflyer' | 'mock'
  hasData?: boolean
}

export interface ActionOption {
  type: string
  label: string
  options: Array<{
    value: string
    description: string
  }>
}

export interface BatchEvaluationResult {
  success: boolean
  evaluation_date: string
  total_campaigns: number
  success_count: number
  failed_count: number
  status_summary: {
    danger: number
    warning: number
    observation: number
    healthy: number
    excellent: number
  }
  results: Array<{
    campaign_id: string
    status?: string
    min_achievement_rate?: number
    recommendation?: string
    error?: string
  }>
  error?: string
  dataSource?: 'appsflyer' | 'mock'
}

export interface EvaluateCampaignFromAFParams {
  campaign: string
  appId: string
  geo: string
  mediaSource: string
  evaluationDate?: Date
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Map achievement rate to campaign status
 * Per PRD thresholds
 */
function mapAchievementToStatus(rate: number | null): CampaignStatus {
  if (rate === null) return 'observation'
  if (rate >= 110) return 'excellent'
  if (rate >= 100) return 'healthy'
  if (rate >= 85) return 'observation'
  if (rate >= 60) return 'warning'
  return 'danger'
}

/**
 * Map status to recommendation
 */
function mapStatusToRecommendation(status: CampaignStatus): {
  type: string
  desc: string
  options: ActionOption[]
} {
  switch (status) {
    case 'excellent':
      return {
        type: 'scale_up',
        desc: 'Campaign performing exceptionally well. Consider scaling budget.',
        options: [
          {
            type: 'budget',
            label: 'Budget Adjustment',
            options: [
              { value: 'increase_20', description: 'Increase budget by 20%' },
              { value: 'increase_50', description: 'Increase budget by 50%' },
              { value: 'maintain', description: 'Maintain current budget' },
            ],
          },
        ],
      }
    case 'healthy':
      return {
        type: 'maintain',
        desc: 'Campaign performing at baseline. Monitor and maintain.',
        options: [
          {
            type: 'monitoring',
            label: 'Monitoring Strategy',
            options: [
              { value: 'weekly_review', description: 'Weekly performance review' },
              { value: 'maintain', description: 'Maintain current strategy' },
            ],
          },
        ],
      }
    case 'observation':
      return {
        type: 'observe',
        desc: 'Campaign slightly below baseline. Watch closely.',
        options: [
          {
            type: 'adjustment',
            label: 'Adjustment Options',
            options: [
              { value: 'optimize_creative', description: 'Optimize creatives' },
              { value: 'adjust_targeting', description: 'Adjust targeting' },
              { value: 'wait', description: 'Wait for more data' },
            ],
          },
        ],
      }
    case 'warning':
      return {
        type: 'optimize',
        desc: 'Campaign underperforming. Optimization required.',
        options: [
          {
            type: 'action',
            label: 'Recommended Actions',
            options: [
              { value: 'reduce_budget', description: 'Reduce budget by 30%' },
              { value: 'pause_creatives', description: 'Pause poor creatives' },
              { value: 'revise_strategy', description: 'Revise campaign strategy' },
            ],
          },
        ],
      }
    case 'danger':
      return {
        type: 'urgent_action',
        desc: 'Campaign critically underperforming. Immediate action required.',
        options: [
          {
            type: 'action',
            label: 'Urgent Actions',
            options: [
              { value: 'pause_campaign', description: 'Pause campaign' },
              { value: 'reduce_budget_50', description: 'Reduce budget by 50%' },
              { value: 'complete_review', description: 'Complete strategy review' },
            ],
          },
        ],
      }
  }
}

// ============================================
// APPSFLYER-BASED EVALUATION (PRIMARY)
// ============================================

/**
 * Evaluate a campaign using real AppsFlyer cohort data
 *
 * This is the primary function for Phase 5+, replacing mock data.
 *
 * @param params - Campaign evaluation parameters
 * @returns Campaign evaluation result with recommendations
 *
 * @example
 * ```typescript
 * const result = await evaluateCampaignFromAF({
 *   campaign: "my_campaign_name",
 *   appId: "id123456789",
 *   geo: "US",
 *   mediaSource: "googleadwords_int",
 * });
 * if (result.status === "danger") {
 *   console.log("Campaign needs attention!");
 * }
 * ```
 */
export async function evaluateCampaignFromAF(
  params: EvaluateCampaignFromAFParams
): Promise<CampaignEvaluationResult> {
  const { campaign, appId, geo, mediaSource, evaluationDate = new Date() } = params

  try {
    // Get cohort metrics for recent install dates (last 7 days of installs)
    const endDate = evaluationDate
    const startDate = new Date(evaluationDate)
    startDate.setDate(startDate.getDate() - 7)

    const metrics = await getAggregatedCampaignMetrics({
      campaign,
      appId,
      geo,
      mediaSource,
      installDateStart: startDate,
      installDateEnd: endDate,
    })

    // Get or calculate baseline
    let baseline = await getSafetyBaseline({
      productName: appId,
      countryCode: geo,
      platform: 'AppsFlyer',
      channel: mediaSource,
    })

    if (!baseline) {
      // Calculate baseline if not exists
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

    if (metrics.roas !== null && baselineRoas7 && baselineRoas7 > 0) {
      roasAchievementRate = (metrics.roas / baselineRoas7) * 100
    }

    if (metrics.retention !== null && baselineRet7 && baselineRet7 > 0) {
      retAchievementRate = (metrics.retention / baselineRet7) * 100
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

    // Determine status and recommendation
    const status = mapAchievementToStatus(minAchievementRate)
    const recommendation = mapStatusToRecommendation(status)

    // Determine campaign type (mature if > 30 days of data)
    const campaignType = metrics.cohortCount >= 30 ? 'mature' : 'test'

    // Store evaluation result
    if (minAchievementRate !== null) {
      await createCampaignEvaluation({
        campaignId: campaign,
        evaluationDate: evaluationDate.toISOString().split('T')[0],
        actualRoas7: metrics.roas?.toString() || null,
        actualRet7: metrics.retention?.toString() || null,
        roasAchievementRate: roasAchievementRate?.toString() || null,
        retAchievementRate: retAchievementRate?.toString() || null,
        minAchievementRate: minAchievementRate?.toString() || null,
        status,
        recommendationType: recommendation.type,
      })
    }

    return {
      campaign_id: campaign,
      campaign_name: campaign,
      campaign_type: campaignType,
      total_spend: metrics.totalCostUsd,
      actual_roas7: metrics.roas,
      actual_ret7: metrics.retention,
      baseline_roas7: baselineRoas7,
      baseline_ret7: baselineRet7,
      roas_achievement_rate: roasAchievementRate,
      ret_achievement_rate: retAchievementRate,
      min_achievement_rate: minAchievementRate,
      recommendation_type: recommendation.type,
      recommendation_desc: recommendation.desc,
      status,
      action_options: recommendation.options,
      dataSource: 'appsflyer',
      hasData: metrics.cohortCount > 0,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return {
      campaign_id: campaign,
      campaign_name: campaign,
      campaign_type: 'test',
      total_spend: 0,
      actual_roas7: null,
      actual_ret7: null,
      baseline_roas7: null,
      baseline_ret7: null,
      roas_achievement_rate: null,
      ret_achievement_rate: null,
      min_achievement_rate: null,
      recommendation_type: 'error',
      recommendation_desc: `Evaluation failed: ${errorMessage}`,
      status: 'observation',
      action_options: [],
      error: errorMessage,
      dataSource: 'appsflyer',
      hasData: false,
    }
  }
}

/**
 * Batch evaluate all campaigns from AppsFlyer data
 *
 * @param params - Evaluation parameters
 * @returns Batch evaluation summary with status breakdown
 */
export async function evaluateAllCampaignsFromAF(params?: {
  appId?: string
  geo?: string
  mediaSource?: string
  evaluationDate?: Date
}): Promise<BatchEvaluationResult> {
  const { appId, geo, mediaSource, evaluationDate = new Date() } = params || {}

  try {
    // Get date range for campaign discovery (last 30 days)
    const endDate = evaluationDate
    const startDate = new Date(evaluationDate)
    startDate.setDate(startDate.getDate() - 30)

    // Get all campaigns from AppsFlyer
    const campaigns = await getCampaignsFromAF({
      appId,
      geo,
      mediaSource,
      installDateStart: startDate,
      installDateEnd: endDate,
    })

    const results: BatchEvaluationResult['results'] = []
    const statusSummary = {
      danger: 0,
      warning: 0,
      observation: 0,
      healthy: 0,
      excellent: 0,
    }
    let successCount = 0
    let failedCount = 0

    // Evaluate each campaign
    for (const campaign of campaigns) {
      try {
        const evaluation = await evaluateCampaignFromAF({
          campaign: campaign.campaign,
          appId: campaign.appId,
          geo: campaign.geo,
          mediaSource: campaign.mediaSource,
          evaluationDate,
        })

        if (evaluation.hasData) {
          statusSummary[evaluation.status]++
          results.push({
            campaign_id: campaign.campaign,
            status: evaluation.status,
            min_achievement_rate: evaluation.min_achievement_rate ?? undefined,
            recommendation: evaluation.recommendation_type,
          })
          successCount++
        } else {
          results.push({
            campaign_id: campaign.campaign,
            error: 'Insufficient data',
          })
          failedCount++
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        results.push({
          campaign_id: campaign.campaign,
          error: errorMessage,
        })
        failedCount++
      }
    }

    return {
      success: failedCount === 0,
      evaluation_date: evaluationDate.toISOString().split('T')[0],
      total_campaigns: campaigns.length,
      success_count: successCount,
      failed_count: failedCount,
      status_summary: statusSummary,
      results,
      dataSource: 'appsflyer',
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return {
      success: false,
      evaluation_date: evaluationDate.toISOString().split('T')[0],
      total_campaigns: 0,
      success_count: 0,
      failed_count: 0,
      status_summary: {
        danger: 0,
        warning: 0,
        observation: 0,
        healthy: 0,
        excellent: 0,
      },
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
 * @deprecated Use evaluateCampaignFromAF instead
 */
async function runPythonScript<T>(scriptName: string, input: Record<string, unknown>): Promise<T> {
  console.warn(
    '[DEPRECATED] Using Python-based campaign evaluation. Switch to evaluateCampaignFromAF for real AppsFlyer data.'
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
 * Evaluate a single campaign
 *
 * @deprecated Use evaluateCampaignFromAF instead. This function uses mock data via Python.
 *
 * Calculates ROAS7/RET7 achievement rates and generates recommendations
 *
 * @param campaignId - Campaign ID to evaluate
 * @param evaluationDate - Date to evaluate (default: today)
 * @returns Campaign evaluation result with recommendations
 */
export async function evaluateCampaign(
  campaignId: string,
  evaluationDate?: Date | string
): Promise<CampaignEvaluationResult> {
  console.warn('[DEPRECATED] evaluateCampaign uses mock data. Use evaluateCampaignFromAF instead.')

  // Handle both Date objects and date strings
  let dateStr: string | undefined
  if (evaluationDate) {
    if (typeof evaluationDate === 'string') {
      dateStr = evaluationDate
    } else {
      dateStr = evaluationDate.toISOString()
    }
  }

  const input = {
    action: 'evaluate',
    campaignId,
    evaluationDate: dateStr,
  }

  const result = await runPythonScript<CampaignEvaluationResult>('campaign_evaluator.py', input)
  return { ...result, dataSource: 'mock' }
}

/**
 * Batch evaluate all campaigns
 *
 * @deprecated Use evaluateAllCampaignsFromAF instead. This function uses mock data via Python.
 *
 * Evaluates all campaigns for a given date and returns summary statistics
 *
 * @param evaluationDate - Date to evaluate (default: today)
 * @returns Batch evaluation summary with status breakdown
 */
export async function evaluateAllCampaigns(evaluationDate?: Date): Promise<BatchEvaluationResult> {
  console.warn(
    '[DEPRECATED] evaluateAllCampaigns uses mock data. Use evaluateAllCampaignsFromAF instead.'
  )

  const input = {
    action: 'evaluate_all',
    evaluationDate: evaluationDate?.toISOString(),
  }

  const result = await runPythonScript<BatchEvaluationResult>('campaign_evaluator.py', input)
  return { ...result, dataSource: 'mock' }
}

/**
 * Re-export database functions for direct access
 */
export { getCampaignEvaluations, createCampaignEvaluation } from '../../db/queries-evaluation'
