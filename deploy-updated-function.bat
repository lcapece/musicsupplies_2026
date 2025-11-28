@echo off
set SUPABASE_ACCESS_TOKEN=sbp_6bd5d7550da1400a3b7c919685defac0006f91df
echo Deploying fetch-phone-from-places function...
npx supabase functions deploy fetch-phone-from-places --project-ref ekklokrukxmqlahtonnc
pause
