import {
  pgTable,
  serial,
  text,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
  integer,
  boolean,
  decimal,
  date,
  varchar,
} from 'drizzle-orm/pg-core'

// ============================================
// ACCOUNTS TABLE - Multi-Account Support
// ============================================
export const accounts = pgTable('accounts', {
  // Primary key
  id: serial('id').primaryKey(),

  // Google Ads Account Info
  customerId: text('customer_id').notNull().unique(), // e.g., "2766411035" (no dashes)
  name: text('name').notNull(), // User-friendly name: "Product A - Test Account"

  // Account Metadata (auto-populated on first sync)
  currency: text('currency'), // e.g., "USD"
  timeZone: text('time_zone'), // e.g., "America/Los_Angeles"

  // Status
  isActive: boolean('is_active').default(true).notNull(),

  // Tracking
  createdAt: timestamp('created_at').defaultNow().notNull(),
  lastSyncedAt: timestamp('last_synced_at'),
}, (table) => ({
  // Indexes
  customerIdIdx: index('customer_id_idx').on(table.customerId),
}))

export type Account = typeof accounts.$inferSelect
export type NewAccount = typeof accounts.$inferInsert

// ============================================
// CHANGE EVENTS TABLE - Updated for Multi-Account
// ============================================
export const changeEvents = pgTable('change_events', {
  // Primary key
  id: serial('id').primaryKey(),

  // Account association (MULTI-ACCOUNT SUPPORT)
  accountId: integer('account_id')
    .notNull()
    .references(() => accounts.id, { onDelete: 'cascade' }),

  // Time information
  timestamp: timestamp('timestamp', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),

  // Operation information
  userEmail: text('user_email').notNull(),
  resourceType: text('resource_type').notNull(),
  operationType: text('operation_type').notNull(),
  resourceName: text('resource_name').notNull(),
  clientType: text('client_type'),

  // Association information
  campaign: text('campaign'),
  adGroup: text('ad_group'),

  // Change details
  summary: text('summary').notNull(), // English summary (for technical reference)
  summaryZh: text('summary_zh'), // Chinese summary (user-facing, nullable for backward compatibility)
  fieldChanges: jsonb('field_changes'),
  changedFieldsPaths: jsonb('changed_fields_paths').$type<string[]>(),
}, (table) => ({
  // Indexes for query performance
  accountIdIdx: index('account_id_idx').on(table.accountId), // NEW: Account index
  timestampIdx: index('timestamp_idx').on(table.timestamp),
  userEmailIdx: index('user_email_idx').on(table.userEmail),
  resourceTypeIdx: index('resource_type_idx').on(table.resourceType),
  operationTypeIdx: index('operation_type_idx').on(table.operationType),
  campaignIdx: index('campaign_idx').on(table.campaign),

  // Composite index for account-specific queries
  accountTimestampIdx: index('account_timestamp_idx').on(table.accountId, table.timestamp),

  // Unique constraint to prevent duplicates (NOW INCLUDES accountId)
  uniqueEvent: uniqueIndex('unique_event').on(
    table.accountId,
    table.timestamp,
    table.resourceName,
    table.userEmail
  ),
}))

// Type inference
export type ChangeEvent = typeof changeEvents.$inferSelect
export type NewChangeEvent = typeof changeEvents.$inferInsert

// ============================================
// SAFETY BASELINE TABLE - 安全线基准表
// ============================================
export const safetyBaseline = pgTable(
  'safety_baseline',
  {
    // Primary key
    id: serial('id').primaryKey(),

    // Dimension fields
    productName: varchar('product_name', { length: 100 }).notNull(),
    countryCode: varchar('country_code', { length: 10 }).notNull(),
    platform: varchar('platform', { length: 20 }).default('Android').notNull(),
    channel: varchar('channel', { length: 20 }).default('Google').notNull(),

    // Baseline metrics (180 days ago)
    baselineRoas7: decimal('baseline_roas7', { precision: 10, scale: 4 }),
    baselineRet7: decimal('baseline_ret7', { precision: 10, scale: 4 }),

    // Reference period (e.g., "2024-06")
    referencePeriod: varchar('reference_period', { length: 20 }),

    // Tracking
    lastUpdated: timestamp('last_updated').defaultNow().notNull(),
  },
  (table) => ({
    // Unique constraint: one baseline per product/country/platform/channel
    uniqueBaseline: uniqueIndex('unique_baseline').on(
      table.productName,
      table.countryCode,
      table.platform,
      table.channel
    ),
  })
)

export type SafetyBaseline = typeof safetyBaseline.$inferSelect
export type NewSafetyBaseline = typeof safetyBaseline.$inferInsert

// ============================================
// CREATIVE TEST BASELINE TABLE - 素材测试标准表
// ============================================
export const creativeTestBaseline = pgTable(
  'creative_test_baseline',
  {
    // Primary key
    id: serial('id').primaryKey(),

    // Dimension fields
    productName: varchar('product_name', { length: 100 }).notNull(),
    countryCode: varchar('country_code', { length: 10 }).notNull(),
    platform: varchar('platform', { length: 20 }).default('Android').notNull(),
    channel: varchar('channel', { length: 20 }).default('Google').notNull(),

    // Threshold metrics
    maxCpi: decimal('max_cpi', { precision: 10, scale: 2 }), // Maximum CPI threshold
    minRoasD3: decimal('min_roas_d3', { precision: 10, scale: 4 }), // Minimum D3 ROAS
    minRoasD7: decimal('min_roas_d7', { precision: 10, scale: 4 }), // Minimum D7 ROAS
    excellentCvr: decimal('excellent_cvr', { precision: 10, scale: 6 }), // Excellent CVR standard (e.g., 0.0067)

    // Tracking
    lastUpdated: timestamp('last_updated').defaultNow().notNull(),
  },
  (table) => ({
    // Unique constraint: one baseline per product/country/platform/channel
    uniqueCreativeBaseline: uniqueIndex('unique_creative_baseline').on(
      table.productName,
      table.countryCode,
      table.platform,
      table.channel
    ),
  })
)

export type CreativeTestBaseline = typeof creativeTestBaseline.$inferSelect
export type NewCreativeTestBaseline = typeof creativeTestBaseline.$inferInsert

// ============================================
// CAMPAIGN EVALUATION TABLE - Campaign评价记录表
// ============================================
export const campaignEvaluation = pgTable(
  'campaign_evaluation',
  {
    // Primary key
    id: serial('id').primaryKey(),

    // Campaign info
    campaignId: varchar('campaign_id', { length: 100 }).notNull(),
    campaignName: varchar('campaign_name', { length: 200 }),

    // Evaluation metadata
    evaluationDate: date('evaluation_date').notNull(),
    campaignType: varchar('campaign_type', { length: 20 }), // 'test' or 'mature'

    // Financial metrics
    totalSpend: decimal('total_spend', { precision: 15, scale: 2 }),

    // Actual performance
    actualRoas7: decimal('actual_roas7', { precision: 10, scale: 4 }),
    actualRet7: decimal('actual_ret7', { precision: 10, scale: 4 }),

    // Baseline comparison
    baselineRoas7: decimal('baseline_roas7', { precision: 10, scale: 4 }),
    baselineRet7: decimal('baseline_ret7', { precision: 10, scale: 4 }),

    // Achievement rates (%)
    roasAchievementRate: decimal('roas_achievement_rate', { precision: 10, scale: 2 }),
    retAchievementRate: decimal('ret_achievement_rate', { precision: 10, scale: 2 }),
    minAchievementRate: decimal('min_achievement_rate', { precision: 10, scale: 2 }), // Min of ROAS and RET

    // Recommendation
    recommendationType: varchar('recommendation_type', { length: 50 }), // 观察/保守扩量/激进扩量/保守缩量/激进缩量/关停
    status: varchar('status', { length: 20 }), // 正常/预警/危险

    // Tracking
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    // Composite index for time-series queries
    campaignDateIdx: index('campaign_date_idx').on(table.campaignId, table.evaluationDate),

    // Status filter index
    statusIdx: index('status_idx').on(table.status),

    // Recommendation filter index
    recommendationTypeIdx: index('recommendation_type_idx').on(table.recommendationType),
  })
)

export type CampaignEvaluation = typeof campaignEvaluation.$inferSelect
export type NewCampaignEvaluation = typeof campaignEvaluation.$inferInsert

// ============================================
// CREATIVE EVALUATION TABLE - 素材评价记录表 (Test campaigns only)
// ============================================
export const creativeEvaluation = pgTable(
  'creative_evaluation',
  {
    // Primary key
    id: serial('id').primaryKey(),

    // Creative info
    campaignId: varchar('campaign_id', { length: 100 }).notNull(),
    creativeId: varchar('creative_id', { length: 100 }),
    creativeName: varchar('creative_name', { length: 200 }),

    // Evaluation metadata
    evaluationDay: varchar('evaluation_day', { length: 10 }), // 'D3' or 'D7'
    evaluationDate: date('evaluation_date').notNull(),

    // Performance metrics
    impressions: integer('impressions'),
    installs: integer('installs'),
    cvr: decimal('cvr', { precision: 10, scale: 6 }),

    // Cost metrics
    actualCpi: decimal('actual_cpi', { precision: 10, scale: 2 }),
    actualRoas: decimal('actual_roas', { precision: 10, scale: 4 }),

    // Threshold comparison
    maxCpiThreshold: decimal('max_cpi_threshold', { precision: 10, scale: 2 }),
    minRoasThreshold: decimal('min_roas_threshold', { precision: 10, scale: 4 }),

    // Status: 测试中/不及格/及格/出量好素材/待确认/已同步
    creativeStatus: varchar('creative_status', { length: 30 }),

    // Tracking
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    // Composite index for creative lookup
    creativeIdx: index('creative_idx').on(table.campaignId, table.creativeId, table.evaluationDay),

    // Status filter index
    creativeStatusIdx: index('creative_status_idx').on(table.creativeStatus),
  })
)

export type CreativeEvaluation = typeof creativeEvaluation.$inferSelect
export type NewCreativeEvaluation = typeof creativeEvaluation.$inferInsert

// ============================================
// OPERATION SCORE TABLE - 操作评分记录表
// ============================================
export const operationScore = pgTable(
  'operation_score',
  {
    // Primary key
    id: serial('id').primaryKey(),

    // Foreign key to change_events
    operationId: integer('operation_id').references(() => changeEvents.id),

    // Campaign info
    campaignId: varchar('campaign_id', { length: 100 }).notNull(),

    // Optimizer info
    optimizerEmail: varchar('optimizer_email', { length: 100 }),

    // Operation metadata
    operationType: varchar('operation_type', { length: 50 }), // BUDGET_UPDATE/TROAS_UPDATE
    operationDate: date('operation_date').notNull(),
    evaluationDate: date('evaluation_date').notNull(), // 操作后7天

    // Performance after operation (7 days later)
    actualRoas7: decimal('actual_roas7', { precision: 10, scale: 4 }),
    actualRet7: decimal('actual_ret7', { precision: 10, scale: 4 }),

    // Baseline comparison
    baselineRoas7: decimal('baseline_roas7', { precision: 10, scale: 4 }),
    baselineRet7: decimal('baseline_ret7', { precision: 10, scale: 4 }),

    // Achievement rates (%)
    roasAchievementRate: decimal('roas_achievement_rate', { precision: 10, scale: 2 }),
    retAchievementRate: decimal('ret_achievement_rate', { precision: 10, scale: 2 }),

    // Tracking
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    // Composite index for operation lookup
    operationIdx: index('operation_idx').on(table.operationId, table.evaluationDate),

    // Optimizer leaderboard index
    optimizerEmailIdx: index('optimizer_email_idx').on(table.optimizerEmail),
  })
)

export type OperationScore = typeof operationScore.$inferSelect
export type NewOperationScore = typeof operationScore.$inferInsert

// ============================================
// OPTIMIZER LEADERBOARD TABLE - 优化师排行榜
// ============================================
export const optimizerLeaderboard = pgTable(
  'optimizer_leaderboard',
  {
    // Primary key
    id: serial('id').primaryKey(),

    // Optimizer info
    optimizerEmail: varchar('optimizer_email', { length: 100 }).notNull().unique(),

    // Performance stats
    totalOperations: integer('total_operations').default(0).notNull(),
    excellentCount: integer('excellent_count').default(0).notNull(), // ≥110%
    qualifiedCount: integer('qualified_count').default(0).notNull(), // 85-110%
    failedCount: integer('failed_count').default(0).notNull(), // <85%

    // Success rate
    successRate: decimal('success_rate', { precision: 10, scale: 2 }).default('0').notNull(), // (excellent + qualified) / total * 100

    // Tracking
    lastUpdated: timestamp('last_updated').defaultNow().notNull(),
  },
  (table) => ({
    // Index for leaderboard ranking
    successRateIdx: index('success_rate_idx').on(table.successRate),
  })
)

export type OptimizerLeaderboard = typeof optimizerLeaderboard.$inferSelect
export type NewOptimizerLeaderboard = typeof optimizerLeaderboard.$inferInsert

// ============================================
// ACTION RECOMMENDATION TABLE - 建议动作表
// ============================================
export const actionRecommendation = pgTable(
  'action_recommendation',
  {
    // Primary key
    id: serial('id').primaryKey(),

    // Campaign info
    campaignId: varchar('campaign_id', { length: 100 }).notNull(),

    // Foreign key to campaign_evaluation
    evaluationId: integer('evaluation_id').references(() => campaignEvaluation.id),

    // Recommendation metadata
    recommendationDate: date('recommendation_date').notNull(),
    recommendationType: varchar('recommendation_type', { length: 50 }), // 扩量/缩量/关停/换素材

    // Action options (JSON array)
    // Example: [{type: 'budget', options: ['+1%', '+3%', '+5%']}, {type: 'troas', options: ['-1%', '-3%', '-5%']}]
    actionOptions: jsonb('action_options'),

    // Selected action by optimizer (JSON object)
    // Example: {type: 'budget', change: '+3%'}
    selectedAction: jsonb('selected_action'),

    // Execution status
    executed: boolean('executed').default(false).notNull(),
    executedAt: timestamp('executed_at'),

    // Tracking
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    // Composite index for recommendation lookup
    recommendationIdx: index('recommendation_idx').on(table.campaignId, table.recommendationDate),

    // Execution status filter index
    executedIdx: index('executed_idx').on(table.executed),
  })
)

export type ActionRecommendation = typeof actionRecommendation.$inferSelect
export type NewActionRecommendation = typeof actionRecommendation.$inferInsert

// ============================================
// MOCK DATA TABLES - 用于开发和测试的模拟数据
// ============================================

// Mock Campaign Performance - 模拟Campaign性能数据
export const mockCampaignPerformance = pgTable(
  'mock_campaign_performance',
  {
    // Primary key
    id: serial('id').primaryKey(),

    // Campaign info
    campaignId: varchar('campaign_id', { length: 100 }).notNull(),
    campaignName: varchar('campaign_name', { length: 200 }).notNull(),

    // Dimension fields
    productName: varchar('product_name', { length: 100 }).notNull(),
    countryCode: varchar('country_code', { length: 10 }).notNull(),
    platform: varchar('platform', { length: 20 }).default('Android').notNull(),
    channel: varchar('channel', { length: 20 }).default('Google').notNull(),

    // Date
    date: date('date').notNull(),

    // Financial metrics
    totalSpend: decimal('total_spend', { precision: 15, scale: 2 }).notNull(),
    totalRevenue: decimal('total_revenue', { precision: 15, scale: 2 }).notNull(),

    // User metrics
    totalInstalls: integer('total_installs').notNull(),
    d7ActiveUsers: integer('d7_active_users').notNull(), // Users still active on day 7

    // Performance metrics
    actualRoas7: decimal('actual_roas7', { precision: 10, scale: 4 }).notNull(),
    actualRet7: decimal('actual_ret7', { precision: 10, scale: 4 }).notNull(),

    // Tracking
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    // Unique constraint: one record per campaign per date
    uniqueCampaignDate: uniqueIndex('unique_campaign_date').on(table.campaignId, table.date),

    // Indexes for queries
    dateIdx: index('mock_campaign_date_idx').on(table.date),
    productCountryIdx: index('mock_campaign_product_country_idx').on(
      table.productName,
      table.countryCode,
      table.platform,
      table.channel
    ),
  })
)

export type MockCampaignPerformance = typeof mockCampaignPerformance.$inferSelect
export type NewMockCampaignPerformance = typeof mockCampaignPerformance.$inferInsert

// Mock Creative Performance - 模拟素材性能数据
export const mockCreativePerformance = pgTable(
  'mock_creative_performance',
  {
    // Primary key
    id: serial('id').primaryKey(),

    // Creative info
    creativeId: varchar('creative_id', { length: 100 }).notNull(),
    creativeName: varchar('creative_name', { length: 200 }).notNull(),
    campaignId: varchar('campaign_id', { length: 100 }).notNull(),

    // Dimension fields
    productName: varchar('product_name', { length: 100 }).notNull(),
    countryCode: varchar('country_code', { length: 10 }).notNull(),
    platform: varchar('platform', { length: 20 }).default('Android').notNull(),
    channel: varchar('channel', { length: 20 }).default('Google').notNull(),

    // Performance metrics
    impressions: integer('impressions').notNull(),
    installs: integer('installs').notNull(),

    // Conversion metrics
    cvr: decimal('cvr', { precision: 10, scale: 6 }).notNull(), // Conversion rate
    cpi: decimal('cpi', { precision: 10, scale: 2 }).notNull(), // Cost per install

    // ROAS metrics
    roasD3: decimal('roas_d3', { precision: 10, scale: 4 }).notNull(), // D3 ROAS
    roasD7: decimal('roas_d7', { precision: 10, scale: 4 }).notNull(), // D7 ROAS

    // Financial
    spend: decimal('spend', { precision: 15, scale: 2 }).notNull(),

    // Tracking
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    // Unique constraint: one record per creative per campaign
    uniqueCreativeCampaign: uniqueIndex('unique_creative_campaign').on(
      table.creativeId,
      table.campaignId
    ),

    // Indexes for queries
    campaignIdx: index('mock_creative_campaign_idx').on(table.campaignId),
    productCountryIdx: index('mock_creative_product_country_idx').on(
      table.productName,
      table.countryCode,
      table.platform,
      table.channel
    ),
  })
)

export type MockCreativePerformance = typeof mockCreativePerformance.$inferSelect
export type NewMockCreativePerformance = typeof mockCreativePerformance.$inferInsert

// ============================================
// APPSFLYER TABLES - AppsFlyer Cohort Data Pipeline
// ============================================

// AppsFlyer Sync Log Table - 同步日志表
export const afSyncLog = pgTable(
  'af_sync_log',
  {
    id: serial('id').primaryKey(),

    // Sync metadata
    syncType: varchar('sync_type', { length: 20 }).notNull(), // 'events' | 'cohort_kpi' | 'baseline'
    dateRangeStart: date('date_range_start'),
    dateRangeEnd: date('date_range_end'),
    status: varchar('status', { length: 20 }).notNull().default('running'), // 'running' | 'success' | 'failed'

    // Processing info
    recordsProcessed: integer('records_processed'),
    errorMessage: text('error_message'),

    // Timestamps
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (table) => ({
    syncTypeIdx: index('idx_af_sync_log_sync_type').on(table.syncType),
    statusIdx: index('idx_af_sync_log_status').on(table.status),
    startedAtIdx: index('idx_af_sync_log_started_at').on(table.startedAt),
  })
)

export type AfSyncLog = typeof afSyncLog.$inferSelect
export type NewAfSyncLog = typeof afSyncLog.$inferInsert

// AppsFlyer Events Table - 事件明细表 (IAP + Ad Revenue)
export const afEvents = pgTable(
  'af_events',
  {
    eventId: text('event_id').primaryKey(), // MD5 hash

    importedAt: timestamp('imported_at', { withTimezone: true }).notNull().defaultNow(),

    // App info
    appId: text('app_id').notNull(),
    appName: text('app_name'),
    bundleId: text('bundle_id'),

    // User & Event info
    appsflyerId: text('appsflyer_id'),
    eventName: text('event_name').notNull(), // 'iap_purchase' | 'af_ad_revenue'
    eventTime: timestamp('event_time', { withTimezone: true }).notNull(),
    eventDate: date('event_date').notNull(),

    // Install info
    installTime: timestamp('install_time', { withTimezone: true }).notNull(),
    installDate: date('install_date').notNull(),
    daysSinceInstall: integer('days_since_install').notNull(),

    // Revenue info
    eventRevenue: decimal('event_revenue', { precision: 18, scale: 6 }),
    eventRevenueUsd: decimal('event_revenue_usd', { precision: 18, scale: 6 }),
    eventRevenueCurrency: text('event_revenue_currency'),

    // Attribution dimensions
    geo: text('geo'), // Country code - using 'geo' for consistency
    mediaSource: text('media_source'),
    channel: text('channel'),
    campaign: text('campaign'),
    campaignId: text('campaign_id'),
    adset: text('adset'),
    adsetId: text('adset_id'),
    ad: text('ad'),

    isPrimaryAttribution: boolean('is_primary_attribution'),
    rawPayload: jsonb('raw_payload'),
  },
  (table) => ({
    installDateIdx: index('idx_af_events_install_date').on(table.installDate),
    eventDateIdx: index('idx_af_events_event_date').on(table.eventDate),
    cohortIdx: index('idx_af_events_cohort').on(
      table.appId,
      table.geo,
      table.mediaSource,
      table.campaign,
      table.adset,
      table.installDate
    ),
    eventNameIdx: index('idx_af_events_event_name').on(table.eventName),
  })
)

export type AfEvent = typeof afEvents.$inferSelect
export type NewAfEvent = typeof afEvents.$inferInsert

// AppsFlyer Cohort KPI Daily Table - Cohort指标表
export const afCohortKpiDaily = pgTable(
  'af_cohort_kpi_daily',
  {
    id: serial('id').primaryKey(),

    // Cohort dimensions
    appId: text('app_id').notNull(),
    mediaSource: text('media_source').notNull(),
    campaign: text('campaign').notNull(),
    geo: text('geo').notNull(),

    // Time dimensions
    installDate: date('install_date').notNull(),
    daysSinceInstall: integer('days_since_install').notNull(), // 0, 1, 3, 5, 7

    // KPI metrics
    installs: integer('installs'),
    costUsd: decimal('cost_usd', { precision: 18, scale: 6 }),
    retentionRate: decimal('retention_rate', { precision: 8, scale: 4 }),

    // Tracking
    lastRefreshedAt: timestamp('last_refreshed_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    // Unique constraint on cohort dimensions (acts as logical primary key)
    uniqueCohortDay: uniqueIndex('unique_af_cohort_kpi').on(
      table.appId,
      table.mediaSource,
      table.campaign,
      table.geo,
      table.installDate,
      table.daysSinceInstall
    ),
    installDateIdx: index('idx_af_cohort_kpi_install_date').on(table.installDate),
    cohortIdx: index('idx_af_cohort_kpi_cohort').on(
      table.appId,
      table.geo,
      table.mediaSource,
      table.campaign,
      table.installDate
    ),
  })
)

export type AfCohortKpiDaily = typeof afCohortKpiDaily.$inferSelect
export type NewAfCohortKpiDaily = typeof afCohortKpiDaily.$inferInsert
