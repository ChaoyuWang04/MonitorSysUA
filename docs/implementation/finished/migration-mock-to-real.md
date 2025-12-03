# Migration Guide: Mock Data to AppsFlyer

> Guide for migrating from mock evaluation data to real AppsFlyer cohort data.

## Overview

Starting with Phase 5, the evaluation system (A2 Baseline, A3 Campaign, A7 Operation) uses real AppsFlyer cohort data instead of mock data. This document explains the changes and how to migrate.

**Timeline**:
- **Phase 5** (2025-11-29): A2/A3/A7 switched to AppsFlyer data
- **Phase 8** (2025-11-29): `mock_campaign_performance` table removed
- **Future**: A4 Creative will migrate (currently still uses mock)

---

## Breaking Changes

### 1. Removed Table: `mock_campaign_performance`

The `mock_campaign_performance` table has been removed from the schema.

**Before** (Deprecated):
```typescript
// Old approach - used mock data
const performance = await db.select().from(mockCampaignPerformance);
```

**After** (Current):
```typescript
// New approach - use AppsFlyer data
const cohortKpi = await getCohortKpi({
  installDateStart: startDate,
  installDateEnd: endDate,
  geo: 'US'
});
```

### 2. Deprecated Functions

The following functions are deprecated and log warnings:

| Deprecated Function | Replacement | Module |
|---------------------|-------------|--------|
| `calculateBaseline()` | `calculateBaselineFromAF()` | baseline-calculator.ts |
| `updateAllBaselines()` | `updateAllBaselinesFromAF()` | baseline-calculator.ts |
| `evaluateCampaign()` | `evaluateCampaignFromAF()` | campaign-evaluator.ts |
| `evaluateAllCampaigns()` | `evaluateAllCampaignsFromAF()` | campaign-evaluator.ts |
| `evaluateOperation()` | `evaluateOperationFromAF()` | operation-evaluator.ts |

**Example Migration**:

```typescript
// Before (deprecated)
import { calculateBaseline } from '@/server/evaluation/wrappers/baseline-calculator';
const baseline = await calculateBaseline(params);

// After (current)
import { calculateBaselineFromAF } from '@/server/evaluation/wrappers/baseline-calculator';
const baseline = await calculateBaselineFromAF(params);
```

### 3. Table Kept: `mock_creative_performance`

The `mock_creative_performance` table is **preserved** for A4 Creative Evaluation, which has not yet migrated to AppsFlyer data.

---

## Field Mapping

### Campaign Performance Fields

| Mock Field | AppsFlyer Equivalent | Notes |
|------------|---------------------|-------|
| `campaignId` | `campaign` | String identifier |
| `date` | `installDate` | Cohort-based, not event-based |
| `totalSpend` | `costUsd` | From `af_cohort_kpi_daily` |
| `totalRevenue` | `totalRevenueUsd` | From `af_cohort_metrics_daily` |
| `installs` | `installs` | Same field name |
| `actualRoas7` | Calculated | `cumulative_revenue / cost` |
| `actualRet7` | `retentionRate` | Where `daysSinceInstall = 7` |

### Baseline Fields

| Mock Field | AppsFlyer Equivalent | Notes |
|------------|---------------------|-------|
| `baselineRoas7` | `calculateBaselineRoas()` | Weighted ROAS from `baseline_metrics` (no P50) |
| `baselineRet7` | `calculateBaselineRetention()` | Weighted retention from `baseline_metrics` (no P50) |
| `referencePeriod` | `window.start` - `window.end` | 180-210 days ago |

---

## Query Migration Examples

### Getting Campaign Metrics

**Before (Mock)**:
```typescript
const metrics = await db
  .select()
  .from(mockCampaignPerformance)
  .where(eq(mockCampaignPerformance.campaignId, campaignId));
```

**After (AppsFlyer)**:
```typescript
// Option 1: Use tRPC
const metrics = await api.appsflyer.getCohortMetrics.query({
  installDate: date,
  daysSinceInstall: 7,
  campaign: campaignName
});

// Option 2: Use query functions directly
import { getCohortMetrics } from '@/server/db/queries-appsflyer';
const metrics = await getCohortMetrics({
  installDate: new Date(date),
  daysSinceInstall: 7,
  campaign: campaignName
});
```

### Calculating ROAS

**Before (Mock)**:
```typescript
const roas = mockData.actualRoas7;
```

**After (AppsFlyer)**:
```typescript
// Get cumulative revenue D0-D7
const revenue = await getRevenueByCohort({
  installDate: cohortDate,
  daysSinceInstall: 7,
  campaign: campaignName
});

// Get cost from KPI
const kpi = await getCohortKpi({
  installDate: cohortDate,
  daysSinceInstall: 0,  // Cost is on D0
  campaign: campaignName
});

const cost = Number(kpi.data[0]?.costUsd || 0);
const roas = cost > 0 ? revenue.totalRevenueUsd / cost : 0;
```

### Getting Baseline

**Before (Mock)**:
```typescript
const baseline = await db
  .select()
  .from(safetyBaseline)
  .where(and(
    eq(safetyBaseline.product, product),
    eq(safetyBaseline.country, country)
  ));
```

**After (AppsFlyer)**:
```typescript
const baseline = await calculateBaselineFromAF({
  appId: 'solitaire.patience.card.games.klondike.free',
  geo: 'US',
  mediaSource: 'googleadwords_int'
});

// Returns:
// {
//   baselineRoas7: 0.85,
//   baselineRet7: 0.12,
//   referencePeriod: '2025-05-03 to 2025-06-02',
//   sampleCohorts: 30,
//   lastUpdated: Date
// }
```

---

## Troubleshooting

### "No baseline data available"

**Cause**: Baseline calculation requires cohorts from 180-210 days ago.

**Solution**:
1. Run historical backfill: `just af-backfill-180`
2. Wait for data to mature (180+ days of history needed)
3. Check if matching app/geo/mediaSource exists in data

### "Null retention rates"

**Cause**: AppsFlyer updates retention data over time:
- D1: Available ~2 days after install
- D3: Available ~4 days after install
- D7: Available ~8 days after install

**Solution**: Wait for retention data to populate, or use most recent available day.

### "Function not found" errors

**Cause**: Using deprecated function name.

**Solution**: Update import to use `*FromAF()` variant:
```typescript
// Wrong
import { evaluateCampaign } from '...';

// Correct
import { evaluateCampaignFromAF } from '...';
```

### "Zero cost" in calculations

**Cause**: Cost is only recorded on `days_since_install = 0`.

**Solution**: When querying cost, always filter for D0:
```typescript
const kpi = await getCohortKpi({
  ...filters,
  daysSinceInstall: 0  // Cost is recorded on D0
});
```

---

## Data Comparison

If you need to compare mock vs real data during migration:

```typescript
// Get mock data (if still available)
const mockData = await db.select().from(mockCampaignPerformance).where(...);

// Get real data
const realData = await getCohortMetrics({ ...params });

// Compare key metrics
console.log('Mock ROAS:', mockData[0]?.actualRoas7);
console.log('Real ROAS:', realData.totalRevenueUsd / realData.costUsd);
```

**Note**: Values will differ because:
- Mock data uses synthetic generation
- Real data reflects actual user behavior
- Different aggregation periods may be used

---

## A4 Creative Evaluation (Unchanged)

A4 Creative Evaluation continues to use mock data:

```typescript
// Still valid - A4 uses mock creative data
import { evaluateCreativeD3, evaluateCreativeD7 } from '...';

const d3Result = await evaluateCreativeD3(params);
const d7Result = await evaluateCreativeD7(params);
```

**Future**: A4 will migrate to AppsFlyer creative-level data in a future phase.

---

## Checklist

Before considering migration complete:

- [ ] Update all `calculateBaseline()` calls to `calculateBaselineFromAF()`
- [ ] Update all `evaluateCampaign()` calls to `evaluateCampaignFromAF()`
- [ ] Update all `evaluateOperation()` calls to `evaluateOperationFromAF()`
- [ ] Remove any direct queries to `mockCampaignPerformance`
- [ ] Verify baseline data is available (180+ days of history)
- [ ] Test evaluation pages with real data
- [ ] Check for deprecation warnings in console

---

## Related Documentation

- [AppsFlyer Integration Guide](./appsflyer-integration.md)
- [API Reference](./appsflyer-api.md)
- [Database Schema](./system/database.md)
