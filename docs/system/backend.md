# Backend Design

## Architecture
- Next.js App Router with tRPC; Drizzle ORM to PostgreSQL (Docker, port 5433).
- Python subprocesses handle Google Ads fetch, AppsFlyer ETL, and evaluation engines; TypeScript wrappers orchestrate and persist results.

## Modules
- `server/api/`: `trpc.ts`, `root.ts`, routers (`accounts`, `events`, `stats`, `evaluation`, `appsflyer`).
- `server/db/`: `schema.ts` (14 tables), `index.ts` (client), `queries.ts` (accounts/events/stats), `queries-evaluation.ts` (A2-A5 + recommendations), `queries-appsflyer.ts` (events/cohort/baseline/sync logs).
- `server/google-ads/`: `client.ts` (spawn Python), `fetch_events.py`, `parser.ts`, `diff-engine.ts`, `regenerate_summaries.py`.
- `server/appsflyer/`: `sync_af_data.py`, `backfill.py`, `requirements.txt` for ETL venv.
- `server/evaluation/`: wrappers (`baseline-calculator.ts`, `campaign-evaluator.ts`, `creative-evaluator.ts`, `operation-evaluator.ts`), Python engines, mock-data seed + test harness.
- Utilities: `scripts/db-snapshot.ts`, `scripts/db-restore.ts`, Just recipes for dev/DB/AppsFlyer.

## Data Flows
- **Google Ads Sync**: `events.sync` → load account (currency) → Python `fetch_events.py` → parse + dedupe → insert `change_events` → update `accounts.lastSyncedAt`.
- **AppsFlyer Sync**: `appsflyer.triggerManualSync` (or Just commands) → Python `sync_af_data.py`/`backfill.py` → write `af_events`, `af_cohort_kpi_daily` + `af_sync_log`.
- **Evaluation (Phase 5)**: TypeScript wrappers query AppsFlyer tables directly → calculate metrics → persist to `campaign_evaluation`, `operation_score`, `optimizer_leaderboard`. Primary functions:
  - A2 Baseline: `calculateBaselineFromAF()` queries `af_cohort_kpi_daily` for P50 ROAS/RET; configurable window via `baseline_settings`.
  - A3 Campaign: `evaluateCampaignFromAF()` aggregates cohort metrics for evaluation; batch via `evaluateAllCampaignsFromAF()`.
  - A7 Operation: `evaluateOperationFromAF()` compares before/after cohort performance for change events.

## Integrations
- **Google Ads API**: ChangeEvent stream per account via MCC credentials; summaries kept in English + Chinese; soft-delete for accounts.
- **AppsFlyer API**: Token-based export of IAP/ad-revenue and cohort KPIs; baseline helpers compute median ROAS/retention windows.

## Patterns
- Python bridge via `child_process.spawn` with JSON over stdout; detached background for ETL runs.
- Drizzle queries centralised in `queries*.ts`; all data access requires `accountId` for isolation.
- Deletes are soft (`isActive=false`), unique constraints and indexes aligned to account-scoped lookups.

## Operational Status
- Manual triggers only (UI buttons or Just/CLI); cron/scheduled runs not yet set up.
- AppsFlyer ETL available via Python scripts; exposed through tRPC `appsflyer` router.
- **Phase 5 Complete**: Evaluation uses AppsFlyer data (A2/A3/A7). A4 creative evaluation deferred to future phase.
- Batch evaluation functions available: `updateAllBaselinesFromAF()`, `evaluateAllCampaignsFromAF()`, `evaluateOperations7DaysAgoFromAF()`.
- Mock data generators deprecated; retained for development/testing only.
- Observability limited to console/log output; no metrics pipeline configured.
- No auth/permissions; intended for internal operators.
