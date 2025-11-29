# Database Schema

## Overview
- PostgreSQL 16 (Docker, port 5433) with Drizzle ORM 0.44.7; migrations via Atlas.
- Schema source: `server/db/schema.ts` (14 tables); snapshots live in `context/db-snapshot/`.

## Core
- `accounts` (serial PK): `customerId` (unique 10-digit), `name`, optional `currency`/`timeZone`, `isActive`, `createdAt`, `lastSyncedAt`.
- `change_events`: account-scoped Google Ads logs with `timestamp`, `userEmail`, `resourceType`, `operationType`, `resourceName`, `clientType`, `campaign`, `adGroup`, `summary`/`summaryZh`, `fieldChanges` JSONB, `changedFieldsPaths` JSONB array; unique on accountId+timestamp+resourceName+userEmail.

## Baselines
- `safety_baseline`: product/country/platform/channel medians (`baselineRoas7`, `baselineRet7`, `referencePeriod`, `lastUpdated`), unique per dimension. **Deprecated: Use `baseline_settings` with AppsFlyer data.**
- `baseline_settings`: configurable baseline window per app/geo/mediaSource (`windowDays` default 180, `minCohorts` default 30), unique on appId+geo+mediaSource. Used by AppsFlyer-based evaluation.
- `creative_test_baseline`: creative thresholds (`maxCpi`, `minRoasD3`, `minRoasD7`, `excellentCvr`), unique per dimension.

## Evaluation & Actions
- `campaign_evaluation`: campaign metrics (spend, ROAS/RET, achievement rates, `recommendationType`, `status`, `campaignType`, `evaluationDate`).
- `creative_evaluation`: D3/D7 creative metrics (`impressions`, `installs`, `cvr`, `actualCpi`, `actualRoas`, thresholds, `creativeStatus`, `evaluationDate`).
- `operation_score`: post-operation ROAS/RET with `operationId` (change_events FK), `optimizerEmail`, `operationType`, `operationDate`/`evaluationDate`.
- `optimizer_leaderboard`: aggregated counts and success rate per optimizer.
- `action_recommendation`: actions tied to `campaignId`/`evaluationId` with JSON `actionOptions`, `selectedAction`, `executed`, timestamps.

## Mock Data (Deprecated)
- `mock_campaign_performance`, `mock_creative_performance`: seed/test data for evaluation engines. **Deprecated since Phase 5: Evaluation now uses AppsFlyer data.**

## AppsFlyer Pipeline
- `af_events`: IAP/ad-revenue events (`eventId` PK) with cohort dimensions, currency-normalised revenue, install/event timestamps.
- `af_cohort_kpi_daily`: per-cohort installs, cost, retention by `installDate`/`daysSinceInstall`; unique on appId+mediaSource+campaign+geo+installDate+daysSinceInstall.
- `af_sync_log`: status/history for ETL runs (events/cohort_kpi/baseline) with date range, counts, error, started/completed timestamps.

## Commands
- Migrations: `just db-status`, `just db-diff "name"`, `just db-apply`, `just db-studio`.
- Snapshots: `just db-snapshot [limit]` to export JSON; `just db-restore [snapshot]` to reload.
- Latest snapshot example: check `context/db-snapshot/snapshot_*/` in the repo for the most recent dump.

## Status
- Atlas-managed migrations align with `server/db/schema.ts`; no pending schema drift noted locally.
- Unique constraints enforce account-scoped dedupe for change events and baselines.
- **Phase 5 Complete**: Evaluation now uses AppsFlyer data (A2 baseline, A3 campaign, A7 operation). Mock data generators deprecated.
- AppsFlyer tables populate via Python ETL (`just af-sync-yesterday`); evaluation wrappers query `af_cohort_kpi_daily` and `af_events`.
- Snapshots are available for quick restores; production backup/restore flow not yet defined.
