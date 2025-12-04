# Frontend Design

## Overview
- Next.js 16 App Router + React 19; TypeScript 5.7 strict.
- MUI 7.3.5 with @mui/x-data-grid 8.18, @mui/x-charts 8.19, @mui/x-date-pickers 8.18; Emotion styling.
- Data layer: tRPC client + TanStack Query 5.90.9; account selection stored in `AccountProvider`.

## Routes
| Route | File | Notes |
|-------|------|-------|
| `/` | `app/(dashboard)/page.tsx` | Account-scoped stats cards + resource/operation breakdowns. |
| `/accounts` | `app/(dashboard)/accounts/page.tsx` | Account CRUD, soft delete, sync trigger. |
| `/events` | `app/(dashboard)/events/page.tsx` | Account-filtered change log with filters, search, detail modal, sync. |
| `/entities` | `app/(dashboard)/entities/page.tsx` | Campaigns/AdGroups/Ads full-state DataGrids, filters (status/channel/type/media_source), manual sync, detail drawer with latest change history. |
| `/evaluation/campaigns` | `app/(dashboard)/evaluation/campaigns/page.tsx` | Campaign evaluations list + detail dialog + action recommendations. |
| `/evaluation/creatives` | `app/(dashboard)/evaluation/creatives/page.tsx` | D3/D7 creative evaluations, status badges, sync dialog. |
| `/evaluation/operations` | `app/(dashboard)/evaluation/operations/page.tsx` | Operation scores (T+1/T+3/T+7 columns) with manual actions: Sync Events, Sync AppsFlyer Data (cohort KPI), Recalculate scores; includes optimizer leaderboard. |

Layout: `app/layout.tsx` (theme/providers) → `(dashboard)/layout.tsx` (shell with sidebar/header) → pages (client components for interactivity).

## Components
- Accounts: `components/accounts/account-dialog.tsx`.
- Common: `common/confirm-dialog.tsx`, `common/empty-state.tsx`, `common/toast-provider.tsx`.
- Layout: `layout/account-selector.tsx` (persists selection to localStorage).
- Events: `events/event-detail.tsx`.
- Entities: inline DataGrid + drawer in `entities/page.tsx` (reuse account selector + tRPC entities router; valueFormatters guarded for null/number).
- Evaluation: `campaign-evaluation-dialog.tsx`, `creative-evaluation-dialog.tsx`, `operation-score-dialog.tsx`, `optimizer-leaderboard.tsx`, `status-chip.tsx`, `creative-status-badge.tsx`, `creative-sync-dialog.tsx`, `action-recommendation-card.tsx`, `action-execution-dialog.tsx`.

## State & Data
- `lib/contexts/account-context.tsx` supplies `selectedAccountId`; most queries are gated on it via `enabled: !!selectedAccountId`.
- `lib/trpc/client.ts` wires tRPC + React Query; default query options disable refetch-on-focus and set small stale time.
- `lib/utils/evaluation.ts` and `lib/types/evaluation.ts` centralise scoring logic/types; `lib/services/mock-execution.ts` simulates action execution.

## Theme
- Defined in `theme/index.ts` with tokens in `theme/tokens.ts`; light palette leaning blue/teal, 8px spacing scale, MUI breakpoints defaults.

## Patterns
- Client-only pages (prefixed with `'use client'`) for DataGrid-heavy views.
- Use MUI DataGrid pagination state to map 0-indexed UI to 1-indexed backend.
- Mutations invalidate relevant queries via `trpc.useUtils()`; sync buttons call tRPC then refetch.

## Status & Gaps
- Dashboards, accounts, events, and all evaluation pages are wired and usable with real data.
- Account selection is required before any data call; toasts cover happy/error paths.
- Action execution dialogs still use mock services; real execution endpoints not connected.
- AppsFlyer manual sync is available via operations page (cohort KPI), alongside events sync.
- No authentication/roles; assume internal trusted users.
