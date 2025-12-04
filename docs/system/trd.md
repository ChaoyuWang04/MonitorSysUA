# Technical Reference Document (TRD)

## Overview

MonitorSysUA is a Google Ads monitoring and evaluation system that:
- Tracks campaign change events from Google Ads
- Evaluates campaign performance using AppsFlyer cohort data
- Provides safety baselines and risk assessments
- Scores optimizer operations

---

## Technology Stack

| Component | Technology | Version | Notes |
|-----------|------------|---------|-------|
| **Framework** | Next.js | 16.0.3 | App Router + Turbopack |
| **Language** | TypeScript | 5.7.2 | Strict mode |
| **Runtime** | React | 19.2.0 | Server + Client Components |
| **Database** | PostgreSQL | 16-alpine | Docker, port 5433 |
| **ORM** | Drizzle ORM | 0.44.7 | Type-safe queries |
| **Migrations** | Atlas | - | ariga.io/atlas |
| **UI** | MUI | 7.3.5 | Material Design 3 |
| **State** | TanStack Query | 5.90.9 | React Query |
| **API** | tRPC | 11.7.1 | Type-safe RPC |
| **Validation** | Zod | 4.1.12 | Schema validation |
| **ETL** | Python | 3.11 | AppsFlyer data sync |

---

## Architecture Decisions

### AD-001: Python ETL for AppsFlyer Data

**Decision**: Use Python for AppsFlyer data synchronization instead of TypeScript.

**Rationale**:
1. **Pandas ecosystem**: Superior CSV parsing and data transformation capabilities
2. **AppsFlyer SDK compatibility**: Better alignment with AppsFlyer's Python-centric tooling
3. **Memory efficiency**: Pandas handles large datasets (1M+ rows) more efficiently
4. **Separation of concerns**: ETL runs on schedule, decoupled from web application

**Trade-offs**:
- Requires separate Python environment (`server/appsflyer/.venv/`)
- Two-language codebase increases complexity
- Deployment needs both Node.js and Python runtimes

**Alternatives Considered**:
- TypeScript with csv-parse: Rejected due to memory issues with large datasets
- Node.js streams: Rejected due to complexity of cohort aggregation logic

---

### AD-002: Baseline Calculation (PRD 6.2.5, Weighted ROAS/RET)

**Decision**: Use cost-weighted ROAS and install-weighted retention (RET) stored in `baseline_metrics`, with four-level fallback (app+geo+media_source → app+geo → app+media_source → app). No P50.

**Rationale**:
1. **Alignment with PRD 6.2.5**: Baseline must be persisted and queryable with downgrade logic.
2. **Data sparsity resilience**: Falls back to latest available window if the 180/210 anchor has no data.
3. **Actionability**: Weighted averages better reflect spend/installs impact for scoring.

**Implementation**: Window `[today-(baselineDays+30), today-baselineDays]`, cost-weighted ROAS and install-weighted retention. If the anchor window is empty, fall back to the latest available window. Persist results to `baseline_metrics` for four-level lookup.

**Trade-offs**:
- Less outlier-robust than median; mitigated by weighting and fallback windowing.
- Requires maintaining `baseline_metrics` refresh cadence.

---

### AD-003: 180-Day Baseline Window

**Decision**: Use cohorts from 180-210 days ago for baseline calculation.

**Rationale**:
1. **Cohort maturity**: D7 metrics stabilize after ~14 days, 180 days ensures full lifecycle
2. **Seasonal normalization**: 30-day window (180-210) smooths weekly variance
3. **Data availability**: Requires 6+ months of historical data

**Configuration**: `baseline_settings` table allows per-app/geo/mediaSource customization.

---

### AD-004: Docker-based ETL Automation

**Decision**: Run AppsFlyer sync in a dedicated Docker container with internal cron.

**Rationale**:
1. **Isolation**: ETL failures don't affect web application
2. **Portability**: Same container runs locally and in production
3. **Resource management**: Separate memory/CPU limits for ETL vs web
4. **Logging**: Dedicated log files for debugging sync issues

**Implementation**:
- Container: `appsflyer-etl` (Python 3.11-slim + cron daemon)
- Daily sync: 02:00 UTC via cron
- Monthly baseline: 03:00 UTC on 1st

**Trade-offs**:
- Additional container to manage
- Docker-in-Docker considerations for CI/CD

---

### AD-005: Baseline Dimensions Exclude Campaign

**Decision**: Calculate baselines at app + geo + mediaSource level, NOT per-campaign.

**Rationale**:
1. **Statistical significance**: More cohorts per baseline = more reliable median
2. **New campaign support**: New campaigns inherit baseline immediately
3. **Business logic**: Safety line is a macro benchmark, not campaign-specific

**Consequence**: All campaigns within same app/geo/mediaSource share the same safety baseline.

---

### AD-006: Cumulative Revenue for ROAS

**Decision**: ROAS_Dn uses cumulative revenue from D0 through Dn, not daily revenue.

**Rationale**:
1. **Industry standard**: Mobile UA defines ROAS as cumulative LTV / CAC
2. **Comparability**: Matches AppsFlyer dashboard calculations
3. **Decision making**: Cumulative ROAS answers "is this cohort profitable?"

**Implementation**: Sum revenue from D0 through Dn (inclusive) per cohort and divide by cost; retention uses the rate reported at the target day (e.g., D7) from `af_cohort_kpi_daily`.

---

### AD-007: Event Deduplication via MD5 Hash

**Decision**: Generate `event_id` as MD5 hash of (appsflyer_id, event_time, event_name, revenue).

**Rationale**:
1. **Idempotency**: Same event always generates same ID
2. **Natural key**: No reliance on AppsFlyer's internal IDs
3. **Conflict handling**: `ON CONFLICT DO NOTHING` ensures no duplicates

**Trade-offs**:
- Hash collisions theoretically possible (extremely rare)
- Slightly more expensive than auto-increment

---

### AD-008: tRPC over REST

**Decision**: Use tRPC for all API endpoints instead of REST.

**Rationale**:
1. **Type safety**: End-to-end TypeScript types, no codegen needed
2. **Developer experience**: Auto-completion, type checking in IDE
3. **Consistency**: Unified API pattern across the application
4. **Performance**: Automatic batching, minimal overhead

**Implementation**: Thin routers per domain (`accounts`, `events`, `entities`, `stats`, `evaluation`, `appsflyer`) with Zod validation; client uses `httpBatchLink` and React Query integration for caching; error formatter exposes field-level issues.

---

### AD-009: Keep Mock Data Tables for A4

**Decision**: Phase 8 removes `mock_campaign_performance` but keeps `mock_creative_performance`.

**Rationale**:
1. **A4 dependency**: Creative evaluation (A4) still uses mock data
2. **Incremental migration**: Migrate A2/A3/A7 first, A4 later
3. **Testing**: Mock creative data useful for development/testing

**Future**: A4 will migrate to AppsFlyer creative-level data in future phase.

---

## Module Architecture

### Evaluation System (A2-A7)

```
┌──────────────────────────────────────────────────────────────┐
│                    Evaluation System                          │
├──────────────────────────────────────────────────────────────┤
│  A2: Baseline Calculator                                      │
│  └── calculateBaselineFromAF() → weighted ROAS/RET from history   │
│                                                               │
│  A3: Campaign Evaluator                                       │
│  └── evaluateCampaignFromAF() → Achievement vs baseline      │
│                                                               │
│  A4: Creative Evaluator (still uses mock)                    │
│  └── evaluateCreativeD3/D7() → CPI/ROAS thresholds          │
│                                                               │
│  A7: Operation Evaluator                                      │
│  └── evaluateOperationFromAF() → T+7 before/after comparison│
└──────────────────────────────────────────────────────────────┘
```

### Data Pipeline

```
AppsFlyer API
    │
    ├── Raw Data Export API (IAP events)
    │   └── CSV → pandas → normalize → af_events
    │
    ├── Raw Data Export API (Ad Revenue)
    │   └── CSV → pandas → normalize → af_events
    │
    └── Master Agg API (Cohort KPIs)
        └── JSON → expand D0/D1/D3/D5/D7 → af_cohort_kpi_daily
```

---

## Performance Characteristics

### Query Performance

| Query | Typical Time | Max Records |
|-------|--------------|-------------|
| `getEventsByDateRange` (180 days) | ~64ms | 200K |
| `getCohortKpi` (full scan) | ~45ms | 50K |
| `calculateBaselineRoas` | ~89ms | N/A |
| `getCohortMetrics` | ~50ms | 10K |

### Database Size

| Table | Rows (typical) | Growth Rate |
|-------|----------------|-------------|
| `af_events` | 1M+ | ~5K/day |
| `af_cohort_kpi_daily` | 1.3M+ | ~7K/day |
| `af_sync_log` | 1K+ | ~2/day |

---

## Security Considerations

### Secrets Management

| Secret | Storage | Usage |
|--------|---------|-------|
| `AF_API_TOKEN` | `.env` | AppsFlyer API authentication |
| `PG_PASSWORD` | `.env` | Database connection |
| `SMTP_PASSWORD` | `.env` | Email notifications (optional) |

**Note**: Never commit `.env` to version control. Use `.env.example` as template.

### API Access

- All tRPC procedures use `publicProcedure` (no auth currently)
- Future: Add authentication middleware for production deployment

---

## Known Limitations

1. **Baseline data lag**: Requires 180+ days of historical data before baselines are available
2. **Retention lag**: D7 retention only available ~8 days after install
3. **A4 dependency**: Creative evaluation still uses mock data
4. **Single app**: Currently configured for one AppsFlyer app ID
5. **Sync timing**: Daily sync at 2 AM UTC may miss same-day events

---

## Related Documentation

- [Database Schema](./database.md)
- [AppsFlyer Integration](../appsflyer-integration.md)
- [API Reference](../appsflyer-api.md)
