/**
 * Mock Data Generator
 *
 * Generates mock data for testing the evaluation system.
 *
 * @deprecated Since Phase 5, use AppsFlyer data instead of mock data.
 * The evaluation system now uses real cohort data from af_cohort_kpi_daily
 * and af_events tables.
 *
 * **Phase 8 Changes**:
 * - Campaign performance generators removed (use AppsFlyer data)
 * - Creative generators retained for A4 Creative Evaluation only
 *
 * For production evaluation, use:
 * - calculateBaselineFromAF() in baseline-calculator.ts
 * - evaluateCampaignFromAF() in campaign-evaluator.ts
 * - evaluateOperationFromAF() in operation-evaluator.ts
 */

import {
  MockCreativePerformanceData,
  SafetyBaselineData,
  CreativeTestBaselineData,
  ProductConfig,
  DEFAULT_PRODUCT_CONFIGS,
} from "./schemas";

/**
 * Random number generator with normal distribution
 */
function randomNormal(mean: number, stdDev: number): number {
  // Box-Muller transform
  const u1 = Math.random();
  const u2 = Math.random();
  const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + stdDev * z0;
}

/**
 * Random number in range [min, max]
 */
function randomInRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

/**
 * Random integer in range [min, max]
 */
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// NOTE: generateHistoricalCampaignData and generateCurrentCampaignData have been removed (Phase 8).
// Campaign evaluation now uses AppsFlyer data. See docs/migration-mock-to-real.md

/**
 * Generate creative performance data
 * Used for creative evaluation (D3 and D7)
 */
export function generateCreativeData(
  config: ProductConfig,
  campaignIds: string[],
  creativesPerCampaign: number = 10
): MockCreativePerformanceData[] {
  const data: MockCreativePerformanceData[] = [];

  for (const campaignId of campaignIds) {
    // Only generate creatives for test campaigns
    if (!campaignId.includes("test") && Math.random() > 0.3) {
      // 70% chance to skip non-test campaigns
      continue;
    }

    const country = campaignId.includes("US") ? "US" : campaignId.includes("JP") ? "JP" : "US";

    for (let i = 0; i < creativesPerCampaign; i++) {
      const creativeId = `creative-${campaignId}-${i}`;

      const impressions = randomInt(1000, 50000);
      const cvr = randomInRange(0.003, 0.015); // 0.3% - 1.5%
      const installs = Math.round(impressions * cvr);

      const cpi = randomInRange(3, 12);
      const spend = installs * cpi;

      // D3 ROAS: typically lower, 5-20%
      const roasD3 = randomInRange(0.05, 0.20);

      // D7 ROAS: typically higher, 10-60%
      const roasD7 = randomInRange(0.10, 0.60);

      data.push({
        creativeId,
        creativeName: `Creative ${i} - ${config.productName}`,
        campaignId,
        productName: config.productName,
        countryCode: country,
        platform: config.platform,
        channel: config.channel,
        impressions,
        installs,
        cvr,
        cpi,
        roasD3,
        roasD7,
        spend,
      });
    }
  }

  return data;
}

/**
 * Generate safety baseline data
 * Based on historical campaign data
 */
export function generateSafetyBaselines(
  configs: ProductConfig[]
): SafetyBaselineData[] {
  const data: SafetyBaselineData[] = [];

  // Calculate reference period (6 months ago)
  const now = new Date();
  const referenceDate = new Date(now);
  referenceDate.setMonth(now.getMonth() - 6);
  const referencePeriod = `${referenceDate.getFullYear()}-${String(referenceDate.getMonth() + 1).padStart(2, "0")}`;

  for (const config of configs) {
    for (const country of config.countries) {
      // Baseline values based on PRD specifications
      // ROAS7: typically 45% (range: 35%-55%)
      const baselineRoas7 = randomNormal(0.45, 0.05);

      // RET7: typically 38% (range: 30%-45%)
      const baselineRet7 = randomNormal(0.38, 0.04);

      data.push({
        productName: config.productName,
        countryCode: country,
        platform: config.platform,
        channel: config.channel,
        baselineRoas7: Math.max(0.30, Math.min(0.60, baselineRoas7)),
        baselineRet7: Math.max(0.25, Math.min(0.50, baselineRet7)),
        referencePeriod,
      });
    }
  }

  return data;
}

/**
 * Generate creative test baseline data
 * Thresholds for creative evaluation
 */
export function generateCreativeTestBaselines(
  configs: ProductConfig[]
): CreativeTestBaselineData[] {
  const data: CreativeTestBaselineData[] = [];

  for (const config of configs) {
    for (const country of config.countries) {
      // CPI thresholds by country (from PRD)
      let maxCpi: number;
      if (country === "US") maxCpi = 7.0;
      else if (country === "JP") maxCpi = 10.0;
      else if (country === "KR") maxCpi = 8.0;
      else maxCpi = 4.0; // Small countries

      // ROAS thresholds
      const minRoasD3 = 0.10; // 10% minimum D3 ROAS
      const minRoasD7 = 0.30; // 30% minimum D7 ROAS (should be below baseline_roas7)

      // CVR threshold for "high-volume creatives"
      const excellentCvr = 0.0067; // 0.67% (3000 impressions → 20 installs)

      data.push({
        productName: config.productName,
        countryCode: country,
        platform: config.platform,
        channel: config.channel,
        maxCpi,
        minRoasD3,
        minRoasD7,
        excellentCvr,
      });
    }
  }

  return data;
}
