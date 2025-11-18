# Multi-Account Testing Summary

**Date**: 2025-11-16
**Status**: Development Server Running ✅
**Server URL**: http://localhost:4000

---

## ✅ Completed Steps

### 1. Code Fixes
- ✅ Fixed TypeScript compilation errors
  - Fixed `data.events` → `data.data` in Events page
  - Fixed SQL undefined type error in queries.ts
  - Removed unused event-table and event-filters components

### 2. Development Server
- ✅ Server starts successfully on port 4000
- ✅ No compilation errors
- ✅ Environment file created (`.env`)

---

## 🚧 Next Steps: Manual Testing Required

### Step 1: Configure Environment Variables

**Action Required**: Update `.env` file with your actual credentials

```bash
# Edit .env file
nano .env
```

**Required Variables**:
```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/monitor_sys_ua

# Google Ads MCC Configuration
GOOGLE_ADS_DEVELOPER_TOKEN=your_developer_token_here
GOOGLE_ADS_JSON_KEY_FILE_PATH=/absolute/path/to/apitest-478007-6043fa24df4c.json
GOOGLE_ADS_LOGIN_CUSTOMER_ID=7537581501  # Your MCC ID
GOOGLE_ADS_DEFAULT_CUSTOMER_ID=2766411035  # Your test account

# Next.js
NEXT_PUBLIC_APP_URL=http://localhost:4000
```

**File Locations**:
- Service Account JSON: `googletest/apitest-478007-6043fa24df4c.json`
- Use absolute path in `GOOGLE_ADS_JSON_KEY_FILE_PATH`

---

### Step 2: Database Setup

**Run Migration**:
```bash
npm run db:migrate
```

**Expected Output**:
```
✓ Migration 0001_fresh_start_multi_account.sql applied successfully
✓ Tables created: accounts, change_events
✓ Indexes created
```

**Verify Tables**:
```bash
psql -d monitor_sys_ua -c "\dt"
```

Should show:
- `accounts` table
- `change_events` table

---

### Step 3: Manual UI Testing

#### 3.1 Test Account Management

1. **Open Application**:
   ```
   http://localhost:4000
   ```

2. **Navigate to Accounts Page**:
   - Click "Accounts" in sidebar
   - Should see empty DataGrid with "Add Account" button

3. **Add First Account**:
   - Click "Add Account"
   - Fill in:
     - Customer ID: `2766411035` (10 digits, no dashes)
     - Name: `Test Product Campaign`
     - Currency: `USD`
     - Time Zone: `America/New_York`
     - Active: ✓
   - Click "Add Account"

4. **Verify Account Created**:
   - Should see account in DataGrid
   - Check sidebar → AccountSelector shows new account
   - Account should be auto-selected

#### 3.2 Test Event Syncing

1. **Navigate to Events Page**:
   - Click "Events" in sidebar
   - Should see "Sync Events" button

2. **Sync Events from Google Ads**:
   - Click "Sync Events" button
   - Wait for sync to complete (may take 5-10 seconds)
   - Should see success message with count

3. **Verify Events Display**:
   - Events should appear in DataGrid
   - Check filters work (Operation Type, Resource Type)
   - Test search functionality
   - Click event row → Detail dialog should open

#### 3.3 Test Dashboard

1. **Navigate to Dashboard**:
   - Click "Dashboard" in sidebar
   - Should see stats cards:
     - Total Events
     - Active Users
     - Resource Types
     - Operation Types
   - Should see distribution charts

#### 3.4 Test Multi-Account

1. **Add Second Account** (if available):
   - Go to Accounts page
   - Click "Add Account"
   - Add another Google Ads account

2. **Test Account Switching**:
   - Use AccountSelector in sidebar
   - Select different account
   - Verify:
     - Dashboard stats change
     - Events page shows different events
     - URL persists selection (refresh page)

3. **Verify Data Isolation**:
   - Events for Account A should not show when Account B is selected
   - Stats should be different for each account
   - Sync should only affect selected account

---

## 🧪 Test Scenarios

### Scenario 1: New User Flow
```
1. User opens app → No accounts message
2. User clicks "Accounts" → Empty state
3. User adds first account → Auto-selected
4. User syncs events → Events appear
5. User views dashboard → Stats display
```

### Scenario 2: Multi-Account Switching
```
1. User has 2 accounts configured
2. User selects Account A → Views events
3. User switches to Account B → Different events
4. User refreshes page → Selection persists
```

### Scenario 3: Error Handling
```
1. Invalid Customer ID → Error message
2. Duplicate account → Error message
3. Sync with invalid credentials → Error message
4. No account selected → Info alert
```

---

## 🐛 Known Issues & Warnings

### Non-Critical Warnings
1. **Port Warning**: Server uses 4000 (3000 in use)
   - **Impact**: None
   - **Fix**: Change port in next.config.js if needed

2. **Lockfile Warning**: Multiple package-lock.json detected
   - **Impact**: None
   - **Fix**: Can be ignored for development

### Potential Issues to Watch

1. **Database Connection**:
   - Ensure PostgreSQL is running
   - Check DATABASE_URL is correct

2. **Google Ads API**:
   - Ensure service account has access to MCC
   - MCC must have permission for client accounts
   - Developer token must be approved

3. **CORS / Network**:
   - If API calls fail, check network tab in browser
   - tRPC errors will show in console

---

## 📊 Expected Test Results

### Accounts Page
- ✅ DataGrid renders
- ✅ Add/Edit/Delete operations work
- ✅ Validation errors display correctly
- ✅ Status chips show active/inactive

### Events Page
- ✅ Events load for selected account only
- ✅ Pagination works (server-side)
- ✅ Filters apply correctly
- ✅ Search functionality works
- ✅ Event detail dialog displays all fields
- ✅ Sync button fetches new events

### Dashboard Page
- ✅ Stats display correctly
- ✅ Numbers update when switching accounts
- ✅ Distribution charts show data

### Account Selector
- ✅ Displays in sidebar
- ✅ Shows account name + customer ID
- ✅ Last sync time displays
- ✅ Selection persists in localStorage
- ✅ Auto-selects first account

---

## 🔍 Debugging Tips

### Check Server Logs
```bash
# View real-time logs
tail -f .next/trace
```

### Check Browser Console
- Open DevTools → Console tab
- Look for tRPC errors
- Check network requests

### Check Database
```bash
# Count accounts
psql -d monitor_sys_ua -c "SELECT COUNT(*) FROM accounts;"

# Count events per account
psql -d monitor_sys_ua -c "SELECT account_id, COUNT(*) FROM change_events GROUP BY account_id;"

# View recent events
psql -d monitor_sys_ua -c "SELECT id, user_email, operation_type, summary FROM change_events ORDER BY timestamp DESC LIMIT 10;"
```

### Test API Directly
```bash
# Test tRPC accounts.list
curl http://localhost:4000/api/trpc/accounts.list

# Test with proper tRPC format
curl 'http://localhost:4000/api/trpc/accounts.list?batch=1&input=%7B%220%22%3A%7B%22json%22%3Anull%7D%7D'
```

---

## 📝 Test Checklist

Use this checklist for manual testing:

### Backend
- [ ] TypeScript compiles without errors
- [ ] Development server starts successfully
- [ ] Database migration runs successfully
- [ ] tRPC routers respond correctly

### Frontend - Account Management
- [ ] Accounts page loads
- [ ] Add account dialog opens
- [ ] Customer ID validation works (10 digits)
- [ ] Account creation succeeds
- [ ] Account appears in DataGrid
- [ ] Edit account works
- [ ] Delete account (soft delete) works
- [ ] Status indicators display correctly

### Frontend - Account Selector
- [ ] Selector appears in sidebar
- [ ] Account list loads
- [ ] Selection changes page data
- [ ] Selection persists on refresh
- [ ] Auto-selects first account

### Frontend - Events Page
- [ ] Events load for selected account
- [ ] No events show for other accounts (isolation)
- [ ] Pagination works
- [ ] Filters apply correctly
- [ ] Search works
- [ ] Event detail dialog displays
- [ ] Sync button fetches new events
- [ ] Loading states show correctly

### Frontend - Dashboard
- [ ] Stats load for selected account
- [ ] Stats change when switching accounts
- [ ] Distribution charts display
- [ ] Numbers are accurate

### Multi-Account
- [ ] Multiple accounts can be created
- [ ] Switching accounts updates all pages
- [ ] Data isolation verified
- [ ] Each account can sync independently

### Error Handling
- [ ] Invalid Customer ID shows error
- [ ] Duplicate account shows error
- [ ] No account selected shows alert
- [ ] API errors display properly
- [ ] Loading states work

---

## 🎯 Success Criteria

The implementation is successful when:

1. ✅ **Type Safety**: No TypeScript errors
2. ✅ **Server Runs**: Development server starts without errors
3. ⏳ **Database Works**: Migration succeeds, tables created
4. ⏳ **Accounts CRUD**: Can create, read, update, delete accounts
5. ⏳ **Events Sync**: Can fetch events from Google Ads API
6. ⏳ **Multi-Account**: Can switch between accounts
7. ⏳ **Data Isolation**: Events for Account A don't show for Account B
8. ⏳ **UI/UX**: Professional, responsive, no console errors
9. ⏳ **Persistence**: Selection persists across refreshes

**Current Progress**: 2/9 ✅

---

## 🚀 Next Actions

1. **User Action Required**:
   - [ ] Update `.env` with real credentials
   - [ ] Ensure PostgreSQL is running
   - [ ] Run database migration

2. **Manual Testing**:
   - [ ] Follow test scenarios above
   - [ ] Complete test checklist
   - [ ] Report any issues

3. **Optional Enhancements**:
   - [ ] Add more test accounts (up to 4-10)
   - [ ] Test with different time zones
   - [ ] Test with different currencies
   - [ ] Stress test with large event volumes

---

## 📞 Support

If you encounter issues:

1. **Check Logs**: Browser console + server terminal
2. **Verify Config**: .env file has correct values
3. **Test Connectivity**: PostgreSQL running, Google Ads API accessible
4. **Database State**: Check tables exist and have correct schema

---

**Ready to test!** 🎉

Server is running at: http://localhost:4000
