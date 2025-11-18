/**
 * Database Query Functions
 *
 * All database operations using Drizzle ORM.
 * These functions are called by the tRPC routers.
 */

import { db } from './index'
import { changeEvents, type NewChangeEvent, accounts, type Account, type NewAccount } from './schema'
import { and, desc, eq, ilike, or, sql } from 'drizzle-orm'

// ============================================
// ACCOUNT MANAGEMENT FUNCTIONS
// ============================================

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
  return await db.insert(changeEvents).values(event).onConflictDoNothing()
}

/**
 * Batch insert events with automatic deduplication
 */
export async function insertEvents(events: NewChangeEvent[]) {
  if (events.length === 0) return { count: 0 }

  const result = await db.insert(changeEvents)
    .values(events)
    .onConflictDoNothing()

  return { count: result.rowCount || 0 }
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
