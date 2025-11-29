#!/bin/bash
set -e

echo "============================================"
echo "AppsFlyer ETL Container Starting"
echo "============================================"
echo "Timezone: $(cat /etc/timezone)"
echo "Current time: $(date)"
echo ""

# Export environment variables for cron
# Cron runs in a minimal environment and doesn't inherit Docker env vars
echo "Exporting environment variables for cron..."
printenv | grep -E '^(AF_|PG_|SMTP_|DATABASE_|TZ)' > /etc/environment
echo "Environment variables exported."

# Wait for PostgreSQL to be ready
echo ""
echo "Waiting for PostgreSQL..."
MAX_RETRIES=30
RETRY_COUNT=0

until pg_isready -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d "$PG_DATABASE" > /dev/null 2>&1; do
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
        echo "ERROR: PostgreSQL is not available after $MAX_RETRIES attempts. Exiting."
        exit 1
    fi
    echo "PostgreSQL is unavailable - sleeping (attempt $RETRY_COUNT/$MAX_RETRIES)"
    sleep 2
done

echo "PostgreSQL is ready!"
echo ""

# Verify database connection with a simple query
echo "Verifying database connection..."
PGPASSWORD="$PG_PASSWORD" psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d "$PG_DATABASE" -c "SELECT 1;" > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "Database connection verified successfully."
else
    echo "WARNING: Could not verify database connection, but proceeding anyway."
fi

# Display cron schedule
echo ""
echo "============================================"
echo "Cron Schedule (UTC):"
echo "============================================"
echo "Daily sync:    0 2 * * *  (2:00 AM UTC daily)"
echo "Baseline:      0 3 1 * *  (3:00 AM UTC, 1st of month)"
echo ""

# Display next scheduled runs
echo "Container is ready and cron daemon will start."
echo "Logs available at:"
echo "  - /var/log/appsflyer/daily-sync.log"
echo "  - /var/log/appsflyer/baseline-update.log"
echo ""
echo "============================================"
echo "Starting cron daemon in foreground..."
echo "============================================"

# Start cron in foreground mode
exec cron -f
