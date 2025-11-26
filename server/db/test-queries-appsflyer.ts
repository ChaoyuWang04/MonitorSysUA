/**
 * Test script for AppsFlyer query functions
 * Run: npx tsx server/db/test-queries-appsflyer.ts
 */

import * as af from './queries-appsflyer'

// Default test parameters based on existing data
const TEST_APP_ID = 'solitaire.patience.card.games.klondike.free'
const TEST_GEO = 'US'
const TEST_MEDIA_SOURCE = 'googleadwords_int'

async function main() {
  console.log('============================================')
  console.log('Testing AppsFlyer Query Layer')
  console.log('============================================\n')

  let passed = 0
  let failed = 0

  // Test 1: getEventsByDateRange
  console.log('1. Testing getEventsByDateRange...')
  try {
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 30)

    const events = await af.getEventsByDateRange({
      startDate,
      endDate,
      limit: 10,
    })
    console.log(`   Found ${events.total} events, showing ${events.data.length}`)
    console.log(`   First event: ${events.data[0]?.eventName || 'N/A'} on ${events.data[0]?.eventDate || 'N/A'}`)
    passed++
  } catch (error) {
    console.log(`   ERROR: ${error instanceof Error ? error.message : String(error)}`)
    failed++
  }

  // Test 2: getEventsByInstallDate
  console.log('\n2. Testing getEventsByInstallDate...')
  try {
    const installDate = new Date()
    installDate.setDate(installDate.getDate() - 14) // 14 days ago

    const events = await af.getEventsByInstallDate({
      installDate,
      appId: TEST_APP_ID,
    })
    console.log(`   Found ${events.length} events for install date ${installDate.toISOString().split('T')[0]}`)
    passed++
  } catch (error) {
    console.log(`   ERROR: ${error instanceof Error ? error.message : String(error)}`)
    failed++
  }

  // Test 3: getRevenueByCohort (cumulative)
  console.log('\n3. Testing getRevenueByCohort (cumulative D7)...')
  try {
    const installDate = new Date()
    installDate.setDate(installDate.getDate() - 30) // 30 days ago to ensure D7 data

    const revenue = await af.getRevenueByCohort({
      installDate,
      daysSinceInstall: 7,
      appId: TEST_APP_ID,
      geo: TEST_GEO,
    })
    console.log(`   IAP Revenue: $${revenue.iapRevenueUsd.toFixed(2)}`)
    console.log(`   Ad Revenue: $${revenue.adRevenueUsd.toFixed(2)}`)
    console.log(`   Total Revenue (D0-D7): $${revenue.totalRevenueUsd.toFixed(2)}`)
    passed++
  } catch (error) {
    console.log(`   ERROR: ${error instanceof Error ? error.message : String(error)}`)
    failed++
  }

  // Test 4: getCohortKpi
  console.log('\n4. Testing getCohortKpi...')
  try {
    const kpi = await af.getCohortKpi({
      appId: TEST_APP_ID,
      geo: TEST_GEO,
      daysSinceInstall: 7,
      limit: 5,
    })
    console.log(`   Found ${kpi.total} cohort KPI records (D7), showing ${kpi.data.length}`)
    if (kpi.data[0]) {
      console.log(`   First cohort: ${kpi.data[0].installDate}, installs=${kpi.data[0].installs}, retention=${kpi.data[0].retentionRate}`)
    }
    passed++
  } catch (error) {
    console.log(`   ERROR: ${error instanceof Error ? error.message : String(error)}`)
    failed++
  }

  // Test 5: getCohortMetrics (view query)
  console.log('\n5. Testing getCohortMetrics (view query)...')
  try {
    const installDate = new Date()
    installDate.setDate(installDate.getDate() - 30)

    const metrics = await af.getCohortMetrics({
      installDate,
      daysSinceInstall: 7,
      appId: TEST_APP_ID,
      geo: TEST_GEO,
    })
    console.log(`   Found ${metrics.length} cohort metrics`)
    if (metrics[0]) {
      console.log(`   First cohort: campaign=${metrics[0].campaign || 'N/A'}, revenue=$${metrics[0].totalRevenueUsd.toFixed(2)}, cost=$${(metrics[0].costUsd || 0).toFixed(2)}`)
    }
    passed++
  } catch (error) {
    console.log(`   ERROR: ${error instanceof Error ? error.message : String(error)}`)
    failed++
  }

  // Test 6: getLatestCohortData
  console.log('\n6. Testing getLatestCohortData...')
  try {
    const latestData = await af.getLatestCohortData({
      daysBack: 30,
      appId: TEST_APP_ID,
      geo: TEST_GEO,
    })
    console.log(`   Found ${latestData.length} recent cohort records (last 30 days)`)
    passed++
  } catch (error) {
    console.log(`   ERROR: ${error instanceof Error ? error.message : String(error)}`)
    failed++
  }

  // Test 7: getBaselineWindow
  console.log('\n7. Testing getBaselineWindow...')
  try {
    const window = af.getBaselineWindow(180)
    console.log(`   Baseline window (180 days):`)
    console.log(`   Start: ${window.start.toISOString().split('T')[0]}`)
    console.log(`   End: ${window.end.toISOString().split('T')[0]}`)
    passed++
  } catch (error) {
    console.log(`   ERROR: ${error instanceof Error ? error.message : String(error)}`)
    failed++
  }

  // Test 8: calculateBaselineRoas
  console.log('\n8. Testing calculateBaselineRoas...')
  try {
    const baselineRoas = await af.calculateBaselineRoas({
      appId: TEST_APP_ID,
      geo: TEST_GEO,
      mediaSource: TEST_MEDIA_SOURCE,
      baselineDays: 180,
    })
    if (baselineRoas !== null) {
      console.log(`   Baseline ROAS_D7 (median): ${baselineRoas.toFixed(4)}`)
    } else {
      console.log(`   Baseline ROAS_D7: insufficient data (null)`)
    }
    passed++
  } catch (error) {
    console.log(`   ERROR: ${error instanceof Error ? error.message : String(error)}`)
    failed++
  }

  // Test 9: calculateBaselineRetention
  console.log('\n9. Testing calculateBaselineRetention...')
  try {
    const baselineRet = await af.calculateBaselineRetention({
      appId: TEST_APP_ID,
      geo: TEST_GEO,
      mediaSource: TEST_MEDIA_SOURCE,
      daysSinceInstall: 7,
      baselineDays: 180,
    })
    if (baselineRet !== null) {
      console.log(`   Baseline RET_D7 (median): ${(baselineRet * 100).toFixed(2)}%`)
    } else {
      console.log(`   Baseline RET_D7: insufficient data (null)`)
    }
    passed++
  } catch (error) {
    console.log(`   ERROR: ${error instanceof Error ? error.message : String(error)}`)
    failed++
  }

  // Test 10: Sync log CRUD
  console.log('\n10. Testing Sync Log CRUD...')
  try {
    // Create
    const newLog = await af.createSyncLog({
      syncType: 'baseline',
      dateRangeStart: new Date('2025-05-01'),
      dateRangeEnd: new Date('2025-10-31'),
    })
    console.log(`   Created sync log ID: ${newLog.id}, status: ${newLog.status}`)

    // Update
    const updated = await af.updateSyncLog(newLog.id, {
      status: 'success',
      recordsProcessed: 100,
      completedAt: new Date(),
    })
    console.log(`   Updated sync log ID: ${updated?.id}, status: ${updated?.status}, records: ${updated?.recordsProcessed}`)

    // Get latest
    const latest = await af.getLatestSyncLog('baseline')
    console.log(`   Latest baseline sync: ${latest?.status} at ${latest?.startedAt}`)

    passed++
  } catch (error) {
    console.log(`   ERROR: ${error instanceof Error ? error.message : String(error)}`)
    failed++
  }

  // Test 11: getSyncLogs
  console.log('\n11. Testing getSyncLogs...')
  try {
    const logs = await af.getSyncLogs({ limit: 5 })
    console.log(`   Found ${logs.length} sync logs`)
    passed++
  } catch (error) {
    console.log(`   ERROR: ${error instanceof Error ? error.message : String(error)}`)
    failed++
  }

  // Summary
  console.log('\n============================================')
  console.log(`Results: ${passed} passed, ${failed} failed`)
  console.log('============================================')

  if (failed > 0) {
    process.exit(1)
  }

  console.log('\nAll tests passed!')
  process.exit(0)
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
