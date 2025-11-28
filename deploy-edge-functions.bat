@echo off
echo Deploying Edge Functions to Supabase...
echo.

echo Step 1: Logging in to Supabase (browser will open)...
call npx supabase login

echo.
echo Step 2: Deploying ai-chat-proxy...
call npx supabase functions deploy ai-chat-proxy --project-ref ekklokrukxmqlahtonnc

echo.
echo Step 3: Deploying send-admin-sms...
call npx supabase functions deploy send-admin-sms --project-ref ekklokrukxmqlahtonnc

echo.
echo Step 4: Deploying netlify-proxy...
call npx supabase functions deploy netlify-proxy --project-ref ekklokrukxmqlahtonnc

echo.
echo ========================================
echo Deployment complete!
echo ========================================
pause
