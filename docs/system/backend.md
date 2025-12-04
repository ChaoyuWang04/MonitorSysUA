# Backend Design

## Architecture
- Next.js App Router with tRPC; Drizzle ORM to PostgreSQL (Docker, port 5433). All DB writes go through Drizzle/Atlas-managed schema.
- Python subprocesses handle Google Ads fetch, AppsFlyer ETL, and evaluation engines; TypeScript wrappers orchestrate, validate inputs (Zod), and persist results.
- **Docker-based ETL**: AppsFlyer sync runs in dedicated Python container (`appsflyer-etl`) with cron scheduler; independent from Next.js app. Manual triggers call the same scripts outside the container when needed.
- **Execution boundaries**: Node process never embeds API credentials; Google Ads and AppsFlyer credentials are read from local files/env only within Python containers or child processes.

## Modules
- `server/api/`: `trpc.ts`, `root.ts`, routers (`accounts`, `events`, `entities`, `stats`, `evaluation`, `appsflyer`). Routers only orchestrate and validate; all storage is delegated to queries.* files.
- `server/db/`: `schema.ts` (campaign/ad_group/ad tables, baseline/evaluation tables, AppsFlyer tables), `index.ts` (PG pool), `queries.ts` (accounts/events/entities/stats; BigInt → number for API), `queries-evaluation.ts` (A2-A5 + recommendations and operation score grouping), `queries-appsflyer.ts` (events/cohort/baseline/sync logs + cohort metrics view helpers).
- `server/google-ads/`: `client.ts` (ChangeEvent Python bridge), `fetch_events.py`, `fetch_entities.py` (campaign/ad group/ad GAQL), `parser.ts`, `diff-engine.ts`, `regenerate_summaries.py`.
- `server/appsflyer/`: `sync_af_data.py`, `backfill.py`, `monthly_baseline_update.py`, `email_notifier.py`, `Dockerfile`, `crontab`, `entrypoint.sh`, `requirements.txt` for Docker ETL container.
- `server/evaluation/`: wrappers (`baseline-calculator.ts`, `campaign-evaluator.ts`, `creative-evaluator.ts`, `operation-evaluator.ts`), Python engines, mock-data seed + test harness.
- Utilities: `scripts/db-snapshot.ts` (CSV preview + JSON for restore, random sampling, default limit 100), `scripts/db-restore.ts`, Just recipes for dev/DB/AppsFlyer.

## Data Flows
- **Google Ads ChangeEvents**: `events.sync` → load account (currency) → Python `fetch_events.py` → parse + dedupe → insert `change_events` → update `accounts.lastSyncedAt`. Insert path triggers async operation evaluation per new row.
- **Google Ads Entities (full state)**: `entities.sync` → load account → Python `fetch_entities.py` (GAQL campaigns/ad_groups/ads) → TS bridge upsert + prune (hard delete REMOVED/missing) into `campaigns`, `ad_groups`, `ads` → update `accounts.lastSyncedAt`. Listings join latest `change_events` by `resource_name`; BigInt budget/bid fields normalized to number in API responses.
- **AppsFlyer Sync**: `appsflyer.triggerManualSync` (or Just commands) → Python `sync_af_data.py`/`backfill.py` → write `af_events`, `af_cohort_kpi_daily` + `af_sync_log`. Cron inside container runs daily/ monthly, same scripts.
- **Evaluation (Phase 5)**: TypeScript wrappers query AppsFlyer tables directly → calculate metrics → persist to `campaign_evaluation`, `operation_score`, `optimizer_leaderboard`. Primary functions:
  - A2 Baseline: `calculateBaselineFromAF()` resolves PRD 6.2.5 `baseline_metrics` (cost-weighted ROAS + install-weighted RET + CPI) with four-level fallback (app+geo+media_source → app+geo → app+media_source → app). Window `[today-(baselineDays+30), today-baselineDays]`; if empty, falls back to latest available data. Window length from `baseline_settings`.
  - A3 Campaign: `evaluateCampaignFromAF()` aggregates cohort metrics for evaluation; batch via `evaluateAllCampaignsFromAF()`.
  - A7 Operation: `evaluateOperationFromAF()` resolves AppsFlyer context from change events/campaigns, computes stage scores (T+1/T+3/T+7) vs baseline, writes to `operation_score` and mirrors into `change_events.operation_scores`; `evaluateOperations7DaysAgoFromAF()` batches by operation date.

## Integrations
- **Google Ads API**: ChangeEvent stream per account via MCC credentials; summaries kept in English + Chinese; soft-delete for accounts. Login customer ID set per account to avoid permission errors.
- **AppsFlyer API**: Token-based export of IAP/ad-revenue and cohort KPIs; baseline helpers compute weighted ROAS/retention windows into `baseline_metrics` (no P50). Sync jobs record `af_sync_log` for auditability.

## Google Ads Credentials
- ChangeEvent and entity sync read `google-ads.yaml` (service account) from `local/credentials/google-ads/google-ads.yaml` (no env fallback).
- Service account JSON lives alongside yaml; `local/credentials/` is gitignored to avoid secrets leakage.
- Node bridge sets `GOOGLE_ADS_LOGIN_CUSTOMER_ID` per account when spawning Python so the login header matches the target account.

## Google Ads Python Runtime
- Dependencies for Google Ads Python scripts are pinned in `server/google-ads/requirements.txt` (includes `google-ads` 28.4.0). Install system-wide with `python3 -m pip install -r server/google-ads/requirements.txt` before syncing.
- The bridge uses system Python in order: `/Library/Frameworks/Python.framework/Versions/3.12/bin/python3` → `/usr/local/bin/python3` → `/opt/homebrew/bin/python3` → fallback `python3`. Both events and entities sync share this resolution (no virtualenv expected), so ensure `google-ads` is available on one of these interpreters.
- Scripts explicitly request API version `v22` when loading services/types to avoid implicit downgrades; keep `google-ads` on the latest pinned version to match.
- Missing dependencies exit with a JSON error so the UI surfaces actionable guidance instead of a generic `ModuleNotFoundError`.

## Patterns
- Python bridge via `child_process.spawn` with JSON over stdout; detached background for ETL runs. Node side normalises types (BigInt to number) before returning to tRPC.
- Drizzle queries are centralised in `queries*.ts`; all data access requires `accountId` for isolation and aligns with UI account selector gating.
- Deletes are soft (`isActive=false`), unique constraints and indexes aligned to account-scoped lookups. Entity sync prunes REMOVED/missing rows for consistency with Google Ads state.
- Operation evaluation is fire-and-forget on new change_events; failures are logged but do not block ingestion.

## Operational Status
- **Phase 6 Complete**: Automated AppsFlyer sync via Docker container with cron scheduler.
  - Daily sync: 2:00 AM UTC (yesterday's data)
  - Monthly baseline: 3:00 AM UTC, 1st of month (180-day refresh)
  - Email notifications on sync failures (optional, configure SMTP vars)
- Dashboard displays sync status with 36-hour stale warning; stale logic lives in frontend card.
- Manual triggers available via Just recipes (`just af-docker-sync-yesterday`, `just af-docker-baseline-update`) and tRPC `appsflyer.triggerManualSync`/`syncAppsFlyerData`.
- **Phase 5 Complete**: Evaluation uses AppsFlyer data (A2/A3/A7). A4 creative evaluation deferred to future phase; mock creative data kept for UI.
- Batch evaluation functions available: `updateAllBaselinesFromAF()`, `evaluateAllCampaignsFromAF()`, `evaluateOperations7DaysAgoFromAF()`; schedulers not added to Node (manual/cron only).
- Mock data generators deprecated; retained for development/testing only.
- Observability limited to console/log output + sync status UI; no metrics pipeline configured. Add log shipping if productionizing.
- No auth/permissions; intended for internal operators (behind VPN or similar network control).
