# 🚨 STEP-BY-STEP NETLIFY VARIABLE SETUP

## CLICK ON EACH VARIABLE AND SET THESE VALUES:

### 1. VITE_SUPABASE_URL (Currently highlighted - START HERE!)
**Click on it and set value to:**
```
https://ekklokrukxmqlahtonnc.supabase.co
```

### 2. VITE_SUPABASE_ANON_KEY
**Click on it and set value to:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVra2xva3J1a3htcWxhaHRvbm5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAwNzMxOTQsImV4cCI6MjA1NTY0OTE5NH0.LFyaAQyBb2l6rxdUAXpDQVZnR4gHDNrVZH0YudbjP3k
```

### 3. VITE_APP_VERSION
**Click on it and set value to:**
```
1.0.0
```

### 4. VITE_AWS_S3_BUCKET
**Click on it and set value to:**
```
mus86077
```

### 5. VITE_CLICKSEND_API_KEY
**Click on it and set value to:**
```
[Leave empty for now - not critical for startup]
```

### 6. VITE_ELEVENLABS_API_KEY
**Click on it and set value to:**
```
[Leave empty for now - not critical for startup]
```

## PROCESS:
1. **Click on VITE_SUPABASE_URL** (the highlighted one)
2. **Paste**: `https://ekklokrukxmqlahtonnc.supabase.co`
3. **Click Save/Update**
4. **Click on VITE_SUPABASE_ANON_KEY**
5. **Paste the long JWT token** (from above)
6. **Click Save/Update**
7. **Repeat for other variables**
8. **Click "Deploy site" when done**

## MOST CRITICAL
**VITE_SUPABASE_URL** and **VITE_SUPABASE_ANON_KEY** are the ones causing the startup failure. Set these two first!

## AFTER SETTING VARIABLES
The site will redeploy automatically and should start working immediately.