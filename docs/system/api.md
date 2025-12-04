# API Documentation

## Overview
- Transport: tRPC 11.7.1 at `/api/trpc`, Zod validation on every procedure.
- Auth: none (internal tool); rely on network isolation.
- Queries return records directly; mutations return `{ success, message?, ... }` when applicable to simplify UI toasts.
- Batching: tRPC client uses `httpBatchLink`, so adjacent calls coalesce over one request.
- Error formatting: Zod errors are flattened and included under `data.zodError` for frontend surfacing.

## Routers

### Accounts (`accounts`)
- `list` (query) `{ isActive?: boolean }` → `Account[]`.
- `getById` (query) `{ id: number }` → `Account`.
- `create` (mutation) `{ customerId: string(10), name: string, currency?, timeZone? }` → `{ success, account, message }` (dedup on customerId).
- `update` (mutation) `{ id: number, name?, isActive?, currency?, timeZone? }` → `{ success, account, message }`.
- `delete` (mutation) `{ id: number }` → `{ success, account, message }` (soft delete isActive=false).

### Events (`events`)
- `list` (query) `{ accountId: number, page?, pageSize?, userEmail?, resourceType?, operationType?, search? }` → `{ data, total, page, pageSize, totalPages }` (search runs on summary/campaign/resourceName).
- `sync` (mutation) `{ accountId: number, days?: number (1-30, default 7) }` → `{ success, count, totalFetched, accountName, message }` (calls Python change-event fetcher; updates lastSyncedAt; triggers async operation scoring).
- `getById` (query) `{ id: number }` → `ChangeEvent`.

### Entities (`entities`)
- `sync` (mutation) `{ accountId: number, scope?: ['campaigns' | 'adGroups' | 'ads'][] }` → counts for upsert/prune per entity; hard-deletes missing/REMOVED rows; surfaces Python errors directly.
- `listCampaigns` (query) `{ accountId, page?, pageSize?, status?, channelType?, mediaSource? }` → campaigns + `latestChange`; BigInt budgets normalized to number.
- `listAdGroups` (query) `{ accountId, page?, pageSize?, status?, type?, mediaSource? }` → ad groups + `latestChange`; BigInt bids normalized to number.
- `listAds` (query) `{ accountId, page?, pageSize?, status?, type?, mediaSource? }` → ads + `latestChange`.

### Stats (`stats`)
- `overview` (query) `{ accountId: number }` → totals plus resource/operation distributions.
- `multiAccountOverview` (query) `void` → `{ account, stats }[]` for all active accounts (uses same stats helper per account).

### Evaluation (`evaluation`)
- **Baseline (A2)**: `calculateBaseline` *(deprecated)*, `calculateBaselineFromAF` (appId, geo, mediaSource, windowDays?), `updateAllBaselinesFromAF`, `getBaseline`, `getBaselineSettings`, `upsertBaselineSettings`.
- **Campaign (A3)**: `evaluateCampaign` *(deprecated)*, `evaluateCampaignFromAF` (campaignId, evaluationDate?, lookbackDays?), `evaluateAllCampaignsFromAF`, `getCampaignEvaluations`.
- **Creative (A4)**: `evaluateCreativeD3`, `evaluateCreativeD7`, `checkCampaignClosure`, `getCreativeEvaluations`. *(Deferred: not yet using AppsFlyer data; backed by mock tables)*
- **Operations (A7)**: `evaluateOperation` *(calls AppsFlyer-based evaluator with stage scoring)*, `evaluateOperationFromAF` (operationId, optional stages T+1/T+3/T+7), `evaluateOperations7DaysAgoFromAF`, `recalculateOperationScores` (all ops for account), `getOperationScores` (filter by stage), `getOptimizerLeaderboard`.
- **Note**: Phase 5 refactored A2/A3/A7 to use AppsFlyer data. Old mock-based functions remain but are deprecated.

### AppsFlyer (`appsflyer`)
- Events: `getEventsByDateRange`, `getEventsByInstallDate`, `getRevenueByCohort`.
- Cohorts: `getCohortKpi`, `getCohortMetrics`, `getLatestCohortData`.
- Baselines: `calculateBaselineRoas`, `calculateBaselineRetention` (returns hasData and window string for UI display).
- Sync: `getSyncStatus`, `triggerManualSync` (spawns Python ETL; returns `syncLogId`), `syncAppsFlyerData` (cohort KPI sync for last N days; defaults to 7; returns sync log id + date range).
- 规范：内部 OpenAPI（tRPC 调用层）见 `docs/api/internal/appsflyer/appsflyer-trpc.yaml`。

## Patterns
- All queries/mutations are gated by `accountId` where relevant; frontend enforces selection first.
- Validation uses Zod; errors surface in toasts/dialogs. Invalid inputs surface `zodError` per field path.
- Mutations usually return `{ success, message, ... }` along with counts or payloads for easy UI handling; lists are invalidated on the frontend.
- Python bridge errors are surfaced verbatim when possible (parsed JSON from stdout/stderr) to aid operator troubleshooting.

## Status
- Accounts, events, stats, and evaluation routes are live; AppsFlyer router exposes sync triggers.
- **Phase 5 Complete**: Evaluation (A2/A3/A7) now uses AppsFlyer data via `*FromAF` functions; deprecated functions remain for compatibility.
- Batch endpoints available: `updateAllBaselinesFromAF`, `evaluateAllCampaignsFromAF`, `evaluateOperations7DaysAgoFromAF`; manual triggers only, no scheduler.
- No authentication/authorization middleware; designed for internal use on trusted network. Add auth middleware before external exposure.
