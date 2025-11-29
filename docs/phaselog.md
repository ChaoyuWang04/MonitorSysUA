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
- Phase 6: Refactor A4 creative evaluation to use AppsFlyer data
- Add scheduler for automated baseline/evaluation runs
- Extend `change_events` schema with AppsFlyer dimensions
