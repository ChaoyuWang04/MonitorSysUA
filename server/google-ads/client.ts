/**
 * Google Ads API Client (Python Bridge)
 *
 * Calls Python script to fetch ChangeEvent data from Google Ads API.
 * Python handles service account authentication via google-ads.yaml.
 */

import { spawn } from 'child_process'
import { existsSync } from 'fs'
import { join } from 'path'
import type { NewChangeEvent } from '../db/schema'

function resolvePythonExecutable() {
  const candidates = [
    '/Library/Frameworks/Python.framework/Versions/3.12/bin/python3',
    '/usr/local/bin/python3',
    '/opt/homebrew/bin/python3',
  ]

  const found = candidates.find((candidate) => existsSync(candidate))
  return found ?? 'python3'
}

/**
 * Fetch and parse ChangeEvent data from Google Ads API (via Python)
 *
 * @param customerId - The Google Ads customer ID to fetch events for
 * @param days - Number of days to look back (default: 7, max: 30)
 * @param currency - Currency code for formatting monetary values (default: 'USD')
 * @returns Array of parsed ChangeEvents ready for database insertion (without accountId)
 */
export async function fetchAndParseChangeEvents(
  customerId: string,
  days: number = 7,
  currency: string = 'USD'
): Promise<Omit<NewChangeEvent, 'accountId'>[]> {
  return new Promise((resolve, reject) => {
    console.log(`Fetching ChangeEvents for account ${customerId} (last ${days} days, currency: ${currency}) via Python...`)

    // Path to Python script
    const scriptPath = join(process.cwd(), 'server', 'google-ads', 'fetch_events.py')

    // Prefer project-local virtualenv if present to ensure google-ads deps are available
    const pythonExecutable = resolvePythonExecutable()

    // Spawn Python process with currency parameter
    const args = [scriptPath, customerId, days.toString(), currency]

    // Set login customer dynamically per account (Google Ads expects login_customer_id header)
    const pythonProcess = spawn(pythonExecutable, args, {
      env: {
        ...process.env,
        GOOGLE_ADS_LOGIN_CUSTOMER_ID: customerId,
      },
    })

    let stdout = ''
    let stderr = ''

    // Collect stdout
    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString()
    })

    // Collect stderr
    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString()
    })

    // Handle process completion
    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        console.error('Python script error:', stderr)
        try {
          const error = JSON.parse(stderr)
          reject(new Error(error.message || `Python script failed with code ${code}`))
        } catch {
          reject(new Error(`Python script failed: ${stderr || `Exit code ${code}`}`))
        }
        return
      }

      try {
        // Parse JSON output from Python
        const events = JSON.parse(stdout)

        console.log(`Successfully fetched ${events.length} events from Google Ads API`)

        // Transform Python output to match TypeScript schema
        const transformedEvents: Omit<NewChangeEvent, 'accountId'>[] = events.map((event: any) => ({
          timestamp: new Date(event.timestamp),
          userEmail: event.userEmail,
          resourceType: event.resourceType,
          operationType: event.operationType,
          resourceName: event.resourceName,
          clientType: event.clientType || null,
          campaign: event.campaign || null,
          adGroup: event.adGroup || null,
          summary: event.summary,
          summaryZh: event.summaryZh || null,
          fieldChanges: event.fieldChanges,
          changedFieldsPaths: event.changedFieldsPaths,
        }))

        resolve(transformedEvents)
      } catch (error) {
        console.error('Failed to parse Python output:', error)
        reject(new Error(`Failed to parse Python output: ${error instanceof Error ? error.message : 'Unknown error'}`))
      }
    })

    // Handle process errors
    pythonProcess.on('error', (error) => {
      console.error('Failed to start Python process:', error)
      reject(new Error(`Failed to start Python process: ${error.message}`))
    })
  })
}

/**
 * Test Google Ads API connection for a specific customer (via Python)
 */
export async function testConnection(customerId: string) {
  try {
    // Just try to fetch 1 event as a connectivity test
    const events = await fetchAndParseChangeEvents(customerId, 1)
    return {
      success: true,
      eventsFound: events.length,
      message: `Successfully connected to Google Ads API for customer ${customerId}`
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: `Failed to connect to Google Ads API for customer ${customerId}`
    }
  }
}
