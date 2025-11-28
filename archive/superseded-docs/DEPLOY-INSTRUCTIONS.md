# Deploy Updated Edge Function

## What Changed
- The Edge Function now saves the Google Places ID even when no phone number is found
- This allows you to track which businesses have been looked up, even if they don't have a phone number listed on Google

## How to Deploy

### Option 1: Using the batch file
Open Command Prompt and run:
```cmd
cd C:\git\musicsupplies_nov
deploy-updated-function.bat
```

### Option 2: Manual deployment
Open Command Prompt and run:
```cmd
set SUPABASE_ACCESS_TOKEN=sbp_6bd5d7550da1400a3b7c919685defac0006f91df
npx supabase functions deploy fetch-phone-from-places --project-ref ekklokrukxmqlahtonnc
```

## After Deployment
1. Go to the System tab in your application
2. Check the "Run in test mode (10 records)" checkbox
3. Click "Encode Phone Numbers"
4. Check the browser console - you should now see:
   - ✅ Success messages for businesses with phone numbers
   - ⚠️ Warning messages for businesses without phone numbers (but Place ID was still saved)
5. Verify in your database that the `google_places_id` field is populated even for records without phone numbers

## What to Expect
- **Success case**: Business found, phone number found → Both phone and place_id saved
- **Partial success case**: Business found, no phone number → Only place_id saved (this is NEW!)
- **Failure case**: Business not found → No updates made
