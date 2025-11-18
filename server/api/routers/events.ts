import { z } from 'zod'
import { createTRPCRouter, publicProcedure } from '../trpc'
import { getEvents, getEventById, insertEvents, getAccountById, updateAccount } from '@/server/db/queries'
import { fetchAndParseChangeEvents } from '@/server/google-ads/client'

export const eventsRouter = createTRPCRouter({
  // Get paginated event list with optional filters (MULTI-ACCOUNT)
  list: publicProcedure
    .input(z.object({
      accountId: z.number(), // NEW: Required account filter
      page: z.number().min(1).default(1),
      pageSize: z.number().min(1).max(100).default(50),
      userEmail: z.string().optional(),
      resourceType: z.string().optional(),
      operationType: z.string().optional(),
      search: z.string().optional(),
    }))
    .query(async ({ input }) => {
      return await getEvents(input)
    }),

  // Sync data from Google Ads API (MULTI-ACCOUNT)
  sync: publicProcedure
    .input(z.object({
      accountId: z.number(), // NEW: Required account ID to sync
      days: z.number().min(1).max(30).default(7),
    }))
    .mutation(async ({ input }) => {
      try {
        // Get account details
        const account = await getAccountById(input.accountId)
        if (!account) {
          throw new Error('Account not found')
        }

        // Fetch from Google Ads API for this specific account
        const events = await fetchAndParseChangeEvents(account.customerId, input.days)

        // Insert into database (with automatic deduplication and account association)
        const eventsWithAccountId = events.map(event => ({
          ...event,
          accountId: input.accountId,
        }))
        const result = await insertEvents(eventsWithAccountId)

        // Update account's last synced timestamp
        await updateAccount(input.accountId, { lastSyncedAt: new Date() })

        return {
          success: true,
          count: result.count,
          totalFetched: events.length,
          accountName: account.name,
          message: `Successfully synced ${result.count} new events for ${account.name} (${events.length} total fetched)`,
        }
      } catch (error) {
        console.error('Sync error:', error)
        throw new Error(
          `Failed to sync: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      }
    }),

  // Get single event by ID
  getById: publicProcedure
    .input(z.object({
      id: z.number(),
    }))
    .query(async ({ input }) => {
      const event = await getEventById(input.id)
      if (!event) {
        throw new Error('Event not found')
      }
      return event
    }),
})
