import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from 'https://esm.sh/stripe@14.14.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
});

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface VerifyPaymentRequest {
  sessionId: string;
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
    const body: VerifyPaymentRequest = await req.json();
    const { sessionId } = body;

    if (!sessionId) {
      throw new Error('Session ID is required');
    }

    // Retrieve the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['payment_intent'],
    });

    if (session.payment_status !== 'paid') {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Payment not completed',
          status: session.payment_status,
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // Extract metadata
    const accountNumber = session.metadata?.account_number;
    const invoiceIdsStr = session.metadata?.invoice_ids;
    const totalAmount = parseFloat(session.metadata?.total_amount || '0');

    if (!accountNumber || !invoiceIdsStr) {
      throw new Error('Missing payment metadata');
    }

    const invoiceIds = invoiceIdsStr.split(',').map(id => parseInt(id.trim()));

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Record payments for each invoice
    const today = new Date().toISOString().split('T')[0];
    const paymentIntent = session.payment_intent as Stripe.PaymentIntent;

    for (const invoiceId of invoiceIds) {
      // Calculate the amount paid for this invoice (proportional or use actual line item amount)
      // For simplicity, we'll calculate based on the invoice balance
      const { data: invoice } = await supabase
        .from('tbl_inv_headers')
        .select('shipping_charge, interest_charge')
        .eq('ivd', invoiceId)
        .single();

      const { data: details } = await supabase
        .from('tbl_inv_details')
        .select('qtyshipped, unitnet')
        .eq('ivd', invoiceId);

      const lineTotal = (details || []).reduce((sum: number, d: any) => {
        return sum + ((d.qtyshipped || 0) * (d.unitnet || 0));
      }, 0);

      const { data: existingPayments } = await supabase
        .from('tbl_inv_payments')
        .select('paymentamount')
        .eq('invid', invoiceId);

      const existingTotal = (existingPayments || []).reduce((sum: number, p: any) =>
        sum + (p.paymentamount || 0), 0);

      const invoiceTotal = lineTotal + (invoice?.shipping_charge || 0) + (invoice?.interest_charge || 0);
      const balanceOwed = invoiceTotal - existingTotal;

      if (balanceOwed <= 0) continue; // Already paid

      // Insert payment record
      const { error: paymentError } = await supabase
        .from('tbl_inv_payments')
        .insert({
          invid: invoiceId,
          paymenttype: 'Stripe',
          paymentamount: balanceOwed, // Pay the full balance for this invoice
          paymentdate: today,
          paymentreference: paymentIntent?.id || sessionId,
        });

      if (paymentError) {
        console.error(`Failed to record payment for invoice ${invoiceId}:`, paymentError);
      }
    }

    // Update payment attempt status
    await supabase
      .from('invoice_payment_attempts')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        stripe_payment_intent_id: paymentIntent?.id,
      })
      .eq('stripe_session_id', sessionId)
      .catch(err => {
        console.error('Failed to update payment attempt:', err);
      });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Payments recorded successfully',
        invoicesProcessed: invoiceIds.length,
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
    console.error('Error verifying payment:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to verify payment',
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
