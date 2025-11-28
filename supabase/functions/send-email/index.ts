import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const MAILGUN_API_KEY = Deno.env.get('MAILGUN_API_KEY') || '';
const MAILGUN_DOMAIN = 'musicsupplies.com';
const MAILGUN_API_URL = `https://api.mailgun.net/v3/${MAILGUN_DOMAIN}/messages`;

interface SendEmailRequest {
  from: string;
  fromName?: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
  linkedAccount?: number;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  try {
    const body: SendEmailRequest = await req.json();
    const { from, fromName, to, cc, bcc, subject, html, text, replyTo } = body;

    if (!to || to.length === 0) {
      throw new Error('At least one recipient is required');
    }

    if (!from) {
      throw new Error('Sender email is required');
    }

    // Build form data for Mailgun API
    const formData = new FormData();

    // From address with optional display name
    const fromAddress = fromName ? `${fromName} <${from}>` : from;
    formData.append('from', fromAddress);

    // To addresses
    to.forEach(addr => formData.append('to', addr));

    // CC addresses
    if (cc && cc.length > 0) {
      cc.forEach(addr => formData.append('cc', addr));
    }

    // BCC addresses
    if (bcc && bcc.length > 0) {
      bcc.forEach(addr => formData.append('bcc', addr));
    }

    // Subject
    formData.append('subject', subject || '(No subject)');

    // Body - HTML and/or text
    if (html) {
      formData.append('html', html);
    }
    if (text) {
      formData.append('text', text);
    }

    // Reply-To header for threading
    if (replyTo) {
      formData.append('h:In-Reply-To', replyTo);
      formData.append('h:References', replyTo);
    }

    // Send via Mailgun
    const response = await fetch(MAILGUN_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`api:${MAILGUN_API_KEY}`),
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Mailgun error:', errorText);
      throw new Error(`Mailgun API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();

    return new Response(
      JSON.stringify({
        success: true,
        messageId: result.id,
        message: 'Email sent successfully',
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    console.error('Error sending email:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send email',
      }),
      {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
});
