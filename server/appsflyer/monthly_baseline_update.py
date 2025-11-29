# monthly_baseline_update.py
"""
Monthly Baseline Update Script

Updates the rolling 180-day baseline cohort KPI data from AppsFlyer.
Scheduled to run on the 1st of each month at 3 AM UTC via cron.

This refreshes historical cohort KPI data because:
1. AppsFlyer updates retention metrics over time as more data comes in
2. Ensures data completeness for baseline safety calculations
3. Catches any missed daily syncs

Usage:
    python monthly_baseline_update.py              # Full 180-day refresh
    python monthly_baseline_update.py --days 30   # Custom day range
"""

import os
import argparse
import logging
from datetime import datetime, timedelta, date

from dotenv import load_dotenv

# Import sync functions from main module
from sync_af_data import (
    sync_cohort_kpi,
    create_sync_log,
    update_sync_log,
    logger,
)

# Email notification (optional - import with fallback)
try:
    from email_notifier import send_failure_notification, is_email_configured
    EMAIL_AVAILABLE = True
except ImportError:
    EMAIL_AVAILABLE = False
    def is_email_configured():
        return False
    def send_failure_notification(*args, **kwargs):
        return False

# -----------------------------------------------------------------------------
# Logging Configuration
# -----------------------------------------------------------------------------

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)

# Load environment variables
load_dotenv()


def run_baseline_update(days: int = 180) -> int:
    """
    Run the baseline update for the specified number of days.

    Args:
        days: Number of days to refresh (default 180)

    Returns:
        Total number of records processed
    """
    # Calculate date range
    end_date = date.today() - timedelta(days=1)  # Yesterday
    start_date = end_date - timedelta(days=days - 1)  # N days back

    from_date = start_date.strftime('%Y-%m-%d')
    to_date = end_date.strftime('%Y-%m-%d')
    date_range = f"{from_date} to {to_date}"

    logger.info("=" * 60)
    logger.info("Monthly Baseline Update Starting")
    logger.info(f"Refreshing cohort KPIs for {days} days")
    logger.info(f"Date range: {date_range}")
    logger.info("=" * 60)

    # Create sync log entry
    log_id = create_sync_log("baseline_update", start_date, end_date)

    try:
        # Sync cohort KPI data for the full range
        records = sync_cohort_kpi(from_date, to_date)

        # Update sync log with success
        update_sync_log(
            log_id,
            "success",
            records,
            sync_type="baseline_update",
            date_range=date_range
        )

        logger.info("=" * 60)
        logger.info("Baseline update completed successfully!")
        logger.info(f"Total records processed: {records:,}")
        logger.info("=" * 60)

        return records

    except Exception as e:
        error_msg = str(e)
        logger.error(f"Baseline update failed: {error_msg}")

        # Update sync log with failure
        update_sync_log(
            log_id,
            "failed",
            error_message=error_msg,
            sync_type="baseline_update",
            date_range=date_range
        )

        # Re-raise to exit with non-zero status
        raise


def main():
    """
    Main entry point with CLI argument parsing.
    """
    parser = argparse.ArgumentParser(
        description='Monthly Baseline Update - Refresh historical cohort KPI data',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python monthly_baseline_update.py            # Full 180-day refresh
  python monthly_baseline_update.py --days 30  # Last 30 days only
  python monthly_baseline_update.py --days 90  # Last 90 days
        """
    )
    parser.add_argument(
        '--days',
        type=int,
        default=180,
        help='Number of days to refresh (default: 180)'
    )

    args = parser.parse_args()

    try:
        run_baseline_update(days=args.days)
    except Exception as e:
        logger.error(f"Baseline update failed with error: {e}")
        exit(1)


if __name__ == "__main__":
    main()
