# MonitorSysUA Development Commands
# Usage: just <recipe> [args...]
# Run `just` or `just --list` to see available commands

# Default recipe - show available commands
default:
    @just --list --unsorted

# ============================================
# Development
# ============================================

# Start development server (port 4000)
dev:
    npm run dev

# Build production bundle
build:
    npm run build

# Start production server
start:
    npm run start

# ============================================
# Documentation
# ============================================

# Serve docsify locally (auto reload on refresh)
docs-serve:
    npx docsify-cli@latest serve docs --port 3001

# Install dependencies
install:
    npm install

# ============================================
# Database - Docker
# ============================================

# Start PostgreSQL container
docker-up:
    docker-compose up -d

# Stop PostgreSQL container
docker-down:
    docker-compose down

# View PostgreSQL logs
docker-logs:
    docker-compose logs -f postgres

# Restart PostgreSQL container
docker-restart:
    docker-compose restart postgres

# Check container status
docker-status:
    docker-compose ps

# ============================================
# Database - Atlas Migrations
# ============================================

# Show current migration status
db-status:
    atlas migrate status --env local

# Create a new migration from Drizzle schema changes
db-diff name:
    atlas migrate diff {{name}} --env local

# Apply pending migrations
db-apply:
    atlas migrate apply --env local

# Dry run - show what migrations would be applied
db-apply-dry:
    atlas migrate apply --env local --dry-run

# Validate migrations
db-validate:
    atlas migrate validate --env local

# Lint migrations for issues (check latest migration)
db-lint:
    atlas migrate lint --env local --latest 1

# Hash migrations (after manual edits)
db-hash:
    atlas migrate hash --env local

# Show schema diff between Drizzle and database
db-schema-diff:
    atlas schema diff --env local

# ============================================
# Database - Drizzle (ORM tools only)
# ============================================

# Open Drizzle Studio (database GUI)
db-studio:
    npx drizzle-kit studio

# Export Drizzle schema to SQL (for debugging)
db-export:
    npx drizzle-kit export

# ============================================
# Database - Utilities
# ============================================

# Seed evaluation test data
db-seed:
    npx tsx server/evaluation/mock-data/seed.ts

# Run evaluation tests
db-test:
    npx tsx server/evaluation/test-evaluation.ts

# Regenerate summaries (Python script)
db-regenerate-summaries:
    python3 server/google-ads/regenerate_summaries.py

# Reset database (DANGER: drops all data)
db-reset:
    @echo "WARNING: This will drop all data!"
    @read -p "Are you sure? (y/N) " confirm && [ "$$confirm" = "y" ] || exit 1
    docker-compose down -v
    docker-compose up -d
    @sleep 3
    just db-apply
    @echo "Database reset complete. Run 'just db-seed' to add test data."

# Connect to PostgreSQL shell
db-shell:
    docker exec -it monitorsysua-postgres psql -U postgres -d monitor_sys_ua

# Create database snapshot (CSV preview + JSON for restore)
# Usage: just db-snapshot [limit] [format]
# Examples:
#   just db-snapshot                  # Default: 100 rows per table, CSV preview
#   just db-snapshot 200              # Limit to 200 rows per table
#   just db-snapshot 0                # No limit (export all)
#   just db-snapshot 100 csv          # Explicit CSV preview (JSON still written for restore)
#   just db-snapshot 100 json         # JSON only
db-snapshot limit="100" format="csv":
    @mkdir -p context/db-snapshot
    npx tsx scripts/db-snapshot.ts --limit {{limit}} --format {{format}}

# Restore database from snapshot
# Usage: just db-restore [snapshot_name]
# Examples:
#   just db-restore                              # Restore latest snapshot
#   just db-restore snapshot_20250127_143000     # Restore specific snapshot
db-restore snapshot="":
    @echo "WARNING: This will overwrite current database data!"
    @read -p "Are you sure? (y/N) " confirm && [ "$$confirm" = "y" ] || exit 1
    npx tsx scripts/db-restore.ts {{snapshot}}

# List available snapshots
db-snapshots:
    @ls -la context/db-snapshot/ 2>/dev/null || echo "No snapshots found"

# ============================================
# Code Quality
# ============================================

# Run ESLint
lint:
    npm run lint

# TypeScript type checking
type-check:
    npx tsc --noEmit

# Run all code quality checks
check: lint type-check build

# ============================================
# Setup & Utilities
# ============================================

# One-command project setup (for new developers)
setup:
    @echo "Setting up MonitorSysUA development environment..."
    @echo "1. Installing dependencies..."
    npm install
    @echo "2. Starting Docker containers..."
    docker-compose up -d
    @echo "3. Waiting for database..."
    @sleep 3
    @echo "4. Applying database migrations..."
    just db-apply
    @echo ""
    @echo "Setup complete! Run 'just dev' to start development server."
    @echo "Optional: Run 'just db-seed' to add test data."

# Clean build artifacts
clean:
    rm -rf .next
    rm -rf node_modules/.cache

# Deep clean (includes node_modules)
clean-all:
    rm -rf .next
    rm -rf node_modules

# Show project info
info:
    #!/usr/bin/env bash
    echo "MonitorSysUA - Google Ads Monitoring System"
    echo "============================================"
    echo "Node:       $(node --version)"
    echo "npm:        $(npm --version)"
    echo "Just:       $(just --version)"
    echo "Atlas:      $(atlas version 2>/dev/null | head -1 || echo 'not installed')"
    echo ""
    echo "Database:   postgresql://postgres:***@localhost:5433/monitor_sys_ua"
    echo "Dev Server: http://localhost:4000"
    echo ""
    docker-compose ps 2>/dev/null || echo "Docker containers: Not running"

# ============================================
# Migration from Drizzle (One-time)
# ============================================

# Initialize Atlas from existing database (run once after setup)
atlas-init:
    @echo "Initializing Atlas migration directory..."
    @mkdir -p atlas/migrations
    @echo "Creating baseline migration from current database state..."
    atlas migrate diff baseline --env local
    @echo ""
    @echo "Done! Atlas is now managing your migrations."
    @echo ""
    @echo "Next steps:"
    @echo "1. Run: atlas migrate apply --env local --baseline <timestamp>"
    @echo "   (Replace <timestamp> with the migration timestamp from atlas/migrations/)"
    @echo "2. Verify with: just db-status"
    @echo ""
    @echo "NOTE: Keep server/db/migrations/ for reference, but it's no longer used."

# ============================================
# AppsFlyer - Data Sync Commands
# ============================================

# Set up Python environment for AppsFlyer scripts
af-setup:
    @echo "Setting up Python environment for AppsFlyer..."
    python3 -m venv server/appsflyer/.venv
    server/appsflyer/.venv/bin/pip install -r server/appsflyer/requirements.txt
    @echo "Python environment ready!"

# Sync yesterday's AppsFlyer data
af-sync-yesterday:
    cd server/appsflyer && .venv/bin/python sync_af_data.py --yesterday

# Sync AppsFlyer data for specific date range
af-sync-range from to:
    cd server/appsflyer && .venv/bin/python sync_af_data.py --from-date {{from}} --to-date {{to}}

# Sync events only (no KPI)
af-sync-events from to:
    cd server/appsflyer && .venv/bin/python sync_af_data.py --from-date {{from}} --to-date {{to}} --events-only

# Sync cohort KPI only (no events)
af-sync-kpi from to:
    cd server/appsflyer && .venv/bin/python sync_af_data.py --from-date {{from}} --to-date {{to}} --kpi-only

# Backfill last 30 days (for testing)
af-backfill-30:
    cd server/appsflyer && .venv/bin/python backfill.py --days 30

# Backfill last 180 days (full baseline)
af-backfill-180:
    cd server/appsflyer && .venv/bin/python backfill.py --days 180

# Check AppsFlyer sync status
af-status:
    @echo "=== Recent AppsFlyer Sync Logs ==="
    docker exec -it monitorsysua-postgres psql -U postgres -d monitor_sys_ua -c "SELECT id, sync_type, date_range_start, date_range_end, status, records_processed, started_at FROM af_sync_log ORDER BY started_at DESC LIMIT 10;"

# Count records in AppsFlyer tables
af-count:
    @echo "=== AppsFlyer Table Row Counts ==="
    docker exec -it monitorsysua-postgres psql -U postgres -d monitor_sys_ua -c "SELECT 'af_events' as table_name, COUNT(*) as row_count FROM af_events UNION ALL SELECT 'af_cohort_kpi_daily', COUNT(*) FROM af_cohort_kpi_daily;"

# ============================================
# AppsFlyer - Docker Commands (Automated Sync)
# ============================================

# Build AppsFlyer ETL container
af-docker-build:
    docker-compose build appsflyer-etl

# Start AppsFlyer ETL container (with cron scheduler)
af-docker-up:
    docker-compose up -d appsflyer-etl
    @echo "AppsFlyer ETL container started."
    @echo "Cron schedule: Daily at 2 AM UTC, Monthly at 1st 3 AM UTC"

# Stop AppsFlyer ETL container
af-docker-down:
    docker-compose stop appsflyer-etl

# View AppsFlyer ETL container logs
af-docker-logs:
    docker-compose logs -f appsflyer-etl

# View daily sync log file
af-docker-sync-logs:
    docker exec appsflyer-etl cat /var/log/appsflyer/daily-sync.log 2>/dev/null || echo "No sync logs yet."

# View baseline update log file
af-docker-baseline-logs:
    docker exec appsflyer-etl cat /var/log/appsflyer/baseline-update.log 2>/dev/null || echo "No baseline logs yet."

# Manual sync via Docker (yesterday)
af-docker-sync-yesterday:
    docker exec appsflyer-etl python sync_af_data.py --yesterday

# Manual sync via Docker (date range)
af-docker-sync-range from to:
    docker exec appsflyer-etl python sync_af_data.py --from-date {{from}} --to-date {{to}}

# Manual baseline update via Docker
af-docker-baseline-update:
    docker exec appsflyer-etl python monthly_baseline_update.py

# Restart AppsFlyer ETL container
af-docker-restart:
    docker-compose restart appsflyer-etl

# Check AppsFlyer container status
af-docker-status:
    docker-compose ps appsflyer-etl
    @echo ""
    @echo "=== Container Logs (last 10 lines) ==="
    docker-compose logs --tail=10 appsflyer-etl
