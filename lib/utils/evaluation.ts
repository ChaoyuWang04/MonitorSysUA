/**
 * Evaluation System Utility Functions
 *
 * This file contains helper functions for formatting, color mapping, and other utilities
 * used throughout the evaluation system frontend components.
 */

import {
  CampaignStatus,
  CreativeStatus,
  RecommendationType,
  ActionType,
  EvaluationDay,
  OperationStatus,
} from '../types/evaluation'

// ============================================================================
// Color Mapping Functions
// ============================================================================

/**
 * Get MUI color for campaign status
 */
export function getCampaignStatusColor(
  status: CampaignStatus | null | undefined
): 'success' | 'info' | 'warning' | 'error' | 'default' {
  if (!status) return 'default'

  switch (status) {
    case CampaignStatus.EXCELLENT:
      return 'success' // Green
    case CampaignStatus.HEALTHY:
      return 'info' // Blue
    case CampaignStatus.OBSERVATION:
      return 'warning' // Orange
    case CampaignStatus.WARNING:
      return 'warning' // Orange
    case CampaignStatus.DANGER:
      return 'error' // Red
    default:
      return 'default'
  }
}

/**
 * Get MUI color for creative status
 */
export function getCreativeStatusColor(
  status: CreativeStatus | null | undefined
): 'success' | 'info' | 'warning' | 'error' | 'default' {
  if (!status) return 'default'

  switch (status) {
    case CreativeStatus.EXCELLENT:
      return 'success' // Green - 出量好素材
    case CreativeStatus.PASSED:
      return 'success' // Green - 及格
    case CreativeStatus.TESTING:
      return 'info' // Blue - 测试中
    case CreativeStatus.PENDING_CONFIRMATION:
      return 'warning' // Orange - 待确认
    case CreativeStatus.FAILED:
      return 'error' // Red - 不及格
    case CreativeStatus.SYNCED:
      return 'info' // Blue - 已同步
    default:
      return 'default'
  }
}

/**
 * Get MUI color for operation status
 */
export function getOperationStatusColor(
  status: OperationStatus | null | undefined
): 'success' | 'info' | 'warning' | 'error' | 'default' {
  if (!status) return 'default'

  switch (status) {
    case OperationStatus.EXCELLENT:
      return 'success'
    case OperationStatus.HEALTHY:
      return 'info'
    case OperationStatus.OBSERVE:
      return 'warning'
    case OperationStatus.WARNING:
      return 'warning'
    case OperationStatus.DANGER:
      return 'error'
    default:
      return 'default'
  }
}

/**
 * Get MUI color for recommendation type
 */
export function getRecommendationColor(
  recommendation: RecommendationType | null | undefined
): 'success' | 'info' | 'warning' | 'error' | 'default' {
  if (!recommendation) return 'default'

  switch (recommendation) {
    case RecommendationType.AGGRESSIVE_SCALE:
      return 'success' // Green - 激进扩量
    case RecommendationType.CONSERVATIVE_SCALE:
      return 'info' // Blue - 保守扩量
    case RecommendationType.OBSERVE:
      return 'default' // Gray - 继续观察
    case RecommendationType.CONSERVATIVE_REDUCE:
      return 'warning' // Orange - 保守缩量
    case RecommendationType.SHUTDOWN:
      return 'error' // Red - 关停
    default:
      return 'default'
  }
}

/**
 * Get background color (light) for achievement rate
 */
export function getAchievementRateColor(rate: number | null | undefined): string {
  if (rate === null || rate === undefined) return 'transparent'

  if (rate >= 110) return 'rgba(72, 172, 78, 0.1)' // success.light
  if (rate >= 100) return 'rgba(44, 112, 232, 0.1)' // info.light
  if (rate >= 85) return 'rgba(245, 158, 11, 0.1)' // warning.light
  if (rate >= 60) return 'rgba(245, 158, 11, 0.15)' // warning.light (darker)
  return 'rgba(239, 68, 68, 0.1)' // error.light
}

/**
 * Get text color for achievement rate
 */
export function getAchievementRateTextColor(rate: number | null | undefined): string {
  if (rate === null || rate === undefined) return 'text.secondary'

  if (rate >= 110) return 'success.main'
  if (rate >= 100) return 'info.main'
  if (rate >= 85) return 'warning.main'
  if (rate >= 60) return 'warning.dark'
  return 'error.main'
}

// ============================================================================
// Label Mapping Functions
// ============================================================================

/**
 * Get display label for campaign status
 */
export function getCampaignStatusLabel(status: CampaignStatus | null | undefined): string {
  if (!status) return 'Unknown'

  switch (status) {
    case CampaignStatus.EXCELLENT:
      return 'Excellent'
    case CampaignStatus.HEALTHY:
      return 'Healthy'
    case CampaignStatus.OBSERVATION:
      return 'Observation'
    case CampaignStatus.WARNING:
      return 'Warning'
    case CampaignStatus.DANGER:
      return 'Danger'
    default:
      return 'Unknown'
  }
}

/**
 * Get display label for creative status
 */
export function getCreativeStatusLabel(status: CreativeStatus | null | undefined): string {
  if (!status) return 'Unknown'

  switch (status) {
    case CreativeStatus.TESTING:
      return 'Testing'
    case CreativeStatus.PASSED:
      return 'Passed'
    case CreativeStatus.FAILED:
      return 'Failed'
    case CreativeStatus.EXCELLENT:
      return 'Excellent ⭐'
    case CreativeStatus.PENDING_CONFIRMATION:
      return 'Pending'
    case CreativeStatus.SYNCED:
      return 'Synced'
    default:
      return 'Unknown'
  }
}

/**
 * Get display label for operation status
 */
export function getOperationStatusLabel(status: OperationStatus | null | undefined): string {
  if (!status) return 'Unknown'

  switch (status) {
    case OperationStatus.EXCELLENT:
      return 'Excellent'
    case OperationStatus.HEALTHY:
      return 'Healthy'
    case OperationStatus.OBSERVE:
      return 'Observe'
    case OperationStatus.WARNING:
      return 'Warning'
    case OperationStatus.DANGER:
      return 'Danger'
    default:
      return 'Unknown'
  }
}

/**
 * Get display label for recommendation type
 */
export function getRecommendationLabel(
  recommendation: RecommendationType | null | undefined
): string {
  if (!recommendation) return 'No Recommendation'

  switch (recommendation) {
    case RecommendationType.AGGRESSIVE_SCALE:
      return 'Aggressive Scale-up'
    case RecommendationType.CONSERVATIVE_SCALE:
      return 'Conservative Scale-up'
    case RecommendationType.OBSERVE:
      return 'Continue Observing'
    case RecommendationType.CONSERVATIVE_REDUCE:
      return 'Conservative Scale-down'
    case RecommendationType.SHUTDOWN:
      return 'Shut Down'
    default:
      return 'No Recommendation'
  }
}

/**
 * Get display label for action type
 */
export function getActionTypeLabel(action: ActionType | null | undefined): string {
  if (!action) return 'Unknown'

  switch (action) {
    case ActionType.BUDGET:
      return 'Budget Adjustment'
    case ActionType.TROAS:
      return 'tROAS Adjustment'
    case ActionType.PAUSE:
      return 'Pause Campaign'
    case ActionType.OBSERVE:
      return 'Continue Observing'
    case ActionType.CHANGE_CREATIVE:
      return 'Change Creative'
    default:
      return 'Unknown'
  }
}

/**
 * Get display label for evaluation day
 */
export function getEvaluationDayLabel(day: EvaluationDay | null | undefined): string {
  if (!day) return 'Unknown'
  return day // 'D3' or 'D7'
}

// ============================================================================
// Formatting Functions
// ============================================================================

/**
 * Helper: Convert string | number to number
 * Drizzle ORM returns decimal types as strings to preserve precision
 */
function toNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'string') {
    const parsed = parseFloat(value)
    return isNaN(parsed) ? null : parsed
  }
  return value
}

/**
 * Format achievement rate with % sign
 * Example: 120.45% (2 decimal places)
 * Accepts string (from Drizzle decimal) or number
 */
export function formatAchievementRate(rate: string | number | null | undefined): string {
  const numRate = toNumber(rate)
  if (numRate === null) return 'N/A'
  return `${numRate.toFixed(2)}%`
}

/**
 * Format percentage value (ROAS, RET, etc.)
 * Example: 45.23% (2 decimal places)
 * Accepts string (from Drizzle decimal) or number
 */
export function formatPercentage(value: string | number | null | undefined): string {
  const numValue = toNumber(value)
  if (numValue === null) return 'N/A'
  // If value is already in percentage format (e.g., 45.23), use as-is
  // If value is in decimal format (e.g., 0.4523), convert to percentage
  const percentageValue = numValue < 1 && numValue > 0 ? numValue * 100 : numValue
  return `${percentageValue.toFixed(2)}%`
}

/**
 * Format currency with $ sign
 * Example: $1,234.56 (thousands separator + 2 decimal places)
 * Accepts string (from Drizzle decimal) or number
 */
export function formatCurrency(amount: string | number | null | undefined): string {
  const numAmount = toNumber(amount)
  if (numAmount === null) return 'N/A'
  return `$${numAmount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

/**
 * Format CPI (Cost Per Install)
 * Example: $6.50
 * Accepts string (from Drizzle decimal) or number
 */
export function formatCPI(cpi: string | number | null | undefined): string {
  const numCpi = toNumber(cpi)
  if (numCpi === null) return 'N/A'
  return `$${numCpi.toFixed(2)}`
}

/**
 * Format CVR (Conversion Rate)
 * Example: 0.67% (2 decimal places, always in percentage)
 * Accepts string (from Drizzle decimal) or number
 */
export function formatCVR(cvr: string | number | null | undefined): string {
  const numCvr = toNumber(cvr)
  if (numCvr === null) return 'N/A'
  // CVR is stored as decimal (e.g., 0.0067 for 0.67%)
  const percentage = numCvr * 100
  return `${percentage.toFixed(2)}%`
}

/**
 * Format number with thousands separator
 * Example: 1,234,567
 * Accepts string (from Drizzle decimal) or number
 */
export function formatNumber(num: string | number | null | undefined): string {
  const numValue = toNumber(num)
  if (numValue === null) return 'N/A'
  return numValue.toLocaleString('en-US')
}

/**
 * Format date to readable string
 * Example: "Nov 21, 2025"
 */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return 'N/A'

  const dateObj = typeof date === 'string' ? new Date(date) : date

  return dateObj.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/**
 * Format datetime to readable string with time
 * Example: "Nov 21, 2025, 10:30 AM"
 */
export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return 'N/A'

  const dateObj = typeof date === 'string' ? new Date(date) : date

  return dateObj.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ============================================================================
// Action Option Helpers
// ============================================================================

/**
 * Get default action options for scale-up recommendations
 */
export function getScaleUpActions() {
  return [
    {
      type: ActionType.BUDGET,
      label: 'Increase Budget',
      options: ['+1%', '+3%', '+5%', 'Custom'],
      description: 'Increase daily budget to get more traffic',
    },
    {
      type: ActionType.TROAS,
      label: 'Decrease tROAS',
      options: ['-1%', '-3%', '-5%', 'Custom'],
      description: 'Lower target ROAS to expand reach',
    },
    {
      type: ActionType.OBSERVE,
      label: 'Continue Observing',
      description: 'Monitor performance without changes',
    },
  ]
}

/**
 * Get default action options for scale-down recommendations
 */
export function getScaleDownActions() {
  return [
    {
      type: ActionType.BUDGET,
      label: 'Decrease Budget',
      options: ['-1%', '-3%', '-5%', 'Custom'],
      description: 'Reduce daily budget to limit spending',
    },
    {
      type: ActionType.TROAS,
      label: 'Increase tROAS',
      options: ['+1%', '+3%', '+5%', 'Custom'],
      description: 'Raise target ROAS to improve quality',
    },
    {
      type: ActionType.CHANGE_CREATIVE,
      label: 'Change Creative',
      description: 'Replace with better performing creatives',
    },
    {
      type: ActionType.PAUSE,
      label: 'Pause Campaign',
      description: 'Temporarily stop campaign',
    },
    {
      type: ActionType.OBSERVE,
      label: 'Continue Observing',
      description: 'Monitor performance without changes',
    },
  ]
}

/**
 * Get default action options for shutdown recommendation
 */
export function getShutdownActions() {
  return [
    {
      type: ActionType.PAUSE,
      label: 'Pause Campaign',
      description: 'Stop campaign immediately',
    },
    {
      type: ActionType.OBSERVE,
      label: 'Give It More Time',
      description: 'Continue observing for a few more days',
    },
  ]
}

/**
 * Calculate new value based on percentage change
 * Example: calculateNewValue(1000, '+3%') => 1030
 */
export function calculateNewValue(
  currentValue: number,
  changePercent: string
): number | null {
  if (!currentValue || !changePercent) return null

  // Extract number from string (e.g., '+3%' => 3, '-5%' => -5)
  const match = changePercent.match(/([+-]?\d+(?:\.\d+)?)%?/)
  if (!match) return null

  const percent = parseFloat(match[1])
  const multiplier = 1 + percent / 100

  return currentValue * multiplier
}

/**
 * Parse custom percentage input
 * Example: parseCustomPercent('5') => '+5%'
 */
export function parseCustomPercent(input: string, isIncrease: boolean): string {
  const num = parseFloat(input)
  if (isNaN(num)) return ''

  const sign = isIncrease ? '+' : '-'
  return `${sign}${Math.abs(num)}%`
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Check if achievement rate is in danger zone
 */
export function isDangerZone(rate: number | null | undefined): boolean {
  if (rate === null || rate === undefined) return false
  return rate < 60
}

/**
 * Check if achievement rate is excellent
 */
export function isExcellent(rate: number | null | undefined): boolean {
  if (rate === null || rate === undefined) return false
  return rate >= 110
}

/**
 * Check if creative is excellent (high CVR)
 */
export function isExcellentCreative(
  cvr: number | null | undefined,
  threshold: number = 0.0067 // 0.67%
): boolean {
  if (cvr === null || cvr === undefined) return false
  return cvr >= threshold
}

// ============================================================================
// Icon Mapping
// ============================================================================

/**
 * Get emoji icon for campaign status
 */
export function getCampaignStatusIcon(status: CampaignStatus | null | undefined): string {
  if (!status) return '❓'

  switch (status) {
    case CampaignStatus.EXCELLENT:
      return '🟢'
    case CampaignStatus.HEALTHY:
      return '🟢'
    case CampaignStatus.OBSERVATION:
      return '🟡'
    case CampaignStatus.WARNING:
      return '🟠'
    case CampaignStatus.DANGER:
      return '🔴'
    default:
      return '❓'
  }
}

/**
 * Get emoji icon for creative status
 */
export function getCreativeStatusIcon(status: CreativeStatus | null | undefined): string {
  if (!status) return '❓'

  switch (status) {
    case CreativeStatus.TESTING:
      return '🔄'
    case CreativeStatus.PASSED:
      return '✅'
    case CreativeStatus.FAILED:
      return '❌'
    case CreativeStatus.EXCELLENT:
      return '⭐'
    case CreativeStatus.PENDING_CONFIRMATION:
      return '⏳'
    case CreativeStatus.SYNCED:
      return '🔗'
    default:
      return '❓'
  }
}

/**
 * Get emoji icon for operation status
 */
export function getOperationStatusIcon(status: OperationStatus | null | undefined): string {
  if (!status) return '❓'

  switch (status) {
    case OperationStatus.EXCELLENT:
      return '🟢'
    case OperationStatus.HEALTHY:
      return '🟢'
    case OperationStatus.OBSERVE:
      return '🟡'
    case OperationStatus.WARNING:
      return '🟠'
    case OperationStatus.DANGER:
      return '🔴'
    default:
      return '❓'
  }
}
