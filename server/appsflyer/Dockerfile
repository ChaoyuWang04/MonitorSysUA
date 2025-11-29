# AppsFlyer ETL Container
# Runs Python sync scripts with internal cron daemon
# Daily sync at 2 AM UTC, Monthly baseline update at 1st 3 AM UTC

FROM python:3.11-slim

# Install cron daemon and PostgreSQL client for health checks
RUN apt-get update && apt-get install -y --no-install-recommends \
    cron \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

WORKDIR /app

# Copy requirements first for layer caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy Python scripts
COPY *.py ./

# Copy cron configuration
COPY crontab /etc/cron.d/appsflyer-cron

# Copy entrypoint script
COPY entrypoint.sh /entrypoint.sh

# Setup cron and permissions
RUN chmod 0644 /etc/cron.d/appsflyer-cron \
    && crontab /etc/cron.d/appsflyer-cron \
    && chmod +x /entrypoint.sh

# Create log directory with proper permissions
RUN mkdir -p /var/log/appsflyer \
    && chmod 755 /var/log/appsflyer

# Set timezone to UTC for consistent cron scheduling
ENV TZ=UTC
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# Health check - verify cron is running
HEALTHCHECK --interval=60s --timeout=5s --retries=3 \
    CMD pgrep cron > /dev/null || exit 1

ENTRYPOINT ["/entrypoint.sh"]
