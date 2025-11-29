# AppsFlyer Module

## Scope
- Pull AppsFlyer events和cohort KPI，标准化收入并记录同步历史。
- 为评估引擎提供基线（ROAS/Retention）和后续报表能力。
- 自动化同步（Docker+cron），支持手动触发。

## 集成架构
```
AppsFlyer REST → Python ETL (sync_af_data.py) → PostgreSQL
                                   │
                               Drizzle ORM
                                   │
                          tRPC Router (appsflyer.ts)
                                   │
                                 React UI
```

| 层 | 技术 | 位置 |
| --- | --- | --- |
| Data Source | AppsFlyer REST | 外部 |
| ETL | Python 3.11 + pandas | `server/appsflyer/` |
| DB | PostgreSQL 16 (Docker 5433) | `af_events` / `af_cohort_kpi_daily` / `af_sync_log` + 视图 |
| ORM | Drizzle | `server/db/` |
| API | tRPC | `server/api/routers/appsflyer.ts`（OpenAPI: `docs/api/internal/appsflyer/appsflyer-trpc.yaml`） |
| UI | React + MUI | `components/appsflyer/`（如 SyncStatusCard） |

## 数据流
- **自动每日同步**：02:00 UTC cron → `sync_af_data.py --yesterday` → 拉 IAP + Ad Revenue raw data & Cohort KPI，规范化后 upsert 表。
- **每月基线刷新**：03:00 UTC 每月1号 → `monthly_baseline_update.py` → 刷新近 180 天 cohort KPI/留存。
- **手动触发**：`just af-sync-yesterday` / `just af-docker-sync-range <from> <to>` / tRPC `appsflyer.triggerManualSync`（后台 Python 子进程，返回 syncLogId）。
- **日志**：`af_sync_log` 记录 status、时间段、记录数、错误信息。

## 能力清单
- ETL 脚本：同步、回填（`backfill.py`）、基线刷新；token 认证。
- 存储：`af_events`（事件明细）、`af_cohort_kpi_daily`（安装/成本/留存）、`af_sync_log`（审计）。
- 基线：计算 ROAS/Retention 中位数，供 A2/A3/A7 使用。
- 通知：可配置 SMTP（`SMTP_*`）在同步失败时邮件告警。

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
- API 入口：tRPC `/api/trpc/appsflyer.*`，OpenAPI 规范见 `docs/api/internal/appsflyer/appsflyer-trpc.yaml`。

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
