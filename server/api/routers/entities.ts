import { z } from 'zod'
import { createTRPCRouter, publicProcedure } from '../trpc'
import { fetchEntities } from '@/server/google-ads/entities'
import {
  getAccountById,
  updateAccount,
  mapRawCampaignToRecord,
  mapRawAdGroupToRecord,
  mapRawAdToRecord,
  upsertCampaigns,
  upsertAdGroups,
  upsertAds,
  pruneCampaigns,
  pruneAdGroups,
  pruneAds,
  listCampaignsWithChanges,
  listAdGroupsWithChanges,
  listAdsWithChanges,
} from '@/server/db/queries'

const paginationShape = {
  page: z.number().min(1).default(1),
  pageSize: z.number().min(1).max(200).default(50),
}

const listCampaignsInput = z.object({
  accountId: z.number(),
  ...paginationShape,
  status: z.string().optional(),
  channelType: z.string().optional(),
  mediaSource: z.string().optional(), // currently default google; reserved for future
})

const listAdGroupsInput = z.object({
  accountId: z.number(),
  ...paginationShape,
  status: z.string().optional(),
  type: z.string().optional(),
  mediaSource: z.string().optional(),
})

const listAdsInput = z.object({
  accountId: z.number(),
  ...paginationShape,
  status: z.string().optional(),
  type: z.string().optional(),
  mediaSource: z.string().optional(),
})

const syncInput = z.object({
  accountId: z.number(),
  scope: z.array(z.enum(['campaigns', 'adGroups', 'ads'])).optional(),
})

export const entitiesRouter = createTRPCRouter({
  sync: publicProcedure
    .input(syncInput)
    .mutation(async ({ input }) => {
      const account = await getAccountById(input.accountId)
      if (!account) {
        throw new Error('Account not found')
      }

      const scopes = input.scope || ['campaigns', 'adGroups', 'ads']
      const payload = await fetchEntities(account.customerId)

      const currency = account.currency || null
      const includeCampaigns = scopes.includes('campaigns')
      const includeAdGroups = scopes.includes('adGroups')
      const includeAds = scopes.includes('ads')

      let campaignResult = { insertedOrUpdated: 0, deleted: 0 }
      let adGroupResult = { insertedOrUpdated: 0, deleted: 0 }
      let adResult = { insertedOrUpdated: 0, deleted: 0 }

      if (includeCampaigns) {
        const campaignRecords = payload.campaigns.map((c) => mapRawCampaignToRecord(account.id, c, currency || undefined))
        const keep = campaignRecords.filter((c) => c.status !== 'REMOVED').map((c) => c.resourceName)
        const upsertRes = await upsertCampaigns(account.id, campaignRecords)
        const pruneRes = await pruneCampaigns(account.id, keep)
        campaignResult = { insertedOrUpdated: upsertRes.insertedOrUpdated, deleted: pruneRes.deleted }
      }

      if (includeAdGroups) {
        const adGroupRecords = payload.adGroups.map((g) => mapRawAdGroupToRecord(account.id, g))
        const keep = adGroupRecords.filter((g) => g.status !== 'REMOVED').map((g) => g.resourceName)
        const upsertRes = await upsertAdGroups(account.id, adGroupRecords)
        const pruneRes = await pruneAdGroups(account.id, keep)
        adGroupResult = { insertedOrUpdated: upsertRes.insertedOrUpdated, deleted: pruneRes.deleted }
      }

      if (includeAds) {
        const adRecords = payload.ads.map((a) => mapRawAdToRecord(account.id, a))
        const keep = adRecords.filter((a) => a.status !== 'REMOVED').map((a) => a.resourceName)
        const upsertRes = await upsertAds(account.id, adRecords)
        const pruneRes = await pruneAds(account.id, keep)
        adResult = { insertedOrUpdated: upsertRes.insertedOrUpdated, deleted: pruneRes.deleted }
      }

      await updateAccount(account.id, { lastSyncedAt: new Date() })

      return {
        success: true,
        campaigns: campaignResult,
        adGroups: adGroupResult,
        ads: adResult,
      }
    }),

  listCampaigns: publicProcedure
    .input(listCampaignsInput)
    .query(async ({ input }) => {
      return listCampaignsWithChanges({
        accountId: input.accountId,
        page: input.page,
        pageSize: input.pageSize,
        status: input.status,
        channelType: input.channelType,
      })
    }),

  listAdGroups: publicProcedure
    .input(listAdGroupsInput)
    .query(async ({ input }) => {
      return listAdGroupsWithChanges({
        accountId: input.accountId,
        page: input.page,
        pageSize: input.pageSize,
        status: input.status,
        type: input.type,
      })
    }),

  listAds: publicProcedure
    .input(listAdsInput)
    .query(async ({ input }) => {
      return listAdsWithChanges({
        accountId: input.accountId,
        page: input.page,
        pageSize: input.pageSize,
        status: input.status,
        type: input.type,
      })
    }),
})
