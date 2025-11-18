import { pgTable, serial, text, timestamp, jsonb, index, uniqueIndex, integer, boolean } from 'drizzle-orm/pg-core'

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
  summary: text('summary').notNull(),
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
