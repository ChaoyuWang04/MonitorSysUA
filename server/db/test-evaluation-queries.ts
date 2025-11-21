/**
 * Test script for evaluation query functions
 *
 * This script tests all query functions in queries-evaluation.ts
 * by inserting test data and verifying the results.
 *
 * Run with: npx tsx server/db/test-evaluation-queries.ts
 */

import {
  // Safety Baseline
  getSafetyBaseline,
  getAllSafetyBaselines,
  upsertSafetyBaseline,
  // Creative Test Baseline
  getCreativeTestBaseline,
  getAllCreativeTestBaselines,
  upsertCreativeTestBaseline,
  // Campaign Evaluation
  getCampaignEvaluations,
  getLatestCampaignEvaluation,
  getCampaignEvaluationsByStatus,
  createCampaignEvaluation,
  getCampaignEvaluationStats,
  // Creative Evaluation
  getCreativeEvaluations,
  getCreativeEvaluation,
  createCreativeEvaluation,
  updateCreativeStatus,
  getExcellentCreatives,
  // Operation Score
  getOperationScores,
  createOperationScore,
  getOptimizerLeaderboard,
  // Action Recommendation
  getActionRecommendations,
  getPendingRecommendations,
  createActionRecommendation,
  markRecommendationAsExecuted,
} from './queries-evaluation'

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
}

function log(message: string, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`)
}

function logSection(title: string) {
  console.log('\n' + '='.repeat(60))
  log(title, colors.bright + colors.cyan)
  console.log('='.repeat(60))
}

function logTest(testName: string) {
  log(`\n▶ Testing: ${testName}`, colors.blue)
}

function logSuccess(message: string) {
  log(`✅ ${message}`, colors.green)
}

function logError(message: string) {
  log(`❌ ${message}`, colors.red)
}

function logInfo(message: string) {
  log(`ℹ️  ${message}`, colors.yellow)
}

// Test counters
let testsRun = 0
let testsPassed = 0
let testsFailed = 0

function assert(condition: boolean, message: string) {
  testsRun++
  if (condition) {
    testsPassed++
    logSuccess(message)
  } else {
    testsFailed++
    logError(message)
  }
}

// ============================================
// TEST SUITE
// ============================================

async function runTests() {
  log('\n🚀 Starting Evaluation Queries Test Suite\n', colors.bright)

  try {
    // ============================================
    // 1. SAFETY BASELINE TESTS
    // ============================================
    logSection('1. Safety Baseline Tests')

    logTest('Upsert Safety Baseline - Solitaire US')
    const baseline1 = await upsertSafetyBaseline({
      productName: 'Solitaire',
      countryCode: 'US',
      platform: 'Android',
      channel: 'Google',
      baselineRoas7: '0.4500',
      baselineRet7: '0.3800',
      referencePeriod: '2024-06',
    })
    assert(!!baseline1, 'Created Safety Baseline for Solitaire US')
    assert(baseline1.baselineRoas7 === '0.4500', 'ROAS7 baseline correct')
    assert(baseline1.baselineRet7 === '0.3800', 'RET7 baseline correct')
    logInfo(`Baseline ID: ${baseline1.id}`)

    logTest('Upsert Safety Baseline - Solitaire JP')
    const baseline2 = await upsertSafetyBaseline({
      productName: 'Solitaire',
      countryCode: 'JP',
      platform: 'Android',
      channel: 'Google',
      baselineRoas7: '0.5200',
      baselineRet7: '0.4100',
      referencePeriod: '2024-06',
    })
    assert(!!baseline2, 'Created Safety Baseline for Solitaire JP')

    logTest('Get Safety Baseline by parameters')
    const fetchedBaseline = await getSafetyBaseline({
      productName: 'Solitaire',
      countryCode: 'US',
      platform: 'Android',
      channel: 'Google',
    })
    assert(!!fetchedBaseline, 'Retrieved Safety Baseline')
    assert(fetchedBaseline?.baselineRoas7 === '0.4500', 'Retrieved correct ROAS7')

    logTest('Get All Safety Baselines')
    const allBaselines = await getAllSafetyBaselines()
    assert(allBaselines.length >= 2, `Retrieved ${allBaselines.length} baselines`)

    logTest('Update existing baseline (upsert)')
    const updatedBaseline = await upsertSafetyBaseline({
      productName: 'Solitaire',
      countryCode: 'US',
      platform: 'Android',
      channel: 'Google',
      baselineRoas7: '0.4700', // Updated value
      baselineRet7: '0.3900', // Updated value
      referencePeriod: '2024-07',
    })
    assert(updatedBaseline.baselineRoas7 === '0.4700', 'Baseline updated correctly')
    assert(updatedBaseline.referencePeriod === '2024-07', 'Reference period updated')

    // ============================================
    // 2. CREATIVE TEST BASELINE TESTS
    // ============================================
    logSection('2. Creative Test Baseline Tests')

    logTest('Upsert Creative Test Baseline - US')
    const creativeBaseline1 = await upsertCreativeTestBaseline({
      productName: 'Solitaire',
      countryCode: 'US',
      platform: 'Android',
      channel: 'Google',
      maxCpi: '7.00',
      minRoasD3: '0.1000',
      minRoasD7: '0.4500',
      excellentCvr: '0.006700',
    })
    assert(!!creativeBaseline1, 'Created Creative Test Baseline for US')
    assert(creativeBaseline1.maxCpi === '7.00', 'Max CPI correct')

    logTest('Upsert Creative Test Baseline - JP')
    const creativeBaseline2 = await upsertCreativeTestBaseline({
      productName: 'Solitaire',
      countryCode: 'JP',
      platform: 'Android',
      channel: 'Google',
      maxCpi: '10.00',
      minRoasD3: '0.1200',
      minRoasD7: '0.5200',
      excellentCvr: '0.008000',
    })
    assert(!!creativeBaseline2, 'Created Creative Test Baseline for JP')

    logTest('Get Creative Test Baseline')
    const fetchedCreativeBaseline = await getCreativeTestBaseline({
      productName: 'Solitaire',
      countryCode: 'US',
    })
    assert(!!fetchedCreativeBaseline, 'Retrieved Creative Test Baseline')
    assert(fetchedCreativeBaseline?.maxCpi === '7.00', 'Retrieved correct max CPI')

    logTest('Get All Creative Test Baselines')
    const allCreativeBaselines = await getAllCreativeTestBaselines()
    assert(allCreativeBaselines.length >= 2, `Retrieved ${allCreativeBaselines.length} creative baselines`)

    // ============================================
    // 3. CAMPAIGN EVALUATION TESTS
    // ============================================
    logSection('3. Campaign Evaluation Tests')

    logTest('Create Campaign Evaluation - Excellent Performance')
    const evaluation1 = await createCampaignEvaluation({
      campaignId: 'campaign_001',
      campaignName: 'Solitaire_US_Main_001',
      evaluationDate: '2024-11-19',
      campaignType: 'mature',
      totalSpend: '5000.00',
      actualRoas7: '0.5400',
      actualRet7: '0.4200',
      baselineRoas7: '0.4500',
      baselineRet7: '0.3800',
      roasAchievementRate: '120.00',
      retAchievementRate: '110.53',
      minAchievementRate: '110.53',
      recommendationType: '激进扩量',
      status: '优秀',
    })
    assert(!!evaluation1, 'Created Campaign Evaluation (Excellent)')
    logInfo(`Evaluation ID: ${evaluation1.id}`)

    logTest('Create Campaign Evaluation - Warning')
    const evaluation2 = await createCampaignEvaluation({
      campaignId: 'campaign_002',
      campaignName: 'Solitaire_US_Test_021',
      evaluationDate: '2024-11-19',
      campaignType: 'test',
      totalSpend: '800.00',
      actualRoas7: '0.3200',
      actualRet7: '0.2800',
      baselineRoas7: '0.4500',
      baselineRet7: '0.3800',
      roasAchievementRate: '71.11',
      retAchievementRate: '73.68',
      minAchievementRate: '71.11',
      recommendationType: '保守缩量',
      status: '预警',
    })
    assert(!!evaluation2, 'Created Campaign Evaluation (Warning)')

    logTest('Create Campaign Evaluation - Danger')
    const evaluation3 = await createCampaignEvaluation({
      campaignId: 'campaign_003',
      campaignName: 'Solitaire_JP_Test_042',
      evaluationDate: '2024-11-19',
      campaignType: 'test',
      totalSpend: '600.00',
      actualRoas7: '0.2600',
      actualRet7: '0.2100',
      baselineRoas7: '0.5200',
      baselineRet7: '0.4100',
      roasAchievementRate: '50.00',
      retAchievementRate: '51.22',
      minAchievementRate: '50.00',
      recommendationType: '立即关停',
      status: '危险',
    })
    assert(!!evaluation3, 'Created Campaign Evaluation (Danger)')

    logTest('Get Campaign Evaluations (All)')
    const allEvaluations = await getCampaignEvaluations({})
    assert(allEvaluations.data.length >= 3, `Retrieved ${allEvaluations.data.length} evaluations`)
    assert(allEvaluations.total >= 3, `Total count: ${allEvaluations.total}`)

    logTest('Get Campaign Evaluations by campaignId')
    const campaign1Evals = await getCampaignEvaluations({ campaignId: 'campaign_001' })
    assert(campaign1Evals.data.length >= 1, 'Retrieved evaluations for campaign_001')

    logTest('Get Campaign Evaluations by status')
    const dangerEvals = await getCampaignEvaluationsByStatus('危险')
    assert(dangerEvals.length >= 1, `Found ${dangerEvals.length} danger campaigns`)

    logTest('Get Latest Campaign Evaluation')
    const latestEval = await getLatestCampaignEvaluation('campaign_001')
    assert(!!latestEval, 'Retrieved latest evaluation')
    assert(latestEval?.status === '优秀', 'Latest evaluation has correct status')

    logTest('Get Campaign Evaluation Stats')
    const stats = await getCampaignEvaluationStats()
    assert(stats.statusCounts.length > 0, `Status counts: ${stats.statusCounts.length} categories`)
    logInfo(`Average achievement rate: ${stats.avgAchievementRate.toFixed(2)}%`)

    // ============================================
    // 4. CREATIVE EVALUATION TESTS
    // ============================================
    logSection('4. Creative Evaluation Tests')

    logTest('Create Creative Evaluation - D3 (Testing)')
    const creative1 = await createCreativeEvaluation({
      campaignId: 'campaign_002',
      creativeId: 'creative_001',
      creativeName: 'Christmas_Video_001',
      evaluationDay: 'D3',
      evaluationDate: '2024-11-16',
      impressions: 5000,
      installs: 50,
      cvr: '0.010000',
      actualCpi: '5.20',
      actualRoas: '0.1200',
      maxCpiThreshold: '7.00',
      minRoasThreshold: '0.1000',
      creativeStatus: '测试中',
    })
    assert(!!creative1, 'Created Creative Evaluation (D3)')

    logTest('Create Creative Evaluation - D7 (Excellent)')
    const creative2 = await createCreativeEvaluation({
      campaignId: 'campaign_002',
      creativeId: 'creative_007',
      creativeName: 'Christmas_Video_007',
      evaluationDay: 'D7',
      evaluationDate: '2024-11-19',
      impressions: 12000,
      installs: 96,
      cvr: '0.008000',
      actualCpi: '5.20',
      actualRoas: '0.4800',
      maxCpiThreshold: '7.00',
      minRoasThreshold: '0.4500',
      creativeStatus: '出量好素材',
    })
    assert(!!creative2, 'Created Creative Evaluation (D7 - Excellent)')

    logTest('Create Creative Evaluation - D7 (Failed)')
    const creative3 = await createCreativeEvaluation({
      campaignId: 'campaign_002',
      creativeId: 'creative_010',
      creativeName: 'Christmas_Video_010',
      evaluationDay: 'D7',
      evaluationDate: '2024-11-19',
      impressions: 3000,
      installs: 12,
      cvr: '0.004000',
      actualCpi: '8.50',
      actualRoas: '0.0800',
      maxCpiThreshold: '7.00',
      minRoasThreshold: '0.4500',
      creativeStatus: '不及格',
    })
    assert(!!creative3, 'Created Creative Evaluation (D7 - Failed)')

    logTest('Get Creative Evaluations by campaignId')
    const campaignCreatives = await getCreativeEvaluations({ campaignId: 'campaign_002' })
    assert(campaignCreatives.length >= 3, `Found ${campaignCreatives.length} creatives for campaign_002`)

    logTest('Get Creative Evaluations by evaluationDay')
    const d7Creatives = await getCreativeEvaluations({
      campaignId: 'campaign_002',
      evaluationDay: 'D7',
    })
    assert(d7Creatives.length >= 2, `Found ${d7Creatives.length} D7 evaluations`)

    logTest('Get Creative Evaluation by ID')
    const singleCreative = await getCreativeEvaluation({
      campaignId: 'campaign_002',
      creativeId: 'creative_007',
      evaluationDay: 'D7',
    })
    assert(!!singleCreative, 'Retrieved specific creative evaluation')
    assert(singleCreative?.creativeStatus === '出量好素材', 'Creative status correct')

    logTest('Update Creative Status')
    const updatedCreative = await updateCreativeStatus(creative2.id, '已同步')
    assert(!!updatedCreative, 'Updated creative status')
    assert(updatedCreative?.creativeStatus === '已同步', 'Status updated to "已同步"')

    logTest('Get Excellent Creatives')
    const excellentCreatives = await getExcellentCreatives()
    assert(excellentCreatives.length === 0, 'No "出量好素材" left after status change')

    // Change it back for testing
    await updateCreativeStatus(creative2.id, '出量好素材')
    const excellentCreatives2 = await getExcellentCreatives('campaign_002')
    assert(excellentCreatives2.length >= 1, 'Found excellent creative after reverting')

    // ============================================
    // 5. OPERATION SCORE TESTS
    // ============================================
    logSection('5. Operation Score Tests')

    // First, we need a change event to reference
    // Note: In real scenario, we'd reference actual change_events
    // For this test, we'll use null for operation_id (optional FK)

    logTest('Create Operation Score - Excellent')
    const opScore1 = await createOperationScore({
      operationId: null, // Would reference actual change_events.id in production
      campaignId: 'campaign_001',
      optimizerEmail: 'alice@example.com',
      operationType: 'BUDGET_UPDATE',
      operationDate: '2024-11-12',
      evaluationDate: '2024-11-19',
      actualRoas7: '0.5400',
      actualRet7: '0.4200',
      baselineRoas7: '0.4500',
      baselineRet7: '0.3800',
      roasAchievementRate: '120.00',
      retAchievementRate: '110.53',
    })
    assert(!!opScore1, 'Created Operation Score (Excellent)')

    logTest('Create Operation Score - Good')
    const opScore2 = await createOperationScore({
      operationId: null,
      campaignId: 'campaign_001',
      optimizerEmail: 'bob@example.com',
      operationType: 'TROAS_UPDATE',
      operationDate: '2024-11-10',
      evaluationDate: '2024-11-17',
      actualRoas7: '0.4900',
      actualRet7: '0.3900',
      baselineRoas7: '0.4500',
      baselineRet7: '0.3800',
      roasAchievementRate: '108.89',
      retAchievementRate: '102.63',
    })
    assert(!!opScore2, 'Created Operation Score (Good)')

    logTest('Create Operation Score - Failed')
    const opScore3 = await createOperationScore({
      operationId: null,
      campaignId: 'campaign_002',
      optimizerEmail: 'charlie@example.com',
      operationType: 'BUDGET_UPDATE',
      operationDate: '2024-11-08',
      evaluationDate: '2024-11-15',
      actualRoas7: '0.3500',
      actualRet7: '0.3000',
      baselineRoas7: '0.4500',
      baselineRet7: '0.3800',
      roasAchievementRate: '77.78',
      retAchievementRate: '78.95',
    })
    assert(!!opScore3, 'Created Operation Score (Failed)')

    logTest('Create more scores for Alice')
    await createOperationScore({
      operationId: null,
      campaignId: 'campaign_003',
      optimizerEmail: 'alice@example.com',
      operationType: 'BUDGET_UPDATE',
      operationDate: '2024-11-05',
      evaluationDate: '2024-11-12',
      actualRoas7: '0.5800',
      actualRet7: '0.4400',
      baselineRoas7: '0.4500',
      baselineRet7: '0.3800',
      roasAchievementRate: '128.89',
      retAchievementRate: '115.79',
    })

    logTest('Get Operation Scores (All)')
    const allOpScores = await getOperationScores({})
    assert(allOpScores.data.length >= 4, `Retrieved ${allOpScores.data.length} operation scores`)

    logTest('Get Operation Scores by optimizer')
    const aliceScores = await getOperationScores({ optimizerEmail: 'alice@example.com' })
    assert(aliceScores.data.length >= 2, `Alice has ${aliceScores.data.length} operations`)

    logTest('Get Operation Scores by campaign')
    const campaign1Scores = await getOperationScores({ campaignId: 'campaign_001' })
    assert(campaign1Scores.data.length >= 2, `Campaign_001 has ${campaign1Scores.data.length} scores`)

    logTest('Get Optimizer Leaderboard')
    const leaderboard = await getOptimizerLeaderboard()
    assert(leaderboard.length >= 3, `Leaderboard has ${leaderboard.length} optimizers`)
    logInfo(`Top optimizer: ${leaderboard[0].optimizerEmail}`)
    logInfo(`  - Total operations: ${leaderboard[0].totalOperations}`)
    logInfo(`  - Avg ROAS achievement: ${leaderboard[0].avgRoasAchievementRate.toFixed(2)}%`)
    logInfo(`  - Excellent rate: ${leaderboard[0].excellentRate.toFixed(2)}%`)
    assert(leaderboard[0].excellentRate >= 0, 'Excellent rate calculated')

    // ============================================
    // 6. ACTION RECOMMENDATION TESTS
    // ============================================
    logSection('6. Action Recommendation Tests')

    logTest('Create Action Recommendation - Scale Up')
    const recommendation1 = await createActionRecommendation({
      campaignId: 'campaign_001',
      evaluationId: evaluation1.id,
      recommendationDate: '2024-11-19',
      recommendationType: '激进扩量',
      actionOptions: [
        { type: 'budget', options: ['+1%', '+3%', '+5%'] },
        { type: 'troas', options: ['-1%', '-3%', '-5%'] },
      ],
      selectedAction: null,
      executed: false,
    })
    assert(!!recommendation1, 'Created Action Recommendation (Scale Up)')

    logTest('Create Action Recommendation - Scale Down')
    const recommendation2 = await createActionRecommendation({
      campaignId: 'campaign_002',
      evaluationId: evaluation2.id,
      recommendationDate: '2024-11-19',
      recommendationType: '保守缩量',
      actionOptions: [
        { type: 'budget', options: ['-1%', '-3%', '-5%'] },
        { type: 'troas', options: ['+1%', '+3%', '+5%'] },
      ],
      selectedAction: null,
      executed: false,
    })
    assert(!!recommendation2, 'Created Action Recommendation (Scale Down)')

    logTest('Create Action Recommendation - Pause')
    const recommendation3 = await createActionRecommendation({
      campaignId: 'campaign_003',
      evaluationId: evaluation3.id,
      recommendationDate: '2024-11-19',
      recommendationType: '立即关停',
      actionOptions: [{ type: 'pause', options: ['暂停campaign'] }],
      selectedAction: null,
      executed: false,
    })
    assert(!!recommendation3, 'Created Action Recommendation (Pause)')

    logTest('Get Action Recommendations (All)')
    const allRecommendations = await getActionRecommendations({})
    assert(allRecommendations.data.length >= 3, `Retrieved ${allRecommendations.data.length} recommendations`)

    logTest('Get Pending Recommendations')
    const pendingRecs = await getPendingRecommendations()
    assert(pendingRecs.length >= 3, `Found ${pendingRecs.length} pending recommendations`)

    logTest('Get Recommendations by campaign')
    const campaign1Recs = await getActionRecommendations({ campaignId: 'campaign_001' })
    assert(campaign1Recs.data.length >= 1, 'Found recommendations for campaign_001')

    logTest('Mark Recommendation as Executed')
    const executedRec = await markRecommendationAsExecuted(recommendation1.id, {
      type: 'budget',
      change: '+5%',
    })
    assert(!!executedRec, 'Marked recommendation as executed')
    assert(executedRec?.executed === true, 'Executed flag set to true')
    assert(!!executedRec?.executedAt, 'Executed timestamp set')
    assert(
      JSON.stringify(executedRec?.selectedAction) === JSON.stringify({ type: 'budget', change: '+5%' }),
      'Selected action saved correctly'
    )

    logTest('Get Executed Recommendations')
    const executedRecs = await getActionRecommendations({ executed: true })
    assert(executedRecs.data.length >= 1, `Found ${executedRecs.data.length} executed recommendations`)

    logTest('Get Pending Recommendations (after execution)')
    const pendingRecs2 = await getPendingRecommendations()
    assert(pendingRecs2.length === pendingRecs.length - 1, 'Pending count decreased by 1')

    // ============================================
    // FINAL SUMMARY
    // ============================================
    logSection('Test Summary')

    console.log('\n')
    log(`Total Tests Run:    ${testsRun}`, colors.bright)
    log(`✅ Tests Passed:    ${testsPassed}`, colors.green)
    if (testsFailed > 0) {
      log(`❌ Tests Failed:    ${testsFailed}`, colors.red)
    } else {
      log(`❌ Tests Failed:    ${testsFailed}`, colors.green)
    }

    const successRate = ((testsPassed / testsRun) * 100).toFixed(2)
    console.log('\n')
    log(`Success Rate: ${successRate}%`, testsFailed === 0 ? colors.green : colors.yellow)

    if (testsFailed === 0) {
      console.log('\n')
      log('🎉 All tests passed! Query functions are working correctly.', colors.bright + colors.green)
    } else {
      console.log('\n')
      log('⚠️  Some tests failed. Please review the output above.', colors.yellow)
    }

    process.exit(testsFailed === 0 ? 0 : 1)
  } catch (error) {
    console.error('\n')
    logError('Test suite failed with error:')
    console.error(error)
    process.exit(1)
  }
}

// Run the tests
runTests()
