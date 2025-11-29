# MonitorSysUA - Product Requirements Document

## Overview
MonitorSysUA monitors multi-account Google Ads change events, syncs AppsFlyer cohort data, and runs automated evaluations with actionable recommendations (mock execution in UI).

## Core Features

### 1. Multi-Account Google Ads
- MCC-based; account CRUD with 10-digit validation, per-account isolation, `lastSyncedAt` tracking.

### 2. Change Event Monitoring
- Google Ads ChangeEvent ingestion with field-level diffs; bilingual summaries; filters/search/pagination; manual sync per account.

### 3. Evaluation System (A2-A7)
- A2 Safety Baseline: ROAS7/RET7 medians by product/country/platform/channel.
- A3 Campaign Evaluation: achievement/status + recommendations.
- A4 Creative Evaluation: D3/D7 thresholds, sync-to-campaign action.
- A5 Operation Scoring: 7-day post-change scoring, optimizer leaderboard (A6).
- A7 UI integration with action recommendation/execution (currently mock service).

### 4. AppsFlyer Integration
- ETL (Python) for IAP/ad-revenue events and cohort KPIs; baseline helpers for ROAS/retention; sync logs exposed via tRPC.

## Development Phases

| Phase | Status | Description |
|-------|--------|-------------|
| Phase 1 | Complete | Core infrastructure, database, tRPC API |
| Phase 2 | Complete | Google Ads integration, multi-account support |
| Phase 3 | Complete | AppsFlyer data pipeline + tRPC router |
| Phase 4 | Complete | Evaluation system (A2-A7) + dashboard UI |
| Phase 5 | Planned | Performance optimization, live execution, analytics |

## User Workflows

### Optimizer Workflow
1. Select account → view change events.
2. Open campaign evaluation → review status/recommendations.
3. Execute recommended actions (mock) or mark observe/pause.
4. Track operation scores and leaderboard after 7 days.

### Manager Workflow
1. Review account-level stats.
2. Scan leaderboard and operation results.
3. Identify underperforming campaigns/creatives to act on.

## Key Metrics
- **ROAS7**: 7-day return on ad spend
- **RET7**: 7-day retention rate
- **Achievement Rate**: (actual / baseline) * 100%
- **CPI**: Cost per install
- **CVR**: Conversion rate
