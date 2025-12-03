# Operation Scoring Integration Progress (2026-02-05)

## Context
- Goal: Implement PRD v3 campaign-level operation scoring (T+1/T+3/T+7) tying Google ChangeEvents to AppsFlyer cohort metrics and baseline.
- Primary storage: `operation_score` (FK `change_events.id`); `change_events.operation_scores` JSON mirrors latest stage results.

## Changes Completed
- **Schema**
  - `change_events`: add `operation_scores` JSONB for stage summaries.
  - `operation_score`: add stage fields (`score_stage`, `stage_factor`), metrics (`actual_roas/ret`, baselines), achievements (`roas/retention/min`), risk_level, base/final score, magnitude/labels, value_before/after, change_percentage, recognition/suggestion fields; unique index (`operation_id`, `score_stage`). Kept legacy D7 columns for compatibility.
  - Migration: `atlas/migrations/20260205000001_operation-score-prdv3.sql` applied to current DB.

- **Backend logic**
  - `operation-evaluator.ts`:
    - Resolve AppsFlyer context from change_events.campaign (resource_name) and campaigns.name → fallback to `AF_APP_ID/AF_DEFAULT_GEO/AF_DEFAULT_MEDIA_SOURCE`.
    - Per-stage eval (T+1/T+3/T+7): cohort window T0–T6, require maturity to stage day; baselines via PRD 6.2.5 `baseline_metrics` (weighted ROAS/RET with four-level fallback, no P50).
    - Scoring: min_achievement → base score (0/40/60/80/100), stage factors 0.5/0.8/1.0, risk levels danger/warning/observe/healthy/excellent, suggestions mapped from risk. Magnitude classification 微调/常规调整/大胆操作; special recognition badges.
    - Persist each stage to `operation_score` (UPSERT on op+stage) and mirror summaries into `change_events.operation_scores`.
    - Batch `evaluateOperations7DaysAgoFromAF` now executes real stage eval (default T+7).
  - `queries-appsflyer.ts`: baseline ROAS supports arbitrary `daysSinceInstall`; aggregated campaign metrics use `af_cohort_metrics_daily` (cost/install/revenue/retention) with configurable stage day.
  - `queries-evaluation.ts`: operation scores filterable by stage; normalized totalScore/riskLevel in responses; cohort metrics return stageDays.
  - tRPC `evaluation` router: `evaluateOperation` → AppsFlyer stage evaluator (stages optional), `getOperationScores` accepts stage, batch uses new function.
  - Types & UI utils: OperationStatus expanded to five risk levels; labels/colors/icons updated.

- **Frontend**
  - Operation Scores page and detail dialog accept new fields (final/base score, riskLevel) and fallback when stage-specific scores are present.

- **Docs**
  - Updated: `docs/system/database.md`, `docs/modules/change-events.md`, `docs/modules/evaluation.md`, `docs/system/backend.md`, `docs/system/api.md` to reflect stage scoring, new fields, and data linkage.

- **Validation & DB ops**
  - Commands run: `just db-status` (pre/post), `just db-diff "operation-score-prdv3"`, `just db-apply`, `just type-check` (pass).
  - Migration applied to production DB (per data_migration_principle): current version `20260205000001`.

## Current Behavior
- `evaluateOperationFromAF({ operationId, stages? })` computes requested stages (default T+1/T+3/T+7) and writes to `operation_score` + `change_events.operation_scores`.
- `evaluateOperations7DaysAgoFromAF()` batches by operation timestamp, stage T+7.
- Baseline pull uses AppsFlyer data with configurable window; stage day aligns with target (1/3/7).

## Next Steps (Recommendations)
1) Run a few real change_event IDs through `evaluateOperationFromAF` and verify UI `/evaluation/operations` shows finalScore/risk levels; capture screenshots if needed.
2) Backfill historical operations: decide target date window, run batch, spot-check written `operation_score` rows and `change_events.operation_scores` JSON.
3) If available, populate `field_changes.change_percentage` or explicit before/after values for better magnitude tagging.
4) Consider adding app/geo/media_source columns directly to `change_events` to avoid fallback heuristics and improve batch accuracy.
5) (Optional) Add stage selection/filter on frontend if multi-stage display is desired.

## Notes / Open Items
- Repository still has existing unrelated untracked/modified files (e.g., `app/(dashboard)/layout.tsx`, multiple docs/api deletions, justfile edits, etc.). They were left untouched.
- `operation_score` keeps legacy D7 columns for compatibility; new logic writes both stage and legacy fields.
