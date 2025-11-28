# 🚨 COMPLETE NETLIFY ENVIRONMENT VARIABLES LIST

## CRITICAL SUPABASE VARIABLES (REQUIRED)

### VITE_SUPABASE_URL
```
XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

### VITE_SUPABASE_ANON_KEY
```
XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

## OTHER VARIABLES (Based on your .env files)

### VITE_APP_VERSION
```
1.0.0
```

### VITE_AWS_S3_BUCKET
```
mus86077
```

### VITE_CLICKSEND_API_KEY
```
[Your ClickSend API Key - check your .env files]
```

### VITE_ELEVENLABS_API_KEY
```
[Your ElevenLabs API Key - check your .env files]
```

## STEP-BY-STEP INSTRUCTIONS

1. **VITE_SUPABASE_URL**: Set to `XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`
2. **VITE_SUPABASE_ANON_KEY**: Set to the long JWT token above
3. **VITE_APP_VERSION**: Set to `1.0.0`
4. **VITE_AWS_S3_BUCKET**: Set to `mus86077`
5. **VITE_CLICKSEND_API_KEY**: Check your local .env files for this value
6. **VITE_ELEVENLABS_API_KEY**: Check your local .env files for this value

## AFTER SETTING ALL VARIABLES
1. Click "Save" or "Deploy site"
2. Wait for deployment to complete
3. Site should start working immediately

## MOST CRITICAL
The **VITE_SUPABASE_URL** and **VITE_SUPABASE_ANON_KEY** are the most critical ones that were causing the startup failure.

Set those two first, then add the others as needed.