# Backend Design

## Architecture
- Next.js App Router with tRPC; Drizzle ORM to PostgreSQL (Docker, port 5433).
- Python subprocesses handle Google Ads fetch, AppsFlyer ETL, and evaluation engines; TypeScript wrappers orchestrate and persist results.
- **Docker-based ETL**: AppsFlyer sync runs in dedicated Python container (`appsflyer-etl`) with cron scheduler; independent from Next.js app.

## Modules
- `server/api/`: `trpc.ts`, `root.ts`, routers (`accounts`, `events`, `entities`, `stats`, `evaluation`, `appsflyer`).
- `server/db/`: `schema.ts` (adds campaigns/ad_groups/ads), `index.ts` (client), `queries.ts` (accounts/events/entities/stats; BigInt → number for API), `queries-evaluation.ts` (A2-A5 + recommendations), `queries-appsflyer.ts` (events/cohort/baseline/sync logs).
- `server/google-ads/`: `client.ts` (ChangeEvent Python bridge), `fetch_events.py`, `fetch_entities.py` (campaign/ad group/ad GAQL), `parser.ts`, `diff-engine.ts`, `regenerate_summaries.py`.
- `server/appsflyer/`: `sync_af_data.py`, `backfill.py`, `monthly_baseline_update.py`, `email_notifier.py`, `Dockerfile`, `crontab`, `entrypoint.sh`, `requirements.txt` for Docker ETL container.
- `server/evaluation/`: wrappers (`baseline-calculator.ts`, `campaign-evaluator.ts`, `creative-evaluator.ts`, `operation-evaluator.ts`), Python engines, mock-data seed + test harness.
- Utilities: `scripts/db-snapshot.ts` (CSV preview + JSON for restore, random sampling, default limit 100), `scripts/db-restore.ts`, Just recipes for dev/DB/AppsFlyer.

## Data Flows
- **Google Ads ChangeEvents**: `events.sync` → load account (currency) → Python `fetch_events.py` → parse + dedupe → insert `change_events` → update `accounts.lastSyncedAt`.
- **Google Ads Entities (full state)**: `entities.sync` → load account → Python `fetch_entities.py` (GAQL campaigns/ad_groups/ads) → TS bridge upsert + prune (hard delete REMOVED/missing) into `campaigns`, `ad_groups`, `ads` → update `accounts.lastSyncedAt`. Listings join latest `change_events` by `resource_name`; BigInt budget/bid fields normalized to number in API responses.
- **AppsFlyer Sync**: `appsflyer.triggerManualSync` (or Just commands) → Python `sync_af_data.py`/`backfill.py` → write `af_events`, `af_cohort_kpi_daily` + `af_sync_log`.
- **Evaluation (Phase 5)**: TypeScript wrappers query AppsFlyer tables directly → calculate metrics → persist to `campaign_evaluation`, `operation_score`, `optimizer_leaderboard`. Primary functions:
  - A2 Baseline: `calculateBaselineFromAF()` resolves PRD 6.2.5 `baseline_metrics` (cost-weighted ROAS + install-weighted RET + CPI) with four-level fallback (app+geo+media_source → app+geo → app+media_source → app). Window `[today-(baselineDays+30), today-baselineDays]`; if empty, falls back to latest available data. Window length from `baseline_settings`.
  - A3 Campaign: `evaluateCampaignFromAF()` aggregates cohort metrics for evaluation; batch via `evaluateAllCampaignsFromAF()`.
  - A7 Operation: `evaluateOperationFromAF()` resolves AppsFlyer context from change events/campaigns, computes stage scores (T+1/T+3/T+7) vs baseline, writes to `operation_score` and mirrors into `change_events.operation_scores`; `evaluateOperations7DaysAgoFromAF()` batches by operation date.

## Integrations
- **Google Ads API**: ChangeEvent stream per account via MCC credentials; summaries kept in English + Chinese; soft-delete for accounts.
- **AppsFlyer API**: Token-based export of IAP/ad-revenue and cohort KPIs; baseline helpers compute weighted ROAS/retention windows into `baseline_metrics` (no P50).

## Google Ads Credentials
- ChangeEvent sync loads `google-ads.yaml` (service account) from `local/credentials/google-ads/google-ads.yaml` (no env fallback).
- Keep the service account JSON in the same folder (default entry points to `./local/credentials/google-ads/<file>.json`); the `local/credentials/` folder is gitignored to avoid leaking secrets.
- The Node bridge sets `GOOGLE_ADS_LOGIN_CUSTOMER_ID` per account when spawning Python so the login header matches the target account.

## Google Ads Python Runtime
- Dependencies for Google Ads Python scripts are pinned in `server/google-ads/requirements.txt` (includes `google-ads` 28.4.0). Install system-wide with `python3 -m pip install -r server/google-ads/requirements.txt` before syncing.
- The bridge prefers system Python at `/Library/Frameworks/Python.framework/Versions/3.12/bin/python3` (then `/usr/local/bin/python3`, `/opt/homebrew/bin/python3`, else `python3`), so make sure the dependency is available there.
- Scripts explicitly request API version `v22` when loading services/types to avoid implicit downgrades; keep `google-ads` on the latest pinned version to match.
- Missing dependencies exit with a JSON error so the UI surfaces actionable guidance instead of a generic `ModuleNotFoundError`.

## Patterns
- Python bridge via `child_process.spawn` with JSON over stdout; detached background for ETL runs.
- Drizzle queries centralised in `queries*.ts`; all data access requires `accountId` for isolation.
- Deletes are soft (`isActive=false`), unique constraints and indexes aligned to account-scoped lookups.

## Operational Status
- **Phase 6 Complete**: Automated AppsFlyer sync via Docker container with cron scheduler.
  - Daily sync: 2:00 AM UTC (yesterday's data)
  - Monthly baseline: 3:00 AM UTC, 1st of month (180-day refresh)
  - Email notifications on sync failures (optional, configure SMTP vars)
- Dashboard displays sync status with 36-hour stale warning.
- Manual triggers available via Just recipes (`just af-docker-sync-yesterday`, `just af-docker-baseline-update`).
- AppsFlyer ETL exposed through tRPC `appsflyer` router (`getSyncStatus`, `triggerManualSync`).
- **Phase 5 Complete**: Evaluation uses AppsFlyer data (A2/A3/A7). A4 creative evaluation deferred to future phase.
- Batch evaluation functions available: `updateAllBaselinesFromAF()`, `evaluateAllCampaignsFromAF()`, `evaluateOperations7DaysAgoFromAF()`.
- Mock data generators deprecated; retained for development/testing only.
- Observability limited to console/log output + sync status UI; no metrics pipeline configured.
- No auth/permissions; intended for internal operators.
