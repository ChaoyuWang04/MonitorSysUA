#!/usr/bin/env python3
"""
Regenerate Chinese summaries for all existing change events

This script reads all change_events from the database and regenerates
the summary_zh field using the generate_chinese_summary() function from fetch_events.py

Usage:
    python3 server/google-ads/regenerate_summaries.py
"""

import sys
import os
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

# Import the generate_chinese_summary function from fetch_events
sys.path.insert(0, os.path.dirname(__file__))
from fetch_events import generate_chinese_summary

# Load environment variables
load_dotenv()

def get_db_connection():
    """Get PostgreSQL database connection"""
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        raise Exception('DATABASE_URL environment variable not set')

    return psycopg2.connect(database_url)


def regenerate_summaries():
    """Regenerate Chinese summaries for all change events"""

    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    try:
        # Get all events with their account currency
        print("Fetching change events from database...")
        cursor.execute("""
            SELECT
                ce.id,
                ce.resource_type,
                ce.operation_type,
                ce.field_changes,
                a.currency
            FROM change_events ce
            LEFT JOIN accounts a ON ce.account_id = a.id
            WHERE ce.field_changes IS NOT NULL
            ORDER BY ce.id
        """)

        events = cursor.fetchall()
        total_events = len(events)
        print(f"Found {total_events} events to process")

        if total_events == 0:
            print("No events found in database")
            return

        # Process events in batches
        batch_size = 100
        updated_count = 0

        for i, event in enumerate(events):
            event_id = event['id']
            resource_type = event['resource_type']
            operation_type = event['operation_type']
            field_changes = event['field_changes'] or {}
            currency = event['currency'] or 'USD'

            # Generate Chinese summary
            try:
                summary_zh = generate_chinese_summary(
                    resource_type,
                    operation_type,
                    field_changes,
                    currency
                )

                # Update database
                cursor.execute(
                    "UPDATE change_events SET summary_zh = %s WHERE id = %s",
                    (summary_zh, event_id)
                )

                updated_count += 1

                # Commit in batches
                if (i + 1) % batch_size == 0:
                    conn.commit()
                    progress = (i + 1) / total_events * 100
                    print(f"Progress: {i + 1}/{total_events} ({progress:.1f}%)")

            except Exception as e:
                print(f"Error processing event {event_id}: {e}")
                continue

        # Final commit
        conn.commit()

        print(f"\n✅ Successfully regenerated {updated_count} Chinese summaries out of {total_events} events")

    except Exception as e:
        conn.rollback()
        print(f"❌ Error: {e}")
        raise

    finally:
        cursor.close()
        conn.close()


if __name__ == "__main__":
    print("=" * 60)
    print("Chinese Summary Regeneration Script")
    print("=" * 60)
    print()

    try:
        regenerate_summaries()
        print("\n✅ Script completed successfully!")

    except Exception as e:
        print(f"\n❌ Script failed: {e}")
        sys.exit(1)
