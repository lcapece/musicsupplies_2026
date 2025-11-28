# MANUAL DEPLOYMENT GUIDE - GUARANTEED HOSTED SUPABASE

This guide will help you manually deploy the admin-2fa-handler function to your HOSTED Supabase instance through the web dashboard.

## Step 1: Go to Your HOSTED Supabase Dashboard

1. Open your browser and go to: https://supabase.com/dashboard
2. Sign in with your Supabase account
3. Select your project: **ekklokrukxmqlahtonnc**
4. You should see the URL shows: `https://supabase.com/dashboard/project/ekklokrukxmqlahtonnc`

## Step 2: Navigate to Edge Functions

1. In the left sidebar, click on **"Edge Functions"**
2. You should see a list of your existing functions

## Step 3: Create New Function

1. Click the **"New Function"** button
2. For function name, enter: `admin-2fa-handler`
3. Click **"Create function"**

## Step 4: Copy the Function Code

Copy ALL of the code below (this is from your supabase/functions/admin-2fa-handler/index.ts file):

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    const { accountNumber, password } = await req.json();
    console.log("Received request for account:", accountNumber);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Call authenticate_user function
    const { data: authData, error: authError } = await supabase.rpc(
      "authenticate_user",
      {
        p_account_number: accountNumber,
        p_password: password,
      }
    );

    if (authError) {
      console.error("Authentication error:", authError);
      return new Response(
        JSON.stringify({ error: "Authentication failed" }),
        {
          status: 401,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    if (!authData || !authData.success) {
      return new Response(
        JSON.stringify({ error: "Invalid credentials" }),
        {
          status: 401,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    // Check if this is account 999 (admin)
    if (accountNumber === "999") {
      // Generate 2FA code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

      // Store 2FA code
      const { error: insertError } = await supabase
        .from("admin_logins")
        .insert({
          account_number: accountNumber,
          two_fa_code: code,
          expires_at: expiresAt,
          is_used: false,
        });

      if (insertError) {
        console.error("Error storing 2FA code:", insertError);
        return new Response(
          JSON.stringify({ error: "Failed to generate 2FA code" }),
          {
            status: 500,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          }
        );
      }

      // Get admin phone numbers
      const { data: adminPhones, error: phoneError } = await supabase
        .from("sms_admins")
        .select("phone_number")
        .eq("is_active", true);

      if (phoneError || !adminPhones || adminPhones.length === 0) {
        console.error("Error fetching admin phones:", phoneError);
        return new Response(
          JSON.stringify({ error: "No admin phones configured" }),
          {
            status: 500,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          }
        );
      }

      // Get ClickSend credentials from Edge secrets
      const clicksendUserId = Deno.env.get("CLICKSEND_USERID");
      const clicksendApiKey = Deno.env.get("CLICKSEND_API_KEY");

      if (!clicksendUserId || !clicksendApiKey) {
        console.error("ClickSend credentials not found in Edge secrets");
        return new Response(
          JSON.stringify({ error: "SMS service not configured" }),
          {
            status: 500,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          }
        );
      }

      // Send SMS to all admin phones
      const smsPromises = adminPhones.map(async (admin) => {
        const smsPayload = {
          messages: [
            {
              source: "javascript",
              from: "MusicSupply",
              body: `Your admin 2FA code is: ${code}. Valid for 5 minutes.`,
              to: admin.phone_number,
              schedule: 0,
            },
          ],
        };

        const authHeader = `Basic ${btoa(`${clicksendUserId}:${clicksendApiKey}`)}`;

        try {
          const response = await fetch(
            "https://rest.clicksend.com/v3/sms/send",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: authHeader,
              },
              body: JSON.stringify(smsPayload),
            }
          );

          const result = await response.json();
          console.log(`SMS sent to ${admin.phone_number}:`, result);
          return { phone: admin.phone_number, success: response.ok, result };
        } catch (error) {
          console.error(`Failed to send SMS to ${admin.phone_number}:`, error);
          return { phone: admin.phone_number, success: false, error };
        }
      });

      const smsResults = await Promise.all(smsPromises);
      const successCount = smsResults.filter((r) => r.success).length;

      return new Response(
        JSON.stringify({
          requires2FA: true,
          message: `2FA code sent to ${successCount} admin phone(s)`,
          smsResults,
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    // Non-admin login successful
    return new Response(
      JSON.stringify({
        success: true,
        accountId: authData.account_id,
        isActive: authData.is_active,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error) {
    console.error("Error in admin-2fa-handler:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
});
```

## Step 5: Deploy the Function

1. In the Supabase dashboard, paste the code into the editor
2. Click **"Deploy"** button
3. Wait for the deployment to complete (usually takes 10-30 seconds)
4. You should see a green success message

## Step 6: Verify Deployment

1. After deployment, you should see your function listed
2. The function URL will be: `https://ekklokrukxmqlahtonnc.supabase.co/functions/v1/admin-2fa-handler`
3. The status should show as "Active"

## Step 7: Test the Function

Once deployed, you can test by:
1. Going to http://localhost:5173
2. Logging in with account 999 and password "2750grove"
3. You should receive an SMS with the 2FA code

## IMPORTANT NOTES

- This deployment is going DIRECTLY to your HOSTED Supabase at ekklokrukxmqlahtonnc.supabase.co
- NO local Supabase is involved
- The Edge secrets (CLICKSEND_USERID and CLICKSEND_API_KEY) are already configured in your hosted instance
- The function will have access to these secrets automatically

## Troubleshooting

If the deployment fails:
1. Make sure you're logged into the correct Supabase account
2. Make sure you're in the correct project (ekklokrukxmqlahtonnc)
3. Check that the function name is exactly: admin-2fa-handler
4. Try refreshing the page and deploying again

## Alternative: Using Supabase CLI with Project ID

If you prefer command line, you can use this command which EXPLICITLY targets your hosted instance:

```bash
npx supabase functions deploy admin-2fa-handler --project-ref ekklokrukxmqlahtonnc
```

This uses the project reference ID which GUARANTEES it goes to the hosted instance.
