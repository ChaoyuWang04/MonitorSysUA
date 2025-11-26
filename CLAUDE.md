## Core Directives
Think ultra hard. Plan doc reading wisely (context limits). Always articulate reasoning step-by-step, identify affected system parts. Ask questions to align expectations. After changes: update docs in `docs/` (specify which: api.md/backend.md/database.md/frontend.md/prd.md/structure.md/trd.md) + git commit.
### Standard Flow
**Phase 1: Requirement Analysis**
1. Identify core requirement 2. Determine scope (which parts affected) 3. Define success criteria
**Phase 2: Current State Assessment**
1. Create search plan (including reading relevant docs in `docs/` first) 2. Execute search and read files 3. Document current implementation (patterns, reusable parts)
**Phase 3: Planning**
1. Identify target workspace(s) 2. Create ordered task list 3. Identify which docs to update (API changes→api.md, DB changes→database.md, FE changes→frontend.md, BE logic→backend.md, new features→prd.md, structure changes→structure.md, tech decisions→trd.md) 4. **Confirm plan with user before proceeding**
**Phase 4: Execution**
1. Announce plan ("Will modify X files...") 2. Execute step-by-step per workspace rules 3. Validate each step 4. Update identified docs in `docs/` (keep concise but include necessary details) 5. Git commit with proper message

### Technology Stack
| Category | Technology | Version |
|----------|-----------|---------|
| **Framework** | Next.js (App Router) | 16.0.3 |
| **Language** | TypeScript | 5.7.2 |
| **Runtime** | React | 19.2.0 |
| **Database** | PostgreSQL (Docker) | 16-alpine |
| **ORM** | Drizzle ORM | 0.44.7 |
| **Migration Tool** | Atlas | latest |
| **API** | tRPC | 11.7.1 |
| **State Management** | TanStack React Query | 5.90.9 |
| **UI Library** | Material-UI (MUI) | 7.3.5 |
| **Styling** | Emotion CSS-in-JS | 11.14.0 |
| **Validation** | Zod | 4.1.12 |
| **External APIs** | Google Ads API, AppsFlyer | 21.0.1 |

## 🛠️ Build, Test & Development
### Common Commands
| Task | Command | Purpose |
|------|---------|---------|
| **Install deps** | `just install` / `npm install` | Sync dependencies |
| **Dev server** | `just dev` | Start dev server (http://localhost:4000) |
| **Build** | `just build` | Build production bundle |
| **Lint** | `just lint` | Run ESLint |
| **Type check** | `just type-check` | TypeScript type checking |
| **All checks** | `just check` | lint + type-check + build |
| **Setup** | `just setup` | One-command project setup (new devs) |
| **Info** | `just info` | Show project info and versions |

### Docker Commands
| Task | Command | Purpose |
|------|---------|---------|
| **Start DB** | `just docker-up` | Start PostgreSQL container |
| **Stop DB** | `just docker-down` | Stop PostgreSQL container |
| **Logs** | `just docker-logs` | View PostgreSQL logs |
| **Status** | `just docker-status` | Check container status |
| **DB Shell** | `just db-shell` | Connect to PostgreSQL shell |

### Development Workflow
**Daily**: `just docker-up` → `just dev` → Make changes → `just check`
**Pre-commit (REQUIRED)**: Run `just check` to verify lint + type-check + build passes

### Database Query Script
**Read-only verification**: `just db-shell` then run SELECT queries
- ✅ Only SELECT queries
- 🚫 Never UPDATE/DELETE/INSERT/TRUNCATE, use migrations for schema changes

### ⚠️ Critical Rules
1. **Build before PR** - Always run `just check` 2. **No writes in query script** - Use Atlas migrations 3. **Dev servers optional** - Only run when actively testing


## Database Migration Workflow
### Core Principle
Design Doc → Schema Definition (Drizzle) → Migration (Atlas) → Database → ORM Types. Single source of truth: `server/db/schema.ts`. Never run migrations in app code.
### Absolute Rules
**NEVER execute without confirmation:**
- DROP DATABASE/SCHEMA, TRUNCATE, DELETE WHERE 1=1
- Any write to production database
- `just db-reset` (drops all data)
- Direct SQL bypassing migration system
- Any schema changes, migrations, bulk import/export
**Safe operations (no confirmation needed):** SELECT queries, `just db-status`, `just db-diff` (generate only), review SQL files
**Before any DB operation:** Check DATABASE_URL port (5433=dev), print environment info, wait for confirmation

### Standard Flow
1. Update design: `docs/database.md`
2. Update schema: `server/db/schema.ts` (Drizzle)
3. Generate migration: `just db-diff descriptive_name`
4. **STOP: Show me the SQL file**
5. Review SQL: `atlas/migrations/*.sql`
6. **STOP: Wait for approval**
7. Apply: `just db-apply`
8. Verify: `just db-status`

### Database Commands
| Task | Command | Purpose |
|------|---------|---------|
| **Status** | `just db-status` | Show migration status |
| **Diff** | `just db-diff name` | Create new migration |
| **Apply** | `just db-apply` | Apply pending migrations |
| **Dry run** | `just db-apply-dry` | Preview what would be applied |
| **Validate** | `just db-validate` | Validate migrations |
| **Lint** | `just db-lint` | Check for issues |
| **Studio** | `just db-studio` | Open Drizzle Studio GUI |
| **Seed** | `just db-seed` | Seed evaluation test data |
| **Reset** | `just db-reset` | DANGER: Drop all data |

### Database Tables (17 total)
| Table | Purpose |
|-------|---------|
| `accounts` | Google Ads accounts (multi-account support) |
| `change_events` | Change event tracking |
| `safety_baseline` | Safety baseline metrics (180 days) |
| `creative_test_baseline` | Creative test thresholds |
| `campaign_evaluation` | Campaign evaluation records |
| `creative_evaluation` | Creative evaluation records |
| `operation_score` | Operation scoring |
| `optimizer_leaderboard` | Optimizer rankings |
| `action_recommendation` | Recommended actions |
| `mock_campaign_performance` | Mock data for testing |
| `mock_creative_performance` | Mock data for testing |
| `af_sync_log` | AppsFlyer sync logs |
| `af_events` | AppsFlyer event data |
| `af_cohort_kpi_daily` | AppsFlyer cohort KPI |


## 💅 Coding Style & Naming
### Format & Lint
- **Auto-format**: Prettier (via ESLint)
- **Linter**: ESLint 9 (flat config)
- **Indentation**: 2 spaces
### Naming Conventions
| Element | Convention | Example |
|---------|-----------|---------|
| **Variables/Functions** | camelCase | `getUserData`, `handleClick` |
| **React Components** | PascalCase | `AccountSelector`, `EventDetail` |
| **Files/Directories** | kebab-case | `account-dialog.tsx`, `mock-data/` |
| **Constants** | UPPER_SNAKE_CASE | `API_ENDPOINT`, `MAX_RETRIES` |
| **Types/Interfaces** | PascalCase | `Account`, `ChangeEvent`, `NewAccount` |
| **tRPC Routers** | camelCase | `accounts`, `events`, `evaluation` |
### Code Organization
- **Components**: `components/[feature]/` - Organized by feature (accounts, evaluation, events)
- **Server**: `server/api/routers/` - tRPC routers, `server/db/` - Database layer
- **Types**: Drizzle infers types from schema (`$inferSelect`, `$inferInsert`)
- **Import ordering**: React → 3rd party → Internal (`@/` alias)


## UI/UX design
### Design Principles
- Comprehensive design checklist in `/context/design-principles.md`
- Brand style guide in `/context/style-guide.md`
- When making visual (front-end, UI/UX) changes, always refer to these files for guidance
### Quick Visual Check
IMMEDIATELY after implementing any front-end change:
1. **Identify what changed** – Review the modified components/pages
2. **Navigate to affected pages** – Use `mcp__playwright__browser_navigate` to visit each changed view
3. **Verify design compliance** – Compare against `/context/design-principles.md` and `/context/style-guide.md`
4. **Validate feature implementation** – Ensure the change fulfills the user's specific request
5. **Check acceptance criteria** – Review any provided context files or requirements
6. **Capture evidence** – Take full page screenshot at desktop viewport (1440px) of each changed view
7. **Check for errors** – Run `mcp__playwright__browser_console_messages`
This verification ensures changes meet design standards and user requirements.
### Component Library
| Config | Value |
|--------|-------|
| **Library** | Material-UI (MUI) 7.3.5 |
| **Base** | Material Design, Emotion |
| **Components Path** | `/components/` |
| **Extended** | @mui/x-data-grid, @mui/x-charts, @mui/x-date-pickers |
| **Icons** | @mui/icons-material |
| **Theme** | MUI ThemeProvider (root layout) |
### Usage Rules
- ✅ Use MUI components first before building custom
- ✅ Follow MUI's composition patterns
- ✅ Extend via wrapper components when needed
- ✅ Use MUI X components for data grids, charts, date pickers
- 🚫 Don't modify MUI source files directly

## 🧪 Testing Guidelines
### Test Commands
| Task | Command | Purpose |
|------|---------|---------|
| **Seed data** | `just db-seed` | Seed evaluation test data |
| **Run tests** | `just db-test` | Run evaluation tests |
### Test Organization
**Current**: Manual test files using `tsx` runner
- `server/evaluation/test-evaluation.ts` - Evaluation query tests
- `server/db/test-queries-appsflyer.ts` - AppsFlyer query tests
**Future**: Jest/Vitest for unit tests, Playwright for E2E
### Coverage Priorities
Focus on: Edge cases, business logic (evaluation rules), tRPC contracts, data transformations
Don't test: MUI internals, simple getters/setters
### ⚠️ Rules
✅ Test before commit - ✅ Add tests for bug fixes - ✅ Cover edge cases and error paths

## 📝 Git Commit & PR Guidelines
### Commit Message Format
**Types**: `feat` | `fix` | `docs` | `style` | `refactor` | `test` | `chore`
### Standard Flow
1. **Commit after every change** - Don't leave uncommitted files
2. **Write clear message** - Present tense, reference issue IDs (e.g., `feat(api): add user endpoint #123`)
3. **Create PR with**:
   - Concise description of change
   - Testing evidence (command output/screenshots)
   - Notes on config/schema updates

## 🔄 tRPC API Architecture
### Core Principle
This project uses **tRPC** (not OpenAPI) for end-to-end type safety. Schema changes flow: Drizzle Schema → tRPC Router → React Query Client.

### Router Structure
```
appRouter (server/api/root.ts)
├── accounts   // Account CRUD, list active accounts
├── events     // Change event queries, filtering, pagination
├── stats      // Statistics and aggregations
└── evaluation // Creatives, campaigns, operations, recommendations
```

### tRPC Client Setup
- **Server**: `server/api/root.ts` exports `appRouter`
- **Client**: `lib/trpc/client.ts` creates React client
- **Endpoint**: `/api/trpc` (HTTP batch link)
- **Query config**: `staleTime: 5000ms`, no auto-refetch

### Adding New Endpoints
1. Create/update router in `server/api/routers/`
2. Add to `appRouter` in `server/api/root.ts`
3. Use in components via `trpc.routerName.procedureName.useQuery()`
4. Types are automatically inferred - no manual type definitions needed

## 🔗 AppsFlyer Integration
### Commands
| Task | Command | Purpose |
|------|---------|---------|
| **Setup** | `just af-setup` | Set up Python venv |
| **Sync yesterday** | `just af-sync-yesterday` | Sync yesterday's data |
| **Sync range** | `just af-sync-range 2024-01-01 2024-01-31` | Sync date range |
| **Backfill 30d** | `just af-backfill-30` | Backfill 30 days |
| **Backfill 180d** | `just af-backfill-180` | Backfill 180 days |
| **Status** | `just af-status` | Show recent sync logs |
| **Count** | `just af-count` | Count records in tables |

### ETL Pipeline
- **Location**: `server/appsflyer/`
- **Scripts**: `sync_af_data.py` (main ETL), `backfill.py` (historical)
- **Tables**: `af_events`, `af_cohort_kpi_daily`, `af_sync_log`
- **Env vars**: `AF_API_TOKEN`, `AF_APP_ID`, `AF_DEFAULT_MEDIA_SOURCE`, `AF_DEFAULT_GEO`
