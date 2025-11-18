The most important thing that u need to keep in your mind:
**Remember**: Always think ultra hard and use proper mcp tools and sub-agents when needed. For requirements, always think proactively first and always articulate the reasoning process step by step—identify which parts of the existing system this new change will affect. For implementation, always analyze how we can ensure the new feature implementation integrates perfectly with the existing system and ensure the new system is robust and complete. Meanwhile, please ask me questions at any time to ensure our expectations for the system are aligned. We not only need to implement this new feature but also ensure its interaction with other system components is perfect. After implementation, please update todo.md in the root directory.

## 🎯 Core Directives

When working here:
1. **Follow instructions literally** - don't assume or improvise unless explicitly told
2. **Ask for clarification** when requirements are ambiguous
3. **Report what you're doing** before executing complex operations

## 📍 Workspace Routing System

### How Routing Works
```
User Input → Analyze Requirements → Search & Assess Current State → Create Implementation Plan → Execute in Target Workspace
```

### Routing Workflow

**CRITICAL**: This is NOT keyword-based routing. You must analyze and plan before acting.

#### Phase 1: Requirement Analysis
When receiving any task, FIRST:
1. **Identify the core requirement** - What does the user actually want to achieve?
2. **Determine scope** - Which parts of the codebase will be affected?
3. **List success criteria** - How will we know the task is complete?

#### Phase 2: Current State Assessment
Before any implementation:
1. **Create search plan** - List all files/directories that might be relevant
2. **Execute search and read files**
3. **Document current implementation**
   - What already exists?
   - What patterns are being used?
   - What can be reused?

#### Phase 3: Implementation Planning
Based on assessment, create an execution plan and then confirm with me:
1. **Identify target workspace(s)** - Where will changes be made?
2. **Load relevant CLAUDE.md files** - Get workspace-specific rules
3. **Create task list** with specific order and a todo.md file in the root

#### Phase 4: Execution
Only NOW do you start implementation:
1. **Announce plan to user** - "Based on analysis, I'll need to modify X files..."
2. **Load workspace CLAUDE.md** - `[workspace]/CLAUDE.md`
3. **Execute plan step by step** - Follow workspace-specific instructions
4. **Validate each step** - Run tests, check for errors

### Workspace Reference Table

**Note**: These are NOT trigger keywords. They're reference categories for Phase 3 planning.

| Workspace | Actual Directories | Purpose | Key Files |
|-----------|-------------------|---------|-----------|
| **Frontend** | `/app/*`, `/components/*`, `/theme/*` | Client-side UI and routing | `app/(dashboard)/*`, `components/events/*`, `components/layout/*` |
| **Backend** | `/server/*` | Server-side API and business logic | `server/api/routers/*`, `server/google-ads/*` |
| **Database** | `/server/db/*` | Database schema and queries | `server/db/schema.ts`, `server/db/queries.ts`, `server/db/migrations/*` |
| **Configuration** | Root files | Project configuration | `package.json`, `tsconfig.json`, `drizzle.config.ts`, `next.config.js` |
| **Documentation** | `/docs/*`, `/context/*`, root `.md` files | Project documentation | `prd.md`, `docs/todo.md`, `context/design-principles.md`, `context/prd.md` |

### Technology Stack

- **Framework**: Next.js 16.0.3 (App Router)
- **Language**: TypeScript 5.7.2
- **Runtime**: Node.js 18+ (20 LTS recommended)
- **Database**: PostgreSQL 16 (Docker)
- **ORM**: Drizzle ORM 0.44.7 (type-safe, lightweight)
- **API Layer**: tRPC 11.7.1 (end-to-end type safety)
- **Validation**: Zod 4.1.12 (schema validation)
- **UI Library**: Material UI 7.3.5 (enterprise components)
- **Styling Engine**: Emotion 11.14.0+ (CSS-in-JS, MUI's engine)
- **Data Grid**: MUI X DataGrid 8.18.0 (advanced tables)
- **Date Pickers**: MUI X Date Pickers 8.18.0
- **State Management**: React Context + React Query 5.90.9 (TanStack Query)
- **Icons**: MUI Icons Material 7.3.5
- **Date Utilities**: date-fns 4.1.0
- **Google Ads Integration**: google-ads-api 21.0.1 (official Node.js client)
- **Package Manager**: npm

### Project Structure

```
MonitorSysUA/
├── app/                           # Next.js App Router
│   ├── (dashboard)/              # Dashboard route group
│   │   ├── layout.tsx            # Sidebar + AppBar + AccountSelector
│   │   ├── page.tsx              # Statistics Dashboard
│   │   ├── events/page.tsx       # Events List (DataGrid)
│   │   └── accounts/page.tsx     # Account Management
│   ├── api/trpc/[trpc]/route.ts  # tRPC HTTP handler
│   ├── layout.tsx                # Root layout (HTML, theme providers)
│   └── providers.tsx             # tRPC + React Query + AccountContext
│
├── components/                    # React components
│   ├── events/
│   │   └── event-detail.tsx      # Event detail dialog
│   ├── layout/
│   │   └── account-selector.tsx  # Account dropdown selector
│   ├── accounts/
│   │   └── account-dialog.tsx    # Add/Edit account form
│   └── stats/                    # Statistics components
│
├── server/                        # Backend logic
│   ├── api/
│   │   ├── root.ts               # Root tRPC router
│   │   ├── trpc.ts               # tRPC initialization
│   │   └── routers/              # accounts, events, stats routers
│   ├── db/
│   │   ├── schema.ts             # Drizzle schema (accounts, change_events)
│   │   ├── queries.ts            # Database query functions
│   │   └── migrations/           # SQL migration files
│   └── google-ads/
│       ├── client.ts             # Google Ads API client (MCC support)
│       ├── parser.ts             # ChangeEvent parser
│       └── diff-engine.ts        # Deep diff algorithm
│
├── lib/
│   ├── trpc/
│   │   └── client.ts             # tRPC React client
│   └── contexts/
│       └── account-context.tsx   # Global account state
│
├── context/                       # Design documentation
│   ├── design-principles.md      # S-Tier SaaS design checklist
│   └── prd.md                    # Product requirements (symlink)
│
├── theme/
│   └── index.ts                  # MUI theme configuration
│
├── docs/                          # Project documentation
│   ├── todo.md                   # Development tasks
│   └── TESTING-SUMMARY.md        # Testing guide
│
├── mvp/                          # MVP prototype (Flask/Python - reference only)
│
├── .env.example                  # Environment variables template
├── drizzle.config.ts             # Drizzle ORM configuration
├── next.config.js                # Next.js configuration
├── tsconfig.json                 # TypeScript configuration
├── package.json                  # Dependencies
├── prd.md                        # Product requirements document
└── CLAUDE.md                     # Project instructions
```

### Key Architecture Patterns

1. **Component Structure**:
   - Server Components by default (Next.js App Router)
   - Client Components marked with 'use client'
   - Modular component organization by feature

2. **State Management**:
   - React Context for global UI state (account selection)
   - React Query (via tRPC) for server state
   - Local state for UI components

3. **API Communication**:
   - tRPC for type-safe client-server communication
   - Zod for runtime validation
   - Batched HTTP requests via httpBatchLink

4. **Styling Strategy**:
   - Material UI v7 component library
   - Emotion CSS-in-JS (MUI's styling engine)
   - Theme system with design tokens
   - Responsive design with MUI breakpoints

5. **Data Layer**:
   - Drizzle ORM for type-safe database queries
   - PostgreSQL with JSONB for complex data
   - Indexes for query performance
   - Unique constraints for data integrity

6. **Error Handling**:
   - TRPCError for API errors
   - Zod validation errors
   - Toast notifications for user feedback
   - Try-catch blocks in async operations

7. **Performance**:
   - Server-side pagination (50 items/page)
   - React Query caching
   - Server Components for reduced client JS
   - MUI's tree-shaking support

8. **Multi-Account Architecture**:
   - Supports multiple Google Ads accounts via MCC (Manager Account)
   - Single Service Account authentication for all accounts
   - Account selector in sidebar with localStorage persistence
   - All data queries scoped by accountId

## 💻 Development Workflow

### Setup Commands

```bash
# Install dependencies
npm install

# Development server (runs on port 4000)
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Docker database operations
npm run docker:db:up     # Start PostgreSQL container
npm run docker:db:down   # Stop PostgreSQL container
npm run docker:db:logs   # View database logs
npm run docker:db:restart # Restart database container
npm run docker:db:reset  # Reset database (WARNING: deletes all data)

# Database operations
npm run db:generate      # Generate Drizzle migration files
npm run db:migrate       # Run database migrations
npm run db:studio        # Open Drizzle Studio (DB GUI)

# Code quality
npm run lint             # ESLint
npx tsc --noEmit        # TypeScript type checking
```

### Environment Variables

Required variables (see `.env.example`):
- `DATABASE_URL` - PostgreSQL connection string (Docker: `postgresql://postgres:postgres@localhost:5433/monitor_sys_ua`)
- `GOOGLE_ADS_DEVELOPER_TOKEN` - From MCC account
- `GOOGLE_ADS_JSON_KEY_FILE_PATH` - Service account key file path
- `GOOGLE_ADS_LOGIN_CUSTOMER_ID` - MCC manager ID (10 digits, no dashes)
- `GOOGLE_ADS_DEFAULT_CUSTOMER_ID` - Default client account
- `NEXT_PUBLIC_APP_URL` - Application URL

**Database Setup**:
1. Start Docker database: `npm run docker:db:up`
2. Run migrations: `npm run db:migrate`
3. See detailed Docker guide: `docs/DOCKER-SETUP.md`

## Git Workflow (Before Making Changes)

**ALWAYS execute these checks first:**

1. **Verify current branch**
   ```bash
   git branch --show-current
   ```

2. **Add unsaved file and commit with correct comment **
   ```bash
   git add .
   git commit -m "related comment to the change"
   ```

### Commit Message Format
```
type(scope): subject
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, missing semicolons, etc.)
- `refactor`: Code refactoring without changing functionality
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

## 🐛 Debugging Instructions

### Debug Workflow

1. Error Collection : Browser errors via Chrome DevTools MCP and Playwright MCP
2. Documentation Research : Query official docs via Context7 mcp
3. Solution Planning : Create fix plan based on findings
4. User Confirmation:
**MUST present findings before fixing:**
```
Found: [error] caused by [root cause]
Official docs recommend: [solution]
I need to change: [specific changes]
May I proceed?
```
5. Implementation
Only after approval, implement fixes and verify using Chrome/Playwright tools.

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

### Comprehensive Design Review

Invoke the `@agent-design-review` subagent for thorough design validation when:
- Completing significant UI/UX features
- Before finalizing PRs with visual changes
- Needing comprehensive accessibility and responsiveness testing

### Material UI Components

- Enterprise-grade component library (MUI v7)
- Components in `/components/*` (custom) and imported from `@mui/material`
- Emotion CSS-in-JS for styling with theme system
- MUI Icons Material for consistent iconography
- MUI X DataGrid for advanced data tables
- Theme configuration in `/theme/index.ts`

## ⚠️ Critical Rules

**NEVER DO THESE**:
1. ❌ Delete files without explicit permission
2. ❌ Modify core configuration without discussion
3. ❌ Commit sensitive data (passwords, API keys)
4. ❌ Force push to main branch
5. ❌ Ignore failing tests
6. ❌ Use `any` type in TypeScript without comment explaining why
7. ❌ Copy-paste code without understanding it
8. ❌ Make assumptions about business logic

**ALWAYS DO THESE**:
1. ✅ Read error messages completely before fixing
2. ✅ Test your changes locally
3. ✅ Keep commits atomic and focused
4. ✅ Update documentation when changing APIs
5. ✅ Ask for clarification when unsure
6. ✅ Report blockers immediately
7. ✅ Follow existing patterns in codebase
8. ✅ Consider edge cases and error states
