/**
 * Mock Data Seeding Script
 *
 * Seeds the database with mock data for testing the evaluation system
 *
 * @deprecated Since Phase 5, the evaluation system uses real AppsFlyer data.
 * This seeding script is retained for development/testing purposes only.
 * Production evaluation uses af_cohort_kpi_daily and af_events tables.
 *
 * Usage:
 *   tsx server/evaluation/mock-data/seed.ts
 */

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@/server/db/schema";
import {
  generateHistoricalCampaignData,
  generateCurrentCampaignData,
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
  console.warn("    This mock data seeder is deprecated since Phase 5.");
  console.warn("    The evaluation system now uses real AppsFlyer cohort data.");
  console.warn("    Use this script only for development/testing purposes.\n");

  console.log("🌱 Starting mock data seeding...\n");

  try {
    // ============================================================================
    // Step 1: Clear existing mock data
    // ============================================================================
    console.log("Step 1: Clearing existing mock data...");
    await db.delete(schema.mockCreativePerformance);
    await db.delete(schema.mockCampaignPerformance);
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

    // ============================================================================
    // Step 4: Generate and insert historical campaign data (180 days ago)
    // ============================================================================
    console.log("Step 4: Generating historical campaign data (180 days ago)...");

    const now = new Date();
    const referenceDate = new Date(now);
    referenceDate.setMonth(now.getMonth() - 6);
    referenceDate.setDate(1); // Start of reference month

    let historicalDataCount = 0;

    for (const config of DEFAULT_PRODUCT_CONFIGS) {
      console.log(`  Generating data for ${config.productName}...`);
      const historicalData = generateHistoricalCampaignData(config, referenceDate, 5); // 5 campaigns per country

      // Insert in batches
      const batchSize = 100;
      for (let i = 0; i < historicalData.length; i += batchSize) {
        const batch = historicalData.slice(i, i + batchSize);
        await db.insert(schema.mockCampaignPerformance).values(
          batch.map((d) => ({
            campaignId: d.campaignId,
            campaignName: d.campaignName,
            productName: d.productName,
            countryCode: d.countryCode,
            platform: d.platform,
            channel: d.channel,
            date: d.date.toISOString().split("T")[0],
            totalSpend: d.totalSpend.toFixed(2),
            totalRevenue: d.totalRevenue.toFixed(2),
            totalInstalls: d.totalInstalls,
            d7ActiveUsers: d.d7ActiveUsers,
            actualRoas7: d.actualRoas7.toFixed(4),
            actualRet7: d.actualRet7.toFixed(4),
          }))
        );
      }

      historicalDataCount += historicalData.length;
      console.log(`    ✓ Inserted ${historicalData.length} records`);
    }

    console.log(`✓ Total historical campaign records: ${historicalDataCount}\n`);

    // ============================================================================
    // Step 5: Generate and insert current campaign data
    // ============================================================================
    console.log("Step 5: Generating current campaign data...");

    const currentDate = new Date();
    let currentDataCount = 0;
    const allCampaignIds: string[] = [];

    for (const config of DEFAULT_PRODUCT_CONFIGS) {
      console.log(`  Generating data for ${config.productName}...`);
      const currentData = generateCurrentCampaignData(config, currentDate, 30); // 30 campaigns per country

      await db.insert(schema.mockCampaignPerformance).values(
        currentData.map((d) => {
          allCampaignIds.push(d.campaignId);
          return {
            campaignId: d.campaignId,
            campaignName: d.campaignName,
            productName: d.productName,
            countryCode: d.countryCode,
            platform: d.platform,
            channel: d.channel,
            date: d.date.toISOString().split("T")[0],
            totalSpend: d.totalSpend.toFixed(2),
            totalRevenue: d.totalRevenue.toFixed(2),
            totalInstalls: d.totalInstalls,
            d7ActiveUsers: d.d7ActiveUsers,
            actualRoas7: d.actualRoas7.toFixed(4),
            actualRet7: d.actualRet7.toFixed(4),
          };
        })
      );

      currentDataCount += currentData.length;
      console.log(`    ✓ Inserted ${currentData.length} records`);
    }

    console.log(`✓ Total current campaign records: ${currentDataCount}\n`);

    // ============================================================================
    // Step 6: Generate and insert creative data
    // ============================================================================
    console.log("Step 6: Generating creative data...");

    // Generate creatives for test campaigns (those with spend < $1000)
    const testCampaignIds = allCampaignIds.filter((id) =>
      id.includes("test") || id.includes("danger") || id.includes("warning")
    ).slice(0, 20); // Limit to 20 campaigns for reasonable data size

    let creativeDataCount = 0;

    for (const config of DEFAULT_PRODUCT_CONFIGS) {
      const configCampaigns = testCampaignIds.filter((id) =>
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
    console.log(`Historical campaign data:   ${historicalDataCount}`);
    console.log(`Current campaign data:      ${currentDataCount}`);
    console.log(`Creative data:              ${creativeDataCount}`);
    console.log("═══════════════════════════════════════════════════════\n");

    console.log("💡 Next steps:");
    console.log("   1. Run evaluation system tests: tsx server/evaluation/test-evaluation.ts");
    console.log("   2. Start development server: npm run dev");
    console.log("   3. Test API endpoints via tRPC\n");

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
