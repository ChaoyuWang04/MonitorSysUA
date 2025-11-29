# AppsFlyer Integration Guide

> Complete guide for the AppsFlyer cohort data pipeline integration in MonitorSysUA.

## Overview

The AppsFlyer integration provides a production-ready data pipeline that:

1. **Pulls data** from AppsFlyer APIs (IAP events, Ad Revenue events, Cohort KPIs)
2. **Normalizes** revenue to USD and standardizes field names
3. **Stores** in PostgreSQL with idempotent upserts
4. **Exposes** via type-safe tRPC endpoints
5. **Automates** daily syncs via Docker container with cron scheduler

This data powers the evaluation system (A2 Baseline, A3 Campaign, A7 Operation) with real cohort metrics instead of mock data.

---

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   AppsFlyer     │────▶│   Python ETL     │────▶│   PostgreSQL    │
│   REST APIs     │     │ (sync_af_data.py)│     │    (Docker)     │
└─────────────────┘     └──────────────────┘     └────────┬────────┘
                                                          │
                        ┌──────────────────┐              │
                        │   Drizzle ORM    │◀─────────────┘
                        │  (queries-*.ts)  │
                        └────────┬─────────┘
                                 │
                        ┌────────▼─────────┐
                        │   tRPC Router    │
                        │ (appsflyer.ts)   │
                        └────────┬─────────┘
                                 │
                        ┌────────▼─────────┐
                        │    React UI      │
                        │  (Dashboard, etc)│
                        └──────────────────┘
```

### Component Stack

| Layer | Technology | Location |
|-------|------------|----------|
| **Data Source** | AppsFlyer REST API | External |
| **ETL** | Python 3.11 + pandas | `server/appsflyer/` |
| **Database** | PostgreSQL 16 (Docker) | Port 5433 |
| **ORM** | Drizzle ORM | `server/db/` |
| **API** | tRPC 11.x | `server/api/routers/appsflyer.ts` |
| **Frontend** | React 19 + MUI | `components/appsflyer/` |

---

## Data Flow

### Daily Automated Sync (Docker)

```
02:00 UTC ──▶ Cron triggers sync_af_data.py --yesterday
             │
             ├── 1. Fetch IAP events (iap_purchase)
             │      └── Raw Data API → CSV → normalize → upsert af_events
             │
             ├── 2. Fetch Ad Revenue events (af_ad_revenue)
             │      └── Raw Data API → CSV → normalize → upsert af_events
             │
             └── 3. Fetch Cohort KPIs (last 7 days of install dates)
                    └── Master Agg API → expand D0/D1/D3/D5/D7 → upsert af_cohort_kpi_daily
```

### Monthly Baseline Refresh

```
03:00 UTC, 1st of month ──▶ Cron triggers monthly_baseline_update.py
                            │
                            └── Refresh last 180 days of cohort KPIs
                                (AppsFlyer updates retention data over time)
```

### On-Demand Sync (Manual)

```
User triggers via:
  ├── Just command: just af-sync-yesterday
  ├── tRPC mutation: appsflyer.triggerManualSync
  └── Docker exec: just af-docker-sync-yesterday
```

---

## Database Schema

### Tables

#### `af_events` - Raw Event Records

Stores individual IAP and Ad Revenue events.

| Column | Type | Description |
|--------|------|-------------|
| `event_id` | TEXT (PK) | MD5 hash of (appsflyer_id, event_time, event_name, revenue) |
| `app_id` | TEXT | App bundle identifier |
| `event_name` | TEXT | `iap_purchase` or `af_ad_revenue` |
| `event_time` | TIMESTAMPTZ | When the event occurred |
| `event_date` | DATE | Event date (for partitioning) |
| `install_time` | TIMESTAMPTZ | When the user installed |
| `install_date` | DATE | Install date (cohort key) |
| `days_since_install` | INTEGER | Floor of (event_time - install_time) in days |
| `event_revenue_usd` | NUMERIC(18,6) | Revenue in USD |
| `geo` | TEXT | Country code (e.g., US) |
| `media_source` | TEXT | Attribution source (e.g., googleadwords_int) |
| `campaign` | TEXT | Campaign name |
| `adset` | TEXT | Ad set name |
| `imported_at` | TIMESTAMPTZ | When record was imported |

**Indexes**: `install_date`, `event_date`, `(app_id, geo, media_source, campaign, adset, install_date)`, `event_name`

#### `af_cohort_kpi_daily` - Cohort Metrics

Stores daily cohort-level metrics (installs, cost, retention).

| Column | Type | Description |
|--------|------|-------------|
| `app_id` | TEXT | App identifier |
| `media_source` | TEXT | Attribution source |
| `campaign` | TEXT | Campaign name |
| `geo` | TEXT | Country code |
| `install_date` | DATE | Cohort install date |
| `days_since_install` | INTEGER | 0, 1, 3, 5, or 7 |
| `installs` | INTEGER | Cohort install count |
| `cost_usd` | NUMERIC(18,6) | Cohort cost (on D0 only) |
| `retention_rate` | NUMERIC(8,4) | Retention rate (on D1/3/5/7) |
| `last_refreshed_at` | TIMESTAMPTZ | Last update timestamp |

**Primary Key**: `(app_id, media_source, campaign, geo, install_date, days_since_install)`

#### `af_sync_log` - Sync Audit Trail

Tracks sync operations for monitoring and debugging.

| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL (PK) | Auto-increment ID |
| `sync_type` | VARCHAR | `events`, `cohort_kpi`, or `baseline` |
| `date_range_start` | DATE | Start of sync range |
| `date_range_end` | DATE | End of sync range |
| `status` | VARCHAR | `running`, `success`, or `failed` |
| `records_processed` | INTEGER | Number of records processed |
| `error_message` | TEXT | Error details if failed |
| `started_at` | TIMESTAMPTZ | Sync start time |
| `completed_at` | TIMESTAMPTZ | Sync completion time |

### Views

#### `af_revenue_cohort_daily`

Aggregates events into cohort-level revenue.

```sql
SELECT app_id, geo, media_source, campaign, adset, install_date, days_since_install,
       SUM(CASE WHEN event_name = 'iap_purchase' THEN event_revenue_usd ELSE 0 END) AS iap_revenue_usd,
       SUM(CASE WHEN event_name = 'af_ad_revenue' THEN event_revenue_usd ELSE 0 END) AS ad_revenue_usd,
       SUM(event_revenue_usd) AS total_revenue_usd
FROM af_events
GROUP BY app_id, geo, media_source, campaign, adset, install_date, days_since_install
```

#### `af_cohort_metrics_daily`

Joins revenue with KPIs for complete cohort picture.

```sql
SELECT r.*, k.installs, k.cost_usd, k.retention_rate
FROM af_revenue_cohort_daily r
LEFT JOIN af_cohort_kpi_daily k ON (matching dimensions)
```

---

## Metrics Definitions

### ROAS (Return on Ad Spend)

**Formula**: `ROAS_Dn = Cumulative Revenue (D0 to Dn) / Cost`

```typescript
// Example: Calculate ROAS_D7
const revenue = await api.appsflyer.getRevenueByCohort.query({
  installDate: '2025-11-01',
  daysSinceInstall: 7,  // Cumulative D0-D7
  appId: 'solitaire...',
  geo: 'US',
  mediaSource: 'googleadwords_int'
});

const roas7 = revenue.totalRevenueUsd / costFromKpi;
```

**Note**: Revenue is cumulative (D0 through Dn), not daily.

### Retention Rate (RET)

**Definition**: Percentage of users still active N days after install.

| Day | Field | Typical Range |
|-----|-------|---------------|
| D1 | `retention_rate` (days_since_install=1) | 30-50% |
| D3 | `retention_rate` (days_since_install=3) | 20-35% |
| D5 | `retention_rate` (days_since_install=5) | 15-25% |
| D7 | `retention_rate` (days_since_install=7) | 10-20% |

### Safety Baseline (A2)

**Purpose**: Historical benchmark for evaluating campaign performance.

**Calculation**:
- **Window**: Cohorts from 180-210 days ago (mature, stable performance)
- **Method**: P50 (median) of ROAS_D7 and RET_D7
- **Dimensions**: app + geo + media_source (NOT campaign)

```typescript
const baseline = await api.appsflyer.calculateBaselineRoas.query({
  appId: 'solitaire...',
  geo: 'US',
  mediaSource: 'googleadwords_int',
  baselineDays: 180  // Look at 180-210 days ago
});

// baseline.baselineRoas = median ROAS_D7
// baseline.window = { start: '2025-05-03', end: '2025-06-02' }
```

### Achievement Rate

**Formula**: `Achievement Rate = Actual / Baseline × 100%`

| Achievement | Risk Level | Action |
|-------------|------------|--------|
| < 60% | danger | Stop/reduce significantly |
| 60-84% | warning | Reduce/control budget |
| 85-99% | observe | Maintain, don't expand |
| 100-109% | healthy | Stable expansion |
| >= 110% | excellent | Aggressive expansion |

---

## Manual Sync Commands

All commands use the `just` task runner. Run from project root.

### Setup Python Environment

```bash
# One-time setup (creates virtualenv, installs deps)
just af-setup
```

### Sync Yesterday's Data

```bash
# Recommended daily manual sync
just af-sync-yesterday
```

### Sync Specific Date Range

```bash
# Sync events + KPIs for date range
just af-sync-range 2025-11-01 2025-11-07

# Sync only events (faster, skip KPI)
just af-sync-events 2025-11-01 2025-11-07

# Sync only KPIs (skip events)
just af-sync-kpi 2025-11-01 2025-11-07
```

### Backfill Historical Data

```bash
# Backfill last 30 days (testing)
just af-backfill-30

# Backfill last 180 days (full baseline window)
just af-backfill-180
```

### Check Status

```bash
# View recent sync logs
just af-status

# Count records in tables
just af-count
```

---

## Automated Sync (Docker)

### Starting the ETL Container

```bash
# Build and start the AppsFlyer ETL container
just af-docker-up

# Verify container is running
just af-docker-status
```

### Cron Schedule

The container runs two cron jobs:

| Job | Schedule | Command |
|-----|----------|---------|
| **Daily Sync** | 02:00 UTC | `python sync_af_data.py --yesterday` |
| **Monthly Baseline** | 03:00 UTC, 1st | `python monthly_baseline_update.py` |

### Monitoring

```bash
# View container logs (live)
just af-docker-logs

# View daily sync log file
just af-docker-sync-logs

# View baseline update log file
just af-docker-baseline-logs
```

### Manual Execution via Docker

```bash
# Run yesterday sync manually
just af-docker-sync-yesterday

# Run date range sync manually
just af-docker-sync-range 2025-11-01 2025-11-07

# Run baseline update manually
just af-docker-baseline-update
```

### Container Management

```bash
# Stop container
just af-docker-down

# Restart container
just af-docker-restart
```

---

## Email Notifications

The ETL scripts can send email notifications on sync failures.

### Configuration

Add these environment variables to `.env`:

```bash
# SMTP Configuration (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=your-email@gmail.com
SMTP_TO=alerts@yourcompany.com
SMTP_NOTIFY_SUCCESS=false  # Set true to get success emails too
```

### Notification Content

Failed sync emails include:
- Sync type and date range
- Error message
- Troubleshooting commands
- Link to sync logs

---

## Troubleshooting

### No Data After Sync

**Symptoms**: Tables are empty or missing expected records.

**Checks**:
1. Verify API credentials: `AF_API_TOKEN` in `.env`
2. Check sync logs: `just af-status`
3. Test API manually (see below)

### Sync Fails with API Error

**Symptoms**: `401 Unauthorized` or `403 Forbidden`

**Solution**:
1. Verify `AF_API_TOKEN` is valid and not expired
2. Check AppsFlyer dashboard for API access permissions
3. Ensure app ID matches: `AF_APP_ID` in `.env`

### Retention Data is NULL

**Explanation**: AppsFlyer updates retention data over time:
- D1 retention: Available ~2 days after install
- D3 retention: Available ~4 days after install
- D7 retention: Available ~8 days after install

**Solution**: Wait for data to mature, or run monthly baseline update.

### Baseline Returns NULL

**Explanation**: Baseline calculation requires 180-210 day old cohorts.

**Checks**:
1. Verify backfill completed: `just af-count`
2. Check date range: baseline window = (today-210) to (today-180)
3. Ensure matching dimensions exist in data

### Docker Container Keeps Restarting

**Checks**:
1. View logs: `just af-docker-logs`
2. Check database connectivity: container needs access to PostgreSQL
3. Verify environment variables are passed to container

### Database Connection Errors

**Symptoms**: `Connection refused` or timeout

**Checks**:
1. PostgreSQL running: `just docker-status`
2. Port is correct: 5433 (not default 5432)
3. Database exists: `just db-shell` then `\l`

---

## UI Components

### SyncStatusCard

Location: `components/appsflyer/sync-status-card.tsx`

Displays on Dashboard page:
- Last successful sync time
- Records processed
- Stale data warning (> 36 hours since last sync)
- Manual sync trigger button

### Data Usage

The evaluation pages use AppsFlyer data via tRPC:

```typescript
// Dashboard
const { data } = api.appsflyer.getSyncStatus.useQuery({ limit: 5 });

// Campaign Evaluation
const metrics = api.appsflyer.getCohortMetrics.useQuery({
  installDate: selectedDate,
  daysSinceInstall: 7
});

// Baseline Display
const baseline = api.appsflyer.calculateBaselineRoas.useQuery({
  appId, geo, mediaSource
});
```

---

## Performance

### Query Benchmarks

| Query | Time | Notes |
|-------|------|-------|
| `getEventsByDateRange` (180 days) | ~64ms | With pagination |
| `getCohortKpi` (full scan) | ~45ms | All filters |
| `calculateBaselineRoas` | ~89ms | P50 calculation |
| `getCohortMetrics` | ~50ms | View query |

All queries perform well under the 2-second threshold.

### Index Strategy

Key indexes ensure fast queries:
- `idx_af_events_install_date` - Cohort grouping
- `idx_af_events_cohort` - Multi-column filter
- `idx_af_cohort_kpi_install_date` - Date range queries

---

## Related Documentation

- [API Reference](./appsflyer-api.md) - tRPC procedure documentation
- [Migration Guide](./migration-mock-to-real.md) - Moving from mock to real data
- [Module Overview](./modules/appsflyer.md) - Quick reference
- [Phase 7 Testing Review](./reviews/phase7-testing-review.md) - Test coverage report
