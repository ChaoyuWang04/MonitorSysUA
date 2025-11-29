# Evaluation Module (A2-A5)

## Scope
- Score campaigns, creatives, and operations against baselines, and suggest actions.
- Python engines run calculations; TypeScript wrappers expose them via tRPC; results persist for UI.

## A2: Safety Baseline
- Computes baseline ROAS/RET by product, country, platform, channel.
- Batch updater intended monthly; no dedicated UI yet (trigger via API/CLI).
- Status: functions and storage ready; needs scheduling + UI surfacing.

## A3: Campaign Evaluation
- Evaluates campaigns vs. baselines, assigns status, and suggests actions.
- UI: paginated list with filters, progress bars, and detail dialog for recommendations.
- Status: live with DB-backed history; batch run available but not scheduled.

## A4: Creative Evaluation
- D3/D7 evaluations with thresholds, status badges, and recommendations.
- UI: list view with filters; detail dialogs show metrics and actions; creative status updates supported.
- Status: wired to data tables; assumes upstream data already populated.

## A5: Operation Scoring
- Scores optimizer actions (decision quality, execution, risk) and builds leaderboard.
- UI: tabbed list + leaderboard; detail dialog per day per optimizer.
- Status: UI and storage ready; daily auto-run not yet scheduled; action execution is still mocked in frontend service.
