# Phase Log

## Phase 5: Evaluation Integration (AppsFlyer Data)

**Date**: 2025-11-29
**Status**: Complete

### Overview
Refactored evaluation system (A2-A7) to use real AppsFlyer cohort data instead of mock data.

### Changes Made

#### Database
- Added `baseline_settings` table for configurable baseline window per app/geo/mediaSource
  - `windowDays` (default 180): lookback period for baseline calculation
  - `minCohorts` (default 30): minimum cohorts required for valid baseline
- Deprecated mock data tables (`mock_campaign_performance`, `mock_creative_performance`)

#### Backend - Query Layer (`server/db/queries-evaluation.ts`)
- Added baseline settings CRUD functions: `getBaselineSettings()`, `getAllBaselineSettings()`, `upsertBaselineSettings()`
- Added AppsFlyer bridge functions:
  - `getAggregatedCampaignMetrics()`: aggregates cohort KPIs for campaign evaluation
  - `getOperationCohortMetrics()`: compares before/after cohort performance
  - `getCampaignsFromAF()`: retrieves campaigns from AppsFlyer data

#### Backend - Evaluation Wrappers

**A2 Baseline Calculator** (`server/evaluation/wrappers/baseline-calculator.ts`)
- New: `calculateBaselineFromAF()` - calculates P50 (median) ROAS/RET from cohort data
- New: `updateAllBaselinesFromAF()` - batch updates all baselines
- New: `getOrCreateBaselineSettings()` - manages configurable settings
- Deprecated: `calculateBaseline()` (Python-based)

**A3 Campaign Evaluator** (`server/evaluation/wrappers/campaign-evaluator.ts`)
- New: `evaluateCampaignFromAF()` - evaluates campaigns using aggregated cohort metrics
- New: `evaluateAllCampaignsFromAF()` - batch evaluation with configurable date range
- Deprecated: `evaluateCampaign()` (Python-based)

**A7 Operation Evaluator** (`server/evaluation/wrappers/operation-evaluator.ts`)
- New: `evaluateOperationFromAF()` - compares cohort performance before/after operations
- New: `evaluateOperations7DaysAgoFromAF()` - batch evaluation for recent operations
- Deprecated: `evaluateOperation()` (Python-based)
- Note: Batch function limited due to `change_events` table lacking `appId`/`geo`/`mediaSource` fields

#### Types (`lib/types/evaluation.ts`)
- Added: `BaselineSettings`, `DataSource`, `CampaignEvaluationFromAF`, `OperationEvaluationFromAF`, `BaselineResultFromAF`

#### Deprecated
- Mock data generators (`server/evaluation/mock-data/generator.ts`, `seed.ts`) - retained for testing only
- Python-based evaluation functions - deprecated warnings added

### Decisions Made
- **A4 Creative Evaluation**: Deferred to future phase (not refactored in Phase 5)
- **Data Source Toggle**: No toggle - direct switch to AppsFlyer data
- **Baseline Window**: Configurable per app/geo/mediaSource via `baseline_settings` table

### Known Limitations
- `change_events` table lacks `appId`, `geo`, `mediaSource` fields; batch operation evaluation requires these to be provided explicitly
- A4 creative evaluation still uses mock data (future work)

### Next Steps
- Phase 6: Automation & Scheduling (Completed)
- Phase 7: Testing & Validation (Completed)
- Phase 8: Documentation & Cleanup

---

## Phase 6: Automation & Scheduling

**Date**: 2025-11-29
**Status**: Complete

### Overview
Set up automated daily data sync via Docker container with cron scheduler.

### Changes Made

#### Docker Infrastructure
- Created `server/appsflyer/Dockerfile` (Python 3.11-slim with cron)
- Created `server/appsflyer/crontab` with daily and monthly schedules
- Created `server/appsflyer/entrypoint.sh` with PostgreSQL wait logic
- Updated `docker-compose.yml` with `appsflyer-etl` service

#### Automation Scripts
- Daily sync: 2:00 AM UTC (yesterday's data via `sync_af_data.py --yesterday`)
- Monthly baseline: 3:00 AM UTC on 1st of month (`monthly_baseline_update.py`)

#### Error Notification
- Created `email_notifier.py` with SMTP support
- Integrated email notification into `sync_af_data.py`

#### UI Components
- Created `SyncStatusCard` component (`components/appsflyer/sync-status-card.tsx`)
- Added 36-hour stale warning in Dashboard

#### Just Commands Added
- `just af-docker-up` / `just af-docker-down`
- `just af-docker-logs` / `just af-docker-sync-logs`
- `just af-docker-sync-yesterday` / `just af-docker-sync-range`

---

## Phase 7: Testing & Validation

**Date**: 2025-11-29
**Status**: Complete

### Overview
Comprehensive testing of entire AppsFlyer integration with 78 automated tests across 5 test files.

### Test Files Created

| File | Tests | Purpose |
|------|-------|---------|
| `server/appsflyer/test-data-quality.ts` | 14 | Data integrity validation |
| `server/db/test-queries-appsflyer.ts` | 17 | Query function testing |
| `server/api/routers/test-appsflyer.ts` | 25 | tRPC procedure testing |
| `server/evaluation/test-integration-appsflyer.ts` | 14 | A2/A3/A7 integration tests |
| `server/appsflyer/test-performance.ts` | 8 | Performance benchmarks |

### Key Findings

#### Data Quality
- 1,003,833 events in af_events table
- 1,336,505 KPI records in af_cohort_kpi_daily
- 0 NULL values in critical fields
- All retention rates within valid range [0, 1]

#### Performance Results
- `getEventsByDateRange` (180 days): 64ms
- `getCohortKpi` (full scan): 45ms
- `calculateBaselineRoas`: 89ms
- All queries under 200ms (well below 2s threshold)

#### Index Verification
- 13 database indexes verified via EXPLAIN ANALYZE
- All queries use index scans, no sequential scans on large tables

### UI Testing (Playwright MCP)
- Dashboard: Load success, no console errors
- Campaign Evaluation: Load success, DataGrid functional
- Creative Evaluation: Load success, filters working
- Operation Scores: Load success, tabs navigable

### Issues Fixed
1. TypeScript `@ts-expect-error` directives replaced with type assertions
2. Type assertion syntax corrected in test-data-quality.ts

### Known Limitations Documented
1. A7 batch limitation: `change_events` lacks `appId`/`geo`/`mediaSource` fields
2. Baseline requires 180 days of data accumulation

### Review Document
- Created `docs/reviews/phase7-testing-review.md` with comprehensive test report

### Next Steps
- Phase 8: Documentation & Cleanup
