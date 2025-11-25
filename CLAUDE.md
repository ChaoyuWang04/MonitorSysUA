The most important thing that u need to keep in your mind:
**Remember**: Always think ultra hard and use proper mcp tools and sub-agents when needed, also remember to plan reading docs wisely, some are way too long with your limited context window. For requirements, always think proactively first and always articulate the reasoning process step by step—identify which parts of the existing system this new change will affect. For implementation, always analyze how we can ensure the new feature implementation integrates perfectly with the existing system and ensure the new system is robust and complete. Meanwhile, please ask me questions at any time to ensure our expectations for the system are aligned. We not only need to implement this new feature but also ensure its interaction with other system components is perfect. After implementation, please update todo.md in the root directory.

## 🎯 Core Directives

When working here:
1. **Follow instructions literally** - don't assume or improvise unless explicitly told
2. **Ask for clarification** when requirements are ambiguous
3. **Report what you're doing** before executing complex operations
4. **Always analyze and plan before acting.**
## 📍 Workspace Routing System

### Core Principle (must follow step by step, do not skip!!!)
**CRITICAL**:  User Input → Analyze Requirements → Assess Current State → Plan → Execute in Target Workspace - git commit
### Standard Flow (Do NOT skip phases)
**Phase 1: Requirement Analysis**
1. Identify core requirement - What does user actually want?
2. Determine scope - Which parts affected?
3. Define success criteria - How to verify completion?
**Phase 2: Current State Assessment**
1. Create search plan - List relevant files/directories
2. Execute search and read files
3. Document current implementation - What exists? What patterns? What's reusable?
**Phase 3: Implementation Planning**
1. Identify target workspace(s)
2. Load relevant CLAUDE.md files
3. Create ordered task list + root `todo.md`
4. **Confirm plan with user before proceeding**
**Phase 4: Execution**
1. Announce plan - "Based on analysis, I'll modify X files..."
2. Execute step by step - Follow workspace-specific rules
3. Validate each step - Run tests, check errors
4. Git commit with proper comment.

### Technology Stack
- **Framework**: Next.js 16.0.3 with App Router
- **Language**: TypeScript 5.7.2 (strict mode enabled)
- **Runtime**: React 19.2.0
- **Database**: PostgreSQL 16-alpine (Docker) + Drizzle ORM 0.44.7
- **API Layer**: tRPC 11.7.1 (end-to-end type-safe RPC)
- **UI Library**: Material-UI (MUI) 7.3.5 with Emotion CSS-in-JS
- **State Management**: React Query 5.90.9 (@tanstack/react-query) + React Context
- **Validation**: Zod 4.1.12
- **Testing**: tsx for script execution (no formal test framework configured)
- **External APIs**: Google Ads API (google-ads-api 21.0.1)

### Key Architecture Patterns
- **Component Structure**: Feature-based organization (accounts/, evaluation/, events/, stats/)
- **State Management**: tRPC + React Query for server state, React Context for UI state
- **API Communication**: tRPC with end-to-end type safety (no REST/GraphQL)
- **Styling Strategy**: MUI sx prop with Emotion CSS-in-JS
- **Error Handling**: tRPC error formatting + toast notifications + form validation
- **Performance**: Server Components by default, 'use client' only for interactivity
- **Type Safety**: TypeScript strict mode + Zod validation + Drizzle type inference

### Project Structure
```
MonitorSysUA/
├── app/                              # Next.js App Router
│   ├── (dashboard)/                  # Dashboard route group
│   │   ├── page.tsx                  # Main dashboard
│   │   ├── layout.tsx                # Shared layout
│   │   ├── accounts/                 # Account management page
│   │   ├── evaluation/               # Evaluation system pages (A2-A7)
│   │   └── events/                   # Event management page
│   ├── api/trpc/[trpc]/              # tRPC API handler
│   ├── layout.tsx                    # Root layout (MUI theme setup)
│   └── providers.tsx                 # Root providers (tRPC, React Query)
│
├── server/                           # Backend business logic
│   ├── api/                          # tRPC API layer
│   │   ├── trpc.ts                   # tRPC setup & context
│   │   ├── root.ts                   # Root router (accounts, events, stats, evaluation)
│   │   └── routers/                  # Individual routers
│   │       ├── accounts.ts           # Account CRUD procedures
│   │       ├── events.ts             # Event queries/mutations
│   │       ├── stats.ts              # Statistics procedures
│   │       └── evaluation.ts         # Evaluation system procedures
│   │
│   ├── db/                           # Database layer (Drizzle ORM)
│   │   ├── schema.ts                 # Drizzle schema definition
│   │   ├── queries.ts                # Common query helpers
│   │   ├── queries-evaluation.ts     # Evaluation-specific queries
│   │   ├── index.ts                  # DB client export
│   │   └── migrations/               # Drizzle-generated SQL migrations
│   │
│   ├── evaluation/                   # Evaluation system (Phase 4-5)
│   │   ├── mock-data/                # Test data generators
│   │   └── python/                   # Python evaluation scripts
│   │
│   └── google-ads/                   # Google Ads API integration
│
├── components/                       # React components
│   ├── common/                       # Shared (confirm-dialog, toast-provider)
│   ├── accounts/                     # Account management UI
│   ├── evaluation/                   # Evaluation system UI
│   ├── events/                       # Event display components
│   ├── stats/                        # Statistics components
│   └── layout/                       # Layout components (account-selector)
│
├── lib/                              # Frontend utilities
│   ├── contexts/                     # React Context (account-context)
│   ├── services/                     # API service layer
│   ├── types/                        # TypeScript type definitions
│   ├── trpc/                         # tRPC client setup
│   └── utils/                        # Utility functions
│
├── context/                          # Design & documentation context
│   ├── design-principles.md          # S-Tier SaaS Design Checklist
│   ├── trd.md                        # Technical Reference Document
│   └── prd.md                        # Product Requirements
│
├── docs/                             # Project documentation
│   ├── prd_v1.md, prd_v2.md, prd_v3.md  # PRD versions
│   └── TODO-AUTHENTICATION.md        # Auth implementation plan
│
├── mvp/                              # Legacy MVP (Python Flask) - Reference only
│
├── docker-compose.yml                # PostgreSQL database
├── drizzle.config.ts                 # Drizzle Kit configuration
├── atlas.hcl                         # Atlas migration configuration
├── justfile                          # Just command runner recipes
├── atlas/migrations/                 # Atlas-managed migrations
├── next.config.js                    # Next.js configuration
├── tsconfig.json                     # TypeScript (strict mode)
├── package.json                      # Dependencies & scripts
├── .env.example                      # Environment template
└── CLAUDE.md                         # This file
```
**Key Principles:**
- **app/**: Next.js App Router with route groups for dashboard
- **server/**: All backend logic (tRPC routers, DB queries, external APIs)
- **components/**: Feature-based React components
- **lib/**: Frontend utilities, contexts, types
- **context/**: Design docs and PRD (for Claude reference)
- **Root files**: Only global configs

## 🛠️ Build, Test & Development

This project uses **Just** as the command runner and **Atlas** for database migrations.
Run `just` to see all available commands.

### Quick Start

```bash
# First time setup (installs deps, starts Docker, applies migrations)
just setup

# Daily development
just dev              # Start dev server (http://localhost:4000)
just docker-up        # Start database containers
```

### Command Reference

| Category | Commands |
|----------|----------|
| **Development** | `just dev`, `just build`, `just start`, `just install` |
| **Database** | `just db-status`, `just db-diff <name>`, `just db-apply`, `just db-studio` |
| **Docker** | `just docker-up`, `just docker-down`, `just docker-logs`, `just docker-status` |
| **Code Quality** | `just lint`, `just type-check`, `just check` |
| **Utilities** | `just setup`, `just info`, `just clean`, `just db-seed`, `just db-reset` |

### Development Workflow
**Daily**: `just docker-up` → `just dev` → Make changes
**Pre-commit (REQUIRED)**: `just check` (runs lint + type-check + build)

### Database Access
**Drizzle Studio**: `just db-studio` - Visual database browser
**Direct PostgreSQL**: `just db-shell` or `psql postgresql://postgres:postgres@localhost:5433/monitor_sys_ua`

### ⚠️ Critical Rules
1. **Build before PR** - Always verify `just build` passes
2. **Soft delete pattern** - Use `isActive: false` instead of DELETE
3. **Docker required** - PostgreSQL runs in Docker, start with `just docker-up`
4. **Port 4000** - Dev server runs on http://localhost:4000


## 🗄️ Database Migration Workflow

### Core Principle
```
Design Doc → Schema Definition → Migration → Database
(context/trd.md)  (server/db/schema.ts)  (atlas/migrations/)
```
**Single source of truth**: `server/db/schema.ts` (Drizzle schema)
- Atlas uses `drizzle-kit export` to read the schema
- Atlas generates SQL migrations from schema changes
- 🚫 Never edit migration files manually
- ✅ All changes via schema.ts → `just db-diff` → `just db-apply`
- ✅ Types auto-inferred from schema

### Standard Flow (Do NOT skip steps)
1. **Update design**: `context/trd.md` or `docs/prd_v*.md`
2. **Update schema**: `server/db/schema.ts`
3. **Generate migration**: `just db-diff descriptive_name`
4. **Review SQL**: `atlas/migrations/*.sql`
5. **Lint migration**: `just db-lint` (catches destructive changes)
6. **Apply**: `just db-apply`
7. **Verify**: `just db-studio` or `just db-status`

### Key Commands
| Command | Purpose |
|---------|---------|
| `just db-status` | Show migration status |
| `just db-diff <name>` | Create new migration from schema changes |
| `just db-apply` | Apply pending migrations |
| `just db-apply-dry` | Preview what would be applied |
| `just db-lint` | Check for issues in latest migration |
| `just db-studio` | Open Drizzle Studio GUI |
| `just docker-up` | Start PostgreSQL container |
| `just docker-logs` | View database logs |


## 💅 Coding Style & Naming
### Format & Lint
- **Linter**: ESLint with Next.js config (`npm run lint`)
- **Indentation**: 2 spaces
- **No Prettier**: Use ESLint for formatting

### Naming Conventions
| Element | Convention | Example |
|---------|-----------|---------|
| **Variables/Functions** | camelCase | `selectedAccountId`, `getAccounts()` |
| **Components** | PascalCase | `AccountDialog`, `StatusChip` |
| **Component Files** | kebab-case.tsx | `account-dialog.tsx`, `status-chip.tsx` |
| **Database Columns** | snake_case | `customer_id`, `is_active`, `created_at` |
| **Constants** | UPPER_SNAKE_CASE | `TIME_ZONES`, `CURRENCIES` |
| **Interfaces** | PascalCase + Props | `AccountDialogProps`, `StatusChipProps` |
| **Types** | PascalCase | `Account`, `NewAccount` |

### Code Organization
- **Path alias**: `@/*` maps to root directory
- **Import ordering**: React → MUI → @/ internal imports → types
- **Feature co-location**: Keep related components in feature folders

### Project-Specific Rules
- **'use client'**: Add directive for interactive components
- **Soft delete**: Use `isActive: false` instead of DELETE
- **Zod validation**: All tRPC inputs validated with Zod schemas
- **Type inference**: Use Drizzle's `$inferSelect` / `$inferInsert` for DB types


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
| **Base** | Material Design |
| **Components Path** | `/components/` (feature-based) |
| **Styling** | Emotion CSS-in-JS with `sx` prop |
| **Icons** | @mui/icons-material |
| **Theme** | MUI ThemeProvider in `app/layout.tsx` |
| **Data Grid** | @mui/x-data-grid |
| **Charts** | @mui/x-charts |
| **Date Pickers** | @mui/x-date-pickers with date-fns |

### Usage Rules
- ✅ Use MUI components first before building custom
- ✅ Use `sx` prop for component-specific styling
- ✅ Use responsive breakpoints: `{ xs, sm, md, lg, xl }`
- ✅ Extend via wrapper components when needed
- 🚫 Don't use inline styles, use `sx` prop instead

## 🧪 Testing Guidelines
### Test Commands
| Command | Purpose |
|---------|---------|
| `just db-test` | Run evaluation system tests |
| `just db-seed` | Seed evaluation test data |

### Test Organization
- **Backend tests**: Co-located in `server/` (e.g., `test-evaluation-queries.ts`)
- **Evaluation tests**: `server/evaluation/test-evaluation.ts`
- **No formal test framework**: Uses tsx for script execution

### Coverage Priorities
- **Focus on**: tRPC procedures, database queries, evaluation logic
- **Don't test**: MUI components, framework internals

### ⚠️ Rules
- ✅ Test critical business logic before commit
- ✅ Add tests for bug fixes
- ✅ Cover edge cases and error paths
- 🚫 No formal Jest/Vitest setup yet - use tsx scripts

## 📝 Git Commit & PR Guidelines
### Commit Message Format
```
<type>(<scope>): <subject>
Example: feat(auth): 添加JWT token刷新机制
```
**Types**: `feat` | `fix` | `docs` | `style` | `refactor` | `test` | `chore`
### Standard Flow
1. **Commit after every change** - Don't leave uncommitted files
2. **Write clear message** - Present tense, reference issue IDs (e.g., `feat(api): add user endpoint #123`)
3. **Create PR with**:
   - Concise description of change
   - Testing evidence (command output/screenshots)
   - Notes on config/schema updates
4. **Request reviews** - Both backend & frontend owners for shared contracts
### Key Rules
- ✅ Commit frequently, push often
- ✅ Use conventional commit format
- ✅ Include testing proof in PRs
- 🚫 Mix unrelated changes in one commit


## 🔄 tRPC Type Flow (replaces OpenAPI)
### Core Principle
This project uses **tRPC** instead of OpenAPI for end-to-end type safety.
```
Server Router → Type Inference → Client Hooks
(server/api/routers/*.ts) → (AppRouter type) → (lib/trpc/client.ts)
```
**Single Source of Truth**: tRPC router definitions with Zod schemas
- 🚫 No code generation needed
- ✅ Types automatically inferred at compile-time
- ✅ Full type safety from backend to frontend

### Key Files
| File | Purpose |
|------|---------|
| `server/api/trpc.ts` | tRPC setup & context |
| `server/api/root.ts` | Root router combining all routers |
| `server/api/routers/*.ts` | Individual procedure definitions |
| `lib/trpc/client.ts` | Client-side tRPC hooks |
| `app/api/trpc/[trpc]/route.ts` | Next.js API handler |

### Type Safety Flow
1. Define Zod schema in router procedure input
2. Types automatically inferred on client via `trpc.[router].[procedure]`
3. No manual type definitions needed

### Adding New Procedures
1. Add procedure to appropriate router in `server/api/routers/`
2. Define Zod input schema
3. Return typed data
4. Use on client: `trpc.[router].[procedure].useQuery()` or `.useMutation()`

### ⚠️ Critical Rules
- Never use `any` type with tRPC hooks
- Always use Zod for input validation
- Export AppRouter type from `server/api/root.ts`
- Use React Query patterns for data fetching
