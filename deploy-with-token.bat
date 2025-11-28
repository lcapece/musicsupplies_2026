@echo off
echo ========================================
echo Supabase Edge Function Deployment
echo ========================================
echo.
echo This script will deploy the fetch-phone-from-places function.
echo.
echo If you don't have a Supabase access token, get one from:
echo https://supabase.com/dashboard/account/tokens
echo.
echo ========================================
echo.

REM Check if access token is set
if "%SUPABASE_ACCESS_TOKEN%"=="" (
    echo ERROR: SUPABASE_ACCESS_TOKEN environment variable is not set!
    echo.
    echo Please set it first using:
    echo   set SUPABASE_ACCESS_TOKEN=your_token_here
    echo.
    echo Then run this script again.
    pause
    exit /b 1
)

echo Deploying with access token (first 10 chars: %SUPABASE_ACCESS_TOKEN:~0,10%...)
echo.

REM Deploy the function
npx supabase functions deploy fetch-phone-from-places --project-ref ekklokrukxmqlahtonnc --no-verify-jwt

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo Deployment Successful!
    echo ========================================
    echo.
    echo Next Steps:
    echo 1. Set the GOOGLE_MAPS_API_KEY secret in Supabase Dashboard:
    echo    https://supabase.com/dashboard/project/ekklokrukxmqlahtonnc/settings/functions
    echo.
    echo 2. Test your function at:
    echo    https://ekklokrukxmqlahtonnc.supabase.co/functions/v1/fetch-phone-from-places
    echo.
) else (
    echo.
    echo ========================================
    echo Deployment Failed!
    echo ========================================
    echo.
    echo Please check the error message above and try again.
    echo.
)

pause
