# Operation Scoring & Baseline Update Log (2025-12-03)

## Summary
- Switched baseline to PRD 6.2.5 weighted model (cost-weighted ROAS, install-weighted RET) with four-level fallback (app+geo+media_source → app+geo → app+media_source → app), stored in new `baseline_metrics` table.
- Operation scoring now reads `baseline_metrics`; parses `field_changes` for before/after/change% (missing values drop weight instead of using 0); always persists stage rows.
- Added async scoring trigger on `change_events` insert and frontend “Recalculate scores” button; Operation Scores table shows T+1/T+3/T+7 columns.
- Backfilled all change_events (target app/geo/media_source only): complete 58, pending 172, missing 154 (mostly stage not matured or non-target context). `baseline_metrics` populated for solitaire+US+googleadwords_int (window 2025-10-30→2025-11-29, ROAS_D7≈0.0016, RET_D7≈0.1266).

## Commands Run
- `just db-snapshot`
- `just db-diff "baseline-metrics-table"` → `atlas/migrations/20260205000002_baseline-metrics-table.sql`
- `just db-apply`
- `npx tsx -e "import('./server/evaluation/wrappers/operation-evaluator').then(async m => { const res = await m.evaluateAllOperationsFromAF({ stages: ['T+1','T+3','T+7'] }); console.log(JSON.stringify(res, null, 2)); })"`
- `just type-check`

## Affected Areas
- Backend: `baseline_metrics` schema + queries, baseline-calculator, operation-evaluator, queries-evaluation, change_events insert trigger.
- Frontend: Operation Scores page (stage columns, recalc button), operation score dialog (stage chips).
- Docs: baseline method updated to weighted (no P50) across system/backend/database/trd/evaluation modules and PRD v3 references.

## Follow-ups
- Pending/missing stages require more cohort data or wider windows; consider batch rerun once data matures.
- If multi-app/geo/media_source needed, extend baseline_metrics population job and UI for overrides.
