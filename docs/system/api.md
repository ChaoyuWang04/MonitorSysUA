# API Documentation

## Overview
- Transport: tRPC 11.7.1 at `/api/trpc`, Zod validation on every procedure.
- Auth: none (internal tool).
- Queries return records directly; mutations return `{ success, message?, ... }` when applicable.

## Routers

### Accounts (`accounts`)
- `list` (query) `{ isActive?: boolean }` → `Account[]`.
- `getById` (query) `{ id: number }` → `Account`.
- `create` (mutation) `{ customerId: string(10), name: string, currency?, timeZone? }` → `{ success, account, message }`.
- `update` (mutation) `{ id: number, name?, isActive?, currency?, timeZone? }` → `{ success, account, message }`.
- `delete` (mutation) `{ id: number }` → `{ success, account, message }`.

### Events (`events`)
- `list` (query) `{ accountId: number, page?, pageSize?, userEmail?, resourceType?, operationType?, search? }` → `{ data, total, page, pageSize, totalPages }`.
- `sync` (mutation) `{ accountId: number, days?: number (1-30, default 7) }` → `{ success, count, totalFetched, accountName, message }`.
- `getById` (query) `{ id: number }` → `ChangeEvent`.

### Entities (`entities`)
- `sync` (mutation) `{ accountId: number, scope?: ['campaigns' | 'adGroups' | 'ads'][] }` → counts for upsert/prune per entity; hard-deletes missing/REMOVED rows; surfaces Python errors directly.
- `listCampaigns` (query) `{ accountId, page?, pageSize?, status?, channelType?, mediaSource? }` → campaigns + `latestChange`.
- `listAdGroups` (query) `{ accountId, page?, pageSize?, status?, type?, mediaSource? }` → ad groups + `latestChange`.
- `listAds` (query) `{ accountId, page?, pageSize?, status?, type?, mediaSource? }` → ads + `latestChange`.

### Stats (`stats`)
- `overview` (query) `{ accountId: number }` → totals plus resource/operation distributions.
- `multiAccountOverview` (query) `void` → `{ account, stats }[]` for all active accounts.

### Evaluation (`evaluation`)
- **Baseline (A2)**: `calculateBaseline` *(deprecated)*, `calculateBaselineFromAF` (appId, geo, mediaSource, windowDays?), `updateAllBaselinesFromAF`, `getBaseline`, `getBaselineSettings`, `upsertBaselineSettings`.
- **Campaign (A3)**: `evaluateCampaign` *(deprecated)*, `evaluateCampaignFromAF` (campaignId, evaluationDate?, lookbackDays?), `evaluateAllCampaignsFromAF`, `getCampaignEvaluations`.
- **Creative (A4)**: `evaluateCreativeD3`, `evaluateCreativeD7`, `checkCampaignClosure`, `getCreativeEvaluations`. *(Deferred: not yet using AppsFlyer data)*
- **Operations (A7)**: `evaluateOperation` *(calls AppsFlyer-based evaluator with stage scoring)*, `evaluateOperationFromAF` (operationId, optional stages T+1/T+3/T+7), `evaluateOperations7DaysAgoFromAF`, `getOperationScores` (filter by stage), `getOptimizerLeaderboard`.
- **Note**: Phase 5 refactored A2/A3/A7 to use AppsFlyer data. Old mock-based functions remain but are deprecated.

### AppsFlyer (`appsflyer`)
- Events: `getEventsByDateRange`, `getEventsByInstallDate`, `getRevenueByCohort`.
- Cohorts: `getCohortKpi`, `getCohortMetrics`, `getLatestCohortData`.
- Baselines: `calculateBaselineRoas`, `calculateBaselineRetention`.
- Sync: `getSyncStatus`, `triggerManualSync` (spawns Python ETL; returns `syncLogId`).
- 规范：内部 OpenAPI（tRPC 调用层）见 `docs/api/internal/appsflyer/appsflyer-trpc.yaml`。

## Patterns
- All queries/mutations are gated by `accountId` where relevant; frontend enforces selection first.
- Validation uses Zod; errors surface in toasts/dialogs.
- Mutations usually return `{ success, message, ... }` along with counts or payloads for easy UI handling.

## Status
- Accounts, events, stats, and evaluation routes are live; AppsFlyer router exposes sync triggers.
- **Phase 5 Complete**: Evaluation (A2/A3/A7) now uses AppsFlyer data via `*FromAF` functions; deprecated functions remain for compatibility.
- Batch endpoints available: `updateAllBaselinesFromAF`, `evaluateAllCampaignsFromAF`, `evaluateOperations7DaysAgoFromAF`; manual triggers only, no scheduler.
- No authentication/authorization middleware; designed for internal use.
