# API Integration Guide - Phase B

## Overview

This guide provides detailed instructions for replacing mock execution functions with real Google Ads API calls in Phase B of the MonitorSysUA evaluation system.

**Current Status (Phase A):**
- All action executions are simulated using `lib/services/mock-execution.ts`
- Frontend components reference mock functions
- No real changes are made to Google Ads campaigns

**Target (Phase B):**
- Replace mock functions with real Google Ads API service
- Implement proper error handling and retry logic
- Add transaction logging and audit trails
- Ensure atomic operations and rollback capabilities

---

## Architecture Overview

### Phase A (Current - Mock Mode)

```
Frontend Components
    ↓
Mock Execution Service (lib/services/mock-execution.ts)
    ↓
Console Logging + Simulated Results
```

### Phase B (Target - Real API)

```
Frontend Components
    ↓
tRPC API Routers (server/api/routers/evaluation.ts)
    ↓
Google Ads Service Layer (server/google-ads/evaluation-actions.ts)
    ↓
Google Ads API Client (google-ads-api)
    ↓
Google Ads Platform
```

---

## Mock Functions Mapping

### 1. Campaign Budget Update

**Mock Function:** `mockBudgetUpdate()`
**Location:** `lib/services/mock-execution.ts:33-86`

**Function Signature:**
```typescript
async function mockBudgetUpdate(
  campaignId: string,
  currentBudget: number,
  changePercent: string
): Promise<MockExecutionResult>
```

**Real API Implementation:**

**New Location:** `server/google-ads/evaluation-actions.ts`

```typescript
import { GoogleAdsApi, enums } from 'google-ads-api'

async function updateCampaignBudget(
  customerId: string,
  campaignId: string,
  newBudget: number
): Promise<ExecutionResult> {
  const client = getGoogleAdsClient() // From server/google-ads/client.ts

  try {
    const campaign = {
      resourceName: `customers/${customerId}/campaigns/${campaignId}`,
      campaignBudget: {
        amountMicros: Math.round(newBudget * 1_000_000), // Convert to micros
      },
    }

    const response = await client.customers.campaigns.update(campaign, {
      updateMask: ['campaign_budget.amount_micros'],
    })

    return {
      success: true,
      message: `Budget updated successfully`,
      newValue: newBudget,
    }
  } catch (error) {
    return {
      success: false,
      message: 'Budget update failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
```

**Google Ads API Endpoints:**
- **Service:** `CampaignBudgetService`
- **Method:** `mutateCampaignBudgets`
- **Resource:** `customers/{customer_id}/campaignBudgets/{campaign_budget_id}`
- **Documentation:** https://developers.google.com/google-ads/api/reference/rpc/latest/CampaignBudgetService

**Validation Rules:**
- Minimum budget: $10 (10,000,000 micros)
- Maximum budget: $100,000 (100,000,000,000 micros)
- Budget changes should be logged in `change_events` table
- Retry logic: 3 attempts with exponential backoff

---

### 2. Campaign tROAS Update

**Mock Function:** `mockTroasUpdate()`
**Location:** `lib/services/mock-execution.ts:99-152`

**Function Signature:**
```typescript
async function mockTroasUpdate(
  campaignId: string,
  currentTroas: number,
  changePercent: string
): Promise<MockExecutionResult>
```

**Real API Implementation:**

```typescript
async function updateCampaignTROAS(
  customerId: string,
  campaignId: string,
  newTroas: number
): Promise<ExecutionResult> {
  const client = getGoogleAdsClient()

  try {
    const campaign = {
      resourceName: `customers/${customerId}/campaigns/${campaignId}`,
      targetRoas: {
        targetRoas: newTroas / 100, // API expects decimal (e.g., 2.0 for 200%)
      },
    }

    const response = await client.customers.campaigns.update(campaign, {
      updateMask: ['target_roas.target_roas'],
    })

    return {
      success: true,
      message: `tROAS updated successfully`,
      newValue: newTroas,
    }
  } catch (error) {
    return {
      success: false,
      message: 'tROAS update failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
```

**Google Ads API Endpoints:**
- **Service:** `CampaignService`
- **Method:** `mutateCampaigns`
- **Resource:** `customers/{customer_id}/campaigns/{campaign_id}`
- **Field:** `target_roas.target_roas`
- **Documentation:** https://developers.google.com/google-ads/api/reference/rpc/latest/CampaignService

**Validation Rules:**
- Minimum tROAS: 50% (0.5)
- Maximum tROAS: 1000% (10.0)
- Only applicable to campaigns with `TARGET_ROAS` bidding strategy
- Log all tROAS changes with timestamp and old/new values

---

### 3. Campaign Pause

**Mock Function:** `mockCampaignPause()`
**Location:** `lib/services/mock-execution.ts:163-182`

**Function Signature:**
```typescript
async function mockCampaignPause(
  campaignId: string
): Promise<MockExecutionResult>
```

**Real API Implementation:**

```typescript
async function pauseCampaign(
  customerId: string,
  campaignId: string
): Promise<ExecutionResult> {
  const client = getGoogleAdsClient()

  try {
    const campaign = {
      resourceName: `customers/${customerId}/campaigns/${campaignId}`,
      status: enums.CampaignStatus.PAUSED,
    }

    const response = await client.customers.campaigns.update(campaign, {
      updateMask: ['status'],
    })

    return {
      success: true,
      message: 'Campaign paused successfully',
    }
  } catch (error) {
    return {
      success: false,
      message: 'Failed to pause campaign',
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
```

**Google Ads API Endpoints:**
- **Service:** `CampaignService`
- **Method:** `mutateCampaigns`
- **Resource:** `customers/{customer_id}/campaigns/{campaign_id}`
- **Field:** `status`
- **Value:** `PAUSED` (enum value: 3)
- **Documentation:** https://developers.google.com/google-ads/api/reference/rpc/latest/CampaignService

**Important Notes:**
- Pausing a campaign stops all ad serving immediately
- Consider sending notification to campaign owner
- Log pause action with reason code
- Implement cooldown period (e.g., cannot re-enable within 1 hour)

---

### 4. Creative Sync

**Mock Function:** `mockCreativeSync()`
**Location:** `lib/services/mock-execution.ts:195-228`

**Function Signature:**
```typescript
async function mockCreativeSync(
  creativeId: string,
  sourceCampaignId: string,
  targetCampaignIds: string[]
): Promise<MockExecutionResult>
```

**Real API Implementation:**

```typescript
async function syncCreativeToMatureCampaigns(
  customerId: string,
  creativeId: string,
  sourceCampaignId: string,
  targetCampaignIds: string[]
): Promise<ExecutionResult> {
  const client = getGoogleAdsClient()

  try {
    // 1. Fetch creative asset from source campaign
    const creativeAsset = await fetchCreativeAsset(
      client,
      customerId,
      sourceCampaignId,
      creativeId
    )

    // 2. Create ad group ads in target campaigns
    const results = []
    for (const targetCampaignId of targetCampaignIds) {
      const adGroupId = await getOrCreateAdGroup(
        client,
        customerId,
        targetCampaignId
      )

      const adGroupAd = {
        adGroup: `customers/${customerId}/adGroups/${adGroupId}`,
        ad: {
          finalUrls: creativeAsset.finalUrls,
          type: creativeAsset.type,
          // Copy all creative assets (images, videos, headlines, descriptions)
          ...creativeAsset.adData,
        },
        status: enums.AdGroupAdStatus.ENABLED,
      }

      const response = await client.customers.adGroupAds.create(adGroupAd)
      results.push(response)
    }

    return {
      success: true,
      message: `Creative synced to ${targetCampaignIds.length} campaign(s)`,
    }
  } catch (error) {
    return {
      success: false,
      message: 'Creative sync failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// Helper function to fetch creative asset
async function fetchCreativeAsset(
  client: GoogleAdsApi,
  customerId: string,
  campaignId: string,
  creativeId: string
) {
  const query = `
    SELECT
      ad_group_ad.ad.id,
      ad_group_ad.ad.type,
      ad_group_ad.ad.final_urls,
      ad_group_ad.ad.responsive_display_ad.headlines,
      ad_group_ad.ad.responsive_display_ad.descriptions,
      ad_group_ad.ad.responsive_display_ad.marketing_images,
      ad_group_ad.ad.app_ad.headlines,
      ad_group_ad.ad.app_ad.descriptions,
      ad_group_ad.ad.app_ad.images
    FROM ad_group_ad
    WHERE ad_group_ad.ad.id = ${creativeId}
      AND campaign.id = ${campaignId}
    LIMIT 1
  `

  const [ad] = await client.query(query)
  return ad
}

// Helper function to get or create ad group in target campaign
async function getOrCreateAdGroup(
  client: GoogleAdsApi,
  customerId: string,
  campaignId: string
): Promise<string> {
  // Query existing ad groups
  const query = `
    SELECT ad_group.id, ad_group.name
    FROM ad_group
    WHERE campaign.id = ${campaignId}
      AND ad_group.status = 'ENABLED'
    ORDER BY ad_group.id ASC
    LIMIT 1
  `

  const results = await client.query(query)

  if (results.length > 0) {
    return results[0].ad_group.id
  }

  // Create new ad group if none exists
  const adGroup = {
    campaign: `customers/${customerId}/campaigns/${campaignId}`,
    name: `Synced Creatives - ${new Date().toISOString().split('T')[0]}`,
    status: enums.AdGroupStatus.ENABLED,
    type: enums.AdGroupType.DISPLAY_STANDARD,
  }

  const response = await client.customers.adGroups.create(adGroup)
  return response.results[0].resourceName.split('/').pop()!
}
```

**Google Ads API Endpoints:**
- **Creative Fetch Service:** `GoogleAdsService` (query)
- **Ad Group Ad Creation Service:** `AdGroupAdService`
- **Method:** `mutateAdGroupAds`
- **Resources:**
  - Source: `customers/{customer_id}/adGroupAds/{ad_group_id}~{ad_id}`
  - Target: `customers/{customer_id}/adGroups/{ad_group_id}`
- **Documentation:**
  - Query: https://developers.google.com/google-ads/api/docs/query/overview
  - AdGroupAdService: https://developers.google.com/google-ads/api/reference/rpc/latest/AdGroupAdService

**Important Notes:**
- Creative sync is complex and varies by ad type (App, Display, Video)
- Ensure all asset references (images, videos) are copied correctly
- Validate ad policies before syncing to avoid disapprovals
- Implement transaction rollback if sync fails for any target campaign

---

## tRPC Router Integration

### Update Evaluation Router

**File:** `server/api/routers/evaluation.ts`

Add new mutations for action execution:

```typescript
import { z } from 'zod'
import { createTRPCRouter, protectedProcedure } from '../trpc'
import * as evaluationActions from '@/server/google-ads/evaluation-actions'

export const evaluationRouter = createTRPCRouter({
  // ... existing queries ...

  // Execute campaign budget update
  executeBudgetUpdate: protectedProcedure
    .input(
      z.object({
        accountId: z.string(),
        campaignId: z.string(),
        changePercent: z.string(),
        evaluationId: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { accountId, campaignId, changePercent, evaluationId } = input

      // Fetch current budget
      const campaign = await ctx.db.query.campaigns.findFirst({
        where: (campaigns, { eq }) => eq(campaigns.id, campaignId),
      })

      if (!campaign) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Campaign not found' })
      }

      const currentBudget = campaign.dailyBudget || 1000
      const newBudget = calculateNewValue(currentBudget, changePercent)

      if (!newBudget) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid change percentage' })
      }

      // Execute real API call
      const result = await evaluationActions.updateCampaignBudget(
        accountId,
        campaignId,
        newBudget
      )

      // Log action execution
      if (evaluationId) {
        await ctx.db.insert(actionExecutionLogs).values({
          evaluationId,
          actionType: 'BUDGET',
          campaignId,
          oldValue: currentBudget,
          newValue: newBudget,
          success: result.success,
          errorMessage: result.error,
          executedAt: new Date(),
        })
      }

      return result
    }),

  // Execute campaign tROAS update
  executeTroasUpdate: protectedProcedure
    .input(
      z.object({
        accountId: z.string(),
        campaignId: z.string(),
        changePercent: z.string(),
        evaluationId: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Similar implementation to executeBudgetUpdate
      // ...
    }),

  // Execute campaign pause
  executeCampaignPause: protectedProcedure
    .input(
      z.object({
        accountId: z.string(),
        campaignId: z.string(),
        evaluationId: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // ...
    }),

  // Execute creative sync
  executeCreativeSync: protectedProcedure
    .input(
      z.object({
        accountId: z.string(),
        creativeId: z.string(),
        sourceCampaignId: z.string(),
        targetCampaignIds: z.array(z.string()),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // ...
    }),
})
```

---

## Frontend Migration

### Update Component Imports

**Files to Update:**
- `components/evaluation/action-execution-dialog.tsx`
- `components/evaluation/creative-sync-dialog.tsx`

**Change From:**
```typescript
import { mockExecuteAction } from '@/lib/services/mock-execution'

// Usage
const result = await mockExecuteAction({
  campaignId,
  action,
  currentBudget,
  currentTroas,
})
```

**Change To:**
```typescript
import { trpc } from '@/lib/trpc/client'

// In component
const executeBudgetMutation = trpc.evaluation.executeBudgetUpdate.useMutation()
const executeTroasMutation = trpc.evaluation.executeTroasUpdate.useMutation()
const executePauseMutation = trpc.evaluation.executeCampaignPause.useMutation()

// Usage
if (action.type === ActionType.BUDGET) {
  const result = await executeBudgetMutation.mutateAsync({
    accountId: selectedAccountId,
    campaignId,
    changePercent: action.change!,
    evaluationId,
  })
}
```

---

## Database Schema Updates

### Add Action Execution Logs Table

**File:** `server/db/schema.ts`

```typescript
export const actionExecutionLogs = pgTable('action_execution_logs', {
  id: serial('id').primaryKey(),
  evaluationId: integer('evaluation_id').references(() => campaignEvaluations.id),
  actionType: text('action_type').notNull(), // 'BUDGET', 'TROAS', 'PAUSE', 'OBSERVE'
  campaignId: text('campaign_id').notNull(),
  creativeId: text('creative_id'),
  oldValue: doublePrecision('old_value'),
  newValue: doublePrecision('new_value'),
  success: boolean('success').notNull(),
  errorMessage: text('error_message'),
  executedBy: text('executed_by'), // User ID or 'SYSTEM'
  executedAt: timestamp('executed_at').notNull().defaultNow(),
  rollbackAt: timestamp('rollback_at'),
})

export const actionExecutionLogsRelations = relations(actionExecutionLogs, ({ one }) => ({
  evaluation: one(campaignEvaluations, {
    fields: [actionExecutionLogs.evaluationId],
    references: [campaignEvaluations.id],
  }),
}))
```

**Migration Command:**
```bash
npm run db:generate
npm run db:migrate
```

---

## Error Handling

### Retry Logic

```typescript
async function executeWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  backoffMs: number = 1000
): Promise<T> {
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error

      // Check if error is retryable
      if (!isRetryableError(error)) {
        throw error
      }

      if (attempt < maxRetries) {
        const delay = backoffMs * Math.pow(2, attempt - 1)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  throw lastError
}

function isRetryableError(error: any): boolean {
  // Retry on transient errors
  const retryableCodes = [
    'UNAVAILABLE',
    'DEADLINE_EXCEEDED',
    'RESOURCE_EXHAUSTED',
  ]

  return retryableCodes.includes(error.code)
}
```

### Error Logging

```typescript
import { logger } from '@/lib/logger'

async function updateCampaignBudget(...) {
  try {
    // ... API call
  } catch (error) {
    logger.error('Budget update failed', {
      customerId,
      campaignId,
      newBudget,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    })

    throw error
  }
}
```

---

## Testing Guidelines

### Unit Tests

**File:** `server/google-ads/__tests__/evaluation-actions.test.ts`

```typescript
import { describe, it, expect, vi } from 'vitest'
import { updateCampaignBudget } from '../evaluation-actions'

describe('Campaign Budget Update', () => {
  it('should update budget successfully', async () => {
    const result = await updateCampaignBudget('1234567890', 'campaign_123', 1500)

    expect(result.success).toBe(true)
    expect(result.newValue).toBe(1500)
  })

  it('should reject budget below minimum', async () => {
    const result = await updateCampaignBudget('1234567890', 'campaign_123', 5)

    expect(result.success).toBe(false)
    expect(result.error).toContain('Minimum budget')
  })

  it('should handle API errors gracefully', async () => {
    // Mock API to throw error
    vi.spyOn(client.customers.campaigns, 'update').mockRejectedValueOnce(
      new Error('API Error')
    )

    const result = await updateCampaignBudget('1234567890', 'campaign_123', 1500)

    expect(result.success).toBe(false)
  })
})
```

### Integration Tests

```typescript
describe('Budget Update Integration', () => {
  it('should update budget and log execution', async () => {
    const result = await trpc.evaluation.executeBudgetUpdate.mutate({
      accountId: 'test_account',
      campaignId: 'campaign_123',
      changePercent: '+10%',
      evaluationId: 1,
    })

    expect(result.success).toBe(true)

    // Verify log was created
    const log = await db.query.actionExecutionLogs.findFirst({
      where: (logs, { eq }) => eq(logs.evaluationId, 1),
    })

    expect(log).toBeDefined()
    expect(log?.actionType).toBe('BUDGET')
  })
})
```

---

## Rollout Plan

### Phase B.1: Preparation
1. ✅ Set up Google Ads API access
2. ✅ Create service layer (`server/google-ads/evaluation-actions.ts`)
3. ✅ Add database schema for action logs
4. ✅ Implement retry and error handling

### Phase B.2: Staged Rollout
1. **Week 1:** Implement and test budget updates only
2. **Week 2:** Add tROAS updates
3. **Week 3:** Add campaign pause functionality
4. **Week 4:** Implement creative sync (most complex)

### Phase B.3: Feature Flags
```typescript
// lib/feature-flags.ts
export const ENABLE_REAL_API = process.env.ENABLE_REAL_API === 'true'

// In components
if (ENABLE_REAL_API) {
  result = await trpc.evaluation.executeBudgetUpdate.mutateAsync(...)
} else {
  result = await mockExecuteAction(...)
}
```

### Phase B.4: Monitoring
- Set up alerts for failed API calls
- Monitor action execution logs daily
- Track success rates per action type
- Review budget/tROAS changes weekly

---

## Security Considerations

1. **Authorization:**
   - Verify user has permission to modify campaigns
   - Check account ownership before executing actions
   - Log all action attempts (success and failure)

2. **Validation:**
   - Validate all inputs on server side
   - Enforce budget/tROAS constraints
   - Prevent rapid repeated actions (rate limiting)

3. **Audit Trail:**
   - Log old and new values for all changes
   - Store timestamp and user ID
   - Implement rollback capability for emergencies

4. **Rate Limiting:**
   ```typescript
   const RATE_LIMIT = 10 // actions per minute per user

   // Use Redis or in-memory store
   const key = `action_rate_limit:${userId}`
   const count = await redis.incr(key)
   await redis.expire(key, 60)

   if (count > RATE_LIMIT) {
     throw new TRPCError({ code: 'TOO_MANY_REQUESTS' })
   }
   ```

---

## Rollback Procedure

If a change needs to be reverted:

```typescript
async function rollbackAction(logId: number): Promise<void> {
  const log = await db.query.actionExecutionLogs.findFirst({
    where: (logs, { eq }) => eq(logs.id, logId),
  })

  if (!log || !log.success) {
    throw new Error('Cannot rollback failed or non-existent action')
  }

  switch (log.actionType) {
    case 'BUDGET':
      await updateCampaignBudget(
        log.accountId,
        log.campaignId,
        log.oldValue!
      )
      break
    case 'TROAS':
      await updateCampaignTROAS(
        log.accountId,
        log.campaignId,
        log.oldValue!
      )
      break
    case 'PAUSE':
      // Re-enable campaign
      await enableCampaign(log.accountId, log.campaignId)
      break
  }

  // Mark as rolled back
  await db.update(actionExecutionLogs)
    .set({ rollbackAt: new Date() })
    .where(eq(actionExecutionLogs.id, logId))
}
```

---

## Checklist

**Before Phase B Implementation:**
- [ ] Google Ads API credentials verified and tested
- [ ] Service account has necessary permissions
- [ ] Database migration for `action_execution_logs` table completed
- [ ] Error logging system configured
- [ ] Retry logic implemented and tested
- [ ] Unit tests written for all action functions
- [ ] Integration tests written for tRPC mutations
- [ ] Feature flag system implemented
- [ ] Monitoring and alerts configured
- [ ] Documentation reviewed by team

**After Phase B Implementation:**
- [ ] All mock functions replaced with real API calls
- [ ] Frontend components updated to use tRPC mutations
- [ ] Action execution logs are being created correctly
- [ ] Error handling tested with various failure scenarios
- [ ] Rollback procedure tested and documented
- [ ] Performance benchmarks meet requirements (< 3s per action)
- [ ] Security audit completed
- [ ] User acceptance testing passed

---

## Support

For questions or issues during Phase B implementation:
- **Technical Questions:** Contact backend team lead
- **Google Ads API Issues:** Refer to official documentation: https://developers.google.com/google-ads/api
- **System Design Questions:** Review PRD.md and PLAN.md

**Version:** 1.0
**Last Updated:** 2024-01-21
**Author:** MonitorSysUA Development Team
