# Deploy Send Test Email Edge Function

## Manual Deployment Instructions

### 1. Deploy the Edge Function

Run this command in your terminal:

```bash
npx supabase functions deploy send-test-email --project-ref ekklokrukxmqlahtonnc
```

### 2. Set the SendGrid API Key Secret

The SENDGRID_API_KEY should already be set in your Supabase vault. If not, you can set it using:

```bash
npx supabase secrets set SENDGRID_API_KEY=your_sendgrid_api_key_here --project-ref ekklokrukxmqlahtonnc
```

### 3. Test the Function

The function is now integrated into the login page. Click the "SEND MSG" button on the login page to test it.

## Function Details

- **Function Name**: send-test-email
- **Purpose**: Sends a test email to lcapece@optonline.net using SendGrid
- **Trigger**: Click the green "SEND MSG" button on the login page
- **Email Details**:
  - To: lcapece@optonline.net
  - From: marketing@musicsupplies.com
  - Subject: Test Message from Music Supplies Login
  - Content: Includes timestamp of when the email was sent

## Troubleshooting

If the email doesn't send:
1. Check that SENDGRID_API_KEY is properly set in Supabase secrets
2. Verify the SendGrid API key has proper permissions
3. Check the browser console for any error messages
4. Check Supabase Edge Function logs for detailed error information

## Files Created

- `/supabase/functions/send-test-email/index.ts` - The edge function code
- Updated `/src/components/Login.tsx` - Added SEND MSG button with email functionality
