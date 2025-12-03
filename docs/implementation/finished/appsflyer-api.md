# AppsFlyer API Reference

> Complete API documentation for AppsFlyer tRPC procedures.

## Overview

The AppsFlyer API provides type-safe access to cohort data via tRPC. All procedures are accessible through the `api.appsflyer` namespace.

**Base Router**: `server/api/routers/appsflyer.ts`

**Total Procedures**: 10 (8 queries, 2 mutations)

---

## Event Procedures

### appsflyer.getEventsByDateRange

Query events (IAP + Ad Revenue) within a date range with pagination.

**Type**: Query

**Input**:
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `startDate` | Date/string | Yes | - | Start of date range |
| `endDate` | Date/string | Yes | - | End of date range |
| `eventName` | `'iap_purchase' \| 'af_ad_revenue'` | No | - | Filter by event type |
| `appId` | string | No | - | Filter by app ID |
| `geo` | string | No | - | Filter by country code |
| `mediaSource` | string | No | - | Filter by attribution source |
| `limit` | number | No | 100 | Max rows (1-1000) |
| `offset` | number | No | 0 | Pagination offset |

**Output**:
```typescript
{
  data: AfEvent[];  // Array of event records
  total: number;    // Total matching records (for pagination)
}
```

**Example**:
```typescript
const result = await api.appsflyer.getEventsByDateRange.query({
  startDate: '2025-11-01',
  endDate: '2025-11-07',
  eventName: 'iap_purchase',
  geo: 'US',
  limit: 100,
  offset: 0
});

console.log(`Found ${result.total} events`);
console.log(`Page contains ${result.data.length} records`);
```

---

### appsflyer.getEventsByInstallDate

Get all events for users who installed on a specific date (cohort lifecycle view).

**Type**: Query

**Input**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `installDate` | Date/string | Yes | Cohort install date |
| `appId` | string | No | Filter by app ID |
| `geo` | string | No | Filter by country code |
| `mediaSource` | string | No | Filter by attribution source |
| `campaign` | string | No | Filter by campaign name |

**Output**:
```typescript
AfEvent[]  // Array of events, ordered by days_since_install
```

**Example**:
```typescript
// Get all events from users who installed on Nov 1
const events = await api.appsflyer.getEventsByInstallDate.query({
  installDate: '2025-11-01',
  appId: 'solitaire.patience.card.games.klondike.free',
  geo: 'US'
});

// Group by days_since_install to see cohort lifecycle
const d1Events = events.filter(e => e.daysSinceInstall === 1);
const d7Events = events.filter(e => e.daysSinceInstall === 7);
```

---

### appsflyer.getRevenueByCohort

Get **cumulative** revenue for a cohort from D0 to Dn. Used for ROAS calculation.

**Type**: Query

**Input**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `installDate` | Date/string | Yes | Cohort install date |
| `daysSinceInstall` | number | Yes | Calculate revenue D0 through this day (0-180) |
| `appId` | string | No | Filter by app ID |
| `geo` | string | No | Filter by country code |
| `mediaSource` | string | No | Filter by attribution source |
| `campaign` | string | No | Filter by campaign name |

**Output**:
```typescript
{
  iapRevenueUsd: number;    // In-app purchase revenue (USD)
  adRevenueUsd: number;     // Ad revenue (USD)
  totalRevenueUsd: number;  // Total revenue (USD)
}
```

**Example**:
```typescript
// Calculate D7 ROAS for a cohort
const revenue = await api.appsflyer.getRevenueByCohort.query({
  installDate: '2025-11-01',
  daysSinceInstall: 7,  // Cumulative D0-D7
  appId: 'solitaire.patience.card.games.klondike.free',
  geo: 'US',
  mediaSource: 'googleadwords_int'
});

// Assume cost from getCohortKpi
const cost = 1000;
const roas7 = revenue.totalRevenueUsd / cost;
console.log(`D7 ROAS: ${(roas7 * 100).toFixed(1)}%`);
```

---

## Cohort KPI Procedures

### appsflyer.getCohortKpi

Get cohort KPI data (installs, cost, retention) with flexible filtering.

**Type**: Query

**Input**:
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `appId` | string | No | - | Filter by app ID |
| `geo` | string | No | - | Filter by country code |
| `mediaSource` | string | No | - | Filter by attribution source |
| `campaign` | string | No | - | Filter by campaign name |
| `installDate` | Date/string | No | - | Exact install date |
| `installDateStart` | Date/string | No | - | Start of install date range |
| `installDateEnd` | Date/string | No | - | End of install date range |
| `daysSinceInstall` | number | No | - | Filter by specific day (0,1,3,5,7) |
| `limit` | number | No | 100 | Max rows (1-1000) |
| `offset` | number | No | 0 | Pagination offset |

**Output**:
```typescript
{
  data: AfCohortKpiDaily[];  // Array of KPI records
  total: number;              // Total matching records
}
```

**Example**:
```typescript
// Get D7 retention for all cohorts in November
const result = await api.appsflyer.getCohortKpi.query({
  installDateStart: '2025-11-01',
  installDateEnd: '2025-11-30',
  daysSinceInstall: 7,
  geo: 'US'
});

// Calculate average D7 retention
const avgRetention = result.data
  .filter(d => d.retentionRate !== null)
  .reduce((sum, d) => sum + Number(d.retentionRate), 0) / result.data.length;
```

---

### appsflyer.getCohortMetrics

Get complete cohort metrics from `af_cohort_metrics_daily` view (revenue + KPIs combined).

**Type**: Query

**Input**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `installDate` | Date/string | Yes | Cohort install date |
| `daysSinceInstall` | number | Yes | Day to query (0-180) |
| `appId` | string | No | Filter by app ID |
| `geo` | string | No | Filter by country code |
| `mediaSource` | string | No | Filter by attribution source |
| `campaign` | string | No | Filter by campaign name |

**Output**:
```typescript
CohortMetrics[]  // Array with revenue breakdown + KPIs
```

**CohortMetrics Type**:
```typescript
interface CohortMetrics {
  appId: string;
  geo: string | null;
  mediaSource: string | null;
  campaign: string | null;
  adset: string | null;
  installDate: string;
  daysSinceInstall: number;
  iapRevenueUsd: number;
  adRevenueUsd: number;
  totalRevenueUsd: number;
  installs: number | null;
  costUsd: number | null;
  retentionRate: number | null;
}
```

**Example**:
```typescript
// Get complete D7 metrics for all campaigns on Nov 1
const metrics = await api.appsflyer.getCohortMetrics.query({
  installDate: '2025-11-01',
  daysSinceInstall: 7,
  geo: 'US'
});

// Calculate ROAS for each campaign
metrics.forEach(m => {
  if (m.costUsd && m.costUsd > 0) {
    const roas = m.totalRevenueUsd / m.costUsd;
    console.log(`${m.campaign}: ROAS=${(roas * 100).toFixed(1)}%`);
  }
});
```

---

### appsflyer.getLatestCohortData

Get most recent cohort data within N days (for dashboards).

**Type**: Query

**Input**:
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `daysBack` | number | No | 30 | Days to look back (1-365) |
| `appId` | string | No | - | Filter by app ID |
| `geo` | string | No | - | Filter by country code |
| `mediaSource` | string | No | - | Filter by attribution source |

**Output**:
```typescript
AfCohortKpiDaily[]  // Recent KPI records, ordered by install_date DESC
```

**Example**:
```typescript
// Get last 7 days of cohort data for dashboard
const recent = await api.appsflyer.getLatestCohortData.query({
  daysBack: 7,
  geo: 'US',
  mediaSource: 'googleadwords_int'
});

// Group by install_date for daily view
const byDate = recent.reduce((acc, r) => {
  const key = r.installDate;
  if (!acc[key]) acc[key] = [];
  acc[key].push(r);
  return acc;
}, {});
```

---

## Baseline Procedures

### appsflyer.calculateBaselineRoas

Calculate median D7 ROAS from historical cohorts (safety baseline).

**Type**: Query

**Input**:
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `appId` | string | Yes | - | App identifier |
| `geo` | string | Yes | - | Country code |
| `mediaSource` | string | Yes | - | Attribution source |
| `baselineDays` | number | No | 180 | Days back for baseline window (30-365) |

**Output**:
```typescript
{
  baselineRoas: number | null;  // Median ROAS_D7, null if no data
  hasData: boolean;              // Whether baseline was calculated
  window: {
    start: string;  // Window start date (YYYY-MM-DD)
    end: string;    // Window end date (YYYY-MM-DD)
  };
}
```

**Calculation Details**:
- **Window**: Cohorts from (today - baselineDays - 30) to (today - baselineDays)
- **Method**: Cost-weighted ROAS (no P50), stored in `baseline_metrics` with four-level fallback
- **Dimensions**: app + geo + mediaSource (NOT campaign-specific)

**Example**:
```typescript
const baseline = await api.appsflyer.calculateBaselineRoas.query({
  appId: 'solitaire.patience.card.games.klondike.free',
  geo: 'US',
  mediaSource: 'googleadwords_int',
  baselineDays: 180
});

if (baseline.hasData) {
  console.log(`Baseline ROAS_D7: ${(baseline.baselineRoas * 100).toFixed(1)}%`);
  console.log(`Based on cohorts: ${baseline.window.start} to ${baseline.window.end}`);
} else {
  console.log('Insufficient historical data for baseline');
}
```

---

### appsflyer.calculateBaselineRetention

Calculate median retention rate from historical cohorts.

**Type**: Query

**Input**:
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `appId` | string | Yes | - | App identifier |
| `geo` | string | Yes | - | Country code |
| `mediaSource` | string | Yes | - | Attribution source |
| `daysSinceInstall` | number | Yes | - | Must be 1, 3, 5, or 7 |
| `baselineDays` | number | No | 180 | Days back for baseline window |

**Output**:
```typescript
{
  baselineRetention: number | null;  // Median retention rate
  hasData: boolean;                   // Whether baseline was calculated
  window: {
    start: string;
    end: string;
  };
}
```

**Example**:
```typescript
// Get baseline D7 retention
const baseline = await api.appsflyer.calculateBaselineRetention.query({
  appId: 'solitaire.patience.card.games.klondike.free',
  geo: 'US',
  mediaSource: 'googleadwords_int',
  daysSinceInstall: 7
});

if (baseline.hasData) {
  console.log(`Baseline RET_D7: ${(baseline.baselineRetention * 100).toFixed(1)}%`);
}
```

---

## Sync Management Procedures

### appsflyer.getSyncStatus

Get sync history and latest status.

**Type**: Query

**Input**:
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `syncType` | `'events' \| 'cohort_kpi' \| 'baseline'` | No | - | Filter by sync type |
| `status` | `'running' \| 'success' \| 'failed'` | No | - | Filter by status |
| `limit` | number | No | 50 | Max logs to return (1-100) |

**Output**:
```typescript
{
  logs: AfSyncLog[];           // Array of sync log entries
  latest: AfSyncLog | null;    // Most recent log for syncType (if specified)
}
```

**Example**:
```typescript
// Check if any sync is currently running
const status = await api.appsflyer.getSyncStatus.query({
  status: 'running'
});

if (status.logs.length > 0) {
  console.log('Sync in progress:', status.logs[0].syncType);
}

// Get latest successful events sync
const eventsStatus = await api.appsflyer.getSyncStatus.query({
  syncType: 'events',
  status: 'success',
  limit: 1
});

if (eventsStatus.latest) {
  const lastSync = new Date(eventsStatus.latest.completedAt);
  const hoursAgo = (Date.now() - lastSync.getTime()) / (1000 * 60 * 60);

  if (hoursAgo > 36) {
    console.warn('Data may be stale - last sync was', hoursAgo.toFixed(0), 'hours ago');
  }
}
```

---

### appsflyer.triggerManualSync

Trigger a manual sync operation (runs in background).

**Type**: Mutation

**Input**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `syncType` | `'events' \| 'cohort_kpi'` | Yes | Type of sync to run |
| `dateRangeStart` | string | Yes | Start date (YYYY-MM-DD format) |
| `dateRangeEnd` | string | Yes | End date (YYYY-MM-DD format) |

**Output**:
```typescript
{
  success: boolean;
  syncLogId: number;  // ID to track progress via getSyncStatus
  message: string;
}
```

**Behavior**:
1. Creates sync log entry with `status='running'`
2. Spawns Python ETL process in background (detached)
3. Returns immediately (non-blocking)
4. Frontend can poll `getSyncStatus` to track completion

**Example**:
```typescript
// Trigger sync for last week
const result = await api.appsflyer.triggerManualSync.mutate({
  syncType: 'events',
  dateRangeStart: '2025-11-01',
  dateRangeEnd: '2025-11-07'
});

console.log(result.message);
console.log('Tracking ID:', result.syncLogId);

// Poll for completion
const pollInterval = setInterval(async () => {
  const status = await api.appsflyer.getSyncStatus.query({
    syncType: 'events',
    limit: 1
  });

  if (status.latest?.status !== 'running') {
    clearInterval(pollInterval);
    console.log('Sync completed:', status.latest?.status);
  }
}, 5000);
```

---

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `Invalid date format` | Date not parseable | Use ISO format: `YYYY-MM-DD` |
| `daysSinceInstall must be 1, 3, 5, or 7` | Invalid retention day | Use only standard retention days |
| `limit must be between 1 and 1000` | Out of range | Adjust limit parameter |
| `No data found` | Empty result | Check date range and filters |

### Error Response Format

All tRPC errors follow standard format:

```typescript
{
  code: 'BAD_REQUEST' | 'NOT_FOUND' | 'INTERNAL_SERVER_ERROR',
  message: string,
  data: {
    zodError?: ZodError  // If input validation failed
  }
}
```

---

## TypeScript Types

### AfEvent

```typescript
interface AfEvent {
  eventId: string;
  appId: string;
  appName: string | null;
  bundleId: string | null;
  appsflyerId: string | null;
  eventName: string;
  eventTime: Date;
  eventDate: string;
  installTime: Date;
  installDate: string;
  daysSinceInstall: number;
  eventRevenue: string | null;
  eventRevenueUsd: string | null;
  eventRevenueCurrency: string | null;
  geo: string | null;
  mediaSource: string | null;
  channel: string | null;
  campaign: string | null;
  campaignId: string | null;
  adset: string | null;
  adsetId: string | null;
  ad: string | null;
  isPrimaryAttribution: boolean | null;
  rawPayload: unknown | null;
  importedAt: Date;
}
```

### AfCohortKpiDaily

```typescript
interface AfCohortKpiDaily {
  id: number;
  appId: string;
  mediaSource: string;
  campaign: string;
  geo: string;
  installDate: string;
  daysSinceInstall: number;
  installs: number | null;
  costUsd: string | null;
  retentionRate: string | null;
  lastRefreshedAt: Date;
}
```

### AfSyncLog

```typescript
interface AfSyncLog {
  id: number;
  syncType: string;
  dateRangeStart: string | null;
  dateRangeEnd: string | null;
  status: string;
  recordsProcessed: number | null;
  errorMessage: string | null;
  startedAt: Date;
  completedAt: Date | null;
}
```

---

## Related Documentation

- [Integration Guide](./appsflyer-integration.md) - Architecture and setup
- [Migration Guide](./migration-mock-to-real.md) - Moving from mock data
- [Query Functions](../server/db/queries-appsflyer.ts) - Underlying query layer
