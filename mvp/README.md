# Google Ads ChangeEvent Monitor - MVP

> **Real-time visibility into your Google Ads account changes**

A simple, lightweight system to monitor and visualize Google Ads ChangeEvent data. Track who changed what, when, and how in your advertising accounts.

## 🎯 What This MVP Does

- ✅ **Fetches** ChangeEvent data from Google Ads API
- ✅ **Stores** events in local SQLite database
- ✅ **Displays** changes in clean web interface
- ✅ **Filters** by user, resource type, operation, date
- ✅ **Supports** 4 resource types: Campaign Budget, Campaign, Ad Group, Ads

## 🚀 Quick Start

### Prerequisites

- Python 3.8+
- Google Ads API credentials
- Modern web browser

### Installation

```bash
# 1. Navigate to MVP directory
cd mvp

# 2. Create virtual environment
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Configure environment (if needed)
cp .env.example .env
# Edit .env if your config path differs

# 5. Run the server
python app.py
```

### First Run

1. Open browser: `http://localhost:5000`
2. Click **"Refresh Data"** button
3. Wait 10-30 seconds for API fetch
4. View your Google Ads changes!

## 📁 Project Structure

```
mvp/
├── app.py                  # Flask web server (⭐ start here)
├── google_ads_client.py    # Google Ads API wrapper
├── database.py             # SQLite operations
├── requirements.txt        # Python dependencies
├── .env                    # Configuration
├── change_events.db        # Database (auto-created)
│
├── static/                 # Frontend files
│   ├── index.html         # Main UI
│   ├── app.js             # JavaScript logic
│   └── style.css          # Custom styles
│
└── README.md              # This file
```

## 🔧 Configuration

### Environment Variables (.env)

```bash
# Path to Google Ads config (relative to project root)
GOOGLE_ADS_CONFIG_PATH=../googletest/google-ads.yaml

# Your Google Ads customer ID (without dashes)
GOOGLE_ADS_CUSTOMER_ID=2766411035

# Database file path
DATABASE_PATH=./change_events.db
```

### Google Ads API Setup

Ensure you have a valid `google-ads.yaml` file with:
- Developer token
- Client ID & Client Secret
- Refresh token or service account credentials

## 📖 Usage Guide

### Viewing Changes

1. **Initial Load**: Open `http://localhost:5000`
2. **Filter Events**: Use dropdowns to filter by user, type, operation
3. **Search**: Type in search box to find specific changes
4. **View Details**: Click any row to see full change details
5. **Navigate**: Use pagination to browse all events

### Fetching New Data

Click **"Refresh Data"** to sync latest changes from Google Ads API.

**Options** (via API):
```bash
curl -X POST http://localhost:5000/api/sync \
  -H "Content-Type: application/json" \
  -d '{
    "days": 7,
    "resource_types": ["CAMPAIGN_BUDGET", "CAMPAIGN"],
    "operation": "UPDATE"
  }'
```

### Filtering Data

**Available Filters**:
- **User Email**: Filter by optimizer email
- **Resource Type**: CAMPAIGN_BUDGET, CAMPAIGN, AD_GROUP, AD_GROUP_AD
- **Operation**: CREATE, UPDATE, REMOVE
- **Search**: Free text search in summary and resource name

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Serve frontend UI |
| GET | `/api/changes` | List events with filters |
| POST | `/api/sync` | Fetch new data from Google Ads |
| GET | `/api/users` | List unique users |
| GET | `/api/stats` | Database statistics |
| GET | `/api/health` | Health check |

### Examples

```bash
# Get all events
curl "http://localhost:5000/api/changes"

# Get filtered events
curl "http://localhost:5000/api/changes?user_email=optimizer@company.com&resource_type=CAMPAIGN_BUDGET&limit=50"

# Sync last 3 days
curl -X POST http://localhost:5000/api/sync \
  -H "Content-Type: application/json" \
  -d '{"days": 3}'

# Get statistics
curl "http://localhost:5000/api/stats"
```

## 🧪 Testing

### Test Google Ads Connection

```bash
python google_ads_client.py
```

Expected output:
```
Testing Google Ads client...
Fetching last 7 days of changes...
Found X events

1. 2025-11-14T10:30:45Z
   User: optimizer@company.com
   Type: CAMPAIGN_BUDGET
   Operation: UPDATE
   Summary: Amount Micros: $50.00 → $80.00
```

### Test Database

```bash
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

### Test API

```bash
# Start server
python app.py

# In another terminal
curl http://localhost:5000/api/health
```

## 🐛 Troubleshooting

### Google Ads API Errors

**Problem**: "Authentication error" or "Invalid developer token"

**Solution**:
1. Check `google-ads.yaml` exists and is valid
2. Verify developer token is active
3. Ensure OAuth refresh token is current
4. Run `python google_ads_client.py` to test directly

### No Data Showing

**Problem**: Empty table after loading

**Solution**:
1. Click "Refresh Data" to fetch from API
2. Check browser console for errors (F12)
3. Check Flask server logs
4. Verify customer ID has recent changes

### Port Already in Use

**Problem**: "Address already in use: Port 5000"

**Solution**:
```bash
# Use different port
export FLASK_RUN_PORT=5001
python app.py
```

### Database Errors

**Problem**: SQLite errors or corrupted database

**Solution**:
```bash
# Delete and recreate database
rm change_events.db
python app.py  # Will recreate automatically
```

## 📊 Supported Resource Types

| Type | Description | Example Changes |
|------|-------------|----------------|
| **CAMPAIGN_BUDGET** | Budget modifications | Amount changes, delivery method |
| **CAMPAIGN** | Campaign settings | Status, bidding strategy, targets |
| **AD_GROUP** | Ad group changes | Bids, status, targeting |
| **AD_GROUP_AD** | Individual ads | Ad copy, URLs, status |

## 🎨 Features

### Current MVP Features

- ✅ Real-time change monitoring
- ✅ User-friendly web interface
- ✅ Advanced filtering and search
- ✅ Pagination for large datasets
- ✅ Detailed change view
- ✅ Statistics dashboard
- ✅ Manual data refresh
- ✅ Responsive design

### Not Included in MVP

- ❌ Automatic background sync
- ❌ Performance impact analysis
- ❌ Multi-account support
- ❌ User authentication
- ❌ Email notifications
- ❌ Export to CSV/Excel
- ❌ Advanced analytics

## 🔄 Workflow

```
1. User Opens Browser
   ↓
2. Frontend Loads (HTML/JS/CSS)
   ↓
3. Fetch Initial Data (API calls)
   ↓
4. Display Events in Table
   ↓
5. User Applies Filters / Searches
   ↓
6. User Clicks "Refresh Data"
   ↓
7. Backend Fetches from Google Ads API
   ↓
8. New Events Stored in Database
   ↓
9. Frontend Updates Automatically
```

## 📚 Additional Resources

- **Full Design Document**: See `../docs/mvpdesign.md`
- **Product Vision**: See `../prd.md`
- **Google Ads API**: https://developers.google.com/google-ads/api
- **ChangeEvent Docs**: https://developers.google.com/google-ads/api/reference/rpc/latest/ChangeEvent

## 🚧 Next Steps (Post-MVP)

### Phase 2: Enhanced Monitoring
- Add all 20+ resource types
- Automatic background sync
- Export functionality
- Advanced search

### Phase 3: Analytics
- Performance correlation
- Trend analysis
- Impact scoring
- Anomaly detection

### Phase 4: Enterprise
- Multi-account support
- User authentication
- Team collaboration
- Cloud deployment

## 📝 Development Notes

### Technology Stack

- **Backend**: Flask 3.0, Python 3.8+
- **Database**: SQLite 3
- **Google Ads**: google-ads 28.4.0
- **Frontend**: Vanilla JS, HTML5, Tailwind CSS

### Why These Choices?

**Flask over FastAPI**: Simpler for MVP, easier to understand
**SQLite over PostgreSQL**: Zero config, perfect for local MVP
**Vanilla JS over React**: No build process, instant development

## 🤝 Contributing

This is an MVP - contributions welcome for future phases!

Ideas for improvements:
1. Add more resource types
2. Improve UI/UX
3. Add export functionality
4. Implement automatic sync
5. Build analytics features

## 📄 License

Internal project for monitoring Google Ads accounts.

## 🆘 Support

Having issues?

1. Check this README
2. Review `../docs/mvpdesign.md`
3. Test components individually:
   - `python google_ads_client.py`
   - `python database.py`
4. Check browser console (F12)
5. Check Flask server logs

---

**Happy Monitoring! 📊**

Built with ❤️ for better Google Ads optimization visibility
