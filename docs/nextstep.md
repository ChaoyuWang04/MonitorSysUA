# Next Steps Toward PRD v3 Coverage

Context: Primary scope from `docs/implementation/finished/prd_v3.md` (MVP v3, 2025-11-24). Current-state references: `docs/system/frontend.md`, `docs/system/backend.md`, `docs/system/database.md`, `docs/system/api.md`, `docs/modules/*`, logs (`docs/logs/operation-scoring-20260205.md`, `docs/logs/phaselog.md`). Goal: close the gaps between shipped features and PRD v3; testing is out of scope.

## Gap Summary (What’s Missing)
- Cohort analysis API/UI: PRD calls for `/api/cohort` and cohort views (e.g., `campaign_metrics_daily`, `cohort_performance`) with visualizations; current system only has internal views (`af_cohort_metrics_daily`) and no dedicated endpoints or pages.
- Safety line persistence/management: PRD defines `baseline_metrics` with multi-level lookup (app+geo+media_source → fallbacks); current implementation only has `baseline_settings` + on-demand P50 calc, no stored baseline metrics, no downgrade logic, no UI.
- Suggestion engine service: PRD requires `/api/suggestions` with five-level risk actions (expand/shrink/stop/observe) decoupled from evaluations; current recommendations live inside A3/A7 responses only, no standalone engine or UI surface.
- Reports & alerts: PRD specifies daily/weekly/monthly reports and real-time alerts; current system only emails ETL failures, no report generation or delivery.
- Automation of evaluations: PRD daily flow expects post-sync cohort refresh + T+1/T+3/T+7 scoring; current A2/A3/A7 batch functions exist but are manual (no scheduler/cron hooks).
- AppsFlyer/Cohort visualization: PRD expects cohort KPI surfaces (D0/D1/D3/D5/D7 ROAS/RET/ARPU); UI lacks dedicated AppsFlyer/cohort pages.

## Recommended Sequenced Next Steps

1) Cohort API & storage
- Add tables/views per PRD (`campaign_metrics_daily`, `cohort_performance` if needed) backed by existing `af_cohort_metrics_daily` sources.
- Implement tRPC router `/cohort` with queries: list by cohort_date + campaign_id; aggregated KPIs (D0/D1/D3/D5/D7 revenue/ROAS/RET/ARPU, payers); completion flags.
- Expose UI page under `/evaluation/cohorts` (or similar) with filters (campaign, date range, geo, media_source) and charts.

2) Safety line persistence & lookup
- Create `baseline_metrics` table with Level 1–4 dimensions (app+geo+media_source → app) and monthly `next_update_date`.
- Implement baseline calculation job writing to `baseline_metrics`; add downgrade lookup logic in backend helpers.
- Add management UI (view, manual override, refresh trigger); wire A2/A7 to consume persisted baselines first.

3) Suggestion engine service
- Extract recommendation logic into `/api/suggestions` (tRPC) using five-level risk table; accept campaign metrics + baselines and return structured actions.
- Add frontend module to surface system-generated suggestions (campaign list + per-item actions), reuse existing action cards where possible.

4) Reporting & alerts
- Implement report generator (daily/weekly/monthly) for campaign status, operation scores, special recognitions; output Markdown/HTML.
- Delivery channel: start with email (reuse SMTP notifier), later add webhook/Slack if needed.
- Real-time alerts: hook risk evaluation to enqueue critical alerts (danger campaigns).

5) Evaluation automation
- Add scheduler/cron (Node or existing Docker cron) to: (a) post-AF sync aggregation refresh, (b) evaluate operations T+1/T+3/T+7, (c) campaign evaluations batch.
- Provide manual admin endpoints/Just recipes to re-run the same jobs.

6) AppsFlyer/Cohort UI surfacing
- Build dashboard widgets for AF sync health and recent cohort KPIs.
- Add dedicated pages for cohort trends (D0–D7 ROAS/RET/ARPU) with filters and data completeness flags.

## Dependencies & Notes
- Reuse existing AF data sources: `af_events`, `af_cohort_kpi_daily`, `af_cohort_metrics_daily` view.
- Keep AppsFlyer defaults (app_id/media_source/geo) aligned with PRD MVP scope (single app, googleadwords_int, US).
- Operation scoring already supports stages and writes to `operation_score` + `change_events.operation_scores`; automation and baseline persistence will improve accuracy.
