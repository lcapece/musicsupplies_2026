@echo off
echo Deploying fetch-phone-from-places Edge Function to Supabase...
echo.

REM Deploy the function
npx supabase functions deploy fetch-phone-from-places --project-ref ekklokrukxmqlahtonnc --no-verify-jwt

echo.
echo Deployment complete!
echo.
echo Don't forget to set the GOOGLE_MAPS_API_KEY secret in Supabase Dashboard:
echo 1. Go to https://supabase.com/dashboard/project/ekklokrukxmqlahtonnc/settings/functions
echo 2. Click on "Edge Function Secrets"
echo 3. Add: GOOGLE_MAPS_API_KEY = your_google_api_key
echo.
pause
