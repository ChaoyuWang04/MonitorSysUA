/**
 * Mock Data Seeding Script
 *
 * Seeds the database with mock data for testing the evaluation system.
 *
 * @deprecated Since Phase 5, the evaluation system uses real AppsFlyer data
 * for A2/A3/A7 evaluation. This script is retained ONLY for A4 Creative
 * Evaluation mock data and development/testing purposes.
 *
 * **Phase 8 Changes**:
 * - Campaign performance seeding removed (use AppsFlyer data)
 * - Creative performance seeding retained for A4 Creative Evaluation
 *
 * Usage:
 *   tsx server/evaluation/mock-data/seed.ts
 */

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@/server/db/schema";
import {
  generateCreativeData,
  generateSafetyBaselines,
  generateCreativeTestBaselines,
} from "./generator";
import { DEFAULT_PRODUCT_CONFIGS } from "./schemas";

// Load environment variables
import dotenv from "dotenv";
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool, { schema });

async function seed() {
  console.warn("\n⚠️  DEPRECATION WARNING:");
  console.warn("    Mock data seeding is deprecated since Phase 5.");
  console.warn("    A2/A3/A7 evaluation now uses real AppsFlyer cohort data.");
  console.warn("    This script seeds ONLY:");
  console.warn("    - Safety baselines (for reference)");
  console.warn("    - Creative test baselines (for A4 Creative Evaluation)");
  console.warn("    - Mock creative data (for A4 Creative Evaluation)\n");
  console.warn("    Campaign performance data should come from AppsFlyer.");
  console.warn("    See docs/migration-mock-to-real.md for details.\n");

  console.log("🌱 Starting mock data seeding (A4 Creative only)...\n");

  try {
    // ============================================================================
    // Step 1: Clear existing mock data
    // ============================================================================
    console.log("Step 1: Clearing existing mock data...");
    await db.delete(schema.mockCreativePerformance);
    await db.delete(schema.creativeTestBaseline);
    await db.delete(schema.safetyBaseline);
    console.log("✓ Cleared existing mock data\n");

    // ============================================================================
    // Step 2: Generate and insert safety baselines
    // ============================================================================
    console.log("Step 2: Generating safety baselines...");
    const safetyBaselines = generateSafetyBaselines(DEFAULT_PRODUCT_CONFIGS);
    await db.insert(schema.safetyBaseline).values(
      safetyBaselines.map((b) => ({
        productName: b.productName,
        countryCode: b.countryCode,
        platform: b.platform,
        channel: b.channel,
        baselineRoas7: b.baselineRoas7.toString(),
        baselineRet7: b.baselineRet7.toString(),
        referencePeriod: b.referencePeriod,
      }))
    );
    console.log(`✓ Inserted ${safetyBaselines.length} safety baselines\n`);

    // ============================================================================
    // Step 3: Generate and insert creative test baselines
    // ============================================================================
    console.log("Step 3: Generating creative test baselines...");
    const creativeBaselines = generateCreativeTestBaselines(DEFAULT_PRODUCT_CONFIGS);
    await db.insert(schema.creativeTestBaseline).values(
      creativeBaselines.map((b) => ({
        productName: b.productName,
        countryCode: b.countryCode,
        platform: b.platform,
        channel: b.channel,
        maxCpi: b.maxCpi.toString(),
        minRoasD3: b.minRoasD3.toString(),
        minRoasD7: b.minRoasD7.toString(),
        excellentCvr: b.excellentCvr.toString(),
      }))
    );
    console.log(`✓ Inserted ${creativeBaselines.length} creative test baselines\n`);

    // NOTE: Steps 4 & 5 (historical/current campaign data) have been removed (Phase 8).
    // Campaign evaluation now uses AppsFlyer data. See docs/migration-mock-to-real.md

    // ============================================================================
    // Step 4: Generate and insert creative data (for A4 Creative Evaluation)
    // ============================================================================
    console.log("Step 4: Generating creative data for A4 evaluation...");

    // Generate creatives for sample test campaigns
    const sampleCampaignIds = DEFAULT_PRODUCT_CONFIGS.flatMap((config) =>
      config.countries.map((country) => `test-campaign-${config.productName}-${country}`)
    ).slice(0, 20);

    let creativeDataCount = 0;

    for (const config of DEFAULT_PRODUCT_CONFIGS) {
      const configCampaigns = sampleCampaignIds.filter((id) =>
        id.includes(config.productName)
      );

      if (configCampaigns.length === 0) continue;

      console.log(`  Generating creatives for ${config.productName}...`);
      const creativeData = generateCreativeData(config, configCampaigns, 10); // 10 creatives per campaign

      await db.insert(schema.mockCreativePerformance).values(
        creativeData.map((d) => ({
          creativeId: d.creativeId,
          creativeName: d.creativeName,
          campaignId: d.campaignId,
          productName: d.productName,
          countryCode: d.countryCode,
          platform: d.platform,
          channel: d.channel,
          impressions: d.impressions,
          installs: d.installs,
          cvr: d.cvr.toFixed(6),
          cpi: d.cpi.toFixed(2),
          roasD3: d.roasD3.toFixed(4),
          roasD7: d.roasD7.toFixed(4),
          spend: d.spend.toFixed(2),
        }))
      );

      creativeDataCount += creativeData.length;
      console.log(`    ✓ Inserted ${creativeData.length} records`);
    }

    console.log(`✓ Total creative records: ${creativeDataCount}\n`);

    // ============================================================================
    // Summary
    // ============================================================================
    console.log("═══════════════════════════════════════════════════════");
    console.log("✅ Mock data seeding completed successfully!");
    console.log("═══════════════════════════════════════════════════════");
    console.log(`Safety baselines:           ${safetyBaselines.length}`);
    console.log(`Creative test baselines:    ${creativeBaselines.length}`);
    console.log(`Creative data (A4):         ${creativeDataCount}`);
    console.log("═══════════════════════════════════════════════════════\n");

    console.log("💡 Next steps:");
    console.log("   1. For A2/A3/A7 evaluation, use AppsFlyer data:");
    console.log("      just af-sync-yesterday");
    console.log("   2. For A4 creative evaluation testing:");
    console.log("      tsx server/evaluation/test-creative.ts");
    console.log("   3. Start development server: npm run dev\n");

  } catch (error) {
    console.error("❌ Error seeding mock data:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run seeding
seed()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
