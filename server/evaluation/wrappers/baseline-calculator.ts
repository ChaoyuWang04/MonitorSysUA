/**
 * A2: Safety Baseline Calculator - TypeScript Wrapper
 *
 * Phase 5: Refactored to use real AppsFlyer cohort data.
 * The Python-based calculation is kept for backward compatibility but deprecated.
 */

import { spawn } from 'child_process'
import path from 'path'
import {
  calculateBaselineRoas,
  calculateBaselineRetention,
} from '../../db/queries-appsflyer'
import {
  getBaselineSettings,
  upsertBaselineSettings,
  upsertSafetyBaseline,
  getSafetyBaseline,
} from '../../db/queries-evaluation'
import type { BaselineSettings, NewBaselineSettings } from '../../db/schema'

export interface BaselineResult {
  baseline_roas7: number | null
  baseline_ret7: number | null
  reference_period: string
  total_spend?: number
  total_revenue?: number
  total_installs?: number
  total_d7_active?: number
  error?: string
  dataSource?: 'appsflyer' | 'mock'
  hasData?: boolean
  baselineDays?: number
}

export interface UpdateAllBaselinesResult {
  success: boolean
  updated_count: number
  failed_count: number
  total_count: number
  results: Array<{
    product: string
    country: string
    platform?: string
    channel?: string
    baseline_roas7?: number
    baseline_ret7?: number
    status: string
    error?: string
  }>
  error?: string
}

export interface CalculateBaselineParams {
  productName: string
  countryCode: string
  platform?: string
  channel?: string
  currentDate?: Date
}

export interface CalculateBaselineFromAFParams {
  appId: string
  geo: string
  mediaSource: string
}

/**
 * Get or create baseline settings for a specific app/geo/mediaSource
 * Returns existing settings or creates with defaults if not found
 */
export async function getOrCreateBaselineSettings(params: {
  appId: string
  geo: string
  mediaSource: string
}): Promise<BaselineSettings> {
  const existing = await getBaselineSettings(params)
  if (existing) return existing

  // Create with defaults
  const defaults: NewBaselineSettings = {
    appId: params.appId,
    geo: params.geo,
    mediaSource: params.mediaSource,
    baselineDays: 180, // Default per PRD
    minSampleSize: 30, // Min cohorts for valid P50
  }

  const created = await upsertBaselineSettings(defaults)
  return created!
}

/**
 * Calculate safety baseline using real AppsFlyer cohort data
 *
 * This is the primary function for Phase 5+, replacing mock data.
 * Uses configurable baseline window from baseline_settings table.
 *
 * @param params - Calculation parameters (appId, geo, mediaSource)
 * @returns Baseline calculation result with ROAS7 and RET7 values
 *
 * @example
 * ```typescript
 * const baseline = await calculateBaselineFromAF({
 *   appId: "id123456789",
 *   geo: "US",
 *   mediaSource: "googleadwords_int"
 * });
 * console.log(baseline.baseline_roas7); // e.g., 0.45
 * console.log(baseline.baseline_ret7);  // e.g., 0.38
 * ```
 */
export async function calculateBaselineFromAF(
  params: CalculateBaselineFromAFParams
): Promise<BaselineResult> {
  try {
    // Get configurable baseline window
    const settings = await getOrCreateBaselineSettings(params)

    // Calculate P50 ROAS and Retention from AppsFlyer data
    const [roasResult, retResult] = await Promise.all([
      calculateBaselineRoas({
        appId: params.appId,
        geo: params.geo,
        mediaSource: params.mediaSource,
        baselineDays: settings.baselineDays,
      }),
      calculateBaselineRetention({
        appId: params.appId,
        geo: params.geo,
        mediaSource: params.mediaSource,
        daysSinceInstall: 7, // D7 retention
        baselineDays: settings.baselineDays,
      }),
    ])

    const hasData = roasResult !== null || retResult !== null
    const now = new Date()
    const endDate = now.toISOString().split('T')[0]
    const startDate = new Date(now)
    startDate.setDate(startDate.getDate() - settings.baselineDays)
    const referencePeriod = `${startDate.toISOString().split('T')[0]} to ${endDate}`

    // Store the calculated baseline in the safety_baseline table
    if (hasData) {
      await upsertSafetyBaseline({
        productName: params.appId,
        countryCode: params.geo,
        platform: 'AppsFlyer', // Distinguish from mock data
        channel: params.mediaSource,
        baselineRoas7: roasResult?.toString() || null,
        baselineRet7: retResult?.toString() || null,
        referencePeriod,
      })
    }

    return {
      baseline_roas7: roasResult,
      baseline_ret7: retResult,
      reference_period: referencePeriod,
      dataSource: 'appsflyer',
      hasData,
      baselineDays: settings.baselineDays,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return {
      baseline_roas7: null,
      baseline_ret7: null,
      reference_period: '',
      error: `Failed to calculate baseline from AppsFlyer: ${errorMessage}`,
      dataSource: 'appsflyer',
      hasData: false,
    }
  }
}

/**
 * Batch update all safety baselines using AppsFlyer data
 *
 * Queries all unique app/geo/mediaSource combinations from AppsFlyer data
 * and updates their baselines.
 *
 * @returns Update results with success/failure counts
 */
export async function updateAllBaselinesFromAF(): Promise<UpdateAllBaselinesResult> {
  // Import here to avoid circular dependency
  const { getUniqueAppGeoMediaCombinations } = await import('../../db/queries-appsflyer')

  try {
    const combinations = await getUniqueAppGeoMediaCombinations()

    const results: UpdateAllBaselinesResult['results'] = []
    let updatedCount = 0
    let failedCount = 0

    for (const combo of combinations) {
      try {
        const baseline = await calculateBaselineFromAF({
          appId: combo.appId,
          geo: combo.geo,
          mediaSource: combo.mediaSource,
        })

        if (baseline.hasData) {
          results.push({
            product: combo.appId,
            country: combo.geo,
            channel: combo.mediaSource,
            baseline_roas7: baseline.baseline_roas7 ?? undefined,
            baseline_ret7: baseline.baseline_ret7 ?? undefined,
            status: 'success',
          })
          updatedCount++
        } else {
          results.push({
            product: combo.appId,
            country: combo.geo,
            channel: combo.mediaSource,
            status: 'no_data',
            error: 'Insufficient data for baseline calculation',
          })
          failedCount++
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        results.push({
          product: combo.appId,
          country: combo.geo,
          channel: combo.mediaSource,
          status: 'error',
          error: errorMessage,
        })
        failedCount++
      }
    }

    return {
      success: failedCount === 0,
      updated_count: updatedCount,
      failed_count: failedCount,
      total_count: combinations.length,
      results,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return {
      success: false,
      updated_count: 0,
      failed_count: 0,
      total_count: 0,
      results: [],
      error: `Failed to update baselines: ${errorMessage}`,
    }
  }
}

// ============================================
// LEGACY PYTHON-BASED FUNCTIONS (DEPRECATED)
// ============================================

/**
 * Run Python script and return parsed JSON output
 *
 * @deprecated Use calculateBaselineFromAF instead
 * @param scriptName - Python script filename
 * @param input - Input data to pass to Python script via stdin
 * @returns Parsed output from Python script
 */
async function runPythonScript<T>(scriptName: string, input: Record<string, unknown>): Promise<T> {
  console.warn(
    '[DEPRECATED] Using Python-based baseline calculation. Switch to calculateBaselineFromAF for real AppsFlyer data.'
  )

  return new Promise((resolve, reject) => {
    const scriptPath = path.join(process.cwd(), 'server', 'evaluation', 'python', scriptName)

    const pythonProcess = spawn('python3', [scriptPath])

    let stdoutData = ''
    let stderrData = ''

    // Collect stdout
    pythonProcess.stdout.on('data', (data) => {
      stdoutData += data.toString()
    })

    // Collect stderr
    pythonProcess.stderr.on('data', (data) => {
      stderrData += data.toString()
    })

    // Handle process exit
    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Python script exited with code ${code}\nStderr: ${stderrData}`))
        return
      }

      try {
        // Parse JSON output from stdout
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

    // Handle process errors
    pythonProcess.on('error', (error) => {
      reject(new Error(`Failed to start Python process: ${error.message}`))
    })

    // Send input data to Python script via stdin
    pythonProcess.stdin.write(JSON.stringify(input))
    pythonProcess.stdin.end()
  })
}

/**
 * Calculate safety baseline for a specific product/country/platform/channel
 *
 * @deprecated Use calculateBaselineFromAF instead. This function uses mock data via Python.
 *
 * This calculates ROAS7 and RET7 baselines based on data from 180 days ago.
 *
 * @param params - Calculation parameters
 * @returns Baseline calculation result
 */
export async function calculateBaseline(params: CalculateBaselineParams): Promise<BaselineResult> {
  console.warn('[DEPRECATED] calculateBaseline uses mock data. Use calculateBaselineFromAF instead.')

  const input = {
    action: 'calculate',
    productName: params.productName,
    countryCode: params.countryCode,
    platform: params.platform || 'Android',
    channel: params.channel || 'Google',
    currentDate: params.currentDate?.toISOString(),
  }

  const result = await runPythonScript<BaselineResult>('baseline_calculator.py', input)
  return { ...result, dataSource: 'mock' }
}

/**
 * Batch update all safety baselines
 *
 * @deprecated Use updateAllBaselinesFromAF instead. This function uses mock data via Python.
 *
 * This should be run on the 1st of each month to update all product/country/platform/channel baselines.
 *
 * @param currentDate - Current date (optional, defaults to now)
 * @returns Update results with success/failure counts
 */
export async function updateAllBaselines(currentDate?: Date): Promise<UpdateAllBaselinesResult> {
  console.warn(
    '[DEPRECATED] updateAllBaselines uses mock data. Use updateAllBaselinesFromAF instead.'
  )

  const input = {
    action: 'update_all',
    currentDate: currentDate?.toISOString(),
  }

  return runPythonScript<UpdateAllBaselinesResult>('baseline_calculator.py', input)
}

/**
 * Re-export database functions for direct access
 */
export { getSafetyBaseline, upsertSafetyBaseline }
