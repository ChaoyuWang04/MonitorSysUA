# Project Structure

```
MonitorSysUA/
├── app/                        # Next.js App Router (providers + dashboard pages)
│   ├── api/trpc/[trpc]/route.ts
│   └── (dashboard)/{layout.tsx,page.tsx,accounts/,events/,evaluation/}
├── components/                 # UI building blocks (accounts, common, layout, events, evaluation)
├── lib/                        # tRPC client, contexts, utils, types, mock execution service
├── server/
│   ├── api/                    # tRPC wiring + routers (accounts/events/stats/evaluation/appsflyer)
│   ├── db/                     # Drizzle schema + queries (core, evaluation, AppsFlyer)
│   ├── google-ads/             # TS/Python ChangeEvent ingestion + diff/summary tools
│   ├── appsflyer/              # Python ETL + backfill for events/cohort KPIs
│   └── evaluation/             # TS wrappers, Python engines, mock-data seed, test harness
├── theme/                      # MUI theme + tokens
├── atlas/                      # Atlas migration config + SQL migrations
├── scripts/                    # `db-snapshot.ts`, `db-restore.ts`
├── docs/                       # Project docs (plan/finished subfolders ignored)
├── context/                    # Design principles + DB snapshots
├── docker-compose.yml          # Postgres 16 (port 5433)
├── atlas.hcl                   # Atlas env config
├── justfile                    # Dev/DB/AppsFlyer commands
├── package.json                # Dependencies
└── .env.example                # Env template
```

## Key Directories

| Directory | Purpose |
|-----------|---------|
| `app/` | Next.js pages and layouts |
| `components/` | Reusable UI components |
| `lib/` | Frontend utilities, contexts, types |
| `server/` | Backend routers, DB access, integrations, evaluation |
| `theme/` | MUI theming |
| `atlas/` | Database migrations |
| `scripts/` | Snapshot/restore helpers |
| `docs/` | Documentation set |

## Current Progress
- Multi-account flow is live across accounts, events, stats, and evaluation screens.
- Google Ads change-event ingestion works manually from the UI; cron/scheduling not added.
- Evaluation pipeline (A2-A5) persists results and powers UI; batch jobs are manual.
- AppsFlyer ETL scripts run via CLI only; no frontend surface yet.
- Auth/permissions are not implemented (trusted internal use).
