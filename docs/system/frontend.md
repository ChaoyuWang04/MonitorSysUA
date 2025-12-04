# Frontend Design

## Overview
- Next.js 16 App Router + React 19; TypeScript 5.7 strict. Pages are client components where DataGrid is used.
- MUI 7.3.5 with @mui/x-data-grid 8.18, @mui/x-charts 8.19, @mui/x-date-pickers 8.18; Emotion styling via `sx`.
- Data layer: tRPC client + TanStack Query 5.90.9; account selection stored in `AccountProvider`. Queries are gated with `enabled: !!selectedAccountId` to avoid cross-account leakage.
- Layout: `app/layout.tsx` wraps providers; `(dashboard)/layout.tsx` supplies shell + sidebar and account selector; pages render inside.

## Routes
| Route | File | Notes |
|-------|------|-------|
| `/` | `app/(dashboard)/page.tsx` | Account-scoped stats cards + resource/operation breakdowns; shows AppsFlyer sync freshness warning at 36h. |
| `/accounts` | `app/(dashboard)/accounts/page.tsx` | Account CRUD, soft delete, sync trigger; DataGrid actions open dialog/confirm. |
| `/events` | `app/(dashboard)/events/page.tsx` | Account-filtered change log with filters, search, detail modal, sync; modal shows field changes + summaries (en/zh). |
| `/entities` | `app/(dashboard)/entities/page.tsx` | Campaigns/AdGroups/Ads full-state DataGrids, filters (status/channel/type/media_source), manual sync, detail drawer with latest change history. |
| `/evaluation/campaigns` | `app/(dashboard)/evaluation/campaigns/page.tsx` | Campaign evaluations list + detail dialog + action recommendations (mock execution). |
| `/evaluation/creatives` | `app/(dashboard)/evaluation/creatives/page.tsx` | D3/D7 creative evaluations, status badges, sync dialog; still backed by mock creative data. |
| `/evaluation/operations` | `app/(dashboard)/evaluation/operations/page.tsx` | Operation scores (T+1/T+3/T+7 columns) with manual actions: Sync Events, Sync AppsFlyer Data (cohort KPI), Recalculate scores; includes optimizer leaderboard. |

Layout: `app/layout.tsx` (theme/providers) → `(dashboard)/layout.tsx` (shell with sidebar/header) → pages (client components for interactivity).

## Components
- Accounts: `components/accounts/account-dialog.tsx` for create/update with validation and list invalidation.
- Common: `common/confirm-dialog.tsx`, `common/empty-state.tsx`, `common/toast-provider.tsx`.
- Layout: `layout/account-selector.tsx` (persists selection to localStorage) used in sidebar; controls query gating.
- Events: `events/event-detail.tsx` (field change diff, summaries) opened from DataGrid actions.
- Entities: inline DataGrid + drawer in `entities/page.tsx` (valueFormatters guard null/number, includes latest change info); sync button wired to tRPC `entities.sync`.
- Evaluation: `campaign-evaluation-dialog.tsx`, `creative-evaluation-dialog.tsx`, `operation-score-dialog.tsx`, `optimizer-leaderboard.tsx`, `status-chip.tsx`, `creative-status-badge.tsx`, `creative-sync-dialog.tsx`, `action-recommendation-card.tsx`, `action-execution-dialog.tsx` (mock execution for now).

## State & Data
- `lib/contexts/account-context.tsx` supplies `selectedAccountId`; most queries are gated on it via `enabled: !!selectedAccountId`.
- `lib/trpc/client.ts` wires tRPC + React Query; default query options disable refetch-on-focus and set small stale time to keep UI snappy after mutations.
- `lib/utils/evaluation.ts` and `lib/types/evaluation.ts` centralise scoring logic/types; `lib/services/mock-execution.ts` simulates action execution.
- Pagination mapping: DataGrid pages are 0-indexed; backend expects 1-indexed, so pages add +1 before request and subtract on change.
- Mutation patterns: `trpc.useUtils()` invalidates relevant lists after success; toast provider surfaces errors.

## Theme
- Defined in `theme/index.ts` with tokens in `theme/tokens.ts`; light palette leaning blue/teal, 8px spacing scale, MUI breakpoints defaults.
- Buttons use medium weight, no uppercase; cards have outlined borders for dashboard feel; typography tuned to 14px base.

## Patterns
- Client-only pages (prefixed with `'use client'`) for DataGrid-heavy views.
- Use MUI DataGrid pagination state to map 0-indexed UI to 1-indexed backend.
- Mutations invalidate relevant queries via `trpc.useUtils()`; sync buttons call tRPC then refetch.
- Account selector must be set before any data is shown; empty states prompt selection rather than erroring.
- Error handling surfaces toast messages with mutation error messages from tRPC.

## Status & Gaps
- Dashboards, accounts, events, and most evaluation pages are wired and usable with real data; creative evaluation still mock-backed.
- Account selection is required before any data call; toasts cover happy/error paths; skeletons used on dashboard while loading.
- Action execution dialogs still use mock services; real execution endpoints not connected.
- AppsFlyer manual sync is available via operations page (cohort KPI), alongside events sync.
- No authentication/roles; assume internal trusted users and network perimeter.
