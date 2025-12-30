# MonitorSysUA

Full-stack practice project for monitoring ad operations. It aggregates Google Ads change events and AppsFlyer cohort data, then evaluates campaign and operation performance to power dashboards, scoring, and recommendations.

## Highlights
- Multi-account Google Ads management with account-scoped data isolation.
- Change-event ingestion with searchable history, field-level diffs, and bilingual summaries.
- Entity sync for campaigns/ad groups/ads with latest-change context.
- Evaluation suite (baseline, campaign, operation scoring) driven by AppsFlyer cohorts.
- AppsFlyer ETL pipeline with daily sync, backfill support, and audit logs.
- MUI dashboard UI with DataGrid-based management and evaluation views.

## Architecture
- Next.js App Router + tRPC for type-safe APIs.
- Drizzle ORM on PostgreSQL with Atlas migrations.
- Python ETL for Google Ads and AppsFlyer data collection.
- Evaluation pipeline reads AppsFlyer cohorts and writes results to database tables.

## Tech Stack
- Next.js 16 (App Router), React 19, TypeScript 5.7 (strict)
- MUI 7.3.5 + Emotion styling
- tRPC 11.7, Zod 4.1
- PostgreSQL 16 + Drizzle 0.44 + Atlas
- TanStack Query 5
- Python ETL for Google Ads + AppsFlyer

## Getting Started
Prerequisites:
- Node.js (for Next.js app)
- Just (`just` command)
- Docker (for Postgres)
- Python 3.12+ (for Google Ads + AppsFlyer scripts)

Setup:
```bash
just install
just docker-up
just db-apply
just dev
```

Local credentials:
- Google Ads: `local/credentials/google-ads/google-ads.yaml` + service account JSON.
- AppsFlyer: environment variables required by ETL scripts.

Ports:
- App: `http://localhost:4000`
- Postgres: `localhost:5433`

## Common Commands
```bash
just install
just dev
just build
just start
just lint
just type-check
just check
just docker-up
just docker-down
just db-status
just db-diff "<name>"
just db-apply
just db-studio
just af-sync-yesterday
```

## Project Structure
```text
app/          Next.js App Router pages
components/   UI components by domain
lib/          Frontend utilities, contexts, types, tRPC client
server/       tRPC routers, DB schema/queries, integrations, evaluation
theme/        MUI theme + tokens
atlas/        Atlas migrations
docs/         System and module documentation
context/      Design principles and style guide
```

## Key Modules
- Accounts: multi-account management and selection.
- Change Events: Google Ads change-event ingestion and auditing.
- Entities: campaigns/ad groups/ads full-state sync and listing.
- Evaluation: baseline, campaign evaluation, and operation scoring.
- AppsFlyer Cohort Platform: ETL, cohorts, and metrics views.

## Docs
- System overview: `docs/system/`
- Module details: `docs/modules/`
- Docs site: `just docs-serve` (docsify on port 3001)

## Limitations
- No authentication or RBAC (internal use only).
- Some batch evaluations are manual/cron-triggered.
- Creative evaluation still uses mock data.
- Testing is manual (no automated test framework).

## Notes
This is a personal full-stack practice project. It is designed for internal experimentation and learning.
