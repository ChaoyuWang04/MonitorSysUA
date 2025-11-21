/**
 * Mock Data Type Definitions
 */

export interface MockCampaignPerformanceData {
  campaignId: string;
  campaignName: string;
  productName: string;
  countryCode: string;
  platform: string;
  channel: string;
  date: Date;
  totalSpend: number;
  totalRevenue: number;
  totalInstalls: number;
  d7ActiveUsers: number;
  actualRoas7: number;
  actualRet7: number;
}

export interface MockCreativePerformanceData {
  creativeId: string;
  creativeName: string;
  campaignId: string;
  productName: string;
  countryCode: string;
  platform: string;
  channel: string;
  impressions: number;
  installs: number;
  cvr: number;
  cpi: number;
  roasD3: number;
  roasD7: number;
  spend: number;
}

export interface SafetyBaselineData {
  productName: string;
  countryCode: string;
  platform: string;
  channel: string;
  baselineRoas7: number;
  baselineRet7: number;
  referencePeriod: string;
}

export interface CreativeTestBaselineData {
  productName: string;
  countryCode: string;
  platform: string;
  channel: string;
  maxCpi: number;
  minRoasD3: number;
  minRoasD7: number;
  excellentCvr: number;
}

export interface ProductConfig {
  productName: string;
  countries: string[];
  platform: string;
  channel: string;
}

export const DEFAULT_PRODUCT_CONFIGS: ProductConfig[] = [
  {
    productName: "Solitaire",
    countries: ["US", "JP", "KR", "UK", "CA"],
    platform: "Android",
    channel: "Google",
  },
  {
    productName: "Poker",
    countries: ["US", "UK", "CA"],
    platform: "Android",
    channel: "Google",
  },
];
