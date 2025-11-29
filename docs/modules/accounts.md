# Accounts Module

## Scope
- Manage Google Ads accounts used across all modules.
- Provide account context for dashboards, events, stats, and evaluations.

## Capabilities
- List, create, edit, and soft-delete accounts with currency/timezone metadata.
- Display MCC info and last sync time; soft-delete protects historical data.
- Persist account selection in the UI and gate all queries by the chosen account.

## Flow
- Frontend DataGrid shows all accounts; dialogs handle add/edit; confirmation handles delete.
- Mutations invalidate cached lists; selection is stored via `AccountProvider` so other pages pull the same accountId.

## Status
- Multi-account path is live for accounts, events, stats, and evaluation queries.
- No authentication yet; assume trusted internal usage.
- Future: add role-based access and bulk import if needed.
