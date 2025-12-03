# Database Schema

## Overview
- PostgreSQL 16 (Docker, port 5433) with Drizzle ORM 0.44.7; migrations via Atlas.
- Schema source: `server/db/schema.ts` (14 tables); snapshots live in `context/db-snapshot/`.

## Core
- `accounts` (serial PK): `customerId` (unique 10-digit), `name`, optional `currency`/`timeZone`, `isActive`, `createdAt`, `lastSyncedAt`.
- `change_events`: account-scoped Google Ads logs with `timestamp`, `userEmail`, `resourceType`, `operationType`, `resourceName`, `clientType`, `campaign`, `adGroup`, `summary`/`summaryZh`, `fieldChanges` JSONB, `changedFieldsPaths` JSONB array; unique on accountId+timestamp+resourceName+userEmail. **New:** `operation_scores` JSONB stores the latest stage results (T+1/T+3/T+7) linked to `operation_score` rows.
- `campaigns`: full-state campaigns per account; keys `resource_name` + `account_id`, fields include `campaign_id`, `name`, `status`, `serving_status`, `primary_status`, `channel_type/sub_type`, `bidding_strategy_type`, `start_date`, `end_date`, `budget_id`, `budget_amount_micros` (bigint), `currency`, `last_modified_time`; indexed on account/status/channel.
- `ad_groups`: keys `resource_name` + `account_id`, fields `ad_group_id`, `campaign_id`, `name`, `status`, `type`, bids (`cpc_bid_micros`, `cpm_bid_micros`, `target_cpa_micros`), `last_modified_time`; indexed on account/campaign/status/type.
- `ads`: keys `resource_name` + `account_id`, fields `ad_id`, `ad_group_id`, `campaign_id`, `name`, `status`, `type`, `added_by_google_ads`, `final_urls/final_mobile_urls` JSONB arrays, `display_url`, `device_preference`, `system_managed_resource_source`, `last_modified_time`; indexed on account/ad_group/campaign/status/type.

## Baselines
- `baseline_metrics`: PRD 6.2.5 baseline table with four-level lookup (app+geo+media_source → app+geo → app+media_source → app). Stores cost-weighted ROAS and install-weighted retention (D3/D7), CPI, sample window (start/end, sample_size), flags (`is_active`, `manual_override`). Defaults use window `[today-(baselineDays+30), today-baselineDays]` with fallback to latest available data if empty.
- `baseline_settings`: configurable baseline window per app/geo/mediaSource (`baselineDays` default 180, `minSampleSize` default 30), unique on appId+geo+mediaSource; feeds baseline_metrics calculation.
- `safety_baseline`: legacy product/country/platform/channel baselines (`baselineRoas7`, `baselineRet7`, `referencePeriod`, `lastUpdated`); kept for compatibility, superseded by `baseline_metrics`.
- `creative_test_baseline`: creative thresholds (`maxCpi`, `minRoasD3`, `minRoasD7`, `excellentCvr`), unique per dimension.

## Evaluation & Actions
- `campaign_evaluation`: campaign metrics (spend, ROAS/RET, achievement rates, `recommendationType`, `status`, `campaignType`, `evaluationDate`).
- `creative_evaluation`: D3/D7 creative metrics (`impressions`, `installs`, `cvr`, `actualCpi`, `actualRoas`, thresholds, `creativeStatus`, `evaluationDate`).
- `operation_score`: stage-scoped operation scores keyed by (`operation_id`, `score_stage`) with `campaign_id` (Google campaign resource_name), `optimizerEmail`, `operationType`, `operationDate`, `evaluationDate` (= score_date), stage factor (`score_stage`: T+1/T+3/T+7), achievements (`roas_achievement`, `retention_achievement`, `min_achievement`), baselines, `risk_level`, base/final score, operation magnitude + label, `value_before/after`, `change_percentage`, `special_recognition`, `is_bold_success`, `suggestion_type/detail`. Unique index on (`operation_id`, `score_stage`).
- `optimizer_leaderboard`: aggregated counts and success rate per optimizer.
- `action_recommendation`: actions tied to `campaignId`/`evaluationId` with JSON `actionOptions`, `selectedAction`, `executed`, timestamps.

## Mock Data (Deprecated)
- `mock_campaign_performance`, `mock_creative_performance`: seed/test data for evaluation engines. **Deprecated since Phase 5: Evaluation now uses AppsFlyer data.**

## AppsFlyer Pipeline

### Tables
- `af_events`: IAP/ad-revenue events (`eventId` PK - MD5 hash) with cohort dimensions, currency-normalised revenue, install/event timestamps.
  - Indexes: `install_date`, `event_date`, cohort composite `(app_id, geo, media_source, campaign, adset, install_date)`, `event_name`.
- `af_cohort_kpi_daily`: per-cohort installs, cost, retention by `installDate`/`daysSinceInstall`; unique on appId+mediaSource+campaign+geo+installDate+daysSinceInstall.
  - `days_since_install`: 0 (cost+installs), 1/3/5/7 (retention rates).
- `af_sync_log`: status/history for ETL runs (events/cohort_kpi/baseline) with date range, counts, error, started/completed timestamps.

### Views
- `af_revenue_cohort_daily`: Aggregates `af_events` by cohort dimensions, splits revenue into `iap_revenue_usd`, `ad_revenue_usd`, `total_revenue_usd`.
- `af_cohort_metrics_daily`: Joins revenue view with `af_cohort_kpi_daily` for complete cohort picture (revenue + installs + cost + retention).

## Commands
- Migrations: `just db-status`, `just db-diff "name"`, `just db-apply`, `just db-studio`.
- Snapshots: `just db-snapshot [limit] [format]` (default: `limit=100`, `format=csv`). Random sample per table, applies `is_deleted = false` when present, writes CSV for preview plus JSON for restore. `just db-restore [snapshot]` reloads from JSON in the snapshot.
- Latest snapshot example: check `context/db-snapshot/snapshot_*/` in the repo for the most recent dump.

## Status
- Atlas-managed migrations align with `server/db/schema.ts`; no pending schema drift noted locally.
- Unique constraints enforce account-scoped dedupe for change events and baselines.
- **Phase 5 Complete**: Evaluation now uses AppsFlyer data (A2 baseline, A3 campaign, A7 operation). Mock data generators deprecated.
- AppsFlyer tables populate via Python ETL (`just af-sync-yesterday`); evaluation wrappers query `af_cohort_kpi_daily` and `af_events`.
- Snapshots are available for quick restores; production backup/restore flow not yet defined.
