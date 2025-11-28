#!/bin/bash

# 2FA System Test using Supabase REST API
echo "🚀 Starting 2FA System Test..."

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | xargs)
fi

SUPABASE_URL=$VITE_SUPABASE_URL
SUPABASE_KEY=$VITE_SUPABASE_ANON_KEY

if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_KEY" ]; then
    echo "❌ Missing Supabase credentials in .env file"
    exit 1
fi

echo "✅ Using Supabase URL: $SUPABASE_URL"

# Step 1: Check sms_admins table
echo ""
echo "📱 Step 1: Checking sms_admins table..."
curl -s -X GET \
  "${SUPABASE_URL}/rest/v1/sms_admins?is_active=eq.true" \
  -H "apikey: $SUPABASE_KEY" \
  -H "Authorization: Bearer $SUPABASE_KEY" \
  -H "Content-Type: application/json" | jq '.'

# Step 2: Check admin_logins table for recent entries
echo ""
echo "🗃️  Step 2: Checking recent admin_logins for account 999..."
curl -s -X GET \
  "${SUPABASE_URL}/rest/v1/admin_logins?account_number=eq.999&order=created_at.desc&limit=3" \
  -H "apikey: $SUPABASE_KEY" \
  -H "Authorization: Bearer $SUPABASE_KEY" \
  -H "Content-Type: application/json" | jq '.'

# Step 3: Generate 2FA code
echo ""
echo "🔢 Step 3: Generating 2FA code for account 999..."
GENERATE_RESULT=$(curl -s -X POST \
  "${SUPABASE_URL}/rest/v1/rpc/generate_2fa_code" \
  -H "apikey: $SUPABASE_KEY" \
  -H "Authorization: Bearer $SUPABASE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "p_account_number": 999,
    "p_ip_address": "127.0.0.1",
    "p_user_agent": "curl-test/1.0"
  }')

echo "$GENERATE_RESULT" | jq '.'

# Extract the generated code for validation test
GENERATED_CODE=$(echo "$GENERATE_RESULT" | jq -r '.code // empty')
echo "Generated code: $GENERATED_CODE"

# Step 4: Check if code was inserted
echo ""
echo "🔍 Step 4: Checking if code was inserted into admin_logins..."
curl -s -X GET \
  "${SUPABASE_URL}/rest/v1/admin_logins?account_number=eq.999&order=created_at.desc&limit=3" \
  -H "apikey: $SUPABASE_KEY" \
  -H "Authorization: Bearer $SUPABASE_KEY" \
  -H "Content-Type: application/json" | jq '.'

# Step 5: Test code validation (if we have a valid code)
echo ""
echo "✅ Step 5: Testing code validation..."
if [ -n "$GENERATED_CODE" ] && [ "$GENERATED_CODE" != "null" ]; then
    echo "Testing validation with generated code: $GENERATED_CODE"
    curl -s -X POST \
      "${SUPABASE_URL}/rest/v1/rpc/validate_admin_login_code" \
      -H "apikey: $SUPABASE_KEY" \
      -H "Authorization: Bearer $SUPABASE_KEY" \
      -H "Content-Type: application/json" \
      -d "{
        \"p_account_number\": 999,
        \"p_code\": \"$GENERATED_CODE\"
      }" | jq '.'
else
    echo "⚠️  No valid code generated, testing with dummy code..."
    curl -s -X POST \
      "${SUPABASE_URL}/rest/v1/rpc/validate_admin_login_code" \
      -H "apikey: $SUPABASE_KEY" \
      -H "Authorization: Bearer $SUPABASE_KEY" \
      -H "Content-Type: application/json" \
      -d '{
        "p_account_number": 999,
        "p_code": "999999"
      }' | jq '.'
fi

echo ""
echo "🎯 2FA System Test Complete!"