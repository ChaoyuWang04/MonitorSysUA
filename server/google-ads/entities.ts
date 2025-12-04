/**
 * Google Ads Entities Client (Python Bridge)
 *
 * Fetches full state of campaigns/ad groups/ads via Python GAQL script.
 * Reuses existing OAuth configuration (no auth flow changes).
 */

import { spawn } from 'child_process'
import { existsSync } from 'fs'
import { join } from 'path'

function resolvePythonExecutable() {
  const venvPath = join(process.cwd(), 'server', 'google-ads', '.venv')
  const candidates = [
    join(venvPath, 'bin', 'python3'),
    join(venvPath, 'bin', 'python'),
    join(venvPath, 'Scripts', 'python.exe'),
  ]

  const found = candidates.find((candidate) => existsSync(candidate))
  return found ?? 'python3'
}

export type RawCampaign = {
  resourceName: string
  campaignId: string
  name: string | null
  status: string | null
  servingStatus: string | null
  primaryStatus: string | null
  channelType: string | null
  channelSubType: string | null
  biddingStrategyType: string | null
  startDate: string | null
  endDate: string | null
  budgetId: string | null
  budgetAmountMicros: number | null
  lastModifiedTime: string | null
}

export type RawAdGroup = {
  resourceName: string
  adGroupId: string
  campaignId: string | null
  name: string | null
  status: string | null
  type: string | null
  cpcBidMicros: number | null
  cpmBidMicros: number | null
  targetCpaMicros: number | null
  lastModifiedTime: string | null
}

export type RawAd = {
  resourceName: string
  adId: string
  adGroupId: string | null
  campaignId: string | null
  name: string | null
  status: string | null
  type: string | null
  finalUrls: string[]
  finalMobileUrls: string[]
  displayUrl: string | null
  devicePreference: string | null
  systemManagedResourceSource: string | null
  addedByGoogleAds: boolean | null
  lastModifiedTime: string | null
}

export type EntitySyncPayload = {
  campaigns: RawCampaign[]
  adGroups: RawAdGroup[]
  ads: RawAd[]
}

export async function fetchEntities(customerId: string): Promise<EntitySyncPayload> {
  return new Promise((resolve, reject) => {
    const scriptPath = join(process.cwd(), 'server', 'google-ads', 'fetch_entities.py')
    const pythonExecutable = resolvePythonExecutable()
    const pythonProcess = spawn(pythonExecutable, [scriptPath, customerId], {
      env: {
        ...process.env,
        GOOGLE_ADS_LOGIN_CUSTOMER_ID: customerId,
      },
    })

    let stdout = ''
    let stderr = ''

    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString()
    })

    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString()
    })

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        // Try to surface stdout JSON error first, then stderr, then generic code
        try {
          const parsedError = JSON.parse(stdout)
          if (parsedError?.error) {
            reject(new Error(`Python fetch_entities failed: ${parsedError.error}`))
            return
          }
        } catch {
          // ignore parse failure
        }
        reject(new Error(`Python fetch_entities failed: ${stderr || `exit code ${code}`}`))
        return
      }

      try {
        const parsed = JSON.parse(stdout)
        if (parsed.error) {
          reject(new Error(Array.isArray(parsed.messages) ? parsed.messages.join('; ') : parsed.error))
          return
        }
        resolve(parsed as EntitySyncPayload)
      } catch (error) {
        reject(new Error(`Failed to parse Python output: ${error instanceof Error ? error.message : 'unknown error'}`))
      }
    })

    pythonProcess.on('error', (error) => {
      reject(new Error(`Failed to start Python process: ${error.message}`))
    })
  })
}
