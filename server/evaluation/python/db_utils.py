"""
Database connection utilities for Python evaluation engine
"""

import os
import json
from typing import Any, Dict, List, Optional
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


class Database:
    """PostgreSQL database connection manager"""

    def __init__(self):
        self.connection_string = os.getenv('DATABASE_URL')
        if not self.connection_string:
            raise ValueError("DATABASE_URL environment variable is not set")

        self.conn = None
        self.cursor = None

    def connect(self):
        """Establish database connection"""
        try:
            self.conn = psycopg2.connect(self.connection_string)
            self.cursor = self.conn.cursor(cursor_factory=RealDictCursor)
            return True
        except Exception as e:
            print(f"Database connection error: {e}", flush=True)
            return False

    def close(self):
        """Close database connection"""
        if self.cursor:
            self.cursor.close()
        if self.conn:
            self.conn.close()

    def execute_query(self, query: str, params: tuple = None) -> List[Dict[str, Any]]:
        """
        Execute SELECT query and return results as list of dictionaries

        Args:
            query: SQL query string
            params: Query parameters (for parameterized queries)

        Returns:
            List of dictionaries (each row as a dict)
        """
        try:
            self.cursor.execute(query, params)
            results = self.cursor.fetchall()
            return [dict(row) for row in results]
        except Exception as e:
            print(f"Query execution error: {e}", flush=True)
            print(f"Query: {query}", flush=True)
            return []

    def execute_update(self, query: str, params: tuple = None) -> bool:
        """
        Execute INSERT/UPDATE/DELETE query

        Args:
            query: SQL query string
            params: Query parameters

        Returns:
            True if successful, False otherwise
        """
        try:
            self.cursor.execute(query, params)
            self.conn.commit()
            return True
        except Exception as e:
            print(f"Update execution error: {e}", flush=True)
            print(f"Query: {query}", flush=True)
            self.conn.rollback()
            return False

    def __enter__(self):
        """Context manager entry"""
        self.connect()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit"""
        self.close()


def get_db() -> Database:
    """Factory function to create database instance"""
    return Database()


def format_output(data: Any) -> None:
    """
    Format and print data as JSON to stdout
    Used for TypeScript wrapper communication

    Args:
        data: Data to be output (dict, list, etc.)
    """
    print(json.dumps(data, default=str), flush=True)


def read_input() -> Dict[str, Any]:
    """
    Read JSON input from stdin
    Used for TypeScript wrapper communication

    Returns:
        Parsed JSON data as dictionary
    """
    import sys
    try:
        input_data = sys.stdin.read()
        return json.loads(input_data) if input_data else {}
    except Exception as e:
        print(f"Input reading error: {e}", flush=True)
        return {}
