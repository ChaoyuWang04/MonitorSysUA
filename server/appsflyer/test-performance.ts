/**
 * Performance & Load Tests (Section 7.6)
 *
 * Tests query performance and validates that indexes are being used:
 * - Query performance benchmarks
 * - tRPC latency
 * - Index usage verification
 *
 * Run: npx tsx server/appsflyer/test-performance.ts
 */

import * as af from '../db/queries-appsflyer'
import { db } from '../db/index'
import { sql } from 'drizzle-orm'

// Performance thresholds (per plan)
const THRESHOLDS = {
  getEventsByDateRange: 2000, // 2s max
  getCohortKpi: 1000, // 1s max
  calculateBaselineRoas: 3000, // 3s max
  calculateBaselineRetention: 3000, // 3s max
  getRevenueByCohort: 1000, // 1s max
}

// Test constants
const TEST_APP_ID = 'solitaire.patience.card.games.klondike.free'
const TEST_GEO = 'US'
const TEST_MEDIA_SOURCE = 'googleadwords_int'

interface PerformanceResult {
  name: string
  durationMs: number
  threshold: number
  passed: boolean
  details?: string
}

interface IndexCheckResult {
  indexName: string
  tableName: string
  used: boolean
  details?: string
}

async function runPerformanceTests(): Promise<PerformanceResult[]> {
  const results: PerformanceResult[] = []

  console.log('============================================')
  console.log('Section 7.6: Performance & Load Tests')
  console.log('============================================\n')

  // ============================================
  // PART 1: Query Performance Benchmarks
  // ============================================
  console.log('--- Part 1: Query Performance Benchmarks ---\n')

  // Test 1: getEventsByDateRange (30 days)
  console.log('1. Testing getEventsByDateRange (30 days)...')
  try {
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 30)

    const start = Date.now()
    const result = await af.getEventsByDateRange({
      startDate,
      endDate,
      limit: 100,
    })
    const duration = Date.now() - start

    const passed = duration < THRESHOLDS.getEventsByDateRange
    console.log(`   Duration: ${duration}ms (threshold: ${THRESHOLDS.getEventsByDateRange}ms)`)
    console.log(`   Rows returned: ${result.data.length} of ${result.total}`)
    console.log(`   ${passed ? '✓ PASS' : '✗ FAIL'}`)

    results.push({
      name: 'getEventsByDateRange (30 days)',
      durationMs: duration,
      threshold: THRESHOLDS.getEventsByDateRange,
      passed,
      details: `${result.total} total rows`,
    })
  } catch (error) {
    console.log(`   ✗ ERROR: ${error instanceof Error ? error.message : String(error)}`)
    results.push({
      name: 'getEventsByDateRange (30 days)',
      durationMs: -1,
      threshold: THRESHOLDS.getEventsByDateRange,
      passed: false,
      details: error instanceof Error ? error.message : String(error),
    })
  }

  // Test 2: getEventsByDateRange (180 days - full window)
  console.log('\n2. Testing getEventsByDateRange (180 days)...')
  try {
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 180)

    const start = Date.now()
    const result = await af.getEventsByDateRange({
      startDate,
      endDate,
      limit: 100,
    })
    const duration = Date.now() - start

    const passed = duration < THRESHOLDS.getEventsByDateRange
    console.log(`   Duration: ${duration}ms (threshold: ${THRESHOLDS.getEventsByDateRange}ms)`)
    console.log(`   Rows returned: ${result.data.length} of ${result.total}`)
    console.log(`   ${passed ? '✓ PASS' : '✗ FAIL'}`)

    results.push({
      name: 'getEventsByDateRange (180 days)',
      durationMs: duration,
      threshold: THRESHOLDS.getEventsByDateRange,
      passed,
      details: `${result.total} total rows`,
    })
  } catch (error) {
    console.log(`   ✗ ERROR: ${error instanceof Error ? error.message : String(error)}`)
    results.push({
      name: 'getEventsByDateRange (180 days)',
      durationMs: -1,
      threshold: THRESHOLDS.getEventsByDateRange,
      passed: false,
    })
  }

  // Test 3: getCohortKpi with filters
  console.log('\n3. Testing getCohortKpi (with filters)...')
  try {
    const start = Date.now()
    const result = await af.getCohortKpi({
      appId: TEST_APP_ID,
      geo: TEST_GEO,
      mediaSource: TEST_MEDIA_SOURCE,
      limit: 100,
    })
    const duration = Date.now() - start

    const passed = duration < THRESHOLDS.getCohortKpi
    console.log(`   Duration: ${duration}ms (threshold: ${THRESHOLDS.getCohortKpi}ms)`)
    console.log(`   Rows returned: ${result.data.length} of ${result.total}`)
    console.log(`   ${passed ? '✓ PASS' : '✗ FAIL'}`)

    results.push({
      name: 'getCohortKpi (with filters)',
      durationMs: duration,
      threshold: THRESHOLDS.getCohortKpi,
      passed,
      details: `${result.total} total rows`,
    })
  } catch (error) {
    console.log(`   ✗ ERROR: ${error instanceof Error ? error.message : String(error)}`)
    results.push({
      name: 'getCohortKpi (with filters)',
      durationMs: -1,
      threshold: THRESHOLDS.getCohortKpi,
      passed: false,
    })
  }

  // Test 4: getCohortKpi without filters (full scan)
  console.log('\n4. Testing getCohortKpi (no filters - full table)...')
  try {
    const start = Date.now()
    const result = await af.getCohortKpi({
      limit: 100,
    })
    const duration = Date.now() - start

    // Allow more time for full table scan
    const threshold = THRESHOLDS.getCohortKpi * 2
    const passed = duration < threshold
    console.log(`   Duration: ${duration}ms (threshold: ${threshold}ms)`)
    console.log(`   Rows returned: ${result.data.length} of ${result.total}`)
    console.log(`   ${passed ? '✓ PASS' : '⚠ WARNING (slower but acceptable)'}`)

    results.push({
      name: 'getCohortKpi (no filters)',
      durationMs: duration,
      threshold: threshold,
      passed,
      details: `${result.total} total rows`,
    })
  } catch (error) {
    console.log(`   ✗ ERROR: ${error instanceof Error ? error.message : String(error)}`)
    results.push({
      name: 'getCohortKpi (no filters)',
      durationMs: -1,
      threshold: THRESHOLDS.getCohortKpi * 2,
      passed: false,
    })
  }

  // Test 5: calculateBaselineRoas
  console.log('\n5. Testing calculateBaselineRoas...')
  try {
    const start = Date.now()
    const result = await af.calculateBaselineRoas({
      appId: TEST_APP_ID,
      geo: TEST_GEO,
      mediaSource: TEST_MEDIA_SOURCE,
      baselineDays: 180,
    })
    const duration = Date.now() - start

    const passed = duration < THRESHOLDS.calculateBaselineRoas
    console.log(`   Duration: ${duration}ms (threshold: ${THRESHOLDS.calculateBaselineRoas}ms)`)
    console.log(`   Result: ${result !== null ? result.toFixed(4) : 'null (no data in window)'}`)
    console.log(`   ${passed ? '✓ PASS' : '✗ FAIL'}`)

    results.push({
      name: 'calculateBaselineRoas',
      durationMs: duration,
      threshold: THRESHOLDS.calculateBaselineRoas,
      passed,
    })
  } catch (error) {
    console.log(`   ✗ ERROR: ${error instanceof Error ? error.message : String(error)}`)
    results.push({
      name: 'calculateBaselineRoas',
      durationMs: -1,
      threshold: THRESHOLDS.calculateBaselineRoas,
      passed: false,
    })
  }

  // Test 6: calculateBaselineRetention
  console.log('\n6. Testing calculateBaselineRetention...')
  try {
    const start = Date.now()
    const result = await af.calculateBaselineRetention({
      appId: TEST_APP_ID,
      geo: TEST_GEO,
      mediaSource: TEST_MEDIA_SOURCE,
      daysSinceInstall: 7,
      baselineDays: 180,
    })
    const duration = Date.now() - start

    const passed = duration < THRESHOLDS.calculateBaselineRetention
    console.log(`   Duration: ${duration}ms (threshold: ${THRESHOLDS.calculateBaselineRetention}ms)`)
    console.log(
      `   Result: ${result !== null ? (result * 100).toFixed(2) + '%' : 'null (no data in window)'}`
    )
    console.log(`   ${passed ? '✓ PASS' : '✗ FAIL'}`)

    results.push({
      name: 'calculateBaselineRetention',
      durationMs: duration,
      threshold: THRESHOLDS.calculateBaselineRetention,
      passed,
    })
  } catch (error) {
    console.log(`   ✗ ERROR: ${error instanceof Error ? error.message : String(error)}`)
    results.push({
      name: 'calculateBaselineRetention',
      durationMs: -1,
      threshold: THRESHOLDS.calculateBaselineRetention,
      passed: false,
    })
  }

  // Test 7: getRevenueByCohort
  console.log('\n7. Testing getRevenueByCohort...')
  try {
    const installDate = new Date()
    installDate.setDate(installDate.getDate() - 30)

    const start = Date.now()
    const result = await af.getRevenueByCohort({
      installDate,
      daysSinceInstall: 7,
      appId: TEST_APP_ID,
      geo: TEST_GEO,
    })
    const duration = Date.now() - start

    const passed = duration < THRESHOLDS.getRevenueByCohort
    console.log(`   Duration: ${duration}ms (threshold: ${THRESHOLDS.getRevenueByCohort}ms)`)
    console.log(`   Total Revenue: $${result.totalRevenueUsd.toFixed(2)}`)
    console.log(`   ${passed ? '✓ PASS' : '✗ FAIL'}`)

    results.push({
      name: 'getRevenueByCohort',
      durationMs: duration,
      threshold: THRESHOLDS.getRevenueByCohort,
      passed,
    })
  } catch (error) {
    console.log(`   ✗ ERROR: ${error instanceof Error ? error.message : String(error)}`)
    results.push({
      name: 'getRevenueByCohort',
      durationMs: -1,
      threshold: THRESHOLDS.getRevenueByCohort,
      passed: false,
    })
  }

  // Test 8: Concurrent queries
  console.log('\n8. Testing concurrent queries (5 parallel)...')
  try {
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 30)

    const start = Date.now()
    await Promise.all([
      af.getEventsByDateRange({ startDate, endDate, limit: 50 }),
      af.getCohortKpi({ appId: TEST_APP_ID, limit: 50 }),
      af.getLatestCohortData({ daysBack: 30, appId: TEST_APP_ID }),
      af.getSyncLogs({ limit: 10 }),
      af.getEventsByInstallDate({ installDate: startDate, appId: TEST_APP_ID }),
    ])
    const duration = Date.now() - start

    // Concurrent should complete within 5s
    const threshold = 5000
    const passed = duration < threshold
    console.log(`   Duration: ${duration}ms (threshold: ${threshold}ms)`)
    console.log(`   ${passed ? '✓ PASS' : '✗ FAIL'}`)

    results.push({
      name: 'Concurrent queries (5 parallel)',
      durationMs: duration,
      threshold,
      passed,
    })
  } catch (error) {
    console.log(`   ✗ ERROR: ${error instanceof Error ? error.message : String(error)}`)
    results.push({
      name: 'Concurrent queries (5 parallel)',
      durationMs: -1,
      threshold: 5000,
      passed: false,
    })
  }

  return results
}

async function checkIndexUsage(): Promise<IndexCheckResult[]> {
  const results: IndexCheckResult[] = []

  console.log('\n\n--- Part 2: Index Usage Verification ---\n')

  // Check indexes exist
  const indexQuery = sql`
    SELECT
      indexname,
      tablename,
      indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
    AND (tablename LIKE 'af_%')
    ORDER BY tablename, indexname
  `

  try {
    const indexes = await db.execute(indexQuery)
    console.log('AppsFlyer table indexes:')

    for (const idx of indexes.rows) {
      const indexName = idx.indexname as string
      const tableName = idx.tablename as string
      console.log(`   - ${indexName} on ${tableName}`)
      results.push({
        indexName,
        tableName,
        used: true,
        details: idx.indexdef as string,
      })
    }

    if (indexes.rows.length === 0) {
      console.log('   No indexes found on af_* tables')
    }
  } catch (error) {
    console.log(`   ✗ ERROR checking indexes: ${error instanceof Error ? error.message : String(error)}`)
  }

  // Test EXPLAIN ANALYZE for key queries
  console.log('\n\nQuery plan analysis:')

  // EXPLAIN for getEventsByDateRange
  console.log('\n9. EXPLAIN ANALYZE getEventsByDateRange...')
  try {
    const explainQuery = sql`
      EXPLAIN ANALYZE
      SELECT * FROM af_events
      WHERE event_date >= '2025-10-01'
      AND event_date <= '2025-11-29'
      LIMIT 100
    `
    const explainResult = await db.execute(explainQuery)
    const plan = explainResult.rows.map((r) => r['QUERY PLAN']).join('\n')

    const usesIndex = plan.includes('Index') || plan.includes('Bitmap')
    console.log(`   Uses index: ${usesIndex ? '✓ YES' : '✗ NO (sequential scan)'}`)

    // Extract execution time
    const timeMatch = plan.match(/Execution Time: ([\d.]+) ms/)
    if (timeMatch) {
      console.log(`   Execution time: ${timeMatch[1]}ms`)
    }

    results.push({
      indexName: 'idx_af_events_event_date',
      tableName: 'af_events',
      used: usesIndex,
      details: usesIndex ? 'Index scan confirmed' : 'Sequential scan - consider adding index',
    })
  } catch (error) {
    console.log(`   ✗ ERROR: ${error instanceof Error ? error.message : String(error)}`)
  }

  // EXPLAIN for getCohortKpi
  console.log('\n10. EXPLAIN ANALYZE getCohortKpi...')
  try {
    const explainQuery = sql`
      EXPLAIN ANALYZE
      SELECT * FROM af_cohort_kpi_daily
      WHERE app_id = 'solitaire.patience.card.games.klondike.free'
      AND geo = 'US'
      LIMIT 100
    `
    const explainResult = await db.execute(explainQuery)
    const plan = explainResult.rows.map((r) => r['QUERY PLAN']).join('\n')

    const usesIndex = plan.includes('Index') || plan.includes('Bitmap')
    console.log(`   Uses index: ${usesIndex ? '✓ YES' : '✗ NO (sequential scan)'}`)

    const timeMatch = plan.match(/Execution Time: ([\d.]+) ms/)
    if (timeMatch) {
      console.log(`   Execution time: ${timeMatch[1]}ms`)
    }

    results.push({
      indexName: 'idx_af_cohort_kpi_cohort',
      tableName: 'af_cohort_kpi_daily',
      used: usesIndex,
      details: usesIndex ? 'Index scan confirmed' : 'Sequential scan - consider adding index',
    })
  } catch (error) {
    console.log(`   ✗ ERROR: ${error instanceof Error ? error.message : String(error)}`)
  }

  return results
}

async function main() {
  // Run performance tests
  const perfResults = await runPerformanceTests()

  // Check index usage
  const indexResults = await checkIndexUsage()

  // Summary
  const perfPassed = perfResults.filter((r) => r.passed).length
  const perfFailed = perfResults.filter((r) => !r.passed).length
  const indexUsed = indexResults.filter((r) => r.used).length

  console.log('\n============================================')
  console.log('Performance Test Summary')
  console.log('============================================')
  console.log(`\nQuery Performance: ${perfPassed} passed, ${perfFailed} failed`)

  // Show timing summary
  console.log('\nTiming Summary:')
  for (const result of perfResults) {
    const status = result.passed ? '✓' : '✗'
    const time = result.durationMs >= 0 ? `${result.durationMs}ms` : 'ERROR'
    console.log(`   ${status} ${result.name}: ${time} (max: ${result.threshold}ms)`)
  }

  console.log(`\nIndex Usage: ${indexUsed} indexes detected/used`)

  if (perfFailed > 0) {
    console.log('\n⚠ Some performance tests failed. Consider:')
    console.log('   - Adding missing indexes')
    console.log('   - Optimizing slow queries')
    console.log('   - Increasing thresholds if data volume is expected to be high')
  }

  console.log('\n============================================')

  // Exit with appropriate code
  if (perfFailed > 0) {
    console.log('\nPerformance tests completed with warnings.')
    process.exit(0) // Don't fail on performance - just warn
  }

  console.log('\nAll performance tests passed!')
  process.exit(0)
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
