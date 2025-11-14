# Google Ads ChangeEvent Monitor - MVP Design Document

## Document Information

**Project**: Google Ads ChangeEvent Monitoring System
**Phase**: Minimum Viable Product (MVP)
**Version**: 1.0
**Date**: November 2025
**Status**: Implementation Complete

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [MVP Goals & Scope](#mvp-goals--scope)
3. [System Architecture](#system-architecture)
4. [Technology Stack](#technology-stack)
5. [Data Model](#data-model)
6. [API Specification](#api-specification)
7. [Frontend Design](#frontend-design)
8. [Implementation Details](#implementation-details)
9. [Setup & Deployment](#setup--deployment)
10. [Testing Strategy](#testing-strategy)
11. [Future Enhancements](#future-enhancements)
12. [Appendix](#appendix)

---

## Executive Summary

### Purpose

This MVP provides a **simple, functional system** to monitor and visualize Google Ads account changes in real-time. It addresses the immediate need for visibility into optimizer actions without the complexity of a full-featured analytics platform.

### Core Value Proposition

> "See what changes are happening in your Google Ads account in real-time"

That's it. No analytics, no scoring, no AI. Just immediate visibility.

### Key Features

1. ✅ **Fetch ChangeEvent data** from Google Ads API
2. ✅ **Store in local database** (SQLite)
3. ✅ **Display on web interface** with filtering and pagination
4. ✅ **Manual refresh** to fetch latest changes
5. ✅ **Support 4 resource types**: CAMPAIGN_BUDGET, CAMPAIGN, AD_GROUP, AD_GROUP_AD

### What This MVP Does NOT Include

- ❌ Performance impact analysis
- ❌ Effect scoring or optimizer ratings
- ❌ Automatic scheduling/background jobs
- ❌ Authentication or user management
- ❌ Advanced analytics or dashboards
- ❌ AI recommendations
- ❌ Production deployment infrastructure

---

## MVP Goals & Scope

### Primary Goals

1. **Prove Core Value**: Demonstrate that ChangeEvent monitoring provides useful insights
2. **Rapid Validation**: Get feedback from users quickly without over-engineering
3. **Learning Foundation**: Build knowledge of Google Ads API and ChangeEvent structure
4. **Iteration Base**: Create a foundation for future enhancements

### Success Criteria

The MVP is successful if:

- ✅ Users can click "Refresh" and see latest Google Ads changes within 10 seconds
- ✅ Changes are displayed in a clear, readable format
- ✅ Users can filter by date, user, resource type, and operation
- ✅ System runs locally without configuration hassles
- ✅ Stakeholders can understand "who changed what and when"

### Scope Decisions

| Feature | MVP Status | Rationale |
|---------|------------|-----------|
| **Data Fetching** | ✅ Included | Core functionality |
| **4 Resource Types** | ✅ Included | Covers most important changes |
| **Local SQLite DB** | ✅ Included | Simplest storage solution |
| **Web UI** | ✅ Included | Essential for usability |
| **Basic Filtering** | ✅ Included | Improves data navigation |
| **Manual Refresh** | ✅ Included | Simplest sync mechanism |
| **PostgreSQL** | ❌ Deferred | Unnecessary complexity for MVP |
| **Auto-refresh** | ❌ Deferred | Adds scheduling complexity |
| **20+ Resource Types** | ❌ Deferred | Too much scope |
| **Performance Analysis** | ❌ Deferred | Requires additional data sources |
| **Authentication** | ❌ Deferred | Single-user MVP |
| **Cloud Deployment** | ❌ Deferred | Local-first approach |

---

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│          Browser (User Interface)                   │
│                                                     │
│  ┌───────────────────────────────────────────────┐ │
│  │  HTML + JavaScript + Tailwind CSS             │ │
│  │  • Event table with sorting/filtering         │ │
│  │  • Statistics dashboard                       │ │
│  │  • Detail modal for each event                │ │
│  │  • Refresh button to sync data                │ │
│  └────────────────┬──────────────────────────────┘ │
│                   │                                 │
└───────────────────┼─────────────────────────────────┘
                    │
                    │ HTTP/JSON (REST API)
                    │
┌───────────────────▼─────────────────────────────────┐
│                                                     │
│           Flask Backend (Python)                    │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │  API Endpoints:                             │   │
│  │  • GET  /                 → Frontend        │   │
│  │  • GET  /api/changes      → List events     │   │
│  │  • POST /api/sync         → Fetch from API  │   │
│  │  • GET  /api/users        → User list       │   │
│  │  • GET  /api/stats        → Statistics      │   │
│  │  • GET  /api/health       → Health check    │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │  Services:                                  │   │
│  │  • GoogleAdsChangeEventClient               │   │
│  │  • Database operations                      │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
└────────────────┬────────────────┬───────────────────┘
                 │                │
                 │ SQL            │ Google Ads API
                 │                │ (via protobuf)
┌────────────────▼─────┐   ┌──────▼──────────────────┐
│                      │   │                         │
│  SQLite Database     │   │  Google Ads API         │
│  (change_events.db)  │   │                         │
│                      │   │  • ChangeEvent Query    │
│  Table:              │   │  • 4 Resource Types     │
│  • change_events     │   │  • Last 7 days data     │
│                      │   │                         │
└──────────────────────┘   └─────────────────────────┘
```

### Component Responsibilities

#### 1. Frontend (Browser)

**Purpose**: User interface for viewing and filtering events

**Technologies**:
- Pure HTML5
- Vanilla JavaScript (ES6+)
- Tailwind CSS (via CDN)

**Responsibilities**:
- Display events in sortable table
- Provide filtering controls
- Handle pagination
- Show event details in modal
- Trigger data refresh
- Display loading/empty states

#### 2. Backend (Flask)

**Purpose**: REST API server and data orchestration

**Technologies**:
- Python 3.8+
- Flask 3.0
- Flask-CORS 4.0

**Responsibilities**:
- Serve frontend static files
- Provide REST API endpoints
- Orchestrate data fetching from Google Ads
- Query and filter database
- Handle errors and logging

#### 3. Database (SQLite)

**Purpose**: Persistent storage for change events

**Technologies**:
- SQLite 3
- Single-file database

**Responsibilities**:
- Store all fetched change events
- Support filtering and pagination
- Prevent duplicate entries
- Provide fast queries with indexes

#### 4. Google Ads API Client

**Purpose**: Interact with Google Ads API

**Technologies**:
- google-ads Python library v28.4.0
- Protobuf for data serialization

**Responsibilities**:
- Authenticate with Google Ads API
- Fetch ChangeEvent data
- Parse protobuf responses
- Extract field-level changes
- Handle API errors gracefully

---

## Technology Stack

### Backend Stack

| Component | Technology | Version | Justification |
|-----------|-----------|---------|---------------|
| **Web Framework** | Flask | 3.0.0 | Lightweight, easy to use, perfect for MVP |
| **CORS Support** | Flask-CORS | 4.0.0 | Enable frontend API calls |
| **Database** | SQLite | 3.x | Zero-config, single-file, sufficient for MVP |
| **Google Ads SDK** | google-ads | 28.4.0 | Official SDK with protobuf support |
| **Environment Config** | python-dotenv | 1.0.0 | Manage configuration easily |
| **Language** | Python | 3.8+ | Existing codebase, good API support |

**Why Flask over FastAPI?**
- Simpler for MVP (no async complexity)
- Synchronous code easier to understand
- Adequate performance for low traffic
- Can migrate to FastAPI later if needed

**Why SQLite over PostgreSQL?**
- Zero configuration required
- Single file = easy backup/restore
- Sufficient for single-user MVP
- Easy to inspect with DB Browser
- Can migrate to PostgreSQL later

### Frontend Stack

| Component | Technology | Version | Justification |
|-----------|-----------|---------|---------------|
| **HTML** | HTML5 | - | Standard markup |
| **JavaScript** | Vanilla JS | ES6+ | No build process needed |
| **CSS Framework** | Tailwind CSS | 3.x (CDN) | Rapid styling without config |
| **Icons** | Heroicons | Inline SVG | Lightweight, no font dependencies |

**Why Vanilla JS over React/Vue?**
- No build process (Webpack, Vite, etc.)
- No npm dependencies to manage
- Instant refresh during development
- Smaller bundle size
- Easier for non-frontend developers

**Why Tailwind via CDN?**
- No build step required
- Works immediately
- Easy to customize
- Great for prototyping

### Development Tools

| Tool | Purpose |
|------|---------|
| **Git** | Version control |
| **VS Code** | Code editor (recommended) |
| **Chrome DevTools** | Frontend debugging |
| **Postman/curl** | API testing |
| **DB Browser for SQLite** | Database inspection |

---

## Data Model

### Database Schema

#### Table: `change_events`

```sql
CREATE TABLE change_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,              -- ISO 8601 format
    user_email TEXT NOT NULL,             -- Optimizer email
    resource_type TEXT NOT NULL,          -- CAMPAIGN_BUDGET, CAMPAIGN, etc.
    operation_type TEXT NOT NULL,         -- CREATE, UPDATE, REMOVE
    resource_name TEXT NOT NULL,          -- Full resource path
    client_type TEXT,                     -- UI, API, EDITOR
    campaign TEXT,                        -- Related campaign resource name
    ad_group TEXT,                        -- Related ad group resource name
    summary TEXT NOT NULL,                -- Human-readable summary
    field_changes TEXT,                   -- JSON: detailed field changes
    changed_fields_paths TEXT,            -- JSON: array of field paths
    created_at TEXT DEFAULT (datetime('now')),

    UNIQUE(timestamp, resource_name, user_email)  -- Prevent duplicates
);

-- Indexes for fast queries
CREATE INDEX idx_timestamp ON change_events(timestamp DESC);
CREATE INDEX idx_user_email ON change_events(user_email);
CREATE INDEX idx_resource_type ON change_events(resource_type);
CREATE INDEX idx_operation_type ON change_events(operation_type);
CREATE INDEX idx_campaign ON change_events(campaign);
CREATE INDEX idx_created_at ON change_events(created_at DESC);
```

### Data Types

#### Resource Types (Supported in MVP)

```python
SUPPORTED_RESOURCE_TYPES = [
    'CAMPAIGN_BUDGET',   # Budget changes
    'CAMPAIGN',          # Campaign settings
    'AD_GROUP',          # Ad group modifications
    'AD_GROUP_AD'        # Individual ad changes
]
```

#### Operation Types

```python
OPERATION_TYPES = [
    'CREATE',   # New entity created
    'UPDATE',   # Existing entity modified
    'REMOVE'    # Entity deleted
]
```

### Example Event Record

```json
{
    "id": 1,
    "timestamp": "2025-11-14T10:30:45.123Z",
    "user_email": "optimizer@company.com",
    "resource_type": "CAMPAIGN_BUDGET",
    "operation_type": "UPDATE",
    "resource_name": "customers/2766411035/campaignBudgets/456789",
    # pragma: allowlist secret
    "client_type": "GOOGLE_ADS_WEB_CLIENT",
    "campaign": "customers/2766411035/campaigns/123456",
    "ad_group": "",
    "summary": "Amount Micros: $50.00 → $80.00",
    "field_changes": {
        "amount_micros": {
            "old": "$50.00",
            "new": "$80.00",
            "path": "amount_micros"
        }
    },
    "changed_fields_paths": ["amount_micros"],
    "created_at": "2025-11-14T11:00:00Z"
}
```

### Field Changes Format

The `field_changes` JSON stores detailed before/after values:

```json
{
    "field_name_1": {
        "old": "previous value",
        "new": "new value",
        "path": "full.field.path"
    },
    "field_name_2": {
        "old": "$50.00",
        "new": "$80.00",
        "path": "amount_micros"
    }
}
```

---

## API Specification

### Base URL

```
http://localhost:5000
```

### Endpoints

#### 1. Get Root (Frontend)

```
GET /
```

**Description**: Serves the main HTML page

**Response**: HTML document

---

#### 2. List Change Events

```
GET /api/changes
```

**Description**: Retrieve change events with optional filters and pagination

**Query Parameters**:

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `limit` | integer | No | 100 | Max results per page (1-500) |
| `offset` | integer | No | 0 | Number of results to skip |
| `user_email` | string | No | - | Filter by user email |
| `resource_type` | string | No | - | Filter by resource type |
| `operation_type` | string | No | - | Filter by operation (CREATE/UPDATE/REMOVE) |
| `start_date` | string | No | - | Filter by start date (ISO 8601) |
| `end_date` | string | No | - | Filter by end date (ISO 8601) |
| `search` | string | No | - | Search in summary/resource_name |

**Example Request**:

```bash
GET /api/changes?limit=50&resource_type=CAMPAIGN_BUDGET&user_email=optimizer@company.com
```

**Response** (200 OK):

```json
{
    "success": true,
    "events": [
        {
            "id": 1,
            "timestamp": "2025-11-14T10:30:45.123Z",
            "user_email": "optimizer@company.com",
            "resource_type": "CAMPAIGN_BUDGET",
            "operation_type": "UPDATE",
            "resource_name": "customers/2766411035/campaignBudgets/456789",
            "summary": "Amount Micros: $50.00 → $80.00",
            "field_changes": {},
            "changed_fields_paths": []
        }
    ],
    "total": 150,
    "limit": 50,
    "offset": 0,
    "filters": {
        "user_email": "optimizer@company.com",
        "resource_type": "CAMPAIGN_BUDGET",
        "operation_type": null,
        "start_date": null,
        "end_date": null,
        "search": null
    }
}
```

**Error Response** (500):

```json
{
    "success": false,
    "error": "Error message"
}
```

---

#### 3. Sync Data from Google Ads

```
POST /api/sync
```

**Description**: Fetch new ChangeEvent data from Google Ads API and store in database

**Request Body** (optional):

```json
{
    "days": 7,
    "resource_types": ["CAMPAIGN_BUDGET", "CAMPAIGN"],
    "operation": "UPDATE"
}
```

**Parameters**:

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `days` | integer | No | 7 | Days to look back (1-90) |
| `resource_types` | array | No | All supported | Filter by resource types |
| `operation` | string | No | All | Filter by operation |

**Example Request**:

```bash
POST /api/sync
Content-Type: application/json

{
    "days": 7
}
```

**Response** (200 OK):

```json
{
    "success": true,
    "fetched": 150,
    "inserted": 45,
    "duplicates": 105,
    "duration": 12.34
}
```

**Error Response** (500):

```json
{
    "success": false,
    "error": "Google Ads API error message",
    "traceback": "Full traceback..."
}
```

---

#### 4. Get User List

```
GET /api/users
```

**Description**: Get list of unique user emails in the database

**Response** (200 OK):

```json
{
    "success": true,
    "users": [
        "optimizer1@company.com",
        "optimizer2@company.com",
        "manager@company.com"
    ]
}
```

---

#### 5. Get Statistics

```
GET /api/stats
```

**Description**: Get database statistics and summaries

**Response** (200 OK):

```json
{
    "success": true,
    "stats": {
        "total_events": 1523,
        "unique_users": 5,
        "unique_resource_types": 4,
        "earliest_event": "2025-11-07T00:00:00Z",
        "latest_event": "2025-11-14T12:00:00Z",
        "by_resource_type": {
            "CAMPAIGN_BUDGET": 450,
            "CAMPAIGN": 780,
            "AD_GROUP": 200,
            "AD_GROUP_AD": 93
        },
        "by_operation": {
            "CREATE": 120,
            "UPDATE": 1350,
            "REMOVE": 53
        }
    }
}
```

---

#### 6. Health Check

```
GET /api/health
```

**Description**: Check if the system is running properly

**Response** (200 OK):

```json
{
    "status": "ok",
    "database": "connected",
    "google_ads_config": "/path/to/google-ads.yaml",
    "customer_id": "2766411035"
}
```

---

## Frontend Design

### Page Structure

```
┌─────────────────────────────────────────────────┐
│  Header                                         │
│  • Title: "Google Ads ChangeEvent Monitor"     │
│  • Subtitle: "Real-time monitoring..."         │
│  • [Refresh Data] button                       │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  Statistics Bar                                 │
│  Total Events | Unique Users | Latest | Range  │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  Filters                                        │
│  [User ▼] [Resource Type ▼] [Operation ▼]     │
│  [Search....]                                   │
│  [Apply Filters] [Clear Filters]               │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  Events Table                                   │
│  ┌─────────────────────────────────────────┐   │
│  │ Timestamp | User | Type | Op | Summary │   │
│  ├─────────────────────────────────────────┤   │
│  │ Nov 14... | opt@..| CAMP.| UPD| Budget.│   │
│  │ Nov 14... | opt@..| AD_G.| CRE| New ad.│   │
│  │ ...                                     │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  Showing 1-50 of 150  [< Previous] [Next >]    │
└─────────────────────────────────────────────────┘
```

### User Interactions

#### 1. Initial Load

```
User opens page
  → Frontend loads HTML
  → JavaScript calls /api/stats
  → JavaScript calls /api/users
  → JavaScript calls /api/changes
  → Table populated with data
```

#### 2. Refresh Data

```
User clicks "Refresh Data"
  → Button shows loading spinner
  → POST /api/sync
  → Backend fetches from Google Ads API
  → Backend inserts into database
  → Returns count of new events
  → Frontend shows toast notification
  → Frontend reloads data automatically
```

#### 3. Apply Filters

```
User selects filters
  → User clicks "Apply Filters"
  → JavaScript builds query parameters
  → GET /api/changes?filters...
  → Table updates with filtered results
  → Pagination resets to page 1
```

#### 4. View Details

```
User clicks on table row
  → Modal opens with full event details
  → Shows all fields and changes
  → User can close modal to return
```

#### 5. Pagination

```
User clicks "Next Page"
  → Offset increases by page size
  → GET /api/changes?offset=50
  → Table updates with next page
  → Pagination controls update
```

### UI States

#### Loading State

```
┌─────────────────────────────────────┐
│                                     │
│         (Spinning loader)           │
│      Loading changes...             │
│                                     │
└─────────────────────────────────────┘
```

#### Empty State

```
┌─────────────────────────────────────┐
│         (Icon: Empty document)      │
│                                     │
│      No changes found               │
│                                     │
│   Click "Refresh Data" to fetch    │
│   changes from Google Ads API       │
│                                     │
└─────────────────────────────────────┘
```

#### Error State

```
┌─────────────────────────────────────┐
│  ⚠️ Error loading data              │
│                                     │
│  Error message displayed here       │
│                                     │
│  [Try Again]                        │
└─────────────────────────────────────┘
```

### Color Coding

**Resource Types**:
- CAMPAIGN_BUDGET: Purple badge
- CAMPAIGN: Blue badge
- AD_GROUP: Green badge
- AD_GROUP_AD: Yellow badge

**Operations**:
- CREATE: Green badge
- UPDATE: Blue badge
- REMOVE: Red badge

---

## Implementation Details

### Directory Structure

```
MonitorSysUA/
├── mvp/
│   ├── app.py                      # Flask application (main entry point)
│   ├── google_ads_client.py        # Google Ads API wrapper
│   ├── database.py                 # SQLite operations
│   ├── requirements.txt            # Python dependencies
│   ├── .env                        # Environment variables
│   ├── .env.example                # Environment template
│   ├── change_events.db            # SQLite database (generated)
│   │
│   ├── static/                     # Frontend files
│   │   ├── index.html             # Main HTML page
│   │   ├── app.js                 # JavaScript logic
│   │   └── style.css              # Custom CSS
│   │
│   └── README.md                   # MVP-specific documentation
│
├── googletest/
│   ├── google-ads.yaml            # API credentials (gitignored)
│   └── googlemvptest.py           # Original test file (reference)
│
├── docs/
│   └── mvpdesign.md               # This document
│
├── prd.md                          # Product Requirements (full vision)
├── .gitignore                      # Git ignore rules
└── README.md                       # Project overview
```

### Key Files

#### 1. `google_ads_client.py`

**Purpose**: Encapsulates all Google Ads API interactions

**Key Classes**:
```python
class GoogleAdsChangeEventClient:
    def __init__(config_path, customer_id)
    def fetch_change_events(days, resource_types, operation)
    def get_unwrapped_resource(changed_resource)
    def _parse_change_event(event)
    def _extract_field_changes(old, new, changed_fields)
    def _generate_summary(resource_type, operation, changes)
```

**Features**:
- Fetches ChangeEvent data from Google Ads API
- Supports filtering by resource type and operation
- Parses protobuf responses
- Extracts field-level changes
- Generates human-readable summaries
- Handles API errors gracefully

#### 2. `database.py`

**Purpose**: All database operations

**Key Classes**:
```python
class Database:
    def __init__(db_path)
    def insert_event(event)
    def insert_events_bulk(events)
    def get_events(limit, offset, filters...)
    def get_event_count(filters...)
    def get_unique_users()
    def get_stats()
```

**Features**:
- Creates schema automatically
- Prevents duplicate entries
- Supports complex filtering
- Efficient pagination
- Statistics aggregation

#### 3. `app.py`

**Purpose**: Flask web server and API

**Routes**:
- `GET /` - Serve frontend
- `GET /api/changes` - List events
- `POST /api/sync` - Fetch new data
- `GET /api/users` - User list
- `GET /api/stats` - Statistics
- `GET /api/health` - Health check

**Features**:
- Serves static files
- CORS enabled
- Error handling
- Request validation
- Logging

#### 4. `static/app.js`

**Purpose**: Frontend logic

**Key Functions**:
```javascript
loadEvents()           // Fetch and display events
handleRefresh()        // Sync new data
handleApplyFilters()   // Apply filters
showEventDetail()      // Show modal
changePage()           // Pagination
```

**Features**:
- REST API calls
- Dynamic table rendering
- Filter management
- Pagination
- Modal handling
- Toast notifications

---

## Setup & Deployment

### Prerequisites

- Python 3.8 or higher
- pip (Python package manager)
- Google Ads API credentials
- Modern web browser (Chrome, Firefox, Safari, Edge)

### Installation Steps

#### 1. Clone Repository

```bash
cd MonitorSysUA
```

#### 2. Setup Python Environment

```bash
# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
cd mvp
pip install -r requirements.txt
```

#### 3. Configure Google Ads API

Ensure you have:
- `googletest/google-ads.yaml` with valid credentials
- Google Ads customer ID

#### 4. Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env if needed
# Default values should work for most cases
```

#### 5. Test Database Setup

```bash
# Test database module
python database.py
```

Expected output:
```
Testing database...
Inserted event with ID: 1
Found 1 events
Stats: {...}
Database test complete!
```

#### 6. Test Google Ads Client

```bash
# Test API connection
python google_ads_client.py
```

Expected output:
```
Testing Google Ads client...
Config: .../google-ads.yaml
Customer ID: 2766411035

Fetching last 7 days of changes...
Found X events

1. 2025-11-14T...
   User: optimizer@company.com
   Type: CAMPAIGN_BUDGET
   Operation: UPDATE
   Summary: Amount Micros: $50.00 → $80.00
```

#### 7. Start Server

```bash
# Run Flask application
python app.py
```

Expected output:
```
============================================================
Google Ads ChangeEvent Monitoring System - MVP
============================================================
Google Ads Config: .../google-ads.yaml
Customer ID: 2766411035
Database: ./change_events.db

API Endpoints:
  GET  /                    - Frontend UI
  GET  /api/changes         - List events (with filters)
  POST /api/sync            - Fetch new data from Google Ads
  GET  /api/users           - List unique users
  GET  /api/stats           - Database statistics
  GET  /api/health          - Health check

Starting server on http://localhost:5000
============================================================
 * Serving Flask app 'app'
 * Debug mode: on
 * Running on http://127.0.0.1:5000
```

#### 8. Open Browser

```
http://localhost:5000
```

#### 9. First Data Sync

1. Click "Refresh Data" button
2. Wait 10-30 seconds for API fetch
3. View fetched events in table

### Troubleshooting

#### Issue: Google Ads API Authentication Error

**Solution**:
- Verify `google-ads.yaml` exists
- Check developer token is valid
- Ensure OAuth refresh token is current
- Run `python google_ads_client.py` to test

#### Issue: No Events Displayed

**Solution**:
- Click "Refresh Data" to fetch from API
- Check if customer ID has recent changes
- Look at browser console for errors
- Check Flask server logs

#### Issue: Database Error

**Solution**:
- Delete `change_events.db` and restart
- Check file permissions
- Verify SQLite is installed

#### Issue: Port 5000 Already in Use

**Solution**:
```bash
# Use different port
export FLASK_RUN_PORT=5001
python app.py
```

---

## Testing Strategy

### Manual Testing Checklist

#### Backend Tests

- [ ] Test database creation
- [ ] Test Google Ads API connection
- [ ] Test event fetching (7 days)
- [ ] Test duplicate prevention
- [ ] Test filtering by user
- [ ] Test filtering by resource type
- [ ] Test pagination
- [ ] Test statistics calculation

#### API Tests

```bash
# Health check
curl http://localhost:5000/api/health

# Get statistics
curl http://localhost:5000/api/stats

# Get events
curl "http://localhost:5000/api/changes?limit=10"

# Sync data
curl -X POST http://localhost:5000/api/sync \
  -H "Content-Type: application/json" \
  -d '{"days": 3}'

# Get users
curl http://localhost:5000/api/users
```

#### Frontend Tests

- [ ] Page loads without errors
- [ ] Statistics display correctly
- [ ] Table renders events
- [ ] Filters work correctly
- [ ] Pagination works
- [ ] Refresh button fetches data
- [ ] Detail modal opens/closes
- [ ] Toast notifications appear
- [ ] Mobile responsive layout

### Test Scenarios

#### Scenario 1: Fresh Install

1. Delete `change_events.db`
2. Start server
3. Open browser
4. See empty state
5. Click "Refresh Data"
6. Wait for fetch
7. See populated table

#### Scenario 2: Apply Filters

1. Load page with data
2. Select user from dropdown
3. Click "Apply Filters"
4. Verify filtered results
5. Click "Clear Filters"
6. Verify all events shown

#### Scenario 3: View Details

1. Click on any table row
2. Modal opens
3. All fields displayed
4. Field changes highlighted
5. Click outside modal
6. Modal closes

#### Scenario 4: Pagination

1. Ensure >50 events in database
2. Verify "Next" button enabled
3. Click "Next"
4. Verify new events displayed
5. Verify pagination counter updated
6. Click "Previous"
7. Verify return to first page

---

## Future Enhancements

### Phase 2: Enhanced Monitoring

**Timeline**: 1-2 weeks after MVP validation

**Features**:
- [ ] Add all 20+ resource types
- [ ] Automatic background sync (every 10 minutes)
- [ ] Real-time updates with WebSocket
- [ ] Export to CSV/Excel
- [ ] Advanced search with regex
- [ ] Date range picker

**Technical Changes**:
- Migrate to PostgreSQL
- Add APScheduler for background jobs
- Implement WebSocket with Flask-SocketIO

### Phase 3: Analytics & Insights

**Timeline**: 1-2 months

**Features**:
- [ ] Performance correlation (changes → metrics)
- [ ] Trend analysis (change frequency over time)
- [ ] Optimizer leaderboards
- [ ] Change impact scoring
- [ ] Anomaly detection (unusual patterns)
- [ ] Email alerts for critical changes

**Technical Changes**:
- Fetch campaign performance metrics
- Add time-series analysis
- Implement effect scoring algorithm
- Add email notification service

### Phase 4: Enterprise Features

**Timeline**: 3-6 months

**Features**:
- [ ] Multi-account support
- [ ] User authentication & roles
- [ ] Team collaboration tools
- [ ] API rate limiting
- [ ] Audit logs
- [ ] Compliance reporting

**Technical Changes**:
- Migrate to FastAPI
- Add JWT authentication
- Implement proper user management
- Add Redis for caching
- Deploy to cloud (AWS/GCP)

### Phase 5: AI & Automation

**Timeline**: 6+ months

**Features**:
- [ ] AI-powered operation recommendations
- [ ] Automated change approval workflow
- [ ] Predictive analytics
- [ ] Natural language queries
- [ ] Change risk assessment
- [ ] Automated rollback

**Technical Changes**:
- Integrate ML models
- Add workflow engine
- Implement LLM for NL queries
- Build predictive models

---

## Appendix

### A. Google Ads ChangeEvent Structure

#### ChangeEvent Fields

```protobuf
message ChangeEvent {
  string resource_name = 1;
  string change_date_time = 2;
  ChangeResourceType change_resource_type = 3;
  string change_resource_name = 4;
  ClientType client_type = 5;
  string user_email = 6;
  ResourceChangeOperation resource_change_operation = 7;
  google.protobuf.FieldMask changed_fields = 8;
  ChangedResource old_resource = 9;
  ChangedResource new_resource = 10;
  string campaign = 11;
  string ad_group = 12;
  string asset = 13;
  // ... more related fields
}
```

#### ChangedResource (oneof)

```protobuf
message ChangedResource {
  oneof resource {
    Campaign campaign = 1;
    AdGroup ad_group = 2;
    AdGroupAd ad_group_ad = 3;
    CampaignBudget campaign_budget = 4;
    AdGroupCriterion ad_group_criterion = 5;
    Asset asset = 6;
    // ... 20+ more types
  }
}
```

### B. Sample API Queries

#### Fetch Campaign Budget Changes

```python
query = """
    SELECT
      change_event.resource_name,
      change_event.change_date_time,
      change_event.user_email,
      change_event.old_resource,
      change_event.new_resource
    FROM change_event
    WHERE change_event.change_resource_type = 'CAMPAIGN_BUDGET'
    AND change_event.resource_change_operation = 'UPDATE'
    AND change_event.change_date_time >= '2025-11-07'
    ORDER BY change_event.change_date_time DESC
    LIMIT 100
"""
```

### C. Environment Variables Reference

```bash
# Required
GOOGLE_ADS_CONFIG_PATH=../googletest/google-ads.yaml
GOOGLE_ADS_CUSTOMER_ID=2766411035

# Optional
DATABASE_PATH=./change_events.db
FLASK_ENV=development
FLASK_DEBUG=True
FLASK_RUN_PORT=5000
```

### D. Common Field Paths

**Campaign Budget**:
- `amount_micros` - Budget amount in micros
- `delivery_method` - STANDARD or ACCELERATED
- `explicitly_shared` - Boolean
- `status` - ENABLED, REMOVED

**Campaign**:
- `status` - ENABLED, PAUSED, REMOVED
- `advertising_channel_type` - SEARCH, DISPLAY, etc.
- `bidding_strategy_type` - TARGET_CPA, TARGET_ROAS, etc.
- `target_cpa.target_cpa_micros` - Target CPA value
- `target_roas.target_roas` - Target ROAS value
- `budget` - Reference to campaign budget

**Ad Group**:
- `status` - ENABLED, PAUSED, REMOVED
- `type` - SEARCH_STANDARD, DISPLAY_STANDARD
- `cpc_bid_micros` - Max CPC bid
- `target_cpa_micros` - Target CPA

**Ad Group Ad**:
- `status` - ENABLED, PAUSED, REMOVED
- `ad.type` - Type of ad
- `ad.responsive_search_ad` - RSA details
- `ad.final_urls` - Landing page URLs

### E. Performance Benchmarks

**API Fetch Time**:
- 7 days, 100 events: ~5-10 seconds
- 30 days, 500 events: ~15-30 seconds

**Database Query Time**:
- List 100 events: <50ms
- Filter + pagination: <100ms
- Statistics calculation: <200ms

**Frontend Load Time**:
- Initial page load: <1 second
- Table render (100 rows): <200ms
- Modal open: <50ms

### F. Resource Links

**Documentation**:
- [Google Ads API Docs](https://developers.google.com/google-ads/api/docs/start)
- [ChangeEvent Reference](https://developers.google.com/google-ads/api/reference/rpc/latest/ChangeEvent)
- [Flask Documentation](https://flask.palletsprojects.com/)
- [Tailwind CSS](https://tailwindcss.com/)

**Tools**:
- [DB Browser for SQLite](https://sqlitebrowser.org/)
- [Postman](https://www.postman.com/)
- [Google Ads API Test Tool](https://developers.google.com/google-ads/api/docs/samples)

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-14 | Claude | Initial MVP design document |

---

## Contact & Support

For questions, issues, or feature requests related to this MVP:
- Review project README
- Check Flask server logs
- Inspect browser console
- Test API endpoints with curl

---

**End of MVP Design Document**
