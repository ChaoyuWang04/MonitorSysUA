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

---

## Phase 8: Documentation & Cleanup

**Date**: 2025-11-29
**Status**: Complete
**Version**: v1.1.0

### Overview
Comprehensive documentation and cleanup phase. Created user-facing documentation, API reference, migration guides, and removed deprecated mock data infrastructure.

### Documentation Created

| File | Purpose |
|------|---------|
| `docs/appsflyer-integration.md` | Main integration guide with architecture, data flow, metrics |
| `docs/appsflyer-api.md` | Complete tRPC API reference for 10 procedures |
| `docs/migration-mock-to-real.md` | Migration guide from mock to AppsFlyer data |
| `docs/system/trd.md` | Technical Reference Document with architecture decisions |

### Database Changes

#### Table Removed
- `mock_campaign_performance` - Dropped via migration `20251129085803_remove-mock-campaign-performance.sql`

#### Table Retained
- `mock_creative_performance` - Still used by A4 Creative Evaluation (future migration)

### Code Cleanup

#### Schema (`server/db/schema.ts`)
- Removed `mockCampaignPerformance` table definition
- Added migration note comments

#### Mock Data Scripts (`server/evaluation/mock-data/`)
- Updated `generator.ts`: Removed campaign generators, kept creative generators
- Updated `seed.ts`: Removed campaign seeding, kept creative seeding for A4

#### Snapshot Scripts (`scripts/`)
- Updated `db-snapshot.ts`: Removed `mock_campaign_performance` reference, added `baseline_settings`
- Updated `db-restore.ts`: Removed `mock_campaign_performance` reference, added `baseline_settings`

#### Test Scripts (`server/evaluation/test-evaluation.ts`)
- Updated A3 test to reflect AppsFlyer migration
- Added deprecation notice for mock data tests

#### Query Functions (`server/db/queries-appsflyer.ts`)
- Added comprehensive JSDoc documentation to all exported functions

### Validation

- TypeScript compilation: PASS
- Next.js build: PASS
- Database migration: Applied successfully (5 total migrations)

### Breaking Changes

1. **`mock_campaign_performance` table removed**
   - Migrate to `af_cohort_kpi_daily` and `af_events` tables
   - See `docs/migration-mock-to-real.md` for details

2. **Deprecated functions log warnings**
   - `calculateBaseline()` -> `calculateBaselineFromAF()`
   - `evaluateCampaign()` -> `evaluateCampaignFromAF()`
   - `evaluateOperation()` -> `evaluateOperationFromAF()`

### Files Modified

```
atlas/migrations/20251129085803_remove-mock-campaign-performance.sql (new)
docs/appsflyer-api.md (new)
docs/appsflyer-integration.md (new)
docs/migration-mock-to-real.md (new)
docs/system/database.md (updated)
docs/system/trd.md (new)
scripts/db-restore.ts (updated)
scripts/db-snapshot.ts (updated)
server/db/queries-appsflyer.ts (JSDoc added)
server/db/schema.ts (updated)
server/evaluation/mock-data/generator.ts (updated)
server/evaluation/mock-data/seed.ts (updated)
server/evaluation/test-evaluation.ts (updated)
```

### Release Notes (v1.1.0)

#### Features
- Complete AppsFlyer cohort data integration (Phases 1-7)
- Real-time evaluation using actual user behavior data
- P50 baseline calculation from 180-day historical cohorts
- Docker-based automated ETL with cron scheduling

#### Documentation
- AppsFlyer integration guide with architecture diagrams
- Complete API reference for all tRPC procedures
- Migration guide from mock to real data
- Technical Reference Document (TRD)

#### Deprecated
- Mock campaign performance data (removed)
- Python-based evaluation functions (use `*FromAF()` variants)

#### Database
- New: `baseline_settings` table
- New: `af_revenue_cohort_daily` view
- New: `af_cohort_metrics_daily` view
- Removed: `mock_campaign_performance` table

---

## Summary

All 8 phases of the AppsFlyer integration project are now complete:

| Phase | Status | Key Deliverable |
|-------|--------|-----------------|
| 1: Schema | Complete | Database tables, Python ETL |
| 2: Python Scripts | Complete | sync_af_data.py |
| 3: Query Layer | Complete | queries-appsflyer.ts |
| 4: tRPC API | Complete | appsflyer.ts router |
| 5: Evaluation Integration | Complete | *FromAF() wrappers |
| 6: Automation | Complete | Docker ETL with cron |
| 7: Testing | Complete | 78 automated tests |
| 8: Documentation | Complete | Full docs + cleanup |

**Total Tasks**: 182 completed across 8 phases
**Version**: v1.1.0
