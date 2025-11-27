# MonitorSysUA - Product Requirements Document

## Overview
MonitorSysUA is a Google Ads monitoring and campaign evaluation platform. It tracks change events from Google Ads accounts and provides automated performance evaluation with actionable recommendations.

## Core Features

### 1. Multi-Account Management
- Support multiple Google Ads accounts via MCC
- Account CRUD with customer ID validation
- Per-account data isolation
- Sync status tracking

### 2. Change Event Monitoring
- Real-time Google Ads change event tracking
- Event parsing with field-level change detection
- Bilingual summaries (English + Chinese)
- User email tracking for accountability
- Filterable event list with pagination

### 3. Campaign Evaluation System (A2-A7)
| Phase | Feature | Description |
|-------|---------|-------------|
| A2 | Safety Baseline | 180-day ROAS7/RET7 baseline calculation |
| A3 | Campaign Evaluation | Achievement rate vs baseline with status |
| A4 | Creative Evaluation | D3/D7 performance for test campaigns |
| A5 | Operation Scoring | Optimizer action effectiveness tracking |
| A6 | Leaderboard | Optimizer performance ranking |
| A7 | UI Integration | All evaluation views in dashboard |

### 4. AppsFlyer Integration
- IAP + Ad Revenue event ingestion
- Cohort KPI aggregation (D0-D7 retention)
- Daily sync pipeline

## Development Phases

| Phase | Status | Description |
|-------|--------|-------------|
| Phase 1 | Complete | Core infrastructure, database, tRPC API |
| Phase 2 | Complete | Google Ads integration, multi-account support |
| Phase 3 | Complete | AppsFlyer data pipeline (12 query functions) |
| Phase 4 | Complete | Evaluation system (A2-A7) + UI pages |
| Phase 5 | Planned | Performance optimization, advanced analytics |

## User Workflows

### Optimizer Workflow
1. View change events for account
2. Check campaign evaluation status
3. Review recommendations (scale up/down/shutdown)
4. Execute actions
5. Track operation scores after 7 days

### Manager Workflow
1. Monitor multi-account overview stats
2. Review optimizer leaderboard
3. Identify underperforming campaigns
4. Track creative test results

## Key Metrics
- **ROAS7**: 7-day return on ad spend
- **RET7**: 7-day retention rate
- **Achievement Rate**: (actual / baseline) * 100%
- **CPI**: Cost per install
- **CVR**: Conversion rate
