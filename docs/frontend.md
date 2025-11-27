# Frontend Design

## Overview
- **Framework**: Next.js 16.0.3 (App Router)
- **UI Library**: MUI 7.3.5 (@mui/material, @mui/x-data-grid, @mui/x-charts)
- **Styling**: Emotion CSS-in-JS
- **State**: React Query (TanStack Query 5.90.9) + tRPC client
- **Language**: TypeScript 5.7.2 (strict mode)

## Pages

| Route | File | Description |
|-------|------|-------------|
| `/` | `app/(dashboard)/page.tsx` | Dashboard overview with stats |
| `/accounts` | `app/(dashboard)/accounts/page.tsx` | Account management (CRUD) |
| `/events` | `app/(dashboard)/events/page.tsx` | Change event list with filters |
| `/evaluation/campaigns` | `app/(dashboard)/evaluation/campaigns/page.tsx` | Campaign evaluation list |
| `/evaluation/creatives` | `app/(dashboard)/evaluation/creatives/page.tsx` | Creative evaluation list |
| `/evaluation/operations` | `app/(dashboard)/evaluation/operations/page.tsx` | Operation scores + leaderboard |

## Layout Structure
```
app/
├── layout.tsx              # Root layout (MUI theme, providers)
├── providers.tsx           # tRPC + React Query + Contexts
└── (dashboard)/
    ├── layout.tsx          # Dashboard layout (sidebar + header)
    └── [pages]             # Feature pages
```

## Components

### `components/accounts/`
- `account-dialog.tsx` - Create/edit account modal

### `components/common/`
- `confirm-dialog.tsx` - Generic confirmation modal
- `empty-state.tsx` - Empty state placeholder
- `toast-provider.tsx` - Toast notification context

### `components/evaluation/`
- `campaign-evaluation-dialog.tsx` - Campaign detail modal
- `creative-evaluation-dialog.tsx` - Creative detail modal
- `operation-score-dialog.tsx` - Operation score detail
- `optimizer-leaderboard.tsx` - Leaderboard table
- `status-chip.tsx` - Color-coded status indicator
- `action-recommendation-card.tsx` - Recommendation display
- `action-execution-dialog.tsx` - Execute action modal

### `components/events/`
- `event-detail.tsx` - Event detail modal

### `components/layout/`
- `account-selector.tsx` - Account dropdown in header

## State Management

### React Query Configuration
```typescript
{
  staleTime: 5000,           // 5 seconds
  refetchOnMount: false,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false
}
```

### Contexts
- **AccountProvider** - Selected account state (persisted to localStorage)
- **ToastProvider** - Toast notification methods (success, error, warning, info)

## Theme

### Colors
| Category | Primary | Secondary |
|----------|---------|-----------|
| Main | Blue (#1976D2) | Teal (#00897B) |
| Success | Green | - |
| Error | Red | - |
| Warning | Orange | - |

### Typography
- Font: System font stack
- Sizes: xs to 5xl (9 levels)
- Weights: light, regular, medium, semibold, bold

### Spacing
- Base unit: 8px
- Scale: 0-24 steps

### Breakpoints
| Name | Width |
|------|-------|
| xs | 0px |
| sm | 600px |
| md | 900px |
| lg | 1200px |
| xl | 1536px |

## Key Patterns

### Server vs Client Components
- **Server Components**: Pages, static content (default)
- **Client Components**: Interactive elements (`'use client'` directive)

### Data Fetching
```typescript
// tRPC query pattern
const { data, isLoading } = api.accounts.list.useQuery({ isActive: true });

// Mutation with invalidation
const mutation = api.accounts.create.useMutation({
  onSuccess: () => queryClient.invalidateQueries(['accounts'])
});
```

### Status Color Mapping
```typescript
const statusColors = {
  excellent: 'success',
  healthy: 'info',
  observation: 'warning',
  warning: 'warning',
  danger: 'error'
};
```

## File Locations
- **Types**: `lib/types/evaluation.ts`
- **Utils**: `lib/utils/evaluation.ts`
- **Theme**: `theme/index.ts`, `theme/tokens.ts`
- **tRPC Client**: `lib/trpc/client.ts`
- **Contexts**: `lib/contexts/account-context.tsx`
