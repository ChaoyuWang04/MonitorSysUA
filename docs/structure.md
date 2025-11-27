# Project Structure

```
MonitorSysUA/
├── app/                              # Next.js App Router
│   ├── layout.tsx                    # Root layout (theme, fonts)
│   ├── providers.tsx                 # tRPC + React Query providers
│   ├── globals.css                   # Global styles
│   ├── api/
│   │   └── trpc/[trpc]/route.ts     # tRPC HTTP handler
│   └── (dashboard)/                  # Dashboard route group
│       ├── layout.tsx               # Dashboard layout (sidebar)
│       ├── page.tsx                 # Dashboard home
│       ├── accounts/page.tsx        # Account management
│       ├── events/page.tsx          # Change events list
│       └── evaluation/
│           ├── campaigns/page.tsx   # Campaign evaluation
│           ├── creatives/page.tsx   # Creative evaluation
│           └── operations/page.tsx  # Operation scores
│
├── components/                       # React components
│   ├── accounts/                    # Account management
│   │   └── account-dialog.tsx
│   ├── common/                      # Shared components
│   │   ├── confirm-dialog.tsx
│   │   ├── empty-state.tsx
│   │   └── toast-provider.tsx
│   ├── evaluation/                  # Evaluation system
│   │   ├── campaign-evaluation-dialog.tsx
│   │   ├── creative-evaluation-dialog.tsx
│   │   ├── operation-score-dialog.tsx
│   │   ├── optimizer-leaderboard.tsx
│   │   ├── status-chip.tsx
│   │   └── ...
│   ├── events/
│   │   └── event-detail.tsx
│   └── layout/
│       └── account-selector.tsx
│
├── lib/                              # Shared utilities
│   ├── trpc/
│   │   └── client.ts                # tRPC React client
│   ├── types/
│   │   └── evaluation.ts            # Type definitions
│   ├── utils/
│   │   └── evaluation.ts            # Helper functions
│   └── contexts/
│       └── account-context.tsx      # Account state context
│
├── server/                           # Backend code
│   ├── api/
│   │   ├── trpc.ts                  # tRPC context setup
│   │   ├── root.ts                  # Router registration
│   │   └── routers/
│   │       ├── accounts.ts          # Account CRUD
│   │       ├── events.ts            # Event queries + sync
│   │       ├── stats.ts             # Statistics
│   │       └── evaluation.ts        # Evaluation system
│   │
│   ├── db/
│   │   ├── schema.ts                # Drizzle ORM schema
│   │   ├── index.ts                 # Database client
│   │   ├── queries.ts               # Core queries
│   │   ├── queries-evaluation.ts    # Evaluation queries
│   │   └── queries-appsflyer.ts     # AppsFlyer queries
│   │
│   ├── google-ads/
│   │   ├── client.ts                # TypeScript wrapper
│   │   ├── fetch_events.py          # Google Ads API client
│   │   └── regenerate_summaries.py  # Summary regeneration
│   │
│   ├── appsflyer/
│   │   ├── sync_af_data.py          # Main ETL script
│   │   └── backfill.py              # Historical backfill
│   │
│   └── evaluation/
│       ├── wrappers/                # TypeScript wrappers
│       │   ├── baseline-calculator.ts
│       │   ├── campaign-evaluator.ts
│       │   ├── creative-evaluator.ts
│       │   └── operation-evaluator.ts
│       └── python/                  # Python evaluators
│           ├── baseline_calculator.py
│           ├── campaign_evaluator.py
│           ├── creative_evaluator.py
│           ├── operation_evaluator.py
│           └── db_utils.py
│
├── theme/                            # MUI theme
│   ├── index.ts                     # Theme definition
│   └── tokens.ts                    # Design tokens
│
├── atlas/                            # Database migrations
│   └── migrations/                  # SQL migration files
│
├── docs/                             # Documentation
│   ├── prd.md                       # Product requirements
│   ├── api.md                       # API documentation
│   ├── backend.md                   # Backend design
│   ├── database.md                  # Database schema
│   ├── frontend.md                  # Frontend design
│   ├── structure.md                 # Project structure (this file)
│   └── trd.md                       # Technical reference
│
├── context/                          # Design guidelines
│   ├── design-principles.md         # Design checklist
│   └── style-guide.md               # Brand style guide
│
├── scripts/                          # Utility scripts
│   └── db-query.sh                  # Database query helper
│
├── .env.example                      # Environment template
├── docker-compose.yml                # PostgreSQL container
├── drizzle.config.ts                 # Drizzle ORM config
├── next.config.js                    # Next.js config
├── tsconfig.json                     # TypeScript config
├── package.json                      # Dependencies
├── justfile                          # Task runner
└── CLAUDE.md                         # Project instructions
```

## Key Directories

| Directory | Purpose |
|-----------|---------|
| `app/` | Next.js pages and API routes |
| `components/` | React UI components |
| `lib/` | Shared frontend utilities |
| `server/` | Backend logic (tRPC, DB, integrations) |
| `theme/` | MUI theme configuration |
| `atlas/` | Database migrations |
| `docs/` | Project documentation |
