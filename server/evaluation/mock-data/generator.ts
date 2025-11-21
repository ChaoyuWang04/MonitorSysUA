/**
 * Mock Data Generator
 *
 * Generates realistic mock data for testing the evaluation system
 */

import {
  MockCampaignPerformanceData,
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

/**
 * Generate historical campaign data (180 days ago)
 * Used for calculating safety baselines
 */
export function generateHistoricalCampaignData(
  config: ProductConfig,
  referenceMonth: Date,
  campaignCount: number = 20
): MockCampaignPerformanceData[] {
  const data: MockCampaignPerformanceData[] = [];

  for (const country of config.countries) {
    for (let i = 0; i < campaignCount; i++) {
      const campaignId = `campaign-${config.productName}-${country}-hist-${i}`;

      // Calculate month boundaries
      const year = referenceMonth.getFullYear();
      const month = referenceMonth.getMonth();
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0);

      // Generate daily data for the entire month
      for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
        const totalSpend = randomInRange(50, 2000);
        const totalInstalls = randomInt(10, 400);

        // ROAS7: mean 45%, stdDev 15%
        const roas7 = Math.max(0.05, Math.min(0.85, randomNormal(0.45, 0.15)));
        const totalRevenue = totalSpend * roas7;

        // RET7: mean 38%, stdDev 10%
        const ret7 = Math.max(0.10, Math.min(0.60, randomNormal(0.38, 0.10)));
        const d7ActiveUsers = Math.round(totalInstalls * ret7);

        data.push({
          campaignId,
          campaignName: `${config.productName} ${country} Historical ${i}`,
          productName: config.productName,
          countryCode: country,
          platform: config.platform,
          channel: config.channel,
          date: new Date(date),
          totalSpend,
          totalRevenue,
          totalInstalls,
          d7ActiveUsers,
          actualRoas7: roas7,
          actualRet7: ret7,
        });
      }
    }
  }

  return data;
}

/**
 * Generate current campaign data
 * Used for campaign evaluation
 */
export function generateCurrentCampaignData(
  config: ProductConfig,
  currentDate: Date,
  campaignCount: number = 30
): MockCampaignPerformanceData[] {
  const data: MockCampaignPerformanceData[] = [];

  for (const country of config.countries) {
    // Generate various campaign types with different performance levels
    const performanceLevels = [
      { name: "excellent", roas: 0.60, ret: 0.45, count: Math.floor(campaignCount * 0.20) }, // 20%
      { name: "healthy", roas: 0.52, ret: 0.40, count: Math.floor(campaignCount * 0.25) }, // 25%
      { name: "observation", roas: 0.42, ret: 0.36, count: Math.floor(campaignCount * 0.25) }, // 25%
      { name: "warning", roas: 0.35, ret: 0.30, count: Math.floor(campaignCount * 0.20) }, // 20%
      { name: "danger", roas: 0.25, ret: 0.22, count: Math.floor(campaignCount * 0.10) }, // 10%
    ];

    let campaignIndex = 0;

    for (const level of performanceLevels) {
      for (let i = 0; i < level.count; i++) {
        const campaignId = `campaign-${config.productName}-${country}-${level.name}-${i}`;

        // Vary spend: 50% test campaigns (<$1000), 50% mature campaigns (>=$1000)
        const totalSpend = campaignIndex % 2 === 0
          ? randomInRange(100, 900) // Test campaign
          : randomInRange(1000, 5000); // Mature campaign

        const totalInstalls = Math.round(totalSpend / randomInRange(3, 8)); // CPI between $3-$8

        // Performance around level mean with some variance
        const roas7 = Math.max(0.05, randomNormal(level.roas, 0.05));
        const totalRevenue = totalSpend * roas7;

        const ret7 = Math.max(0.10, randomNormal(level.ret, 0.03));
        const d7ActiveUsers = Math.round(totalInstalls * ret7);

        data.push({
          campaignId,
          campaignName: `${config.productName} ${country} ${level.name.toUpperCase()} ${i}`,
          productName: config.productName,
          countryCode: country,
          platform: config.platform,
          channel: config.channel,
          date: currentDate,
          totalSpend,
          totalRevenue,
          totalInstalls,
          d7ActiveUsers,
          actualRoas7: roas7,
          actualRet7: ret7,
        });

        campaignIndex++;
      }
    }
  }

  return data;
}

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
