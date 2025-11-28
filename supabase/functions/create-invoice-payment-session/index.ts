import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from 'https://esm.sh/stripe@14.14.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
});

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface InvoicePaymentRequest {
  invoices: Array<{
    ivd: number;
    amount: number;
  }>;
  total: number;
  accountNumber: string;
  customerEmail?: string;
  successUrl: string;
  cancelUrl: string;
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
    const body: InvoicePaymentRequest = await req.json();
    const { invoices, total, accountNumber, customerEmail, successUrl, cancelUrl } = body;

    if (!invoices || invoices.length === 0) {
      throw new Error('No invoices provided');
    }

    if (!accountNumber) {
      throw new Error('Account number is required');
    }

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch account details for customer info
    const { data: accountData } = await supabase
      .from('accounts_lcmd')
      .select('acct_name, email_address')
      .eq('account_number', parseInt(accountNumber))
      .single();

    const customerName = accountData?.acct_name || `Account ${accountNumber}`;
    const email = customerEmail || accountData?.email_address;

    // Create line items for Stripe
    const lineItems = invoices.map(inv => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: `Invoice #${inv.ivd}`,
          description: `Payment for Invoice #${inv.ivd}`,
        },
        unit_amount: Math.round(inv.amount * 100), // Convert to cents
      },
      quantity: 1,
    }));

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
      customer_email: email,
      metadata: {
        account_number: accountNumber,
        invoice_ids: invoices.map(inv => inv.ivd).join(','),
        total_amount: total.toString(),
      },
      payment_intent_data: {
        metadata: {
          account_number: accountNumber,
          invoice_ids: invoices.map(inv => inv.ivd).join(','),
        },
      },
    });

    // Log the payment attempt
    await supabase
      .from('invoice_payment_attempts')
      .insert({
        account_number: parseInt(accountNumber),
        invoice_ids: invoices.map(inv => inv.ivd),
        total_amount: total,
        stripe_session_id: session.id,
        status: 'pending',
        created_at: new Date().toISOString(),
      })
      .catch(err => {
        // Log error but don't fail - table might not exist yet
        console.error('Failed to log payment attempt:', err);
      });

    return new Response(
      JSON.stringify({
        sessionId: session.id,
        url: session.url,
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
    console.error('Error creating payment session:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to create payment session',
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
