/**
 * Evaluation System Type Definitions
 *
 * This file contains all TypeScript types used in the evaluation system frontend.
 * Types are based on the database schema defined in server/db/schema.ts
 */

// ============================================================================
// Campaign Evaluation Types
// ============================================================================

/**
 * Campaign evaluation status based on minimum achievement rate
 */
export enum CampaignStatus {
  EXCELLENT = 'excellent',    // ≥ 110%
  HEALTHY = 'healthy',        // 100-110%
  OBSERVATION = 'observation', // 85-100%
  WARNING = 'warning',        // 60-85%
  DANGER = 'danger',          // < 60%
}

/**
 * Campaign type based on total spend
 */
export enum CampaignType {
  TEST = 'test',       // Total spend < $1,000
  MATURE = 'mature',   // Total spend ≥ $1,000
}

/**
 * Recommendation types for campaign adjustments
 */
export enum RecommendationType {
  AGGRESSIVE_SCALE = 'aggressive_scale',      // 激进扩量
  CONSERVATIVE_SCALE = 'conservative_scale',  // 保守扩量
  OBSERVE = 'observe',                        // 继续观察
  CONSERVATIVE_REDUCE = 'conservative_reduce', // 保守缩量
  SHUTDOWN = 'shutdown',                      // 关停
}

/**
 * Campaign evaluation record
 */
export interface CampaignEvaluation {
  id: number
  campaignId: string
  campaignName: string | null
  evaluationDate: Date
  campaignType: CampaignType | null
  totalSpend: number | null
  actualRoas7: number | null
  actualRet7: number | null
  baselineRoas7: number | null
  baselineRet7: number | null
  roasAchievementRate: number | null
  retAchievementRate: number | null
  minAchievementRate: number | null
  recommendationType: RecommendationType | null
  status: CampaignStatus | null
  createdAt: Date
}

// ============================================================================
// Creative Evaluation Types
// ============================================================================

/**
 * Creative evaluation status
 */
export enum CreativeStatus {
  TESTING = 'testing',                    // 测试中
  PASSED = 'passed',                      // 及格
  FAILED = 'failed',                      // 不及格
  EXCELLENT = 'excellent',                // 出量好素材
  PENDING_CONFIRMATION = 'pending_confirmation', // 待确认
  SYNCED = 'synced',                      // 已同步
}

/**
 * Evaluation day for creatives
 */
export enum EvaluationDay {
  D3 = 'D3',
  D7 = 'D7',
}

/**
 * Creative evaluation record
 */
export interface CreativeEvaluation {
  id: number
  campaignId: string
  creativeId: string | null
  creativeName: string | null
  evaluationDay: EvaluationDay | null
  evaluationDate: Date
  impressions: number | null
  installs: number | null
  cvr: number | null
  actualCpi: number | null
  actualRoas: number | null
  maxCpiThreshold: number | null
  minRoasThreshold: number | null
  creativeStatus: CreativeStatus | null
  createdAt: Date
}

// ============================================================================
// Operation Score Types
// ============================================================================

/**
 * Operation type
 */
export enum OperationType {
  BUDGET_UPDATE = 'budget_update',
  TROAS_UPDATE = 'troas_update',
  STATUS_CHANGE = 'status_change',
  CAMPAIGN_CREATE = 'campaign_create',
}

/**
 * Operation status based on achievement rate
 */
export enum OperationStatus {
  EXCELLENT = 'excellent',  // Achievement rate ≥ 110%
  NORMAL = 'normal',        // Achievement rate 85-110%
  WARNING = 'warning',      // Achievement rate < 85%
}

/**
 * Operation score record
 */
export interface OperationScore {
  id: number
  operationId: number | null
  campaignId: string
  optimizerEmail: string | null
  optimizerId?: string // For compatibility
  optimizerName?: string // For display
  operationType: OperationType | null
  operationDate: Date
  evaluationDate: Date
  actualRoas7: number | null
  actualRet7: number | null
  baselineRoas7: number | null
  baselineRet7: number | null
  roasAchievementRate: number | null
  retAchievementRate: number | null
  // Score breakdown fields
  totalScore?: number | null
  decisionQualityScore?: number | null
  executionEfficiencyScore?: number | null
  riskManagementScore?: number | null
  // Action execution stats
  actionsExecuted?: number
  successfulActions?: number
  failedActions?: number
  avgResponseTime?: number | null
  // Status
  status?: OperationStatus | null
  createdAt: Date
}

/**
 * Optimizer score for leaderboard display
 * Matches the OptimizerStats interface from Python backend
 */
export interface OptimizerScore {
  optimizer_email: string
  total_operations: number
  avg_roas_achievement: number
  avg_ret_achievement: number
  avg_min_achievement: number
  excellent_count: number
  excellent_rate: number
  good_count: number
  good_rate: number
  failed_count: number
  failed_rate: number
}

/**
 * Optimizer leaderboard entry
 */
export interface OptimizerLeaderboard {
  optimizerEmail: string
  totalOperations: number
  successRate: number // Percentage of operations with achievement rate ≥ 110%
  avgAchievementRate: number
  failRate: number // Percentage of operations with achievement rate < 85%
  rank: number
}

// ============================================================================
// Action Recommendation Types
// ============================================================================

/**
 * Action type for recommendations
 */
export enum ActionType {
  BUDGET = 'budget',
  TROAS = 'troas',
  PAUSE = 'pause',
  OBSERVE = 'observe',
  CHANGE_CREATIVE = 'change_creative',
}

/**
 * Single action option
 */
export interface ActionOption {
  type: ActionType
  label: string
  options?: string[] // e.g., ['+1%', '+3%', '+5%']
  description?: string
}

/**
 * Selected action by optimizer
 */
export interface SelectedAction {
  type: ActionType
  change?: string // e.g., '+3%', '-5%'
  customValue?: number
}

/**
 * Action recommendation record
 */
export interface ActionRecommendation {
  id: number
  campaignId: string
  evaluationId: number | null
  recommendationDate: Date
  recommendationType: RecommendationType | null
  actionOptions: ActionOption[] | null
  selectedAction: SelectedAction | null
  executed: boolean
  executedAt: Date | null
  createdAt: Date
}

// ============================================================================
// Baseline Types
// ============================================================================

/**
 * Safety baseline (180 days ago reference)
 */
export interface SafetyBaseline {
  id: number
  productName: string
  countryCode: string
  platform: string
  channel: string
  baselineRoas7: number | null
  baselineRet7: number | null
  referencePeriod: string | null
  lastUpdated: Date
}

/**
 * Baseline settings for configurable window per app/geo/media source
 * Uses AppsFlyer data source
 */
export interface BaselineSettings {
  id: number
  appId: string
  geo: string
  mediaSource: string
  windowDays: number
  minCohorts: number
  createdAt: Date
  updatedAt: Date
}

/**
 * Data source indicator for evaluation results
 */
export enum DataSource {
  APPSFLYER = 'appsflyer',      // Real AppsFlyer cohort data
  MOCK = 'mock',                 // Mock/test data (deprecated)
}

/**
 * AppsFlyer-based campaign evaluation result
 */
export interface CampaignEvaluationFromAF {
  campaignId: string
  campaignName: string | null
  evaluationDate: string
  campaignType: CampaignType | null
  totalSpend: number | null
  actualRoas7: number | null
  actualRet7: number | null
  baselineRoas7: number | null
  baselineRet7: number | null
  roasAchievementRate: number | null
  retAchievementRate: number | null
  minAchievementRate: number | null
  recommendationType: RecommendationType | null
  status: CampaignStatus | null
  dataSource: DataSource
  cohortCount: number
  installDateRange: {
    start: Date
    end: Date
  }
}

/**
 * AppsFlyer-based operation evaluation result
 */
export interface OperationEvaluationFromAF {
  operationId: number
  campaignId: string
  appId: string
  geo: string
  mediaSource: string
  operationDate: string
  evaluationDate: string
  roas7Before: number | null
  roas7After: number | null
  ret7Before: number | null
  ret7After: number | null
  roasAchievementRate: number | null
  retAchievementRate: number | null
  minAchievementRate: number | null
  score: OperationStatus | null
  dataSource: DataSource
}

/**
 * Baseline calculation result from AppsFlyer data
 */
export interface BaselineResultFromAF {
  appId: string
  geo: string
  mediaSource: string
  baselineRoas7: number | null
  baselineRet7: number | null
  windowDays: number
  cohortCount: number
  calculatedAt: Date
  dataSource: DataSource
}

/**
 * Creative test baseline (CPI and ROAS thresholds)
 */
export interface CreativeTestBaseline {
  id: number
  productName: string
  countryCode: string
  platform: string
  channel: string
  maxCpi: number | null
  minRoasD3: number | null
  minRoasD7: number | null
  excellentCvr: number | null
  lastUpdated: Date
}

// ============================================================================
// UI State Types
// ============================================================================

/**
 * Filter state for campaign evaluation list
 */
export interface CampaignFilters {
  status?: CampaignStatus
  dateRange?: {
    start: Date
    end: Date
  }
  searchQuery?: string
}

/**
 * Filter state for creative evaluation list
 */
export interface CreativeFilters {
  campaignId?: string
  status?: CreativeStatus
  evaluationDay?: EvaluationDay
  dateRange?: {
    start: Date
    end: Date
  }
}

/**
 * Filter state for operation score list
 */
export interface OperationFilters {
  optimizerEmail?: string
  operationType?: OperationType
  dateRange?: {
    start: Date
    end: Date
  }
  scoreRange?: {
    min: number
    max: number
  }
}

// ============================================================================
// Mock Execution Types
// ============================================================================

/**
 * Mock execution result
 */
export interface MockExecutionResult {
  success: boolean
  message: string
  newValue?: number
  error?: string
}

/**
 * Mock execution request
 */
export interface MockExecutionRequest {
  campaignId: string
  action: SelectedAction
  currentBudget?: number
  currentTroas?: number
}

// ============================================================================
// Chart Data Types
// ============================================================================

/**
 * Achievement rate comparison data for charts
 */
export interface AchievementRateData {
  label: string
  actual: number
  baseline: number
  achievementRate: number
}

/**
 * Trend data for time series charts
 */
export interface TrendData {
  date: string
  roas7: number
  ret7: number
  achievementRate: number
}

/**
 * Status distribution data for pie charts
 */
export interface StatusDistribution {
  status: CampaignStatus
  count: number
  percentage: number
}
