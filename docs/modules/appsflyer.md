# AppsFlyer Module

## Scope
- Pull AppsFlyer events and cohort KPIs, normalize revenue, and store sync history.
- Provide baselines for evaluation engines and future reporting.
- **Phase 6**: Automated sync via Docker container with cron scheduler.

## Capabilities
- Python ETL scripts for sync (`sync_af_data.py`), backfill (`backfill.py`), and baseline refresh (`monthly_baseline_update.py`); token-based API access.
- Writes `af_events`, `af_cohort_kpi_daily`, and `af_sync_log` with per-run status.
- Baseline helpers compute ROAS/retention medians for downstream use.
- **Email notifications** on sync failures via SMTP (optional, configure `SMTP_*` env vars).

## Docker Container
- **appsflyer-etl**: Standalone Python 3.11 container with cron daemon.
- **Cron Schedule**:
  - Daily sync: `0 2 * * *` (2:00 AM UTC) - yesterday's data
  - Baseline update: `0 3 1 * *` (3:00 AM UTC, 1st of month) - 180-day refresh
- **Start**: `just af-docker-up`
- **Stop**: `just af-docker-down`
- **Logs**: `just af-docker-logs` or `just af-docker-sync-logs`
- **Manual sync**: `just af-docker-sync-yesterday` or `just af-docker-sync-range 2025-01-01 2025-01-07`

## Flow
- **Automated**: Cron triggers → Python ETL → fetch/export → normalize currency → upsert tables → log sync run → email on failure.
- **Manual**: Just recipes or tRPC `triggerManualSync` → spawn Python subprocess → same flow as above.
- Dashboard shows sync status via `SyncStatusCard` component; 36-hour stale warning.

## Testing (Phase 7)

### Test Files
| File | Tests | Purpose |
|------|-------|---------|
| `server/appsflyer/test-data-quality.ts` | 14 | Data integrity validation |
| `server/db/test-queries-appsflyer.ts` | 17 | Query function testing |
| `server/api/routers/test-appsflyer.ts` | 25 | tRPC procedure testing |
| `server/appsflyer/test-performance.ts` | 8 | Performance benchmarks |

### Running Tests
```bash
# Data quality
npx tsx server/appsflyer/test-data-quality.ts

# Query functions
npx tsx server/db/test-queries-appsflyer.ts

# tRPC procedures
npx tsx server/api/routers/test-appsflyer.ts

# Performance benchmarks
npx tsx server/appsflyer/test-performance.ts
```

### Performance Benchmarks
- `getEventsByDateRange` (180 days): 64ms
- `getCohortKpi` (full scan): 45ms
- `calculateBaselineRoas`: 89ms
- All queries under 200ms (well below 2s threshold)

## Status
- **Phase 7 Complete**: Comprehensive testing with 78 automated tests across 5 files.
- **Phase 6 Complete**: Docker-based automation with cron, email notifications, and UI sync status.
- ETL scripts and storage fully operational.
- tRPC router: `appsflyer.getSyncStatus`, `appsflyer.triggerManualSync`.
- UI component: `components/appsflyer/sync-status-card.tsx` on Dashboard page.
- Review document: `docs/reviews/phase7-testing-review.md`
