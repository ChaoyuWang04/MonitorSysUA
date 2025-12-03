/**
 * Database Query Functions
 *
 * All database operations using Drizzle ORM.
 * These functions are called by the tRPC routers.
 */

import { db } from './index'
import {
  changeEvents,
  type NewChangeEvent,
  accounts,
  type Account,
  type NewAccount,
  campaigns,
  adGroups,
  ads,
  type NewCampaign,
  type NewAdGroup,
  type NewAd,
} from './schema'
import { and, desc, eq, ilike, or, sql, notInArray, inArray } from 'drizzle-orm'

// ============================================
// ACCOUNT MANAGEMENT FUNCTIONS
// ============================================

async function triggerOperationEvaluation(operationIds: number[]) {
  if (operationIds.length === 0) return

  // Fire-and-forget to avoid blocking inserts
  ;(async () => {
    const { evaluateOperationFromAF } = await import('../evaluation/wrappers/operation-evaluator')
    for (const id of operationIds) {
      evaluateOperationFromAF({ operationId: id }).catch((err) => {
        console.error(`[operation-eval] failed for ${id}:`, err)
      })
    }
  })().catch((err) => {
    console.error('[operation-eval] scheduler error', err)
  })
}

/**
 * Get all accounts (optionally filter by active status)
 */
export async function getAccounts(params?: { isActive?: boolean }) {
  const conditions = []

  if (params?.isActive !== undefined) {
    conditions.push(eq(accounts.isActive, params.isActive))
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined

  return await db.select()
    .from(accounts)
    .where(where)
    .orderBy(accounts.name)
}

/**
 * Get a single account by ID
 */
export async function getAccountById(id: number) {
  const result = await db.select()
    .from(accounts)
    .where(eq(accounts.id, id))
    .limit(1)

  return result[0] || null
}

/**
 * Get account by customer ID
 */
export async function getAccountByCustomerId(customerId: string) {
  const result = await db.select()
    .from(accounts)
    .where(eq(accounts.customerId, customerId))
    .limit(1)

  return result[0] || null
}

/**
 * Create a new account
 */
export async function createAccount(account: NewAccount) {
  const result = await db.insert(accounts)
    .values(account)
    .returning()

  return result[0]
}

/**
 * Update an account
 */
export async function updateAccount(id: number, updates: Partial<Account>) {
  const result = await db.update(accounts)
    .set(updates)
    .where(eq(accounts.id, id))
    .returning()

  return result[0] || null
}

/**
 * Soft delete an account (set isActive = false)
 */
export async function deleteAccount(id: number) {
  const result = await db.update(accounts)
    .set({ isActive: false })
    .where(eq(accounts.id, id))
    .returning()

  return result[0] || null
}

// ============================================
// CHANGE EVENTS FUNCTIONS (Updated for Multi-Account)
// ============================================

/**
 * Insert a single event (with conflict handling)
 */
export async function insertEvent(event: NewChangeEvent) {
  const inserted = await db
    .insert(changeEvents)
    .values(event)
    .onConflictDoNothing()
    .returning({ id: changeEvents.id })

  if (inserted.length > 0) {
    triggerOperationEvaluation(inserted.map((row) => row.id))
  }

  return inserted
}

/**
 * Batch insert events with automatic deduplication
 */
export async function insertEvents(events: NewChangeEvent[]) {
  if (events.length === 0) return { count: 0 }

  const result = await db.insert(changeEvents)
    .values(events)
    .onConflictDoNothing()
    .returning({ id: changeEvents.id })

  if (result.length > 0) {
    triggerOperationEvaluation(result.map((row) => row.id))
  }

  return { count: result.length }
}

/**
 * Get events with filtering and pagination (MULTI-ACCOUNT)
 */
export async function getEvents(params: {
  accountId: number // NEW: Required account filter
  page?: number
  pageSize?: number
  userEmail?: string
  resourceType?: string
  operationType?: string
  search?: string
}) {
  const { accountId, page = 1, pageSize = 50, userEmail, resourceType, operationType, search } = params

  // Build WHERE conditions (accountId is REQUIRED)
  const conditions = [eq(changeEvents.accountId, accountId)]

  if (userEmail) conditions.push(eq(changeEvents.userEmail, userEmail))
  if (resourceType) conditions.push(eq(changeEvents.resourceType, resourceType))
  if (operationType) conditions.push(eq(changeEvents.operationType, operationType))
  if (search) {
    const searchCondition = or(
      ilike(changeEvents.summary, `%${search}%`),
      ilike(changeEvents.campaign, `%${search}%`),
      ilike(changeEvents.resourceName, `%${search}%`)
    )
    if (searchCondition) conditions.push(searchCondition)
  }

  const where = and(...conditions)

  // Query data with pagination
  const data = await db.select()
    .from(changeEvents)
    .where(where)
    .orderBy(desc(changeEvents.timestamp))
    .limit(pageSize)
    .offset((page - 1) * pageSize)

  // Get total count
  const totalResult = await db.select({ count: sql<number>`count(*)` })
    .from(changeEvents)
    .where(where)

  const total = Number(totalResult[0]?.count || 0)

  return {
    data,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}

/**
 * Get a single event by ID
 */
export async function getEventById(id: number) {
  const result = await db.select()
    .from(changeEvents)
    .where(eq(changeEvents.id, id))
    .limit(1)

  return result[0] || null
}

/**
 * Get all unique user emails for an account (for filters)
 */
export async function getUserEmails(accountId: number) {
  const result = await db.selectDistinct({ userEmail: changeEvents.userEmail })
    .from(changeEvents)
    .where(eq(changeEvents.accountId, accountId))
    .orderBy(changeEvents.userEmail)

  return result.map(r => r.userEmail)
}

/**
 * Get statistics overview for a specific account (MULTI-ACCOUNT)
 */
export async function getStats(accountId: number) {
  const [totalEvents, totalUsers, resourceTypes, operationTypes] = await Promise.all([
    // Total events count for this account
    db.select({ count: sql<number>`count(*)` })
      .from(changeEvents)
      .where(eq(changeEvents.accountId, accountId)),

    // Total unique users count for this account
    db.select({ count: sql<number>`count(distinct user_email)` })
      .from(changeEvents)
      .where(eq(changeEvents.accountId, accountId)),

    // Resource type distribution for this account
    db.select({
      resourceType: changeEvents.resourceType,
      count: sql<number>`count(*)`
    })
      .from(changeEvents)
      .where(eq(changeEvents.accountId, accountId))
      .groupBy(changeEvents.resourceType),

    // Operation type distribution for this account
    db.select({
      operationType: changeEvents.operationType,
      count: sql<number>`count(*)`
    })
      .from(changeEvents)
      .where(eq(changeEvents.accountId, accountId))
      .groupBy(changeEvents.operationType),
  ])

  return {
    totalEvents: Number(totalEvents[0]?.count || 0),
    totalUsers: Number(totalUsers[0]?.count || 0),
    resourceTypes: resourceTypes.map(r => ({
      resourceType: r.resourceType,
      count: Number(r.count)
    })),
    operationTypes: operationTypes.map(r => ({
      operationType: r.operationType,
      count: Number(r.count)
    })),
  }
}

/**
 * Get multi-account overview statistics
 */
export async function getMultiAccountStats() {
  const activeAccounts = await getAccounts({ isActive: true })

  const stats = await Promise.all(
    activeAccounts.map(async (account) => ({
      account,
      stats: await getStats(account.id),
    }))
  )

  return stats
}

// ============================================
// GOOGLE ADS ENTITIES (Campaigns / AdGroups / Ads)
// ============================================

type CampaignSyncInput = Omit<NewCampaign, 'id'>
type AdGroupSyncInput = Omit<NewAdGroup, 'id'>
type AdSyncInput = Omit<NewAd, 'id'>

function toDate(value: string | Date | null | undefined) {
  return value ? new Date(value) : null
}

function toBigIntValue(value: number | string | null | undefined) {
  if (value === null || value === undefined) return null
  try {
    return BigInt(value)
  } catch {
    return null
  }
}

function toNumber(value: bigint | number | null | undefined) {
  if (value === null || value === undefined) return null
  if (typeof value === 'bigint') {
    return Number(value)
  }
  return value
}

export async function upsertCampaigns(accountId: number, records: CampaignSyncInput[]) {
  if (records.length === 0) return { insertedOrUpdated: 0 }

  const result = await db.insert(campaigns)
    .values(records)
    .onConflictDoUpdate({
      target: [campaigns.accountId, campaigns.resourceName],
      set: {
        campaignId: sql`excluded.campaign_id`,
        name: sql`excluded.name`,
        status: sql`excluded.status`,
        servingStatus: sql`excluded.serving_status`,
        primaryStatus: sql`excluded.primary_status`,
        channelType: sql`excluded.channel_type`,
        channelSubType: sql`excluded.channel_sub_type`,
        biddingStrategyType: sql`excluded.bidding_strategy_type`,
        startDate: sql`excluded.start_date`,
        endDate: sql`excluded.end_date`,
        budgetId: sql`excluded.budget_id`,
        budgetAmountMicros: sql`excluded.budget_amount_micros`,
        currency: sql`excluded.currency`,
        lastModifiedTime: sql`excluded.last_modified_time`,
        updatedAt: sql`now()`,
      },
    })
    .returning({ id: campaigns.id })

  return { insertedOrUpdated: result.length }
}

export async function pruneCampaigns(accountId: number, keepResourceNames: string[]) {
  const where = keepResourceNames.length > 0
    ? and(eq(campaigns.accountId, accountId), notInArray(campaigns.resourceName, keepResourceNames))
    : eq(campaigns.accountId, accountId)

  const deleted = await db.delete(campaigns).where(where).returning({ id: campaigns.id })
  return { deleted: deleted.length }
}

export async function upsertAdGroups(accountId: number, records: AdGroupSyncInput[]) {
  if (records.length === 0) return { insertedOrUpdated: 0 }

  const result = await db.insert(adGroups)
    .values(records)
    .onConflictDoUpdate({
      target: [adGroups.accountId, adGroups.resourceName],
      set: {
        adGroupId: sql`excluded.ad_group_id`,
        campaignId: sql`excluded.campaign_id`,
        name: sql`excluded.name`,
        status: sql`excluded.status`,
        type: sql`excluded.type`,
        cpcBidMicros: sql`excluded.cpc_bid_micros`,
        cpmBidMicros: sql`excluded.cpm_bid_micros`,
        targetCpaMicros: sql`excluded.target_cpa_micros`,
        lastModifiedTime: sql`excluded.last_modified_time`,
        updatedAt: sql`now()`,
      },
    })
    .returning({ id: adGroups.id })

  return { insertedOrUpdated: result.length }
}

export async function pruneAdGroups(accountId: number, keepResourceNames: string[]) {
  const where = keepResourceNames.length > 0
    ? and(eq(adGroups.accountId, accountId), notInArray(adGroups.resourceName, keepResourceNames))
    : eq(adGroups.accountId, accountId)

  const deleted = await db.delete(adGroups).where(where).returning({ id: adGroups.id })
  return { deleted: deleted.length }
}

export async function upsertAds(accountId: number, records: AdSyncInput[]) {
  if (records.length === 0) return { insertedOrUpdated: 0 }

  const result = await db.insert(ads)
    .values(records)
    .onConflictDoUpdate({
      target: [ads.accountId, ads.resourceName],
      set: {
        adId: sql`excluded.ad_id`,
        adGroupId: sql`excluded.ad_group_id`,
        campaignId: sql`excluded.campaign_id`,
        name: sql`excluded.name`,
        type: sql`excluded.type`,
        status: sql`excluded.status`,
        addedByGoogleAds: sql`excluded.added_by_google_ads`,
        finalUrls: sql`excluded.final_urls`,
        finalMobileUrls: sql`excluded.final_mobile_urls`,
        displayUrl: sql`excluded.display_url`,
        devicePreference: sql`excluded.device_preference`,
        systemManagedResourceSource: sql`excluded.system_managed_resource_source`,
        lastModifiedTime: sql`excluded.last_modified_time`,
        updatedAt: sql`now()`,
      },
    })
    .returning({ id: ads.id })

  return { insertedOrUpdated: result.length }
}

export async function pruneAds(accountId: number, keepResourceNames: string[]) {
  const where = keepResourceNames.length > 0
    ? and(eq(ads.accountId, accountId), notInArray(ads.resourceName, keepResourceNames))
    : eq(ads.accountId, accountId)

  const deleted = await db.delete(ads).where(where).returning({ id: ads.id })
  return { deleted: deleted.length }
}

export function mapRawCampaignToRecord(accountId: number, raw: any, currency?: string): CampaignSyncInput {
  return {
    accountId,
    resourceName: raw.resourceName,
    campaignId: raw.campaignId,
    name: raw.name || null,
    status: raw.status || null,
    servingStatus: raw.servingStatus || null,
    primaryStatus: raw.primaryStatus || null,
    channelType: raw.channelType || null,
    channelSubType: raw.channelSubType || null,
    biddingStrategyType: raw.biddingStrategyType || null,
    startDate: raw.startDate || null,
    endDate: raw.endDate || null,
    budgetId: raw.budgetId || null,
    budgetAmountMicros: toBigIntValue(raw.budgetAmountMicros),
    currency: currency || null,
    lastModifiedTime: toDate(raw.lastModifiedTime),
  }
}

export function mapRawAdGroupToRecord(accountId: number, raw: any): AdGroupSyncInput {
  return {
    accountId,
    resourceName: raw.resourceName,
    adGroupId: raw.adGroupId,
    campaignId: raw.campaignId || '',
    name: raw.name || null,
    status: raw.status || null,
    type: raw.type || null,
    cpcBidMicros: toBigIntValue(raw.cpcBidMicros),
    cpmBidMicros: toBigIntValue(raw.cpmBidMicros),
    targetCpaMicros: toBigIntValue(raw.targetCpaMicros),
    lastModifiedTime: toDate(raw.lastModifiedTime),
  }
}

export function mapRawAdToRecord(accountId: number, raw: any): AdSyncInput {
  return {
    accountId,
    resourceName: raw.resourceName,
    adId: raw.adId,
    adGroupId: raw.adGroupId || '',
    campaignId: raw.campaignId || '',
    name: raw.name || null,
    type: raw.type || null,
    status: raw.status || null,
    addedByGoogleAds: raw.addedByGoogleAds === null ? null : Boolean(raw.addedByGoogleAds),
    finalUrls: raw.finalUrls || [],
    finalMobileUrls: raw.finalMobileUrls || [],
    displayUrl: raw.displayUrl || null,
    devicePreference: raw.devicePreference || null,
    systemManagedResourceSource: raw.systemManagedResourceSource || null,
    lastModifiedTime: toDate(raw.lastModifiedTime),
  }
}

type LatestChange = {
  summary: string | null
  summaryZh: string | null
  timestamp: Date | null
}

async function getLatestChangeEventMap(accountId: number, resourceNames: string[]) {
  const result = new Map<string, LatestChange>()
  if (resourceNames.length === 0) return result

  const rows = await db.select({
    resourceName: changeEvents.resourceName,
    summary: changeEvents.summary,
    summaryZh: changeEvents.summaryZh,
    timestamp: changeEvents.timestamp,
  })
    .from(changeEvents)
    .where(
      and(
        eq(changeEvents.accountId, accountId),
        inArray(changeEvents.resourceName, resourceNames)
      )
    )
    .orderBy(desc(changeEvents.timestamp))

  for (const row of rows) {
    if (result.has(row.resourceName)) continue
    result.set(row.resourceName, {
      summary: row.summary,
      summaryZh: row.summaryZh,
      timestamp: row.timestamp,
    })
  }

  return result
}

export async function listCampaignsWithChanges(params: {
  accountId: number
  page?: number
  pageSize?: number
  status?: string
  channelType?: string
}) {
  const { accountId, page = 1, pageSize = 50, status, channelType } = params
  const conditions = [eq(campaigns.accountId, accountId)]
  if (status) conditions.push(eq(campaigns.status, status))
  if (channelType) conditions.push(eq(campaigns.channelType, channelType))

  const where = and(...conditions)

  const data = await db.select()
    .from(campaigns)
    .where(where)
    .orderBy(desc(campaigns.lastModifiedTime), desc(campaigns.updatedAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize)

  const totalResult = await db.select({ count: sql<number>`count(*)` }).from(campaigns).where(where)
  const total = Number(totalResult[0]?.count || 0)

  const changeMap = await getLatestChangeEventMap(accountId, data.map(d => d.resourceName))
  const enriched = data.map(row => ({
    ...row,
    budgetAmountMicros: toNumber(row.budgetAmountMicros),
    latestChange: changeMap.get(row.resourceName) || null,
  }))

  return {
    data: enriched,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}

export async function listAdGroupsWithChanges(params: {
  accountId: number
  page?: number
  pageSize?: number
  status?: string
  type?: string
}) {
  const { accountId, page = 1, pageSize = 50, status, type } = params
  const conditions = [eq(adGroups.accountId, accountId)]
  if (status) conditions.push(eq(adGroups.status, status))
  if (type) conditions.push(eq(adGroups.type, type))

  const where = and(...conditions)

  const data = await db.select()
    .from(adGroups)
    .where(where)
    .orderBy(desc(adGroups.lastModifiedTime), desc(adGroups.updatedAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize)

  const totalResult = await db.select({ count: sql<number>`count(*)` }).from(adGroups).where(where)
  const total = Number(totalResult[0]?.count || 0)

  const changeMap = await getLatestChangeEventMap(accountId, data.map(d => d.resourceName))
  const enriched = data.map(row => ({
    ...row,
    cpcBidMicros: toNumber(row.cpcBidMicros),
    cpmBidMicros: toNumber(row.cpmBidMicros),
    targetCpaMicros: toNumber(row.targetCpaMicros),
    latestChange: changeMap.get(row.resourceName) || null,
  }))

  return {
    data: enriched,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}

export async function listAdsWithChanges(params: {
  accountId: number
  page?: number
  pageSize?: number
  status?: string
  type?: string
}) {
  const { accountId, page = 1, pageSize = 50, status, type } = params
  const conditions = [eq(ads.accountId, accountId)]
  if (status) conditions.push(eq(ads.status, status))
  if (type) conditions.push(eq(ads.type, type))

  const where = and(...conditions)

  const data = await db.select()
    .from(ads)
    .where(where)
    .orderBy(desc(ads.lastModifiedTime), desc(ads.updatedAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize)

  const totalResult = await db.select({ count: sql<number>`count(*)` }).from(ads).where(where)
  const total = Number(totalResult[0]?.count || 0)

  const changeMap = await getLatestChangeEventMap(accountId, data.map(d => d.resourceName))
  const enriched = data.map(row => ({
    ...row,
    latestChange: changeMap.get(row.resourceName) || null,
  }))

  return {
    data: enriched,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}
