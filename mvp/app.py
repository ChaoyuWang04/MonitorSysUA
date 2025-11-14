"""
Flask application for Google Ads ChangeEvent monitoring MVP.
Provides REST API and serves static frontend.
"""

import os
from pathlib import Path
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from dotenv import load_dotenv

from google_ads_client import GoogleAdsChangeEventClient
from database import Database
import tempfile

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__, static_folder='static')
CORS(app)  # Enable CORS for frontend development

# Configuration
PROJECT_ROOT = Path(__file__).parent.parent
GOOGLE_ADS_CONFIG = os.getenv(
    'GOOGLE_ADS_CONFIG_PATH',
    str(PROJECT_ROOT / 'googletest' / 'google-ads.yaml')
)
GOOGLE_ADS_CUSTOMER_ID = os.getenv('GOOGLE_ADS_CUSTOMER_ID', '2766411035')
DATABASE_PATH = os.getenv('DATABASE_PATH', str(Path(tempfile.gettempdir()) / 'change_events.db'))

# Initialize database
db = Database(DATABASE_PATH)

# Initialize Google Ads client (lazy loading)
_google_ads_client = None


def get_google_ads_client():
    """Get or create Google Ads client instance."""
    global _google_ads_client
    if _google_ads_client is None:
        _google_ads_client = GoogleAdsChangeEventClient(
            GOOGLE_ADS_CONFIG,
            GOOGLE_ADS_CUSTOMER_ID
        )
    return _google_ads_client


@app.route('/')
def index():
    """Serve the main frontend page."""
    return send_from_directory(app.static_folder, 'index.html')


@app.route('/api/changes', methods=['GET'])
def get_changes():
    """
    Get change events with optional filters.

    Query Parameters:
        - limit: Max results (default: 100)
        - offset: Pagination offset (default: 0)
        - user_email: Filter by user
        - resource_type: Filter by resource type
        - operation_type: Filter by operation (CREATE/UPDATE/REMOVE)
        - start_date: Filter by start date (ISO format)
        - end_date: Filter by end date (ISO format)
        - search: Search in summary/resource_name

    Returns:
        JSON: {
            "events": [...],
            "total": int,
            "limit": int,
            "offset": int,
            "filters": {...}
        }
    """
    try:
        # Parse query parameters
        limit = int(request.args.get('limit', 100))
        offset = int(request.args.get('offset', 0))
        user_email = request.args.get('user_email', None)
        resource_type = request.args.get('resource_type', None)
        operation_type = request.args.get('operation_type', None)
        start_date = request.args.get('start_date', None)
        end_date = request.args.get('end_date', None)
        search = request.args.get('search', None)

        # Validate limit
        if limit > 500:
            limit = 500
        if limit < 1:
            limit = 100

        # Query database
        events = db.get_events(
            limit=limit,
            offset=offset,
            user_email=user_email,
            resource_type=resource_type,
            operation_type=operation_type,
            start_date=start_date,
            end_date=end_date,
            search=search
        )

        # Get total count for pagination
        total = db.get_event_count(
            user_email=user_email,
            resource_type=resource_type,
            operation_type=operation_type,
            start_date=start_date,
            end_date=end_date,
            search=search
        )

        return jsonify({
            'success': True,
            'events': events,
            'total': total,
            'limit': limit,
            'offset': offset,
            'filters': {
                'user_email': user_email,
                'resource_type': resource_type,
                'operation_type': operation_type,
                'start_date': start_date,
                'end_date': end_date,
                'search': search
            }
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/sync', methods=['POST'])
def sync_data():
    """
    Fetch new data from Google Ads API and store in database.

    Request Body (optional JSON):
        {
            "days": 7,  // Number of days to fetch (default: 7)
            "resource_types": ["CAMPAIGN_BUDGET", "CAMPAIGN"],  // Optional filter
            "operation": "UPDATE"  // Optional filter: CREATE/UPDATE/REMOVE
        }

    Returns:
        JSON: {
            "success": true,
            "fetched": int,  // Events fetched from API
            "inserted": int,  // New events inserted to DB
            "duration": float  // Seconds taken
        }
    """
    try:
        import time
        start_time = time.time()

        # Parse request body
        data = request.get_json() or {}
        days = data.get('days', 7)
        resource_types = data.get('resource_types', None)
        operation = data.get('operation', None)

        # Validate days
        if days < 1:
            days = 1
        if days > 90:
            days = 90

        # Fetch from Google Ads API
        client = get_google_ads_client()
        events = client.fetch_change_events(
            days=days,
            resource_types=resource_types,
            operation=operation
        )

        # Insert into database
        inserted_count = db.insert_events_bulk(events)

        duration = time.time() - start_time

        return jsonify({
            'success': True,
            'fetched': len(events),
            'inserted': inserted_count,
            'duplicates': len(events) - inserted_count,
            'duration': round(duration, 2)
        })

    except Exception as e:
        import traceback
        return jsonify({
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        }), 500


@app.route('/api/users', methods=['GET'])
def get_users():
    """
    Get list of unique user emails in the database.

    Returns:
        JSON: {
            "success": true,
            "users": ["user1@example.com", ...]
        }
    """
    try:
        users = db.get_unique_users()
        return jsonify({
            'success': True,
            'users': users
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/stats', methods=['GET'])
def get_stats():
    """
    Get database statistics.

    Returns:
        JSON: {
            "success": true,
            "stats": {
                "total_events": int,
                "unique_users": int,
                "by_resource_type": {...},
                "by_operation": {...},
                ...
            }
        }
    """
    try:
        stats = db.get_stats()
        return jsonify({
            'success': True,
            'stats': stats
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/health', methods=['GET'])
def health_check():
    """
    Health check endpoint.

    Returns:
        JSON: {
            "status": "ok",
            "database": "connected",
            "google_ads_config": "path/to/config"
        }
    """
    return jsonify({
        'status': 'ok',
        'database': 'connected',
        'google_ads_config': GOOGLE_ADS_CONFIG,
        'customer_id': GOOGLE_ADS_CUSTOMER_ID
    })


@app.errorhandler(404)
def not_found(_error):
    """Handle 404 errors."""
    return jsonify({
        'success': False,
        'error': 'Endpoint not found'
    }), 404


@app.errorhandler(500)
def internal_error(_error):
    """Handle 500 errors."""
    return jsonify({
        'success': False,
        'error': 'Internal server error'
    }), 500


if __name__ == '__main__':
    print("=" * 60)
    print("Google Ads ChangeEvent Monitoring System - MVP")
    print("=" * 60)
    print(f"Google Ads Config: {GOOGLE_ADS_CONFIG}")
    print(f"Customer ID: {GOOGLE_ADS_CUSTOMER_ID}")
    print(f"Database: {DATABASE_PATH}")
    print()
    print("API Endpoints:")
    print("  GET  /                    - Frontend UI")
    print("  GET  /api/changes         - List events (with filters)")
    print("  POST /api/sync            - Fetch new data from Google Ads")
    print("  GET  /api/users           - List unique users")
    print("  GET  /api/stats           - Database statistics")
    print("  GET  /api/health          - Health check")
    print()
    print("Starting server on http://localhost:8080")
    print("=" * 60)

    # Run Flask development server
    app.run(
        host='0.0.0.0',
        port=8080,
        debug=True
    )
