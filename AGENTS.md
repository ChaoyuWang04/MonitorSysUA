## Core Directives
Talk to me with Chinese but write everything in English. Think ultra hard. Plan doc reading wisely (context limits). Always articulate reasoning step-by-step, identify affected system parts. Ask questions to align expectations. After changes: update docs in `docs/`  + git commit.
### Standard Flow
**Phase 1: Requirement Analysis**
1. Identify core requirement 2. Determine scope (which parts affected) 3. Define success criteria
**Phase 2: Current State Assessment**
1. Create search plan (including reading relevant docs in `docs/` first) 2. Execute search and read files 3. Document current implementation (patterns, reusable parts)
**Phase 3: Planning**
1. Identify target workspace(s) 2. Create ordered task list 3. Identify which docs to update (API changes→api.md, DB changes→docs/system/database.md, FE changes→frontend.md, BE logic→backend.md, new features→prd.md, structure changes→structure.md, tech decisions→trd.md) 4. **Confirm plan with user before proceeding**
**Phase 4: Execution**
1. Announce plan ("Will modify X files...") 2. Execute step-by-step per workspace rules 3. Validate each step 4. Update identified docs in `docs/` (keep concise but include necessary details) 5. Git commit with proper message

### Technology Stack
- **Framework**: Next.js 16.0.3 (App Router + Turbopack)
- **Language**: TypeScript 5.7.2 (strict mode)
- **Runtime**: React 19.2.0 (Server + Client Components)
- **Database**: PostgreSQL 16-alpine (Docker, port 5433)
- **ORM**: Drizzle ORM 0.44.7
- **Migration**: Atlas (ariga.io)
- **UI Library**: MUI 7.3.5 (@mui/x-data-grid, @mui/x-charts, @mui/x-date-pickers)
- **Styling**: Emotion CSS-in-JS (@emotion/react, @emotion/styled)
- **State**: TanStack Query 5.90.9 (React Query)
- **API**: tRPC 11.7.1 (type-safe RPC)
- **Validation**: Zod 4.1.12
- **External**: Google Ads API 21.0.1, AppsFlyer (Python ETL)
- **Testing**: Manual (no framework configured)

## 🛠️ Build, Test & Development
### Common Commands
| Task | Command | Purpose |
|------|---------|---------|
| **Install deps** | `just install` | Install npm dependencies |
| **Dev server** | `just dev` | Start dev server (port 4000) |
| **Build** | `just build` | Production build |
| **Start** | `just start` | Start production server |
| **Lint** | `just lint` | Run ESLint |
| **Type check** | `just type-check` | TypeScript checking |
| **All checks** | `just check` | Lint + type-check + build |
| **Setup** | `just setup` | Full project setup (deps + docker + migrations) |
| **Docker up** | `just docker-up` | Start PostgreSQL container |
| **Docker down** | `just docker-down` | Stop PostgreSQL container |
| **DB status** | `just db-status` | Show migration status |
| **DB migrate** | `just db-diff <name>` | Create new migration |
| **DB apply** | `just db-apply` | Apply pending migrations |
| **DB studio** | `just db-studio` | Open Drizzle Studio GUI |
| **DB shell** | `just db-shell` | PostgreSQL shell |
| **AF sync** | `just af-sync-yesterday` | Sync AppsFlyer data |
### Development Workflow
**Daily**: Install deps → Start dev servers (optional) → Make changes
**Pre-commit (REQUIRED)**: Run build commands to verify compilation → Optional: test + lint
### Database Query Script
**Read-only verification**: `scripts/db-query.sh "<SQL>"` - ✅ Only SELECT with `is_deleted = false` filter - 🚫 Never UPDATE/DELETE/INSERT/TRUNCATE, use migrations for schema changes
### ⚠️ Critical Rules
1. **Build before PR** - Always verify frontend + backend compiles 2. **Soft delete everywhere** - All queries must filter `is_deleted = false` 3. **No writes in query script** - Use proper migration tools 4. **Dev servers optional** - Only run when actively testing


## Database Migration Workflow
### Core Principle
Design Doc → Schema Definition → Migration → Database → ORM. Single source of truth: Design docs. Never run migrations in app code. All changes traceable and reversible.
### Absolute Rules
**NEVER execute without confirmation:**
- DROP DATABASE/SCHEMA, TRUNCATE, DELETE WHERE 1=1
- Any write production database
- `just db-reset` without `-dev` suffix
- Direct SQL bypassing migration system
- Any schema changes, migrations (including dev), bulk import/export
**Safe operations (no confirmation needed):** SELECT queries, view migration status, generate migration files (not apply), review SQL files
**Before any DB operation:** Check NODE_ENV + DATABASE_URL port, print environment info, wait for confirmation
### Standard Flow
0. Prep: ensure `.env` `DATABASE_URL` points to target DB, DB is up.
1. Update design: `docs/system/database.md`.
2. Sync schema: `server/db/schema.ts` (Drizzle is schema source; Atlas reads via `atlas.hcl`).
3. Generate migration: `just db-diff "<name>"` → outputs to `atlas/migrations/`.
4. Review SQL: inspect new `atlas/migrations/*.sql` (indexes/constraints/defaults/nullability).
5. Apply: `just db-apply`.
6. Verify: `just db-status`.
7. Export schema (optional): `just db-export` to refresh `.drizzle/` for diff/audit.
8. Types/ORM: Drizzle uses `server/db/schema.ts` as source; run `just type-check` if validation needed.



## 💅 Coding Style & Naming
### Format & Lint
- **Auto-format**: ESLint auto-fix on save
- **Linter**: ESLint 9 (Next.js config)
- **Indentation**: 2 spaces
### Naming Conventions
| Element | Convention | Example |
|---------|-----------|---------|
| **Variables/Functions** | camelCase | `getUserData`, `handleClick` |
| **Classes/Components** | PascalCase | `AccountDialog`, `CampaignEvaluation` |
| **Files/Directories** | kebab-case | `account-selector/`, `change-events/` |
| **Constants** | UPPER_SNAKE_CASE | `API_KEY`, `DEFAULT_PAGE_SIZE` |
| **Types/Interfaces** | PascalCase | `ChangeEvent`, `Account` |
| **Database tables** | snake_case | `change_events`, `campaign_evaluation` |
### Code Organization
- **Server code**: `server/` (api routers, db, google-ads, evaluation, appsflyer)
- **UI components**: `components/` (feature-grouped: accounts/, evaluation/, events/)
- **Shared types**: `lib/types/`
- **tRPC client**: `lib/trpc/`
- **Theme**: `theme/` (MUI theme config + tokens)
### Project-Specific Rules
- Backend: tRPC routers in `server/api/routers/`, Drizzle schema in `server/db/schema.ts`
- Frontend: React components PascalCase, route folders in `app/`
- Validation: Zod schemas inline with tRPC routers


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
| **Library** | MUI (Material-UI) 7.3.5 |
| **Base** | Material Design 3 |
| **Components Path** | `/components/` |
| **Data Components** | @mui/x-data-grid, @mui/x-charts, @mui/x-date-pickers |
| **Styling** | Emotion CSS-in-JS (`sx` prop) |
| **Icons** | @mui/icons-material |
| **Theme** | Custom theme in `/theme/index.ts` + `/theme/tokens.ts` |
### Usage Rules
- ✅ Use library components first before building custom
- ✅ Follow library's composition patterns
- ✅ Extend via wrapper components when needed
- 🚫 Don't modify library source files directly

## 🧪 Testing Guidelines
### Test Commands
No automated test framework configured. Manual testing via:
- `just db-seed` - Seed evaluation test data
- `just db-test` - Run evaluation tests (tsx scripts)
### Test Organization
- Evaluation test scripts: `server/evaluation/mock-data/seed.ts`
- Database test scripts: `server/db/test-*.ts`
- Python test scripts: `server/google-ads/*.py`, `server/appsflyer/*.py`
### Coverage Priorities
Focus on: Evaluation logic, tRPC router behavior, database queries
### ⚠️ Rules
✅ Build before commit (`just check`) - ✅ Verify migrations work - ✅ Test tRPC endpoints manually

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

## 🔄 API Type Safety (tRPC)
### Core Principle
This project uses **tRPC** for type-safe APIs, NOT OpenAPI/REST.
**Single Source of Truth**: tRPC router definitions in `server/api/routers/*.ts`
- ✅ Types are automatically inferred from Zod schemas
- ✅ Frontend gets full type safety via `lib/trpc/`
- 🚫 No OpenAPI spec generation needed
### tRPC Routers
| Router | Purpose |
|--------|---------|
| `accounts.ts` | Multi-account management |
| `evaluation.ts` | Campaign/creative evaluation |
| `events.ts` | Change event queries |
| `stats.ts` | Statistics aggregations |
### Adding New Endpoints
1. Define Zod input/output schemas in router file
2. Add procedure to router (`query` or `mutation`)
3. Register in `server/api/root.ts` if new router
4. Frontend automatically gets types via `api.routerName.procedureName`
