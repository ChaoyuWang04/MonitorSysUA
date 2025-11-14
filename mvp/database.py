"""
SQLite database operations for storing ChangeEvent data.
Simple schema optimized for MVP - single table with JSON for flexibility.
"""

import sqlite3
import json
from datetime import datetime
from typing import List, Dict, Any, Optional
from pathlib import Path


class Database:
    """Simple SQLite database wrapper for change events."""

    def __init__(self, db_path: str = "change_events.db"):
        """
        Initialize database connection and create schema if needed.

        Args:
            db_path: Path to SQLite database file
        """
        self.db_path = db_path
        self.conn = None
        self._connect()
        self._create_schema()

    def _connect(self):
        """Establish database connection."""
        self.conn = sqlite3.connect(self.db_path, check_same_thread=False)
        self.conn.row_factory = sqlite3.Row  # Access columns by name
        self.conn.execute("PRAGMA foreign_keys = ON")
        self.conn.execute("PRAGMA journal_mode = WAL")  # Better concurrency

    def _create_schema(self):
        """Create database schema if it doesn't exist."""
        schema = """
        CREATE TABLE IF NOT EXISTS change_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            user_email TEXT NOT NULL,
            resource_type TEXT NOT NULL,
            operation_type TEXT NOT NULL,
            resource_name TEXT NOT NULL,
            client_type TEXT,
            campaign TEXT,
            ad_group TEXT,
            summary TEXT NOT NULL,
            field_changes TEXT,  -- JSON
            changed_fields_paths TEXT,  -- JSON array
            created_at TEXT DEFAULT (datetime('now')),

            -- Indexes for common queries
            UNIQUE(timestamp, resource_name, user_email)  -- Prevent duplicates
        );

        CREATE INDEX IF NOT EXISTS idx_timestamp ON change_events(timestamp DESC);
        CREATE INDEX IF NOT EXISTS idx_user_email ON change_events(user_email);
        CREATE INDEX IF NOT EXISTS idx_resource_type ON change_events(resource_type);
        CREATE INDEX IF NOT EXISTS idx_operation_type ON change_events(operation_type);
        CREATE INDEX IF NOT EXISTS idx_campaign ON change_events(campaign);
        CREATE INDEX IF NOT EXISTS idx_created_at ON change_events(created_at DESC);
        """

        self.conn.executescript(schema)
        self.conn.commit()

    def insert_event(self, event: Dict[str, Any]) -> Optional[int]:
        """
        Insert a single change event into the database.

        Args:
            event: Event dictionary from GoogleAdsChangeEventClient

        Returns:
            Inserted row ID or None if duplicate
        """
        query = """
        INSERT OR IGNORE INTO change_events (
            timestamp,
            user_email,
            resource_type,
            operation_type,
            resource_name,
            client_type,
            campaign,
            ad_group,
            summary,
            field_changes,
            changed_fields_paths
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """

        values = (
            event['timestamp'],
            event['user_email'],
            event['resource_type'],
            event['operation_type'],
            event['resource_name'],
            event.get('client_type', ''),
            event.get('campaign', ''),
            event.get('ad_group', ''),
            event['summary'],
            json.dumps(event.get('field_changes', {})),
            json.dumps(event.get('changed_fields_paths', []))
        )

        try:
            cursor = self.conn.execute(query, values)
            self.conn.commit()
            return cursor.lastrowid if cursor.rowcount > 0 else None
        except sqlite3.IntegrityError:
            # Duplicate entry
            return None
        except Exception as e:
            print(f"Error inserting event: {e}")
            self.conn.rollback()
            return None

    def insert_events_bulk(self, events: List[Dict[str, Any]]) -> int:
        """
        Insert multiple events efficiently.

        Args:
            events: List of event dictionaries

        Returns:
            Number of new events inserted (excluding duplicates)
        """
        inserted_count = 0

        for event in events:
            row_id = self.insert_event(event)
            if row_id is not None:
                inserted_count += 1

        return inserted_count

    def get_events(
        self,
        limit: int = 100,
        offset: int = 0,
        user_email: Optional[str] = None,
        resource_type: Optional[str] = None,
        operation_type: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        search: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Query change events with filters and pagination.

        Args:
            limit: Maximum number of results
            offset: Number of results to skip
            user_email: Filter by user email
            resource_type: Filter by resource type
            operation_type: Filter by operation (CREATE/UPDATE/REMOVE)
            start_date: Filter by start date (ISO format)
            end_date: Filter by end date (ISO format)
            search: Search in summary and resource_name

        Returns:
            List of event dictionaries
        """
        query = "SELECT * FROM change_events WHERE 1=1"
        params = []

        # Apply filters
        if user_email:
            query += " AND user_email = ?"
            params.append(user_email)

        if resource_type:
            query += " AND resource_type = ?"
            params.append(resource_type)

        if operation_type:
            query += " AND operation_type = ?"
            params.append(operation_type)

        if start_date:
            query += " AND timestamp >= ?"
            params.append(start_date)

        if end_date:
            query += " AND timestamp <= ?"
            params.append(end_date)

        if search:
            query += " AND (summary LIKE ? OR resource_name LIKE ?)"
            search_pattern = f"%{search}%"
            params.extend([search_pattern, search_pattern])

        # Order by timestamp descending (newest first)
        query += " ORDER BY timestamp DESC"

        # Pagination
        query += " LIMIT ? OFFSET ?"
        params.extend([limit, offset])

        try:
            cursor = self.conn.execute(query, params)
            rows = cursor.fetchall()

            events = []
            for row in rows:
                event = dict(row)
                # Parse JSON fields
                event['field_changes'] = json.loads(event['field_changes']) if event['field_changes'] else {}
                event['changed_fields_paths'] = json.loads(event['changed_fields_paths']) if event['changed_fields_paths'] else []
                events.append(event)

            return events

        except Exception as e:
            print(f"Error querying events: {e}")
            return []

    def get_event_count(
        self,
        user_email: Optional[str] = None,
        resource_type: Optional[str] = None,
        operation_type: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        search: Optional[str] = None
    ) -> int:
        """
        Get total count of events matching filters.

        Args:
            Same as get_events (without pagination)

        Returns:
            Total count of matching events
        """
        query = "SELECT COUNT(*) as count FROM change_events WHERE 1=1"
        params = []

        if user_email:
            query += " AND user_email = ?"
            params.append(user_email)

        if resource_type:
            query += " AND resource_type = ?"
            params.append(resource_type)

        if operation_type:
            query += " AND operation_type = ?"
            params.append(operation_type)

        if start_date:
            query += " AND timestamp >= ?"
            params.append(start_date)

        if end_date:
            query += " AND timestamp <= ?"
            params.append(end_date)

        if search:
            query += " AND (summary LIKE ? OR resource_name LIKE ?)"
            search_pattern = f"%{search}%"
            params.extend([search_pattern, search_pattern])

        try:
            cursor = self.conn.execute(query, params)
            result = cursor.fetchone()
            return result['count'] if result else 0
        except Exception as e:
            print(f"Error counting events: {e}")
            return 0

    def get_unique_users(self) -> List[str]:
        """Get list of unique user emails in the database."""
        query = """
        SELECT DISTINCT user_email
        FROM change_events
        WHERE user_email != ''
        ORDER BY user_email
        """
        try:
            cursor = self.conn.execute(query)
            return [row['user_email'] for row in cursor.fetchall()]
        except Exception as e:
            print(f"Error getting unique users: {e}")
            return []

    def get_stats(self) -> Dict[str, Any]:
        """Get database statistics."""
        try:
            stats_query = """
            SELECT
                COUNT(*) as total_events,
                COUNT(DISTINCT user_email) as unique_users,
                COUNT(DISTINCT resource_type) as unique_resource_types,
                MIN(timestamp) as earliest_event,
                MAX(timestamp) as latest_event
            FROM change_events
            """
            cursor = self.conn.execute(stats_query)
            row = cursor.fetchone()

            # Get breakdown by resource type
            type_query = """
            SELECT resource_type, COUNT(*) as count
            FROM change_events
            GROUP BY resource_type
            ORDER BY count DESC
            """
            type_cursor = self.conn.execute(type_query)
            by_type = {row['resource_type']: row['count'] for row in type_cursor.fetchall()}

            # Get breakdown by operation
            op_query = """
            SELECT operation_type, COUNT(*) as count
            FROM change_events
            GROUP BY operation_type
            ORDER BY count DESC
            """
            op_cursor = self.conn.execute(op_query)
            by_operation = {row['operation_type']: row['count'] for row in op_cursor.fetchall()}

            return {
                'total_events': row['total_events'],
                'unique_users': row['unique_users'],
                'unique_resource_types': row['unique_resource_types'],
                'earliest_event': row['earliest_event'],
                'latest_event': row['latest_event'],
                'by_resource_type': by_type,
                'by_operation': by_operation
            }

        except Exception as e:
            print(f"Error getting stats: {e}")
            return {}

    def clear_all(self):
        """Delete all events (use with caution!)."""
        try:
            self.conn.execute("DELETE FROM change_events")
            self.conn.commit()
            print("All events cleared from database")
        except Exception as e:
            print(f"Error clearing database: {e}")
            self.conn.rollback()

    def close(self):
        """Close database connection."""
        if self.conn:
            self.conn.close()

    def __enter__(self):
        """Context manager entry."""
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit."""
        self.close()


def test_database():
    """Simple test function."""
    print("Testing database...")

    # Use test database
    db = Database("test_events.db")

    # Test insert
    test_event = {
        'timestamp': datetime.now().isoformat(),
        'user_email': 'test@example.com',
        'resource_type': 'CAMPAIGN_BUDGET',
        'operation_type': 'UPDATE',
        'resource_name': 'customers/123/campaignBudgets/456',
        'summary': 'Budget changed from $50 to $80',
        'field_changes': {'amount_micros': {'old': 50000000, 'new': 80000000}},
        'changed_fields_paths': ['amount_micros']
    }

    row_id = db.insert_event(test_event)
    print(f"Inserted event with ID: {row_id}")

    # Test query
    events = db.get_events(limit=10)
    print(f"Found {len(events)} events")

    # Test stats
    stats = db.get_stats()
    print(f"Stats: {stats}")

    db.close()
    print("Database test complete!")


if __name__ == "__main__":
    test_database()
