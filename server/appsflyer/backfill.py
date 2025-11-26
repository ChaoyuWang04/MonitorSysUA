#!/usr/bin/env python3
"""
AppsFlyer Historical Data Backfill Script

Backfills historical AppsFlyer data in chunks to avoid API timeouts.
Default: 180 days in 30-day chunks.

Usage:
    python backfill.py                    # Backfill 30 days (test mode)
    python backfill.py --days 180         # Backfill 180 days
    python backfill.py --days 90 --chunk-size 15   # Custom settings
"""

import os
import sys
import argparse
import logging
from datetime import date, timedelta

# Ensure we can import from the same directory
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sync_af_data import sync_events, sync_cohort_kpi, create_sync_log, update_sync_log

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)


def backfill(days: int = 180, chunk_size: int = 30):
    """
    Backfill historical AppsFlyer data in chunks.

    Args:
        days: Total number of days to backfill (default: 180)
        chunk_size: Size of each chunk in days (default: 30)
    """
    end_date = date.today() - timedelta(days=1)  # Start from yesterday
    start_date = end_date - timedelta(days=days - 1)

    chunks = (days + chunk_size - 1) // chunk_size  # Ceiling division

    logger.info("=" * 70)
    logger.info(f"AppsFlyer Historical Data Backfill")
    logger.info(f"Total range: {start_date} to {end_date} ({days} days)")
    logger.info(f"Chunk size: {chunk_size} days")
    logger.info(f"Total chunks: {chunks}")
    logger.info("=" * 70)

    # Create a master sync log for the entire backfill
    master_log_id = create_sync_log("backfill", start_date, end_date)

    total_events = 0
    total_kpi = 0

    try:
        for i in range(chunks):
            chunk_start = start_date + timedelta(days=i * chunk_size)
            chunk_end = min(chunk_start + timedelta(days=chunk_size - 1), end_date)

            chunk_start_str = chunk_start.strftime("%Y-%m-%d")
            chunk_end_str = chunk_end.strftime("%Y-%m-%d")

            logger.info("")
            logger.info(f"{'=' * 20} Chunk {i + 1}/{chunks} {'=' * 20}")
            logger.info(f"Date range: {chunk_start_str} to {chunk_end_str}")
            logger.info("-" * 50)

            try:
                # Sync events for this chunk
                logger.info("Syncing events...")
                events_count = sync_events(chunk_start_str, chunk_end_str)
                total_events += events_count
                logger.info(f"Events synced: {events_count}")

                # Sync cohort KPIs for this chunk
                logger.info("Syncing cohort KPIs...")
                kpi_count = sync_cohort_kpi(chunk_start_str, chunk_end_str)
                total_kpi += kpi_count
                logger.info(f"KPI records synced: {kpi_count}")

                logger.info(f"Chunk {i + 1}/{chunks} completed successfully")

            except Exception as e:
                logger.error(f"Chunk {i + 1}/{chunks} failed: {e}")
                raise

        # Update master log with success
        update_sync_log(master_log_id, "success", total_events + total_kpi)

        logger.info("")
        logger.info("=" * 70)
        logger.info("Backfill completed successfully!")
        logger.info(f"Total events synced: {total_events}")
        logger.info(f"Total KPI records synced: {total_kpi}")
        logger.info(f"Grand total: {total_events + total_kpi} records")
        logger.info("=" * 70)

    except Exception as e:
        update_sync_log(master_log_id, "failed", total_events + total_kpi, str(e))
        logger.error(f"Backfill failed: {e}")
        raise


def main():
    parser = argparse.ArgumentParser(
        description='AppsFlyer Historical Data Backfill',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python backfill.py                         # Backfill 30 days (test mode)
  python backfill.py --days 180              # Backfill 180 days (full baseline)
  python backfill.py --days 90 --chunk-size 15   # Custom settings
        """
    )
    parser.add_argument('--days', type=int, default=30,
                        help='Number of days to backfill (default: 30 for testing)')
    parser.add_argument('--chunk-size', type=int, default=30,
                        help='Chunk size in days (default: 30)')

    args = parser.parse_args()

    if args.days < 1:
        logger.error("Days must be at least 1")
        sys.exit(1)

    if args.chunk_size < 1:
        logger.error("Chunk size must be at least 1")
        sys.exit(1)

    backfill(days=args.days, chunk_size=args.chunk_size)


if __name__ == "__main__":
    main()
