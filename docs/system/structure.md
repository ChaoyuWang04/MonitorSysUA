# Project Structure

```
MonitorSysUA/
├── app/                        # Next.js App Router (providers + dashboard pages)
│   ├── api/trpc/[trpc]/route.ts
│   └── (dashboard)/{layout.tsx,page.tsx,accounts/,events/,entities/,evaluation/}
├── components/                 # UI building blocks (accounts, common, layout, events, evaluation)
├── lib/                        # tRPC client, contexts, utils, types, mock execution service
├── server/
│   ├── api/                    # tRPC wiring + routers (accounts/events/stats/evaluation/appsflyer/entities)
│   ├── db/                     # Drizzle schema + queries (core, evaluation, AppsFlyer)
│   ├── google-ads/             # TS/Python ChangeEvent ingestion + entity sync + diff/summary tools
│   ├── appsflyer/              # Python ETL + backfill for events/cohort KPIs (Dockerized with cron)
│   └── evaluation/             # TS wrappers, Python engines, mock-data seed, test harness
├── theme/                      # MUI theme + tokens
├── atlas/                      # Atlas migration config + SQL migrations
├── scripts/                    # `db-snapshot.ts`, `db-restore.ts`
├── docs/                       # Project docs (system/api/modules/implementation)
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
| `app/` | Next.js pages and layouts (App Router) |
| `components/` | Reusable UI components by domain |
| `lib/` | Frontend utilities, contexts, types, mock services |
| `server/` | Backend routers, DB access, integrations, evaluation wrappers |
| `theme/` | MUI theming and tokens |
| `atlas/` | Database migrations (Atlas generated) |
| `scripts/` | Snapshot/restore helpers (DB tooling) |
| `docs/` | Documentation set (system/api/modules/implementation) |
| `context/` | Design principles, style guide, DB snapshots |

## Current Progress
- Multi-account flow is live across accounts, events, entities, stats, and evaluation screens.
- Google Ads change-event ingestion and entity sync work manually from the UI; cron/scheduling not added on Node side.
- Evaluation pipeline (A2/A3/A7) persists results and powers UI; batch jobs are manual (no scheduler in app process).
- AppsFlyer ETL scripts run via CLI or Docker cron; frontend exposes manual sync controls on operations page.
- Auth/permissions are not implemented (trusted internal use behind network controls).
- Design references live in `context/style-guide.md` and `context/design-principles.md`; align UI changes with them.
