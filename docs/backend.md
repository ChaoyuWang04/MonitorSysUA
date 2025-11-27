# Backend Design

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   tRPC Router   │────▶│  Query Layer    │────▶│   PostgreSQL    │
│   (TypeScript)  │     │  (Drizzle ORM)  │     │   (Docker)      │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │
         ▼
┌─────────────────┐
│ Python Subprocess│
│ (Evaluation/ETL) │
└─────────────────┘
```

## Module Organization

### `server/api/` - tRPC Layer
- `trpc.ts` - Context setup, procedure definitions
- `root.ts` - Router registration
- `routers/` - Feature routers (accounts, events, stats, evaluation)

### `server/db/` - Database Layer
- `schema.ts` - Drizzle ORM schema (14 tables)
- `index.ts` - Database client singleton
- `queries.ts` - Account + event queries
- `queries-evaluation.ts` - Evaluation system queries
- `queries-appsflyer.ts` - AppsFlyer ETL queries

### `server/google-ads/` - Google Ads Integration
- `client.ts` - TypeScript wrapper for Python script
- `fetch_events.py` - Google Ads API client (Python)
- `regenerate_summaries.py` - Batch summary update tool

### `server/appsflyer/` - AppsFlyer ETL
- `sync_af_data.py` - Main sync script (events + cohort KPIs)
- `backfill.py` - Historical data backfill

### `server/evaluation/` - Evaluation System
- `wrappers/` - TypeScript wrappers for Python evaluators
  - `baseline-calculator.ts` (A2)
  - `campaign-evaluator.ts` (A3)
  - `creative-evaluator.ts` (A4)
  - `operation-evaluator.ts` (A5)
- `python/` - Python evaluation logic
  - `baseline_calculator.py`
  - `campaign_evaluator.py`
  - `creative_evaluator.py`
  - `operation_evaluator.py`
  - `db_utils.py`

## Data Flow

### Google Ads Sync
```
1. tRPC mutation (events.sync)
2. Spawn Python process (fetch_events.py)
3. Fetch from Google Ads API
4. Parse and transform events
5. Insert to database via Drizzle
6. Update account lastSyncedAt
```

### AppsFlyer Sync
```
1. Cron job / manual trigger (just af-sync-yesterday)
2. Python script fetches from AppsFlyer API
3. Process IAP + Ad Revenue events
4. Aggregate cohort KPIs
5. Insert to PostgreSQL directly
```

### Evaluation Flow
```
1. tRPC mutation triggers evaluation
2. TypeScript wrapper spawns Python subprocess
3. Python reads from database, calculates metrics
4. Returns JSON result via stdout
5. TypeScript parses and stores result
```

## External Integrations

### Google Ads API
- **Auth**: Service account (google-ads.yaml)
- **API**: ChangeEvent endpoint
- **Data**: Campaign/ad group changes, budget updates, status changes

### AppsFlyer API
- **Auth**: API token (AF_API_TOKEN env var)
- **Endpoints**: Raw data export, cohort KPI
- **Data**: IAP events, ad revenue, retention metrics

## Key Patterns

### Python-TypeScript Bridge
```typescript
// TypeScript wrapper pattern
const result = await new Promise((resolve, reject) => {
  const process = spawn('python', ['script.py']);
  process.stdout.on('data', (data) => {
    resolve(JSON.parse(data.toString()));
  });
});
```

### Query Functions
```typescript
// Drizzle ORM pattern
export async function getEvents(accountId: string, filters: Filters) {
  return db.select()
    .from(changeEvents)
    .where(and(
      eq(changeEvents.accountId, accountId),
      ...buildFilters(filters)
    ))
    .orderBy(desc(changeEvents.timestamp));
}
```

### Soft Delete
All delete operations set `isActive = false` instead of removing records.
