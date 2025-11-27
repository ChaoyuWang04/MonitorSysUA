# Technical Reference Document

## Technology Stack

| Category | Technology | Version |
|----------|-----------|---------|
| **Framework** | Next.js | 16.0.3 |
| **Language** | TypeScript | 5.7.2 |
| **Runtime** | React | 19.2.0 |
| **Database** | PostgreSQL | 16-alpine |
| **ORM** | Drizzle ORM | 0.44.7 |
| **Migration** | Atlas | ariga.io |
| **UI Library** | MUI | 7.3.5 |
| **Styling** | Emotion | 11.14.0 |
| **State** | TanStack Query | 5.90.9 |
| **API** | tRPC | 11.7.1 |
| **Validation** | Zod | 4.1.12 |
| **External** | Google Ads API | 21.0.1 |
| **ETL** | Python | 3.x (numpy, pandas, psycopg2) |

## Architecture Decisions

### tRPC over REST
- Full type safety from server to client
- No OpenAPI spec maintenance
- Automatic TypeScript inference
- Simpler client code (no fetch/axios)

### Drizzle ORM over Prisma
- Better TypeScript inference
- Smaller bundle size
- SQL-like query builder
- Direct schema-to-type mapping

### Python Subprocess for Evaluation
- Leverage existing Python ML libraries
- Separate concerns (evaluation logic vs API)
- Easy to update without rebuilding
- JSON communication via stdout

### MUI over Tailwind
- Pre-built components reduce development time
- Consistent design system
- Accessibility built-in
- X-components for data-heavy UI (DataGrid, Charts)

## Development Commands

| Command | Description |
|---------|-------------|
| `just dev` | Start dev server (port 4000) |
| `just build` | Production build |
| `just check` | Lint + type-check + build |
| `just docker-up` | Start PostgreSQL container |
| `just docker-down` | Stop PostgreSQL container |
| `just db-status` | Check migration status |
| `just db-diff "name"` | Create new migration |
| `just db-apply` | Apply pending migrations |
| `just db-studio` | Open Drizzle Studio |
| `just af-sync-yesterday` | Sync AppsFlyer data |

## Environment Variables

```bash
# Database
DATABASE_URL="postgresql://user:pass@localhost:5433/monitorsysua"

# Google Ads
GOOGLE_ADS_DEVELOPER_TOKEN="..."
GOOGLE_ADS_CLIENT_ID="..."
GOOGLE_ADS_CLIENT_SECRET="..."
GOOGLE_ADS_REFRESH_TOKEN="..."
GOOGLE_ADS_LOGIN_CUSTOMER_ID="..."

# AppsFlyer
AF_API_TOKEN="..."
AF_APP_ID="..."
AF_BASE_URL="https://hq.appsflyer.com"

# PostgreSQL (for Python scripts)
PG_HOST="localhost"
PG_PORT="5433"
PG_USER="..."
PG_PASSWORD="..."
PG_DATABASE="monitorsysua"
```

## Key Patterns

### Soft Delete
All delete operations set `isActive = false` instead of hard delete. All queries filter by `isActive = true` by default.

### Multi-Account Isolation
All data queries require `accountId` parameter. Foreign key constraints ensure data integrity.

### Evaluation Scoring Rules
| Score | Achievement Rate |
|-------|-----------------|
| Excellent | >= 110% |
| Qualified | 85% - 110% |
| Failed | < 85% |

### Status Thresholds
| Status | Min Achievement Rate |
|--------|---------------------|
| Excellent | >= 110% |
| Healthy | 100% - 110% |
| Observation | 85% - 100% |
| Warning | 60% - 85% |
| Danger | < 60% |

## Performance Considerations

### React Query Caching
- `staleTime: 5000ms` - Data considered fresh for 5 seconds
- No automatic refetch on mount/focus/reconnect
- Manual invalidation on mutations

### Database Indexes
- `change_events`: accountId, timestamp, userEmail, campaign
- `campaign_evaluation`: campaignId+date, status
- `af_events`: installDate, eventDate, cohort

### Code Splitting
- Server Components by default
- Client Components only for interactivity
- Dynamic imports for heavy components
