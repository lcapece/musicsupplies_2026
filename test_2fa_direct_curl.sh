#!/bin/bash

# Test direct curl to Supabase for 2FA investigation
# Using the anon key for basic queries

SUPABASE_URL="XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
ANON_KEY="XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"

echo "=== Checking 2FA Tables for Account 999 ==="
echo ""

echo "1. Testing connection to Supabase..."
curl -H "apikey: $ANON_KEY" \
     -H "Authorization: Bearer $ANON_KEY" \
     -H "Content-Type: application/json" \
     "$SUPABASE_URL/rest/v1/" \
     2>/dev/null || echo "Connection failed"

echo ""
echo "2. Checking sms_admins table..."
curl -H "apikey: $ANON_KEY" \
     -H "Authorization: Bearer $ANON_KEY" \
     -H "Content-Type: application/json" \
     "$SUPABASE_URL/rest/v1/sms_admins" \
     2>/dev/null | head -c 200

echo ""
echo ""
echo "3. Checking admin_logins for account 999..."
curl -H "apikey: $ANON_KEY" \
     -H "Authorization: Bearer $ANON_KEY" \
     -H "Content-Type: application/json" \
     "$SUPABASE_URL/rest/v1/admin_logins?account_number=eq.999&order=created_at.desc&limit=5" \
     2>/dev/null | head -c 200

echo ""
echo ""
echo "4. Checking two_factor_codes for account 999..."
curl -H "apikey: $ANON_KEY" \
     -H "Authorization: Bearer $ANON_KEY" \
     -H "Content-Type: application/json" \
     "$SUPABASE_URL/rest/v1/two_factor_codes?account_number=eq.999&order=created_at.desc&limit=5" \
     2>/dev/null | head -c 200

echo ""
echo ""
echo "5. Testing generate_2fa_code function..."
curl -X POST \
     -H "apikey: $ANON_KEY" \
     -H "Authorization: Bearer $ANON_KEY" \
     -H "Content-Type: application/json" \
     -d '{"p_account_number": 999, "p_ip_address": "127.0.0.1"}' \
     "$SUPABASE_URL/rest/v1/rpc/generate_2fa_code" \
     2>/dev/null | head -c 200

echo ""
echo ""
echo "=== Investigation Complete ==="