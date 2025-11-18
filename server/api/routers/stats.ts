import { z } from 'zod'
import { createTRPCRouter, publicProcedure } from '../trpc'
import { getStats, getMultiAccountStats } from '@/server/db/queries'

export const statsRouter = createTRPCRouter({
  // Get overview statistics for a specific account (MULTI-ACCOUNT)
  overview: publicProcedure
    .input(z.object({
      accountId: z.number(), // NEW: Required account filter
    }))
    .query(async ({ input }) => {
      return await getStats(input.accountId)
    }),

  // Get multi-account overview (all active accounts)
  multiAccountOverview: publicProcedure.query(async () => {
    return await getMultiAccountStats()
  }),
})
