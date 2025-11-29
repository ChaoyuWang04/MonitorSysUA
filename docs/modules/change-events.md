# Change Events Module

## Scope
- Ingest Google Ads ChangeEvent stream per account.
- Provide searchable history, summaries (EN/ZH), and stats for dashboards.

## Capabilities
- Manual sync per account (1–30 day window) with deduplication and lastSyncedAt update.
- Filters: user email, resource type, operation type, text search; server-side pagination.
- Detail dialog shows summaries, field changes, and metadata; dashboard cards and distributions reuse the same data.

## Flow
- UI triggers `events.sync` → server loads account (currency) → Python fetcher → parser/deduper → DB insert → stats refresh on read.
- Dashboard and Events page read from `change_events`; stats router aggregates totals and breakdowns.

## Status
- Working end-to-end for manual sync + list + detail.
- Scheduling/cron not wired yet; run sync from UI or scripts.
- Event summaries regeneration script (`regenerate_summaries.py`) exists; automation TBD.
