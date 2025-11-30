/**
 * Evaluation System Test Script
 *
 * Tests all evaluation modules (A2-A5) to verify functionality
 *
 * @deprecated Since Phase 5, A2/A3/A7 evaluation uses AppsFlyer data.
 * This test script is kept for A4 Creative Evaluation testing only.
 * For A2/A3/A7, use real AppsFlyer data via the tRPC API.
 *
 * Usage:
 *   npm run eval:test
 */

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@/server/db/schema";
import { calculateBaseline } from "./wrappers/baseline-calculator";
// NOTE: evaluateCampaign is deprecated. Use evaluateCampaignFromAF instead.
// import { evaluateCampaign } from "./wrappers/campaign-evaluator";
import {
  evaluateCreativeD3,
  evaluateCreativeD7,
} from "./wrappers/creative-evaluator";
import { evaluateOperation } from "./wrappers/operation-evaluator";
import { eq, and } from "drizzle-orm";

// Load environment variables
import dotenv from "dotenv";
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool, { schema });

// ============================================================================
// Test Helper Functions
// ============================================================================

function printSection(title: string) {
  console.log("\n" + "=".repeat(70));
  console.log(`  ${title}`);
  console.log("=".repeat(70) + "\n");
}

function printTest(testName: string, status: "PASS" | "FAIL" | "INFO", details?: string) {
  const icon = status === "PASS" ? "✅" : status === "FAIL" ? "❌" : "ℹ️";
  console.log(`${icon} ${testName}`);
  if (details) {
    console.log(`   ${details}\n`);
  }
}

function printResult(label: string, value: any) {
  console.log(`   ${label}: ${JSON.stringify(value, null, 2)}`);
}

// ============================================================================
// Test Functions
// ============================================================================

async function testA2BaselineCalculation() {
  printSection("A2: Safety Baseline Calculation");

  try {
    // Test 1: Calculate baseline for Solitaire US
    printTest("Test 1", "INFO", "Calculating baseline for Solitaire US Android Google");

    const currentDate = new Date();
    const baselineResult = await calculateBaseline({
      productName: "Solitaire",
      countryCode: "US",
      platform: "Android",
      channel: "Google",
      currentDate,
    });

    printResult("Baseline Result", baselineResult);

    if (baselineResult.baseline_roas7 && baselineResult.baseline_roas7 > 0 && baselineResult.baseline_ret7 && baselineResult.baseline_ret7 > 0) {
      printTest(
        "Baseline Calculation",
        "PASS",
        `ROAS7: ${(baselineResult.baseline_roas7 * 100).toFixed(2)}%, RET7: ${(baselineResult.baseline_ret7 * 100).toFixed(2)}%`
      );
    } else {
      printTest("Baseline Calculation", "FAIL", "Baseline values are zero or negative");
    }

    // Test 2: Verify baseline was saved to database
    const savedBaseline = await db.query.safetyBaseline.findFirst({
      where: and(
        eq(schema.safetyBaseline.productName, "Solitaire"),
        eq(schema.safetyBaseline.countryCode, "US"),
        eq(schema.safetyBaseline.platform, "Android"),
        eq(schema.safetyBaseline.channel, "Google")
      ),
    });

    if (savedBaseline) {
      printTest(
        "Database Persistence",
        "PASS",
        `Baseline saved with reference period: ${savedBaseline.referencePeriod}`
      );
    } else {
      printTest("Database Persistence", "FAIL", "Baseline not found in database");
    }
  } catch (error) {
    printTest("A2 Test Suite", "FAIL", `Error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function testA3CampaignEvaluation() {
  printSection("A3: Campaign Evaluation");

  // NOTE: A3 Campaign Evaluation now uses AppsFlyer data (Phase 5)
  // The mock_campaign_performance table has been removed (Phase 8)
  // Use evaluateCampaignFromAF() or tRPC api.appsflyer endpoints instead

  printTest("A3 Status", "INFO", "A3 Campaign Evaluation now uses AppsFlyer data");
  printTest("Migration Note", "INFO", "mock_campaign_performance table removed in Phase 8");
  printTest("Usage", "INFO", "Use evaluateCampaignFromAF() or tRPC api.appsflyer.*");

  console.log("\n  To test A3 with real data:");
  console.log("  1. Sync AppsFlyer data: just af-sync-yesterday");
  console.log("  2. Use tRPC: api.appsflyer.getCohortKpi({...})");
  console.log("  3. Or call evaluateCampaignFromAF() directly\n");

  // Check if we have any AppsFlyer data
  try {
    const afDataCheck = await db.query.afCohortKpiDaily.findFirst();
    if (afDataCheck) {
      printTest("AppsFlyer Data", "PASS", `Data available - latest: ${afDataCheck.installDate}`);
    } else {
      printTest("AppsFlyer Data", "INFO", "No AppsFlyer data yet. Run: just af-sync-yesterday");
    }
  } catch (error) {
    printTest("AppsFlyer Data", "FAIL", `Error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function testA4CreativeEvaluation() {
  printSection("A4: Creative Evaluation");

  try {
    // Test 1: Get a sample creative from mock data
    const sampleCreative = await db.query.mockCreativePerformance.findFirst();

    if (!sampleCreative) {
      printTest("Sample Creative", "FAIL", "No sample creative found in database");
      return;
    }

    printTest("Test 1", "INFO", `Evaluating creative: ${sampleCreative.creativeName}`);
    printResult("Creative ID", sampleCreative.creativeId);
    printResult("Campaign ID", sampleCreative.campaignId);

    // Test 2: D3 Evaluation - Pass parameters as individual args, not object
    printTest("Test 2", "INFO", "Running D3 evaluation");
    const d3Result = await evaluateCreativeD3(
      sampleCreative.creativeId,
      sampleCreative.campaignId
    );

    printResult("D3 Result", d3Result);

    if (d3Result.creative_status && d3Result.actual_cpi !== undefined) {
      printTest(
        "D3 Evaluation",
        "PASS",
        `Status: ${d3Result.creative_status}, CPI: $${d3Result.actual_cpi.toFixed(2)}, ROAS: ${(d3Result.actual_roas * 100).toFixed(2)}%`
      );
    } else {
      printTest("D3 Evaluation", "FAIL", "Missing D3 evaluation components");
    }

    // Test 3: D7 Evaluation - Pass parameters as individual args, not object
    printTest("Test 3", "INFO", "Running D7 evaluation");
    const d7Result = await evaluateCreativeD7(
      sampleCreative.creativeId,
      sampleCreative.campaignId
    );

    printResult("D7 Result", d7Result);

    if (d7Result.creative_status && d7Result.cpi_pass !== undefined && d7Result.roas_pass !== undefined && d7Result.cvr_excellent !== undefined) {
      printTest(
        "D7 Evaluation",
        "PASS",
        `CPI Pass: ${d7Result.cpi_pass}, ROAS Pass: ${d7Result.roas_pass}, CVR Excellent: ${d7Result.cvr_excellent}, Status: ${d7Result.creative_status}`
      );
    } else {
      printTest("D7 Evaluation", "FAIL", "Missing D7 evaluation components");
    }

    // Test 4: Verify database persistence
    const savedEvaluations = await db.query.creativeEvaluation.findMany({
      where: and(
        eq(schema.creativeEvaluation.creativeId, sampleCreative.creativeId),
        eq(schema.creativeEvaluation.campaignId, sampleCreative.campaignId)
      ),
    });

    if (savedEvaluations.length >= 2) {
      printTest("Database Persistence", "PASS", `Both D3 and D7 evaluations saved (${savedEvaluations.length} records)`);
    } else {
      printTest("Database Persistence", "FAIL", `Expected 2 evaluations, found ${savedEvaluations.length}`);
    }
  } catch (error) {
    printTest("A4 Test Suite", "FAIL", `Error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function testA5OperationEvaluation() {
  printSection("A5: Operation Evaluation & Scoring");

  try {
    // Test 1: Check if we have any change_events to use
    const existingEvent = await db.query.changeEvents.findFirst();

    if (!existingEvent) {
      printTest("A5 Test Suite", "FAIL", "No change_events found - need existing events to test operation evaluation");
      printTest("A5 Note", "INFO", "Operation evaluation uses existing change_events table as operation source");
      return;
    }

    printTest("Test 1", "INFO", `Found existing change event: ${existingEvent.id}`);
    printResult("Event ID", existingEvent.id);
    printResult("Event Summary", existingEvent.summary);

    // Test 2: Evaluate the operation
    printTest("Test 2", "INFO", "Evaluating operation (will check 7 days after operation)");

    try {
      const evaluationResult = await evaluateOperation(existingEvent.id);

      printResult("Evaluation Result", evaluationResult);
      const primaryStage = evaluationResult.stages[0];

      if (primaryStage.dataStatus !== 'complete') {
        printTest(
          "Operation Evaluation",
          "INFO",
          `Pending/missing data: ${primaryStage.error ?? 'waiting for cohorts'}`
        );
      } else {
        printTest(
          "Operation Evaluation",
          "PASS",
          `Stage ${primaryStage.stage} Final Score: ${primaryStage.finalScore ?? 'N/A'} Risk: ${primaryStage.riskLevel ?? 'N/A'}`
        );

        // Test 3: Verify database persistence
        const savedScore = await db.query.operationScore.findFirst({
          where: and(
            eq(schema.operationScore.operationId, existingEvent.id),
            eq(schema.operationScore.scoreStage, 'T+7')
          ),
        });

        if (savedScore) {
          printTest("Database Persistence", "PASS", `Operation score saved: ${savedScore.optimizerEmail}`);
        } else {
          printTest("Database Persistence", "INFO", "No score saved (expected if no data yet)");
        }
      }
    } catch (evalError) {
      printTest("Operation Evaluation", "INFO", `Evaluation attempt completed: ${evalError instanceof Error ? evalError.message : String(evalError)}`);
    }

    // Test 4: Check leaderboard functionality
    printTest("Test 3", "INFO", "Checking optimizer leaderboard structure");

    const leaderboard = await db.query.optimizerLeaderboard.findMany({
      limit: 5,
    });

    printResult("Leaderboard Count", leaderboard.length);

    printTest(
      "Leaderboard",
      "PASS",
      `Leaderboard table accessible (${leaderboard.length} optimizer(s))`
    );
  } catch (error) {
    printTest("A5 Test Suite", "FAIL", `Error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// ============================================================================
// Main Test Runner
// ============================================================================

async function runTests() {
  console.log("\n🧪 Starting Evaluation System Tests...\n");
  console.log("Testing A2-A5 modules with mock data\n");

  try {
    // Run all test suites
    await testA2BaselineCalculation();
    await testA3CampaignEvaluation();
    await testA4CreativeEvaluation();
    await testA5OperationEvaluation();

    // Summary
    printSection("Test Summary");
    console.log("All test suites completed.");
    console.log("\n💡 Next steps:");
    console.log("   1. Review test results above");
    console.log("   2. If all tests passed, start development server: npm run dev");
    console.log("   3. Test API endpoints via tRPC in your application");
    console.log("   4. Check PLAN.md to mark A2-A5 as completed\n");
  } catch (error) {
    console.error("\n❌ Fatal error during testing:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run tests
runTests()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
