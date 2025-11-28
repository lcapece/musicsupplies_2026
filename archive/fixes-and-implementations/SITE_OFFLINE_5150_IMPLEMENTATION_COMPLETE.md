# Site Offline Feature with /5150 Admin Access - Complete Implementation

## ✅ All Features Successfully Implemented and Working

### 1. `/5150` Route
- Successfully added to App.tsx
- Direct route to AdminDashboard component
- Protected by AdminProtectedRoute
- Bypasses offline check when accessed

### 2. RLS Policies Applied
- Applied comprehensive RLS policies with correct table/column names
- Uses `accounts_lcmd` table with `account_number` and `email_address` columns
- Anyone can SELECT (read) site status
- Only account 999 can INSERT, UPDATE, DELETE site status

### 3. Site Status Functionality
- Site Status Tab uses UPSERT operations
- Successfully tested taking site offline
- Successfully tested bringing site back online
- All database operations confirmed working

## How the Feature Works

### Site Offline Check Flow:
1. App.tsx checks if URL contains `/5150` on load
2. If yes: Sets `bypassCheck = true`, redirects to `/login`
3. Otherwise: Queries `site_status` table for `status = 'offline'`
4. If offline and no bypass: Shows SiteStatusOffline component
5. Account 999 always bypasses offline status

### Admin Access When Site is Offline:

#### Method 1: URL Bypass
- Navigate to `https://yourdomain.com/5150`
- Automatically bypasses offline check
- Redirects to login page
- Admin can authenticate and access admin panel

#### Method 2: Account 999
- Always bypasses offline status
- Can access site normally even when offline

### Managing Site Status:

#### Via Admin Panel:
1. Navigate to `/5150` or login as account 999
2. Go to "Site Status" tab
3. Toggle between Online/Offline
4. Set custom maintenance message
5. Click "Set Site Online/Offline"

#### Via Direct SQL:
```sql
-- Take site offline
INSERT INTO site_status (status, status_message) 
VALUES ('offline', 'Your maintenance message here')
ON CONFLICT (status) DO UPDATE SET status_message = EXCLUDED.status_message;

-- Bring site online
DELETE FROM site_status WHERE status = 'offline';
```

## Technical Implementation Details:

### Database Structure:
- Table: `site_status`
- Primary key: `status`
- Fields: `status`, `status_message`
- Offline state: Record exists with `status = 'offline'`
- Online state: No record with `status = 'offline'`

### RLS Policy Details:
```sql
-- Read access for everyone
CREATE POLICY "Anyone can read site status" 
    FOR SELECT USING (true);

-- Write access only for account 999
CREATE POLICY "Only admins can [insert/update/delete]" 
    FOR [INSERT/UPDATE/DELETE] 
    WITH CHECK/USING (
        EXISTS (
            SELECT 1 FROM public.accounts_lcmd
            WHERE accounts_lcmd.email_address = auth.email()
            AND accounts_lcmd.account_number = '999'
        )
    );
```

### Frontend Components:
- **App.tsx**: Main logic for /5150 detection and bypass
- **SiteStatusTab.tsx**: Admin interface for toggling site status
- **SiteStatusOffline.tsx**: Maintenance page shown to users
- **AdminDashboard.tsx**: Admin panel accessible via /5150

## Test Results:
- ✅ `/5150` route successfully added
- ✅ RLS policies applied with correct schema
- ✅ Took site offline - worked
- ✅ Brought site online - worked
- ✅ Bypass mechanisms confirmed functional

## Current Status:
- Site is **ONLINE**
- `/5150` backdoor is **ACTIVE**
- All components **WORKING**

The site offline feature with `/5150` admin access is fully implemented and operational!
