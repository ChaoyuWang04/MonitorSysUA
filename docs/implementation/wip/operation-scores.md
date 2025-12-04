# Operation Scores Implementation (Current)

Scope: summarizes the existing Operation Scores page, data model, scoring algorithm, and API/backend flow (code paths only, no PRD).

## Frontend (app/(dashboard)/evaluation/operations/page.tsx)
- Data source: `trpc.evaluation.getOperationScores` (required `accountId`, optional `optimizerEmail`, `campaignId`), server-mode pagination but slicing happens backend-side.
- Tabs: default “Operation Scores” table; “Optimizer Leaderboard” uses `OptimizerLeaderboard` component.
- Table columns: stage scores `t1Score/t3Score/t7Score` (finalScore per stage), optimizer info, `totalScore` (fallback finalScore/baseScore), category scores (decision/execution/risk reuse same values when breakdown absent), actionsExecuted, status chip from `riskLevel/status`. Excellent rows highlighted. Empty state triggers refetch.
- Filters: only optimizer text field is rendered; campaign filter state exists but no UI control.
- Recalc: “Recalculate scores” → `trpc.evaluation.recalculateOperationScores` with `accountId`, on success refetches list.
- Row click: opens `OperationScoreDialog` with the selected `OperationScore` object.

## Detail Dialog (components/evaluation/operation-score-dialog.tsx)
- Score display: `totalScore || finalScore || baseScore`; stage chips iterate `['T+1','T+3','T+7']` from `operation.stages` (color via `riskLevel`).
- Breakdown bars: Decision/Execution/Risk reuse total/base when specific fields missing. Action summary shows executed/success/fail/avgResponseTime; shows “Excellent Performance” card when `successRate ≥95%` and `totalScore ≥90`.

## Types & derived fields (lib/types/evaluation.ts + getOperationScores)
- `OperationScore` supports per-stage map `stages[stage]` with `finalScore/baseScore/minAchievement/riskLevel/evaluationDate`. Convenience fields `t1Score/t3Score/t7Score` and statuses mirror stage data.
- Backend grouping picks anchor stage in order `T+7 → T+3 → T+1` for overall `finalScore/baseScore/status/evaluationDate` when assembling list rows.

## tRPC endpoints (server/api/routers/evaluation.ts)
- `getOperationScores` → `db/queries-evaluation.getOperationScores` (pagination + filters by account/optimizer/campaign).
- `recalculateOperationScores` → `evaluateAllOperationsFromAF` (batch over change_events, optional account filter; recalculates all requested stages).
- `evaluateOperation`/`evaluateOperationFromAF` (single operation) exposed for manual use.
- `getOptimizerLeaderboard` currently calls deprecated Python path (see Backend) rather than DB aggregation; no account scoping.

## Backend scoring flow (server/evaluation/wrappers/operation-evaluator.ts)
- Context resolution: load `change_events` by id, derive `campaignId` (campaign/resourceName) and campaignName (from campaigns table). Tries AppsFlyer context via `af_cohort_kpi_daily` for the campaign or name; fallback env `AF_APP_ID`, `AF_DEFAULT_GEO`, `AF_DEFAULT_MEDIA_SOURCE`. Missing context throws.
- Baseline config: `getOrCreateBaselineSettings` ensures `baseline_settings` row (default `baselineDays=180`, `minSampleSize=30`).
- Stage config: stages `['T+1','T+3','T+7']`; stageDays map {1,3,7}; stageFactor map {0.5,0.8,1}.
- Metrics: `getOperationCohortMetrics` (via `getAggregatedCampaignMetrics`) aggregates AppsFlyer cohort data for installs within operationDate→+6d and up to `daysSinceInstall` revenue/retention. If today is before last cohort maturity or cohortCount=0, returns null → stage marked `pending`.
- Baseline lookup: `getBaselineMetrics` with four-level fallback (app+geo+mediaSource → app+geo → app+mediaSource → app), returns ROAS/retention baselines for the stageDays window.
- Achievement calc: `roasAchievement = actualRoas7 / baselineRoas`, `retentionAchievement = actualRet7 / baselineRet`; `minAchievement = min(non-null)`. BaseScore mapping: `<0.6→0`, `<0.85→40`, `<1.0→60`, `<1.1→80`, else `100`. FinalScore = `baseScore * stageFactor`. Risk levels mirror thresholds (danger/warning/observe/healthy/excellent). `suggestionType`: danger→stop, warning→shrink, observe→observe, healthy/excellent→expand.
- Operation magnitude: parses `change_events.field_changes` numeric old/new to compute `changePercentage`; classifies 微调(≤5%), 常规调整(≤20%), 大胆操作(>20%). Sets `isBoldSuccess` and `specialRecognition` for high-score bold/precise changes.
- Persistence per stage: builds `NewOperationScore` payload (stringified numerics, includes legacy D7 fields) and `createOperationScore` upsert keyed by (operationId, scoreStage). Evaluation date = operationDate + stageDays. `dataStatus` marked `complete` when baseScore exists, else `missing`/`pending` (pending used when cohort missing due to maturity).
- change_events snapshot: updates `change_events.operation_scores` JSON with stage summaries after evaluation.

## List assembly (server/db/queries-evaluation.getOperationScores)
- **Primary table `change_events`**: filters by `accountId` (mandatory), optional optimizer (matches `change_events.userEmail`) and campaign (`change_events.campaign`). Pulls paginated change events first, then fetches any `operation_score` rows for those operationIds (in-array query) so every change event surfaces even if no score exists.
- Groups rows per operationId, builds `stages` map from matched `operation_score` rows. Convenience fields (`t1Score` etc.) and anchor stage selection `T+7→T+3→T+1` still apply; if no scores, anchor remains null and dates fall back to operation timestamp.

## Batch recalc (evaluateAllOperationsFromAF)
- Iterates all `change_events` (optionally limited by `accountId`), runs `evaluateOperationFromAF` for requested stages, and returns counts of complete/pending/missing; does not skip immature operations (pending returned until data available).

## Leaderboard
- UI calls `trpc.evaluation.getOptimizerLeaderboard` which delegates to deprecated Python `server/evaluation/python/operation_evaluator.py` (mock-era logic, no account filter). TypeScript DB aggregation helper `getOptimizerLeaderboardFromDb` exists but is not wired in tRPC.

## Notable gaps/risks
- Campaign filter UI missing despite state; leaderboard not account-scoped and uses deprecated path; list pagination is client slice after full fetch; stages may remain pending when AF cohorts lack maturity/data.
