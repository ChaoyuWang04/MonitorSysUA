# MonitorSysUA - AppsFlyer Integration TODO

> **Project Goal**: Integrate AppsFlyer cohort data pipeline to replace mock data in evaluation system (A2-A7)
>
> **Total Tasks**: 182 tasks across 8 phases
>
> **Estimated Timeline**: ~4 weeks
>
> **Status**: 🟢 Phase 1 Complete - Ready to Start Phase 2
>
> **Python ETL Script Location**: `server/appsflyer/sync_af_data.py`
>
> **Field Naming Convention**: Use `geo` (NOT `country_code`) for consistency across all tables

---

## 📋 Quick Reference

| Phase | Tasks | Est. Days | Status | Priority |
|-------|-------|-----------|--------|----------|
| [Phase 1: Database Foundation](#phase-1-database-foundation) | 25 | 3 | ✅ Complete | 🔴 CRITICAL |
| [Phase 2: Data Pipeline Setup](#phase-2-data-pipeline-setup) | 42 | 5 | ⬜ Not Started | 🔴 CRITICAL |
| [Phase 3: TypeScript Query Layer](#phase-3-typescript-query-layer) | 18 | 3 | ⬜ Not Started | 🟡 High |
| [Phase 4: tRPC Router](#phase-4-trpc-router) | 15 | 2 | ⬜ Not Started | 🟡 High |
| [Phase 5: Evaluation Integration](#phase-5-evaluation-integration) | 28 | 5 | ⬜ Not Started | 🟡 High |
| [Phase 6: Automation & Scheduling](#phase-6-automation--scheduling) | 12 | 3 | ⬜ Not Started | 🟢 Medium |
| [Phase 7: Testing & Validation](#phase-7-testing--validation) | 24 | 4 | ⬜ Not Started | 🟡 High |
| [Phase 8: Documentation & Cleanup](#phase-8-documentation--cleanup) | 18 | 2 | ⬜ Not Started | 🟢 Medium |

---

## User Decisions Confirmed

✅ **AppsFlyer Credentials**: Have API token for `solitaire.patience.card.games.klondike.free`
✅ **Data Backfill Scope**: Last 180 days (full baseline window)
✅ **Sync Strategy**: Both manual (Just commands) + automated (cron at 2 AM UTC)
✅ **Mock Data**: Deprecate immediately after real data flows
✅ **Table Naming**: Keep `af_` prefix for clarity

---

## Phase 1: Database Foundation

**Goal**: Create AppsFlyer database tables and views
**Duration**: 3 days
**Status**: ✅ Complete (2025-11-26)
**Blockers**: None

**Implementation Notes**:
- Tables created: `af_events`, `af_cohort_kpi_daily`, `af_sync_log`
- Views created: `af_revenue_cohort_daily`, `af_cohort_metrics_daily`
- Python ETL script moved to: `server/appsflyer/sync_af_data.py`
- Field naming: Using `geo` (not `country_code`) for consistency

### 1.1 Schema Definition (Day 1)

- [x] **Task 1.1.1**: Read current `server/db/schema.ts` structure
- [x] **Task 1.1.2**: Add `af_events` table to schema.ts
  - [x] 23 fields: event_id (PK), app_id, appsflyer_id, event_name, event_time, event_date, install_time, install_date, days_since_install, event_revenue_usd, geo, media_source, campaign, campaign_id, adset, adset_id, ad, is_primary_attribution, raw_payload (jsonb), imported_at
  - [x] Primary key: event_id (TEXT)
  - [x] NOT NULL constraints: app_id, event_name, event_time, event_date, install_time, install_date, days_since_install
  - [x] Indexes: install_date, event_date, cohort (app_id + geo + media_source + campaign + adset + install_date), event_name
- [x] **Task 1.1.3**: Add `af_cohort_kpi_daily` table to schema.ts
  - [x] 10 fields: app_id, media_source, campaign, geo, install_date, days_since_install, installs, cost_usd, retention_rate, last_refreshed_at
  - [x] Unique index on: (app_id, media_source, campaign, geo, install_date, days_since_install) - using serial PK + uniqueIndex pattern
  - [x] NOT NULL constraints: app_id, media_source, campaign, geo, install_date, days_since_install
  - [x] Indexes: install_date, cohort (app_id + geo + media_source + campaign + install_date)
- [x] **Task 1.1.4**: Add `af_sync_log` table to schema.ts
  - [x] 9 fields: id (PK), sync_type (varchar), date_range_start, date_range_end, status (varchar), records_processed, error_message, started_at, completed_at
  - [x] Primary key: id (serial)
  - [x] Indexes: sync_type, status, started_at
- [x] **Task 1.1.5**: Run TypeScript type check: `just type-check`

### 1.2 Migration Generation (Day 1-2)

- [x] **Task 1.2.1**: Ensure PostgreSQL Docker container is running: `just docker-up`
- [x] **Task 1.2.2**: Generate migration for AppsFlyer tables: `just db-diff add_appsflyer_tables`
- [x] **Task 1.2.3**: Review generated SQL in `atlas/migrations/`
- [x] **Task 1.2.4**: Verify migration includes all 3 tables with correct constraints
- [x] **Task 1.2.5**: Run migration lint check: `just db-lint` (Atlas Pro required, skipped)
- [x] **Task 1.2.6**: Apply migration: `just db-apply`
- [x] **Task 1.2.7**: Verify tables created: `just db-studio` (check af_events, af_cohort_kpi_daily, af_sync_log)

### 1.3 Database Views (Day 2)

- [x] **Task 1.3.1**: Create SQL file for views: `atlas/migrations/20251126102717_add_appsflyer_views.sql`
- [x] **Task 1.3.2**: Add `af_revenue_cohort_daily` view
  ```sql
  CREATE VIEW af_revenue_cohort_daily AS
  SELECT
    app_id,
    geo,
    media_source,
    campaign,
    adset,
    install_date,
    days_since_install,
    SUM(CASE WHEN event_name = 'iap_purchase' THEN event_revenue_usd ELSE 0 END) AS iap_revenue_usd,
    SUM(CASE WHEN event_name = 'af_ad_revenue' THEN event_revenue_usd ELSE 0 END) AS ad_revenue_usd,
    SUM(event_revenue_usd) AS total_revenue_usd
  FROM af_events
  GROUP BY app_id, geo, media_source, campaign, adset, install_date, days_since_install;
  ```
- [x] **Task 1.3.3**: Add `af_cohort_metrics_daily` view (joins revenue + KPI)
  ```sql
  CREATE VIEW af_cohort_metrics_daily AS
  SELECT
    r.app_id, r.geo, r.media_source, r.campaign, r.adset,
    r.install_date, r.days_since_install,
    r.iap_revenue_usd, r.ad_revenue_usd, r.total_revenue_usd,
    k.installs, k.cost_usd, k.retention_rate
  FROM af_revenue_cohort_daily r
  LEFT JOIN af_cohort_kpi_daily k
    ON r.app_id = k.app_id
   AND r.geo = k.geo
   AND r.media_source = k.media_source
   AND r.campaign = k.campaign
   AND r.install_date = k.install_date
   AND r.days_since_install = k.days_since_install;
  ```
- [x] **Task 1.3.4**: Apply views migration: `just db-apply`
- [x] **Task 1.3.5**: Verify views in Drizzle Studio: `just db-studio`

### 1.4 Type Generation & Validation (Day 3)

- [x] **Task 1.4.1**: Export TypeScript types from schema.ts
  - [x] Add `export type AfEvent = typeof afEvents.$inferSelect`
  - [x] Add `export type NewAfEvent = typeof afEvents.$inferInsert`
  - [x] Add `export type AfCohortKpiDaily = typeof afCohortKpiDaily.$inferSelect`
  - [x] Add `export type NewAfCohortKpiDaily = typeof afCohortKpiDaily.$inferInsert`
  - [x] Add `export type AfSyncLog = typeof afSyncLog.$inferSelect`
  - [x] Add `export type NewAfSyncLog = typeof afSyncLog.$inferInsert`
- [x] **Task 1.4.2**: Run full type check: `just type-check`
- [x] **Task 1.4.3**: Test database connection with new tables
- [x] **Task 1.4.4**: Git commit: `git commit -m "feat(db): Add AppsFlyer tables (af_events, af_cohort_kpi_daily, af_sync_log) and views"`

**Phase 1 Completion Criteria**:
- ✅ 3 new tables exist in database
- ✅ 2 new views created and queryable
- ✅ All migrations applied successfully
- ✅ TypeScript types generated and passing type checks
- ✅ Changes committed to git

---

## Phase 2: Data Pipeline Setup

**Goal**: Integrate Python ETL script for AppsFlyer data ingestion
**Duration**: 5 days
**Status**: ⬜ Not Started
**Blockers**: Phase 1 must be complete

### 2.1 Python Environment Setup (Day 1)

- [x] **Task 2.1.1**: Create directory: `server/appsflyer/` (Done in Phase 1)
- [x] **Task 2.1.2**: Move `docs/sync_af_data.py` to `server/appsflyer/sync_af_data.py` (Done in Phase 1)
- [x] **Task 2.1.3**: Create `server/appsflyer/requirements.txt` (Done in Phase 1)
  ```
  requests==2.31.0
  pandas==2.1.4
  psycopg2-binary==2.9.9
  python-dotenv==1.0.0
  ```
- [x] **Task 2.1.4**: Create `server/appsflyer/__init__.py` (Done in Phase 1)
- [ ] **Task 2.1.5**: Create Python virtual environment: `python3 -m venv server/appsflyer/.venv`
- [ ] **Task 2.1.6**: Install dependencies: `server/appsflyer/.venv/bin/pip install -r server/appsflyer/requirements.txt`
- [ ] **Task 2.1.7**: Add `.venv` to `.gitignore`

### 2.2 Environment Configuration (Day 1)

- [ ] **Task 2.2.1**: Update `.env.example` with AppsFlyer variables
  ```
  # AppsFlyer API
  AF_API_TOKEN=your_appsflyer_bearer_token
  AF_APP_ID=solitaire.patience.card.games.klondike.free
  AF_DEFAULT_MEDIA_SOURCE=googleadwords_int
  AF_DEFAULT_GEO=US
  ```
- [ ] **Task 2.2.2**: Add real credentials to `.env` (not committed)
- [ ] **Task 2.2.3**: Verify database connection variables in `.env`
  ```
  PG_HOST=localhost
  PG_PORT=5433
  PG_USER=postgres
  PG_PASSWORD=postgres
  PG_DATABASE=monitor_sys_ua
  ```
- [ ] **Task 2.2.4**: Test environment loading in Python script

### 2.3 Script Adaptation (Day 2)

- [ ] **Task 2.3.1**: Update database connection to use MonitorSysUA credentials
- [ ] **Task 2.3.2**: Verify table names match schema.ts (af_events, af_cohort_kpi_daily)
- [ ] **Task 2.3.3**: Add sync logging to `af_sync_log` table
  - [ ] Log sync start with `status='running'`
  - [ ] Log sync completion with `status='success'` and `records_processed`
  - [ ] Log errors with `status='failed'` and `error_message`
- [ ] **Task 2.3.4**: Add error handling for API rate limits
- [ ] **Task 2.3.5**: Add retry logic (3 attempts with exponential backoff)
- [ ] **Task 2.3.6**: Add progress logging for long-running syncs

### 2.4 Initial Data Backfill (Day 3)

- [ ] **Task 2.4.1**: Calculate date range: last 180 days from today
- [ ] **Task 2.4.2**: Create backfill script wrapper: `server/appsflyer/backfill.py`
  ```python
  # Backfill last 180 days in 30-day chunks to avoid API timeouts
  from datetime import date, timedelta
  from sync_af_data import sync_events, sync_cohort_kpi

  end_date = date.today()
  start_date = end_date - timedelta(days=180)

  # Split into 6 chunks of 30 days each
  for i in range(6):
      chunk_start = start_date + timedelta(days=i*30)
      chunk_end = min(chunk_start + timedelta(days=29), end_date)

      print(f"Backfilling chunk {i+1}/6: {chunk_start} to {chunk_end}")
      sync_events(chunk_start.strftime("%Y-%m-%d"), chunk_end.strftime("%Y-%m-%d"))
      sync_cohort_kpi(chunk_start.strftime("%Y-%m-%d"), chunk_end.strftime("%Y-%m-%d"))
  ```
- [ ] **Task 2.4.3**: Run backfill script: `server/appsflyer/.venv/bin/python server/appsflyer/backfill.py`
- [ ] **Task 2.4.4**: Monitor progress and error logs
- [ ] **Task 2.4.5**: Verify data in Drizzle Studio: `just db-studio`
  - [ ] Check af_events row count
  - [ ] Check af_cohort_kpi_daily row count
  - [ ] Verify date range coverage
  - [ ] Check for NULL values in critical fields

### 2.5 Incremental Sync Testing (Day 4)

- [ ] **Task 2.5.1**: Test daily sync for yesterday's data
  ```bash
  server/appsflyer/.venv/bin/python -c "
  from sync_af_data import sync_events, sync_cohort_kpi
  from datetime import date, timedelta
  yesterday = (date.today() - timedelta(days=1)).strftime('%Y-%m-%d')
  sync_events(yesterday, yesterday)
  sync_cohort_kpi(yesterday, yesterday)
  "
  ```
- [ ] **Task 2.5.2**: Verify idempotency - run same sync twice, check no duplicates
- [ ] **Task 2.5.3**: Test date range sync (last 7 days)
- [ ] **Task 2.5.4**: Verify af_sync_log entries created correctly

### 2.6 Just Command Integration (Day 5)

- [ ] **Task 2.6.1**: Add Python sync commands to `justfile`
  ```justfile
  # Sync yesterday's AppsFlyer data
  af-sync-yesterday:
      server/appsflyer/.venv/bin/python -c "from sync_af_data import sync_events, sync_cohort_kpi; from datetime import date, timedelta; yesterday = (date.today() - timedelta(days=1)).strftime('%Y-%m-%d'); sync_events(yesterday, yesterday); sync_cohort_kpi(yesterday, yesterday)"

  # Sync specific date range
  af-sync-range FROM TO:
      server/appsflyer/.venv/bin/python -c "from sync_af_data import sync_events, sync_cohort_kpi; sync_events('{{FROM}}', '{{TO}}'); sync_cohort_kpi('{{FROM}}', '{{TO}}')"

  # Backfill last 180 days
  af-backfill:
      server/appsflyer/.venv/bin/python server/appsflyer/backfill.py
  ```
- [ ] **Task 2.6.2**: Test `just af-sync-yesterday`
- [ ] **Task 2.6.3**: Test `just af-sync-range 2025-01-01 2025-01-07`
- [ ] **Task 2.6.4**: Update `justfile` help text with new commands
- [ ] **Task 2.6.5**: Git commit: `git commit -m "feat(pipeline): Add AppsFlyer Python ETL with Just commands"`

### 2.7 Data Quality Validation (Day 5)

- [ ] **Task 2.7.1**: Write validation query: count events by event_name
  ```sql
  SELECT event_name, COUNT(*) as count
  FROM af_events
  GROUP BY event_name;
  ```
- [ ] **Task 2.7.2**: Write validation query: check for orphaned events (no cohort KPI)
  ```sql
  SELECT COUNT(DISTINCT install_date)
  FROM af_events e
  WHERE NOT EXISTS (
    SELECT 1 FROM af_cohort_kpi_daily k
    WHERE k.install_date = e.install_date
      AND k.days_since_install = 0
  );
  ```
- [ ] **Task 2.7.3**: Write validation query: verify revenue totals match
  ```sql
  SELECT
    SUM(event_revenue_usd) as direct_sum,
    (SELECT SUM(total_revenue_usd) FROM af_revenue_cohort_daily) as view_sum;
  ```
- [ ] **Task 2.7.4**: Document validation queries in `docs/appsflyer-validation.md`

**Phase 2 Completion Criteria**:
- ✅ Python ETL script operational
- ✅ 180 days of historical data loaded
- ✅ Just commands working for manual sync
- ✅ Data quality validation passed
- ✅ Sync logging to af_sync_log working
- ✅ Changes committed to git

---

## Phase 3: TypeScript Query Layer

**Goal**: Create TypeScript query functions for AppsFlyer data
**Duration**: 3 days
**Status**: ⬜ Not Started
**Blockers**: Phase 2 must be complete

### 3.1 Query Module Setup (Day 1)

- [ ] **Task 3.1.1**: Create `server/db/queries-appsflyer.ts`
- [ ] **Task 3.1.2**: Import Drizzle types and database client
  ```typescript
  import { db } from './index';
  import { afEvents, afCohortKpiDaily, afSyncLog } from './schema';
  import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
  import type { AfEvent, AfCohortKpiDaily, AfSyncLog } from './schema';
  ```
- [ ] **Task 3.1.3**: Add JSDoc comments for module purpose

### 3.2 Event Queries (Day 1)

- [ ] **Task 3.2.1**: Implement `getEventsByDateRange(startDate: Date, endDate: Date): Promise<AfEvent[]>`
  - Query af_events where event_date between dates
  - Order by event_date DESC, event_time DESC
  - Include pagination support (limit/offset parameters)
- [ ] **Task 3.2.2**: Implement `getEventsByInstallDate(installDate: Date): Promise<AfEvent[]>`
  - Query af_events where install_date = date
  - Group by days_since_install
- [ ] **Task 3.2.3**: Implement `getRevenueByCohort(installDate: Date, daysSinceInstall: number): Promise<{iap: number, ad: number, total: number}>`
  - Sum event_revenue_usd from af_events
  - Filter by install_date and days_since_install
  - Separate IAP vs ad revenue

### 3.3 Cohort KPI Queries (Day 2)

- [ ] **Task 3.3.1**: Implement `getCohortKpi(filters: {appId?: string, geo?: string, mediaSource?: string, campaign?: string, installDate?: Date, daysSinceInstall?: number}): Promise<AfCohortKpiDaily[]>`
  - Dynamic WHERE clause based on provided filters
  - Return matching records
- [ ] **Task 3.3.2**: Implement `getCohortMetrics(installDate: Date, daysSinceInstall: number): Promise<CohortMetrics[]>`
  - Query af_cohort_metrics_daily view
  - Return all campaigns for given install_date and day
  - Include revenue + KPI data
- [ ] **Task 3.3.3**: Implement `getLatestCohortData(daysBack: number = 30): Promise<AfCohortKpiDaily[]>`
  - Get most recent cohorts within daysBack window
  - Useful for dashboard "recent performance" widgets

### 3.4 Baseline Calculation Queries (Day 2)

- [ ] **Task 3.4.1**: Implement `calculateBaselineRoas(dimensions: {appId: string, geo: string, mediaSource: string, campaign?: string}, baselineDays: number = 180): Promise<number | null>`
  - Query cohorts from (today - baselineDays - 30) to (today - baselineDays)
  - Calculate P50 (median) of D7 ROAS
  - Return null if insufficient data
- [ ] **Task 3.4.2**: Implement `calculateBaselineRetention(dimensions: {...}, daysSinceInstall: number, baselineDays: number = 180): Promise<number | null>`
  - Same date range logic as ROAS
  - Calculate P50 of retention_rate for specified day
- [ ] **Task 3.4.3**: Add helper function `getBaselineWindow(baselineDays: number = 180): {start: Date, end: Date}`
  - Return start = today - baselineDays - 30
  - Return end = today - baselineDays

### 3.5 Sync Management Queries (Day 3)

- [ ] **Task 3.5.1**: Implement `getLatestSyncLog(syncType: 'events' | 'cohort_kpi' | 'baseline'): Promise<AfSyncLog | null>`
  - Query af_sync_log for most recent entry of type
  - Order by started_at DESC
- [ ] **Task 3.5.2**: Implement `createSyncLog(data: NewAfSyncLog): Promise<AfSyncLog>`
  - Insert new sync log entry
  - Return created record
- [ ] **Task 3.5.3**: Implement `updateSyncLog(id: number, updates: Partial<AfSyncLog>): Promise<void>`
  - Update existing sync log (for status changes)

### 3.6 Testing & Validation (Day 3)

- [ ] **Task 3.6.1**: Create test file: `server/db/test-queries-appsflyer.ts`
- [ ] **Task 3.6.2**: Test event queries with sample data
- [ ] **Task 3.6.3**: Test cohort KPI queries
- [ ] **Task 3.6.4**: Test baseline calculations (verify P50 logic)
- [ ] **Task 3.6.5**: Test sync log CRUD operations
- [ ] **Task 3.6.6**: Run: `tsx server/db/test-queries-appsflyer.ts`
- [ ] **Task 3.6.7**: Git commit: `git commit -m "feat(db): Add AppsFlyer query layer with 10+ functions"`

**Phase 3 Completion Criteria**:
- ✅ 10+ query functions implemented
- ✅ All queries tested with real data
- ✅ TypeScript types properly inferred
- ✅ JSDoc documentation complete
- ✅ Changes committed to git

---

## Phase 4: tRPC Router

**Goal**: Expose AppsFlyer data via tRPC API
**Duration**: 2 days
**Status**: ⬜ Not Started
**Blockers**: Phase 3 must be complete

### 4.1 Router Setup (Day 1)

- [ ] **Task 4.1.1**: Create `server/api/routers/appsflyer.ts`
- [ ] **Task 4.1.2**: Import tRPC setup and query functions
  ```typescript
  import { createTRPCRouter, publicProcedure } from '../trpc';
  import { z } from 'zod';
  import * as appsflyerQueries from '../../db/queries-appsflyer';
  ```
- [ ] **Task 4.1.3**: Export router: `export const appsflyerRouter = createTRPCRouter({...})`
- [ ] **Task 4.1.4**: Add router to root router in `server/api/root.ts`
  ```typescript
  import { appsflyerRouter } from './routers/appsflyer';

  export const appRouter = createTRPCRouter({
    accounts: accountsRouter,
    events: eventsRouter,
    stats: statsRouter,
    evaluation: evaluationRouter,
    appsflyer: appsflyerRouter, // NEW
  });
  ```

### 4.2 Event Procedures (Day 1)

- [ ] **Task 4.2.1**: Add `getEventsByDateRange` procedure
  ```typescript
  getEventsByDateRange: publicProcedure
    .input(z.object({
      startDate: z.string().datetime(),
      endDate: z.string().datetime(),
      limit: z.number().optional(),
      offset: z.number().optional(),
    }))
    .query(async ({ input }) => {
      return await appsflyerQueries.getEventsByDateRange(
        new Date(input.startDate),
        new Date(input.endDate)
      );
    }),
  ```
- [ ] **Task 4.2.2**: Add `getRevenueByCohort` procedure
  - Input: installDate (string), daysSinceInstall (number)
  - Output: {iap: number, ad: number, total: number}

### 4.3 Cohort KPI Procedures (Day 1)

- [ ] **Task 4.3.1**: Add `getCohortKpi` procedure
  - Input: filters (appId?, geo?, mediaSource?, campaign?, installDate?, daysSinceInstall?)
  - All fields optional for flexible filtering
- [ ] **Task 4.3.2**: Add `getCohortMetrics` procedure
  - Input: installDate (string), daysSinceInstall (number)
  - Returns full metrics from view (revenue + KPI)
- [ ] **Task 4.3.3**: Add `getLatestCohortData` procedure
  - Input: daysBack (number, default 30)
  - Returns recent cohorts for dashboards

### 4.4 Baseline Procedures (Day 2)

- [ ] **Task 4.4.1**: Add `calculateBaselineRoas` procedure
  - Input: dimensions (appId, geo, mediaSource, campaign?), baselineDays (number, default 180)
  - Output: baseline ROAS (P50) or null
- [ ] **Task 4.4.2**: Add `calculateBaselineRetention` procedure
  - Input: dimensions + daysSinceInstall + baselineDays
  - Output: baseline retention rate (P50) or null

### 4.5 Sync Management Procedures (Day 2)

- [ ] **Task 4.5.1**: Add `getLatestSyncLog` procedure
  - Input: syncType ('events' | 'cohort_kpi' | 'baseline')
  - Output: latest sync log record
- [ ] **Task 4.5.2**: Add `triggerManualSync` procedure (mutation)
  - Input: dateRange (from, to)
  - Spawns Python script via child_process
  - Returns sync_log id for tracking

### 4.6 Testing & Type Safety (Day 2)

- [ ] **Task 4.6.1**: Run type check: `just type-check`
- [ ] **Task 4.6.2**: Test procedures via tRPC client in browser console
- [ ] **Task 4.6.3**: Verify Zod validation works for invalid inputs
- [ ] **Task 4.6.4**: Test error handling (e.g., invalid date formats)
- [ ] **Task 4.6.5**: Git commit: `git commit -m "feat(api): Add AppsFlyer tRPC router with 8 procedures"`

**Phase 4 Completion Criteria**:
- ✅ Router added to root router
- ✅ 8+ procedures implemented
- ✅ Zod validation on all inputs
- ✅ Type safety verified end-to-end
- ✅ Changes committed to git

---

## Phase 5: Evaluation Integration

**Goal**: Replace mock data with real AppsFlyer cohort data in A2-A7 evaluation system
**Duration**: 5 days
**Status**: ⬜ Not Started
**Blockers**: Phase 4 must be complete

### 5.1 Analysis of Current Evaluation System (Day 1)

- [ ] **Task 5.1.1**: Read `server/db/queries-evaluation.ts` thoroughly
- [ ] **Task 5.1.2**: Identify all 4 wrappers that query mock_campaign_performance:
  - [ ] A2 wrapper: ROAS calculation
  - [ ] A3 wrapper: Retention rate calculation
  - [ ] A4 wrapper: Baseline comparison
  - [ ] A7 wrapper: Operation scoring
- [ ] **Task 5.1.3**: Document current data flow: mock_campaign_performance → wrapper → evaluation component
- [ ] **Task 5.1.4**: Document target data flow: af_cohort_metrics_daily view → wrapper → evaluation component
- [ ] **Task 5.1.5**: Identify breaking changes (if any) in data structure

### 5.2 Wrapper Refactoring - A2 ROAS (Day 1-2)

- [ ] **Task 5.2.1**: Locate A2 ROAS calculation wrapper function
- [ ] **Task 5.2.2**: Replace mock_campaign_performance query with:
  ```typescript
  // Old: SELECT ... FROM mock_campaign_performance
  // New: SELECT ... FROM af_cohort_metrics_daily
  const cohortData = await db
    .select()
    .from(afCohortMetricsDaily)
    .where(eq(afCohortMetricsDaily.daysSinceInstall, 7))
    .where(gte(afCohortMetricsDaily.installDate, startDate))
    .where(lte(afCohortMetricsDaily.installDate, endDate));
  ```
- [ ] **Task 5.2.3**: Update ROAS calculation to use real fields:
  - revenue_d7 → total_revenue_usd (from view)
  - cost → cost_usd (from view)
- [ ] **Task 5.2.4**: Add NULL handling for campaigns without revenue/cost data
- [ ] **Task 5.2.5**: Test A2 with real data via tRPC procedure

### 5.3 Wrapper Refactoring - A3 Retention (Day 2)

- [ ] **Task 5.3.1**: Locate A3 retention rate calculation wrapper
- [ ] **Task 5.3.2**: Replace query with af_cohort_kpi_daily for D1/D3/D5/D7 retention
  ```typescript
  const retentionData = await db
    .select()
    .from(afCohortKpiDaily)
    .where(eq(afCohortKpiDaily.installDate, cohortDate))
    .where(inArray(afCohortKpiDaily.daysSinceInstall, [1, 3, 5, 7]));
  ```
- [ ] **Task 5.3.3**: Update return structure to match A3 expectations
- [ ] **Task 5.3.4**: Handle missing retention data (not all days may be available yet)
- [ ] **Task 5.3.5**: Test A3 with real data

### 5.4 Wrapper Refactoring - A4 Baseline (Day 3)

- [ ] **Task 5.4.1**: Locate A4 baseline comparison wrapper
- [ ] **Task 5.4.2**: Integrate baseline calculation functions from Phase 3:
  - Use `calculateBaselineRoas()` from queries-appsflyer.ts
  - Use `calculateBaselineRetention()` for retention baseline
- [ ] **Task 5.4.3**: Update achievement rate calculation:
  ```typescript
  const achievementRate = (actualRoas / baselineRoas) * 100;
  ```
- [ ] **Task 5.4.4**: Add logic for campaigns without sufficient baseline data
  - Return "insufficient_data" status
  - Don't show risk level until baseline is available
- [ ] **Task 5.4.5**: Test A4 with real data

### 5.5 Wrapper Refactoring - A7 Operation Scoring (Day 3-4)

- [ ] **Task 5.5.1**: Locate A7 operation scoring wrapper
- [ ] **Task 5.5.2**: Update to query real cohort data for T+7 evaluation
  ```typescript
  // Get campaign performance at T+7 (7 days after optimizer action)
  const performanceAtT7 = await db
    .select()
    .from(afCohortMetricsDaily)
    .where(eq(afCohortMetricsDaily.campaign, campaignName))
    .where(eq(afCohortMetricsDaily.installDate, actionDate))
    .where(eq(afCohortMetricsDaily.daysSinceInstall, 7));
  ```
- [ ] **Task 5.5.3**: Update scoring logic to use real ROAS and retention
- [ ] **Task 5.5.4**: Add "data_incomplete" flag for T+7 not yet reached
- [ ] **Task 5.5.5**: Test A7 with real data

### 5.6 Type Updates (Day 4)

- [ ] **Task 5.6.1**: Update `lib/types/evaluation.types.ts` if needed
- [ ] **Task 5.6.2**: Remove references to mock_campaign_performance types
- [ ] **Task 5.6.3**: Add AppsFlyer-specific types (re-export from schema.ts)
- [ ] **Task 5.6.4**: Run type check: `just type-check`

### 5.7 Component Updates (Day 5)

- [ ] **Task 5.7.1**: Review evaluation UI components in `components/evaluation/`
- [ ] **Task 5.7.2**: Update A2/A3/A4/A7 components to handle new data structure
- [ ] **Task 5.7.3**: Add loading states for real-time data fetching
- [ ] **Task 5.7.4**: Add error boundaries for data fetch failures
- [ ] **Task 5.7.5**: Add "insufficient data" UI states

### 5.8 Mock Data Deprecation (Day 5)

- [ ] **Task 5.8.1**: Add deprecation warning to mock data generators
- [ ] **Task 5.8.2**: Update docs to indicate mock tables are deprecated
- [ ] **Task 5.8.3**: DO NOT DROP mock tables yet (keep for comparison during testing)
- [ ] **Task 5.8.4**: Git commit: `git commit -m "feat(evaluation): Replace mock data with real AppsFlyer cohort data in A2-A7"`

**Phase 5 Completion Criteria**:
- ✅ All 4 wrappers refactored to use real data
- ✅ Type safety maintained
- ✅ UI components updated
- ✅ Mock data deprecated but not dropped
- ✅ Changes committed to git

---

## Phase 6: Automation & Scheduling

**Goal**: Set up automated daily data sync
**Duration**: 3 days
**Status**: ⬜ Not Started
**Blockers**: Phase 2 must be complete

### 6.1 Cron Job Setup (Day 1)

- [ ] **Task 6.1.1**: Choose cron implementation:
  - Option A: System cron (recommended for simplicity)
  - Option B: Node.js cron library (if system cron unavailable)
- [ ] **Task 6.1.2**: Create cron script: `server/appsflyer/cron-daily-sync.sh`
  ```bash
  #!/bin/bash
  cd /path/to/MonitorSysUA
  source server/appsflyer/.venv/bin/activate
  python server/appsflyer/sync_af_data.py --yesterday
  ```
- [ ] **Task 6.1.3**: Make script executable: `chmod +x server/appsflyer/cron-daily-sync.sh`
- [ ] **Task 6.1.4**: Add to system crontab: `crontab -e`
  ```
  # Daily AppsFlyer sync at 2 AM UTC
  0 2 * * * /path/to/MonitorSysUA/server/appsflyer/cron-daily-sync.sh >> /var/log/appsflyer-sync.log 2>&1
  ```

### 6.2 Script Arguments & Logging (Day 1)

- [ ] **Task 6.2.1**: Add CLI argument parsing to sync_af_data.py
  ```python
  import argparse

  parser = argparse.ArgumentParser()
  parser.add_argument('--yesterday', action='store_true', help='Sync yesterday only')
  parser.add_argument('--from', dest='from_date', help='Start date YYYY-MM-DD')
  parser.add_argument('--to', dest='to_date', help='End date YYYY-MM-DD')
  args = parser.parse_args()
  ```
- [ ] **Task 6.2.2**: Update main() to use arguments
- [ ] **Task 6.2.3**: Add detailed logging to console and file
- [ ] **Task 6.2.4**: Test manual run: `python server/appsflyer/sync_af_data.py --yesterday`

### 6.3 Baseline Auto-Update (Day 2)

- [ ] **Task 6.3.1**: Create baseline calculation script: `server/appsflyer/update-baseline.py`
  ```python
  # Recalculate all baselines (P50 of last 180 days)
  # Store in new table: af_baseline_cache
  ```
- [ ] **Task 6.3.2**: Add af_baseline_cache table to schema.ts
  - Fields: app_id, geo, media_source, campaign, metric_type ('roas7'/'ret1'/'ret3'/'ret5'/'ret7'), baseline_value, calculated_at
  - Primary key: (app_id, geo, media_source, campaign, metric_type)
- [ ] **Task 6.3.3**: Generate and apply migration: `just db-diff add_baseline_cache`
- [ ] **Task 6.3.4**: Add monthly cron for baseline update (1st of month, 3 AM UTC)
  ```
  0 3 1 * * /path/to/MonitorSysUA/server/appsflyer/update-baseline.sh
  ```

### 6.4 Error Notification (Day 3)

- [ ] **Task 6.4.1**: Add email notification on sync failure (optional)
- [ ] **Task 6.4.2**: Add Slack webhook notification on sync failure (optional)
- [ ] **Task 6.4.3**: Test cron job failure scenario
- [ ] **Task 6.4.4**: Document cron setup in `docs/appsflyer-automation.md`

### 6.5 Monitoring & Alerts (Day 3)

- [ ] **Task 6.5.1**: Add tRPC procedure to check last sync status
  ```typescript
  getLastSyncStatus: publicProcedure.query(async () => {
    const lastSync = await appsflyerQueries.getLatestSyncLog('events');
    return {
      status: lastSync?.status,
      lastRun: lastSync?.started_at,
      recordsProcessed: lastSync?.records_processed,
    };
  })
  ```
- [ ] **Task 6.5.2**: Add UI indicator in dashboard for sync status
- [ ] **Task 6.5.3**: Add alert if last sync was >36 hours ago
- [ ] **Task 6.5.4**: Git commit: `git commit -m "feat(automation): Add daily AppsFlyer sync cron + monitoring"`

**Phase 6 Completion Criteria**:
- ✅ Daily cron job running at 2 AM UTC
- ✅ Monthly baseline update cron working
- ✅ Sync status visible in UI
- ✅ Error notifications configured
- ✅ Changes committed to git

---

## Phase 7: Testing & Validation

**Goal**: Comprehensive testing of entire AppsFlyer integration
**Duration**: 4 days
**Status**: ⬜ Not Started
**Blockers**: Phase 5 must be complete

### 7.1 Data Quality Tests (Day 1)

- [ ] **Task 7.1.1**: Create test file: `server/appsflyer/test-data-quality.ts`
- [ ] **Task 7.1.2**: Test: Verify no NULL values in critical fields
  ```sql
  SELECT COUNT(*) FROM af_events WHERE app_id IS NULL OR event_name IS NULL;
  ```
- [ ] **Task 7.1.3**: Test: Verify days_since_install is always >= 0
- [ ] **Task 7.1.4**: Test: Verify event_time >= install_time for all events
- [ ] **Task 7.1.5**: Test: Check for reasonable revenue ranges (no negative, no extreme outliers)
- [ ] **Task 7.1.6**: Test: Verify cohort KPI totals match aggregated event revenue
- [ ] **Task 7.1.7**: Run tests: `tsx server/appsflyer/test-data-quality.ts`

### 7.2 Query Function Tests (Day 1)

- [ ] **Task 7.2.1**: Test getEventsByDateRange with various date ranges
- [ ] **Task 7.2.2**: Test getRevenueByCohort for known cohort
- [ ] **Task 7.2.3**: Test getCohortKpi with all filter combinations
- [ ] **Task 7.2.4**: Test baseline calculation functions
- [ ] **Task 7.2.5**: Test edge cases: empty results, invalid dates, NULL values
- [ ] **Task 7.2.6**: Verify query performance (<1s for typical queries)

### 7.3 tRPC Procedure Tests (Day 2)

- [ ] **Task 7.3.1**: Create test file: `server/api/routers/test-appsflyer.ts`
- [ ] **Task 7.3.2**: Test all procedures with valid inputs
- [ ] **Task 7.3.3**: Test Zod validation with invalid inputs
- [ ] **Task 7.3.4**: Test error handling (database errors, missing data)
- [ ] **Task 7.3.5**: Test type safety (ensure return types match expectations)
- [ ] **Task 7.3.6**: Run: `tsx server/api/routers/test-appsflyer.ts`

### 7.4 Evaluation System Integration Tests (Day 2-3)

- [ ] **Task 7.4.1**: Test A2 ROAS calculation with real data
  - [ ] Verify ROAS = revenue / cost
  - [ ] Test multiple campaigns
  - [ ] Test edge case: zero cost (should handle gracefully)
- [ ] **Task 7.4.2**: Test A3 retention calculation
  - [ ] Verify retention rates for D1/D3/D5/D7
  - [ ] Test campaigns with partial retention data
- [ ] **Task 7.4.3**: Test A4 baseline comparison
  - [ ] Verify baseline calculation (P50 logic)
  - [ ] Test achievement rate = actual / baseline × 100
  - [ ] Test risk level mapping
- [ ] **Task 7.4.4**: Test A7 operation scoring
  - [ ] Verify T+7 evaluation logic
  - [ ] Test scoring algorithm with real data
- [ ] **Task 7.4.5**: Compare results with mock data (sanity check)
  - [ ] Run same campaign through both systems
  - [ ] Verify similar trends (not exact match expected)

### 7.5 End-to-End UI Tests (Day 3)

- [ ] **Task 7.5.1**: Test evaluation page loads with real data
- [ ] **Task 7.5.2**: Test filtering by date range
- [ ] **Task 7.5.3**: Test filtering by campaign
- [ ] **Task 7.5.4**: Test data grid sorting and pagination
- [ ] **Task 7.5.5**: Test loading states during data fetch
- [ ] **Task 7.5.6**: Test error states (network failure, no data)

### 7.6 Performance & Load Tests (Day 4)

- [ ] **Task 7.6.1**: Test query performance with 180 days of data
- [ ] **Task 7.6.2**: Test tRPC procedure latency (should be <2s)
- [ ] **Task 7.6.3**: Test UI responsiveness with large datasets
- [ ] **Task 7.6.4**: Test database index usage (EXPLAIN ANALYZE queries)
- [ ] **Task 7.6.5**: Optimize slow queries if needed (add indexes, refactor)

### 7.7 Documentation Tests (Day 4)

- [ ] **Task 7.7.1**: Verify all Just commands work as documented
- [ ] **Task 7.7.2**: Test installation instructions (fresh setup)
- [ ] **Task 7.7.3**: Verify environment variable setup
- [ ] **Task 7.7.4**: Test backup and restore procedures
- [ ] **Task 7.7.5**: Git commit: `git commit -m "test: Add comprehensive test suite for AppsFlyer integration"`

**Phase 7 Completion Criteria**:
- ✅ All data quality tests passing
- ✅ All query function tests passing
- ✅ All tRPC procedure tests passing
- ✅ Evaluation system working with real data
- ✅ UI tests passing
- ✅ Performance acceptable (<2s response times)
- ✅ Changes committed to git

---

## Phase 8: Documentation & Cleanup

**Goal**: Complete documentation and remove deprecated code
**Duration**: 2 days
**Status**: ⬜ Not Started
**Blockers**: Phase 7 must be complete

### 8.1 User Documentation (Day 1)

- [ ] **Task 8.1.1**: Create `docs/appsflyer-integration.md`
  - [ ] Overview of AppsFlyer data pipeline
  - [ ] Architecture diagram (Python ETL → PostgreSQL → Drizzle → tRPC → React)
  - [ ] Data flow explanation
- [ ] **Task 8.1.2**: Document manual sync commands
  - [ ] `just af-sync-yesterday`
  - [ ] `just af-sync-range FROM TO`
  - [ ] `just af-backfill`
- [ ] **Task 8.1.3**: Document automated sync setup
  - [ ] Cron job configuration
  - [ ] Log file locations
  - [ ] Troubleshooting common issues
- [ ] **Task 8.1.4**: Document baseline calculation logic
  - [ ] P50 methodology
  - [ ] 180-day window rationale
  - [ ] Monthly update schedule

### 8.2 Developer Documentation (Day 1)

- [ ] **Task 8.2.1**: Update `context/trd.md` with AppsFlyer architecture
- [ ] **Task 8.2.2**: Document database schema changes
  - [ ] 3 new tables (af_events, af_cohort_kpi_daily, af_sync_log)
  - [ ] 2 new views (af_revenue_cohort_daily, af_cohort_metrics_daily)
  - [ ] 1 new table for baseline cache
- [ ] **Task 8.2.3**: Document query functions in `server/db/queries-appsflyer.ts`
  - [ ] Add JSDoc comments for all exported functions
  - [ ] Include usage examples
- [ ] **Task 8.2.4**: Document tRPC procedures in `server/api/routers/appsflyer.ts`
  - [ ] Add JSDoc comments
  - [ ] Document input/output schemas

### 8.3 API Documentation (Day 1)

- [ ] **Task 8.3.1**: Create `docs/appsflyer-api.md`
- [ ] **Task 8.3.2**: Document all 8+ tRPC procedures
  - [ ] Input parameters (Zod schemas)
  - [ ] Output types
  - [ ] Usage examples
  - [ ] Error cases
- [ ] **Task 8.3.3**: Add curl examples for REST API (if applicable)

### 8.4 Migration Guide (Day 2)

- [ ] **Task 8.4.1**: Create `docs/migration-mock-to-real.md`
- [ ] **Task 8.4.2**: Document breaking changes from mock to real data
- [ ] **Task 8.4.3**: Provide comparison tables (mock fields → real fields)
- [ ] **Task 8.4.4**: Add troubleshooting section for common migration issues

### 8.5 Mock Data Cleanup (Day 2)

- [ ] **Task 8.5.1**: WAIT for user approval before dropping tables
- [ ] **Task 8.5.2**: Create backup of mock data (just in case)
  ```sql
  CREATE TABLE mock_campaign_performance_backup AS
  SELECT * FROM mock_campaign_performance;
  ```
- [ ] **Task 8.5.3**: Drop mock_campaign_performance table (after approval)
- [ ] **Task 8.5.4**: Remove mock data generator scripts
- [ ] **Task 8.5.5**: Remove unused imports in evaluation wrappers
- [ ] **Task 8.5.6**: Generate migration: `just db-diff remove_mock_tables`

### 8.6 Code Cleanup (Day 2)

- [ ] **Task 8.6.1**: Remove TODO comments related to mock data
- [ ] **Task 8.6.2**: Remove console.log debugging statements
- [ ] **Task 8.6.3**: Format all new files: `just format`
- [ ] **Task 8.6.4**: Run linter: `just lint`
- [ ] **Task 8.6.5**: Fix any linting issues
- [ ] **Task 8.6.6**: Run type check: `just type-check`

### 8.7 Final Validation (Day 2)

- [ ] **Task 8.7.1**: Run full build: `just build`
- [ ] **Task 8.7.2**: Test production build locally: `just start`
- [ ] **Task 8.7.3**: Verify all evaluation pages work in production
- [ ] **Task 8.7.4**: Check browser console for errors
- [ ] **Task 8.7.5**: Run pre-commit checks: `just check`

### 8.8 Git & Release (Day 2)

- [ ] **Task 8.8.1**: Review all commits from Phases 1-8
- [ ] **Task 8.8.2**: Squash commits if needed (keep logical grouping)
- [ ] **Task 8.8.3**: Create release notes in `docs/release-notes-appsflyer.md`
  - [ ] New features (AppsFlyer integration)
  - [ ] Breaking changes (mock data removed)
  - [ ] Migration guide reference
  - [ ] Known issues (if any)
- [ ] **Task 8.8.4**: Tag release: `git tag v1.1.0-appsflyer`
- [ ] **Task 8.8.5**: Push to remote: `git push origin main --tags`
- [ ] **Task 8.8.6**: Update this TODO file status to COMPLETE

**Phase 8 Completion Criteria**:
- ✅ All documentation complete
- ✅ Mock data removed (with backups)
- ✅ Code cleaned and formatted
- ✅ Production build successful
- ✅ Release tagged and pushed
- ✅ Project ready for production use

---

## 🎯 Project Completion Checklist

### Pre-Launch Verification

- [ ] All 182 tasks completed
- [ ] All 8 phases marked as complete
- [ ] Production build passing
- [ ] All tests passing
- [ ] Documentation complete
- [ ] User acceptance testing done
- [ ] Performance benchmarks met

### Deployment Readiness

- [ ] Environment variables configured in production
- [ ] Database migrations applied in production
- [ ] Cron jobs configured on production server
- [ ] Monitoring and alerts set up
- [ ] Backup strategy in place
- [ ] Rollback plan documented

### Post-Launch Monitoring

- [ ] Monitor first daily sync (2 AM UTC)
- [ ] Verify evaluation pages with real data
- [ ] Check for errors in logs
- [ ] User feedback collection
- [ ] Performance monitoring (first week)

---

## 📝 Notes & Decisions

### Key Architectural Decisions

1. **Table Naming**: Kept `af_` prefix for AppsFlyer tables (approved)
2. **Sync Strategy**: Both manual + automated (approved)
3. **Baseline Window**: 180 days (approved)
4. **Mock Data**: Deprecated immediately, dropped after validation (approved)

### Risk Mitigation

1. **Data Loss**: Backup mock data before dropping tables
2. **API Rate Limits**: Implemented retry logic with exponential backoff
3. **Data Quality**: Comprehensive validation queries in Phase 7
4. **Performance**: Indexed all frequently queried columns

### Known Limitations

1. AppsFlyer API rate limits (handled with chunked backfill)
2. Retention data not available until D1/D3/D5/D7 after install
3. Baseline requires 180 days of historical data (initial period may show "insufficient data")

---

## 🔗 Reference Links

- [PRD for Schema & API](./prd_for_schema_and_api.md)
- [Source Schema & ETL](./src.md)
- [Python ETL Script](./sync_af_data.py)
- [Project CLAUDE.md](../CLAUDE.md)
- [Technical Reference](../context/trd.md)

---

**Last Updated**: 2025-01-25
**Total Tasks**: 182
**Estimated Completion**: ~4 weeks from start
**Current Phase**: Phase 1 - Database Foundation
