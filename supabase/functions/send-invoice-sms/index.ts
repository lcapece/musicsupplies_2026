import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface InvoiceSmsRequest {
  invoiceId: number
  phoneNumber: string
  includePaymentLink?: boolean
}

// Normalize phone numbers to E.164 format
function normalizeUSPhone(phone: string): string {
  const digits = phone.replace(/[^0-9]/g, '')
  if (digits.length === 10) return '+1' + digits
  if (digits.length === 11 && digits.startsWith('1')) return '+' + digits
  if (phone.startsWith('+')) return phone
  return '+1' + digits
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get ClickSend credentials from vault
    const clicksendUsername = Deno.env.get('CLICKSEND_USERNAME')
    const clicksendApiKey = Deno.env.get('CLICKSEND_API_KEY')
    const clicksendSenderId = Deno.env.get('CLICKSEND_SENDER_ID') || '+18338291653'

    if (!clicksendUsername || !clicksendApiKey) {
      console.error('ClickSend credentials not configured')
      return new Response(
        JSON.stringify({ error: 'SMS service not configured', code: 'MISSING_CREDENTIALS' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify authorization
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    )

    const requestData: InvoiceSmsRequest = await req.json()
    const { invoiceId, phoneNumber, includePaymentLink = true } = requestData

    if (!invoiceId || !phoneNumber) {
      return new Response(
        JSON.stringify({ error: 'Invoice ID and phone number are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const normalizedPhone = normalizeUSPhone(phoneNumber)
    console.log(`Fetching invoice ${invoiceId} for SMS to ${normalizedPhone}`)

    // Fetch invoice header
    const { data: invoice, error: invoiceError } = await supabaseClient
      .from('tbl_inv_headers')
      .select('*')
      .eq('ivd', invoiceId)
      .single()

    if (invoiceError || !invoice) {
      console.error('Invoice fetch error:', invoiceError)
      return new Response(
        JSON.stringify({ error: 'Invoice not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch account for company name
    const { data: account } = await supabaseClient
      .from('accounts_lcmd')
      .select('acct_name')
      .eq('account_number', invoice.account_number)
      .single()

    // Fetch line items to calculate total
    const { data: lineItems } = await supabaseClient
      .from('tbl_inv_details')
      .select('qtyordered, qtyshipped, unitnet')
      .eq('ivd', invoiceId)

    // Fetch payments
    const { data: payments } = await supabaseClient
      .from('tbl_inv_payments')
      .select('paymentamount')
      .eq('invid', invoiceId)

    // Calculate totals
    const subtotal = (lineItems || []).reduce((sum: number, item: any) => {
      const qty = typeof item.qtyshipped === 'number' ? item.qtyshipped : parseFloat(String(item.qtyordered)) || 0
      return sum + (qty * (item.unitnet || 0))
    }, 0)
    const totalPayments = (payments || []).reduce((sum: number, p: any) => sum + (p.paymentamount || 0), 0)
    const grandTotal = subtotal + (invoice.shipping_charge || 0) + (invoice.interest_charge || 0)
    const amountDue = grandTotal - totalPayments

    // Determine display number
    const isWebOrder = invoice.ivd >= 750000 && invoice.ivd <= 770000
    const displayNumber = isWebOrder ? `WB${invoice.ivd}` : String(invoice.ivd)

    // Build SMS message (keep under 160 chars for single SMS, or multi-part if needed)
    const companyShort = account?.acct_name ? account.acct_name.substring(0, 20) : 'Customer'

    let message = `Lou Capece Music: Invoice #${displayNumber} for ${companyShort}`
    message += ` - Amount Due: $${amountDue.toFixed(2)}`

    if (includePaymentLink && amountDue > 0) {
      message += ` Pay at: musicsupplies.com/pay-invoice`
    }

    // If still too long, truncate company name further
    if (message.length > 160) {
      const shortCompany = companyShort.substring(0, 12) + '...'
      message = `Lou Capece: Invoice #${displayNumber} - $${amountDue.toFixed(2)} due`
      if (includePaymentLink && amountDue > 0) {
        message += ` musicsupplies.com/pay-invoice`
      }
    }

    console.log(`Sending invoice SMS (${message.length} chars) to ${normalizedPhone}`)

    // Create ClickSend auth header
    const auth = btoa(`${clicksendUsername}:${clicksendApiKey}`)

    // Prepare payload
    const payload = {
      messages: [{
        source: 'MusicSupplies-Invoice',
        body: message,
        to: normalizedPhone,
        from: clicksendSenderId
      }]
    }

    // Send via ClickSend API
    const clicksendResponse = await fetch('https://rest.clicksend.com/v3/sms/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`
      },
      body: JSON.stringify(payload)
    })

    const responseText = await clicksendResponse.text()
    let responseJson: any = null

    try {
      responseJson = responseText ? JSON.parse(responseText) : null
    } catch {
      responseJson = { raw: responseText }
    }

    if (!clicksendResponse.ok) {
      console.error('ClickSend error:', clicksendResponse.status, responseJson)
      return new Response(
        JSON.stringify({
          success: false,
          error: `SMS sending failed: ${clicksendResponse.status}`,
          details: responseJson
        }),
        { status: clicksendResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Invoice SMS sent successfully:', responseJson)

    // Log the activity
    try {
      await supabaseClient
        .from('activity_log')
        .insert({
          action_type: 'invoice_sms_sent',
          action_details: {
            invoice_id: invoiceId,
            display_number: displayNumber,
            phone_number: normalizedPhone,
            amount_due: amountDue,
            message_length: message.length,
            timestamp: new Date().toISOString()
          }
        })
    } catch (logError) {
      console.log('Failed to log invoice SMS (non-critical):', logError)
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Invoice SMS sent successfully',
        invoiceId,
        displayNumber,
        phoneNumber: normalizedPhone,
        amountDue,
        messageLength: message.length,
        clicksendResponse: responseJson
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Send Invoice SMS error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
