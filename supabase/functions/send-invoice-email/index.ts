import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface InvoiceEmailRequest {
  invoiceId: number
  toEmail: string
  ccEmails?: string[]
  subject?: string
  customMessage?: string
}

interface InvoiceLineItem {
  partnumber: string
  description: string
  qtyordered: string | number
  qtyshipped: number
  unitnet: number
}

interface InvoiceData {
  ivd: number
  invoice_date: string
  doc_type: string
  account_number: number
  customer_po?: string
  terms: string
  ship_method: string
  salesman: string
  shipping_charge: number
  interest_charge: number
  st_name?: string
  st_address?: string
  st_city?: string
  st_state?: string
  st_zip?: string
  st_contact?: string
  st_phone?: string
  gen_comments?: string
}

interface AccountData {
  acct_name: string
  address: string
  city: string
  state: string
  zip: string
  phone: string
  email_address: string
  contact: string
}

// Generate beautiful HTML invoice email
function generateInvoiceEmailHTML(
  invoice: InvoiceData,
  account: AccountData,
  lineItems: InvoiceLineItem[],
  payments: { paymentamount: number }[],
  customMessage?: string
): string {
  const subtotal = lineItems.reduce((sum, item) => {
    const qty = typeof item.qtyshipped === 'number' ? item.qtyshipped : parseFloat(String(item.qtyordered)) || 0
    return sum + (qty * (item.unitnet || 0))
  }, 0)

  const totalPayments = payments.reduce((sum, p) => sum + (p.paymentamount || 0), 0)
  const grandTotal = subtotal + (invoice.shipping_charge || 0) + (invoice.interest_charge || 0)
  const amountDue = grandTotal - totalPayments

  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`

  // Determine if web order
  const isWebOrder = invoice.ivd >= 750000 && invoice.ivd <= 770000
  const displayNumber = isWebOrder ? `WB${invoice.ivd}` : String(invoice.ivd)
  const displayLabel = isWebOrder ? 'WEB ORDER' : invoice.doc_type?.toUpperCase() || 'INVOICE'

  // Generate line items rows
  const lineItemsHTML = lineItems.map((item, index) => {
    const qty = typeof item.qtyshipped === 'number' ? item.qtyshipped : parseFloat(String(item.qtyordered)) || 0
    const extended = qty * (item.unitnet || 0)
    return `
      <tr style="background-color: ${index % 2 === 0 ? '#ffffff' : '#f8fafc'};">
        <td style="padding: 12px 8px; border-bottom: 1px solid #e2e8f0; text-align: center; font-size: 13px; color: #334155;">${item.qtyordered || 0}</td>
        <td style="padding: 12px 8px; border-bottom: 1px solid #e2e8f0; text-align: center; font-size: 13px; color: #334155;">${qty}</td>
        <td style="padding: 12px 8px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #1e40af; font-weight: 500;">${item.partnumber || ''}</td>
        <td style="padding: 12px 8px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #475569;">${item.description || ''}</td>
        <td style="padding: 12px 8px; border-bottom: 1px solid #e2e8f0; text-align: right; font-size: 13px; color: #334155;">${formatCurrency(item.unitnet || 0)}</td>
        <td style="padding: 12px 8px; border-bottom: 1px solid #e2e8f0; text-align: right; font-size: 13px; color: #334155; font-weight: 500;">${formatCurrency(extended)}</td>
      </tr>
    `
  }).join('')

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice #${displayNumber} - Lou Capece Music Distributors</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:AllowPNG/>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f1f5f9; line-height: 1.6;">

  <!-- Main Container -->
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f1f5f9;">
    <tr>
      <td style="padding: 40px 20px;">

        <!-- Email Wrapper -->
        <table role="presentation" style="max-width: 700px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">

          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e40af 0%, #7c3aed 100%); padding: 32px 40px;">
              <table role="presentation" style="width: 100%;">
                <tr>
                  <td style="vertical-align: middle;">
                    <div style="font-size: 28px; font-weight: 700; color: #ffffff; margin-bottom: 4px;">
                      Music<span style="color: #fbbf24;">Supplies</span>.com
                    </div>
                    <div style="font-size: 14px; color: #c7d2fe;">Lou Capece Music Distributors</div>
                  </td>
                  <td style="text-align: right; vertical-align: middle;">
                    <div style="background-color: rgba(255,255,255,0.2); border-radius: 8px; padding: 12px 20px; display: inline-block;">
                      <div style="font-size: 12px; color: #c7d2fe; text-transform: uppercase; letter-spacing: 1px;">${displayLabel}</div>
                      <div style="font-size: 24px; font-weight: 700; color: #ffffff;">#${displayNumber}</div>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Custom Message (if provided) -->
          ${customMessage ? `
          <tr>
            <td style="padding: 24px 40px 0;">
              <div style="background-color: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 16px 20px; border-radius: 0 8px 8px 0;">
                <div style="font-size: 13px; font-weight: 600; color: #0369a1; margin-bottom: 4px;">Message from Lou Capece Music:</div>
                <div style="font-size: 14px; color: #475569;">${customMessage}</div>
              </div>
            </td>
          </tr>
          ` : ''}

          <!-- Invoice Details Row -->
          <tr>
            <td style="padding: 32px 40px;">
              <table role="presentation" style="width: 100%;">
                <tr>
                  <td style="width: 50%; vertical-align: top; padding-right: 20px;">
                    <!-- Bill To -->
                    <div style="background-color: #f8fafc; border-radius: 12px; padding: 20px; border: 1px solid #e2e8f0;">
                      <div style="font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px;">Bill To</div>
                      <div style="font-size: 16px; font-weight: 600; color: #1e293b; margin-bottom: 8px;">${account?.acct_name || 'N/A'}</div>
                      <div style="font-size: 13px; color: #475569; line-height: 1.5;">
                        ${account?.address || ''}<br>
                        ${account?.city || ''}, ${account?.state || ''} ${account?.zip || ''}<br>
                        ${account?.contact ? `Attn: ${account.contact}<br>` : ''}
                        ${account?.phone || ''}
                      </div>
                    </div>
                  </td>
                  <td style="width: 50%; vertical-align: top; padding-left: 20px;">
                    <!-- Ship To -->
                    <div style="background-color: #f0fdf4; border-radius: 12px; padding: 20px; border: 1px solid #bbf7d0;">
                      <div style="font-size: 11px; font-weight: 600; color: #166534; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px;">Ship To</div>
                      <div style="font-size: 16px; font-weight: 600; color: #1e293b; margin-bottom: 8px;">${invoice.st_name || account?.acct_name || 'N/A'}</div>
                      <div style="font-size: 13px; color: #475569; line-height: 1.5;">
                        ${invoice.st_address || account?.address || ''}<br>
                        ${invoice.st_city || account?.city || ''}, ${invoice.st_state || account?.state || ''} ${invoice.st_zip || account?.zip || ''}<br>
                        ${invoice.st_contact ? `Attn: ${invoice.st_contact}<br>` : ''}
                        ${invoice.st_phone || ''}
                      </div>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Invoice Meta Info -->
          <tr>
            <td style="padding: 0 40px 24px;">
              <table role="presentation" style="width: 100%; background-color: #fafafa; border-radius: 8px; padding: 16px;">
                <tr>
                  <td style="padding: 8px 16px; text-align: center; border-right: 1px solid #e2e8f0;">
                    <div style="font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Invoice Date</div>
                    <div style="font-size: 14px; font-weight: 600; color: #1e293b; margin-top: 4px;">${invoice.invoice_date || 'N/A'}</div>
                  </td>
                  <td style="padding: 8px 16px; text-align: center; border-right: 1px solid #e2e8f0;">
                    <div style="font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Terms</div>
                    <div style="font-size: 14px; font-weight: 600; color: #1e293b; margin-top: 4px;">${invoice.terms || 'N/A'}</div>
                  </td>
                  <td style="padding: 8px 16px; text-align: center; border-right: 1px solid #e2e8f0;">
                    <div style="font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Ship Via</div>
                    <div style="font-size: 14px; font-weight: 600; color: #1e293b; margin-top: 4px;">${invoice.ship_method || 'N/A'}</div>
                  </td>
                  <td style="padding: 8px 16px; text-align: center;">
                    <div style="font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Sales Rep</div>
                    <div style="font-size: 14px; font-weight: 600; color: #1e293b; margin-top: 4px;">${invoice.salesman || 'N/A'}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          ${invoice.customer_po ? `
          <!-- Customer PO -->
          <tr>
            <td style="padding: 0 40px 24px;">
              <div style="background-color: #fef3c7; border-radius: 8px; padding: 12px 16px; display: inline-block;">
                <span style="font-size: 12px; color: #92400e; font-weight: 600;">Customer PO:</span>
                <span style="font-size: 14px; color: #78350f; font-weight: 700; margin-left: 8px;">${invoice.customer_po}</span>
              </div>
            </td>
          </tr>
          ` : ''}

          <!-- Line Items Table -->
          <tr>
            <td style="padding: 0 40px 32px;">
              <table role="presentation" style="width: 100%; border-collapse: collapse; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0;">
                <thead>
                  <tr style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);">
                    <th style="padding: 14px 8px; text-align: center; font-size: 11px; font-weight: 600; color: #ffffff; text-transform: uppercase; letter-spacing: 0.5px;">Qty Ord</th>
                    <th style="padding: 14px 8px; text-align: center; font-size: 11px; font-weight: 600; color: #ffffff; text-transform: uppercase; letter-spacing: 0.5px;">Qty Shp</th>
                    <th style="padding: 14px 8px; text-align: left; font-size: 11px; font-weight: 600; color: #ffffff; text-transform: uppercase; letter-spacing: 0.5px;">Part #</th>
                    <th style="padding: 14px 8px; text-align: left; font-size: 11px; font-weight: 600; color: #ffffff; text-transform: uppercase; letter-spacing: 0.5px;">Description</th>
                    <th style="padding: 14px 8px; text-align: right; font-size: 11px; font-weight: 600; color: #ffffff; text-transform: uppercase; letter-spacing: 0.5px;">Unit Price</th>
                    <th style="padding: 14px 8px; text-align: right; font-size: 11px; font-weight: 600; color: #ffffff; text-transform: uppercase; letter-spacing: 0.5px;">Extended</th>
                  </tr>
                </thead>
                <tbody>
                  ${lineItemsHTML}
                </tbody>
              </table>
            </td>
          </tr>

          <!-- Totals Section -->
          <tr>
            <td style="padding: 0 40px 32px;">
              <table role="presentation" style="width: 100%;">
                <tr>
                  <td style="width: 50%; vertical-align: top;">
                    ${invoice.gen_comments ? `
                    <div style="background-color: #f8fafc; border-radius: 8px; padding: 16px; border: 1px solid #e2e8f0;">
                      <div style="font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">Notes</div>
                      <div style="font-size: 13px; color: #475569;">${invoice.gen_comments}</div>
                    </div>
                    ` : ''}
                  </td>
                  <td style="width: 50%; vertical-align: top; padding-left: 20px;">
                    <table role="presentation" style="width: 100%; background-color: #f8fafc; border-radius: 8px; overflow: hidden;">
                      <tr>
                        <td style="padding: 12px 16px; font-size: 13px; color: #64748b;">Subtotal</td>
                        <td style="padding: 12px 16px; text-align: right; font-size: 14px; font-weight: 600; color: #1e293b;">${formatCurrency(subtotal)}</td>
                      </tr>
                      ${invoice.shipping_charge > 0 ? `
                      <tr>
                        <td style="padding: 12px 16px; font-size: 13px; color: #64748b;">Shipping</td>
                        <td style="padding: 12px 16px; text-align: right; font-size: 14px; font-weight: 600; color: #1e293b;">${formatCurrency(invoice.shipping_charge)}</td>
                      </tr>
                      ` : ''}
                      ${invoice.interest_charge > 0 ? `
                      <tr>
                        <td style="padding: 12px 16px; font-size: 13px; color: #64748b;">Interest/Finance</td>
                        <td style="padding: 12px 16px; text-align: right; font-size: 14px; font-weight: 600; color: #1e293b;">${formatCurrency(invoice.interest_charge)}</td>
                      </tr>
                      ` : ''}
                      ${totalPayments > 0 ? `
                      <tr>
                        <td style="padding: 12px 16px; font-size: 13px; color: #059669;">Payments Received</td>
                        <td style="padding: 12px 16px; text-align: right; font-size: 14px; font-weight: 600; color: #059669;">-${formatCurrency(totalPayments)}</td>
                      </tr>
                      ` : ''}
                      <tr style="background: linear-gradient(135deg, #1e40af 0%, #7c3aed 100%);">
                        <td style="padding: 16px; font-size: 14px; font-weight: 600; color: #ffffff;">Amount Due</td>
                        <td style="padding: 16px; text-align: right; font-size: 20px; font-weight: 700; color: #ffffff;">${formatCurrency(amountDue)}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Payment Call to Action -->
          ${amountDue > 0 ? `
          <tr>
            <td style="padding: 0 40px 32px;">
              <div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); border-radius: 12px; padding: 24px; text-align: center;">
                <div style="font-size: 16px; font-weight: 600; color: #ffffff; margin-bottom: 8px;">Ready to Pay?</div>
                <div style="font-size: 13px; color: #d1fae5; margin-bottom: 16px;">Pay securely online with credit card or ACH</div>
                <a href="https://musicsupplies.com/pay-invoice" style="display: inline-block; background-color: #ffffff; color: #059669; font-size: 14px; font-weight: 600; padding: 12px 32px; border-radius: 8px; text-decoration: none;">Pay Invoice Online</a>
              </div>
            </td>
          </tr>
          ` : ''}

          <!-- Footer -->
          <tr>
            <td style="background-color: #1e293b; padding: 32px 40px;">
              <table role="presentation" style="width: 100%;">
                <tr>
                  <td style="vertical-align: top;">
                    <div style="font-size: 16px; font-weight: 600; color: #ffffff; margin-bottom: 12px;">Lou Capece Music Distributors</div>
                    <div style="font-size: 13px; color: #94a3b8; line-height: 1.6;">
                      2555 North Jerusalem Rd.<br>
                      East Meadow, NY 11554<br>
                      Toll Free: 1(800) 321-5584
                    </div>
                  </td>
                  <td style="text-align: right; vertical-align: top;">
                    <div style="font-size: 13px; color: #94a3b8; margin-bottom: 8px;">Questions about this invoice?</div>
                    <a href="mailto:marketing@loucapecemusic.com" style="font-size: 14px; color: #60a5fa; text-decoration: none;">marketing@loucapecemusic.com</a>
                  </td>
                </tr>
              </table>
              <div style="border-top: 1px solid #334155; margin-top: 24px; padding-top: 24px; text-align: center;">
                <div style="font-size: 12px; color: #64748b;">Thank you for your business!</div>
                <div style="font-size: 11px; color: #475569; margin-top: 8px;">This invoice was generated by MusicSupplies.com</div>
              </div>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>
  `
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get Mailgun credentials from vault
    const mailgunApiKey = Deno.env.get('MAILGUN_API_KEY')
    const mailgunSendingKey = Deno.env.get('MAILGUN_SENDING_KEY')
    const mailgunDomain = Deno.env.get('MAILGUN_DOMAIN') || 'mg.musicsupplies.com'

    // Use sending key if available, otherwise API key
    const apiKey = mailgunSendingKey || mailgunApiKey

    if (!apiKey) {
      console.error('Mailgun credentials not configured')
      return new Response(
        JSON.stringify({ error: 'Email service not configured', code: 'MISSING_CREDENTIALS' }),
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

    const requestData: InvoiceEmailRequest = await req.json()
    const { invoiceId, toEmail, ccEmails, subject, customMessage } = requestData

    if (!invoiceId || !toEmail) {
      return new Response(
        JSON.stringify({ error: 'Invoice ID and recipient email are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Fetching invoice ${invoiceId} for email to ${toEmail}`)

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

    // Fetch account details
    const { data: account } = await supabaseClient
      .from('accounts_lcmd')
      .select('acct_name, address, city, state, zip, phone, email_address, contact')
      .eq('account_number', invoice.account_number)
      .single()

    // Fetch line items
    const { data: lineItems } = await supabaseClient
      .from('tbl_inv_details')
      .select('partnumber, description, qtyordered, qtyshipped, unitnet')
      .eq('ivd', invoiceId)
      .order('linekey', { ascending: true })

    // Fetch payments
    const { data: payments } = await supabaseClient
      .from('tbl_inv_payments')
      .select('paymentamount')
      .eq('invid', invoiceId)

    // Determine display number
    const isWebOrder = invoice.ivd >= 750000 && invoice.ivd <= 770000
    const displayNumber = isWebOrder ? `WB${invoice.ivd}` : String(invoice.ivd)

    // Generate HTML email
    const htmlContent = generateInvoiceEmailHTML(
      invoice as InvoiceData,
      account as AccountData,
      (lineItems || []) as InvoiceLineItem[],
      payments || [],
      customMessage
    )

    // Calculate totals for plain text version
    const subtotal = (lineItems || []).reduce((sum: number, item: any) => {
      const qty = typeof item.qtyshipped === 'number' ? item.qtyshipped : parseFloat(String(item.qtyordered)) || 0
      return sum + (qty * (item.unitnet || 0))
    }, 0)
    const totalPayments = (payments || []).reduce((sum: number, p: any) => sum + (p.paymentamount || 0), 0)
    const grandTotal = subtotal + (invoice.shipping_charge || 0) + (invoice.interest_charge || 0)
    const amountDue = grandTotal - totalPayments

    // Generate plain text version
    const textContent = `
INVOICE #${displayNumber}
Lou Capece Music Distributors
MusicSupplies.com

${customMessage ? `Message: ${customMessage}\n\n` : ''}

Bill To: ${account?.acct_name || 'N/A'}
${account?.address || ''}, ${account?.city || ''}, ${account?.state || ''} ${account?.zip || ''}

Invoice Date: ${invoice.invoice_date || 'N/A'}
Terms: ${invoice.terms || 'N/A'}
Ship Via: ${invoice.ship_method || 'N/A'}

ITEMS:
${(lineItems || []).map((item: any) => `- ${item.partnumber}: ${item.description} (Qty: ${item.qtyshipped || item.qtyordered}) - $${((item.qtyshipped || parseFloat(String(item.qtyordered)) || 0) * (item.unitnet || 0)).toFixed(2)}`).join('\n')}

Subtotal: $${subtotal.toFixed(2)}
${invoice.shipping_charge > 0 ? `Shipping: $${invoice.shipping_charge.toFixed(2)}\n` : ''}
${totalPayments > 0 ? `Payments: -$${totalPayments.toFixed(2)}\n` : ''}
AMOUNT DUE: $${amountDue.toFixed(2)}

Pay online at: https://musicsupplies.com/pay-invoice

Questions? Contact marketing@loucapecemusic.com or call 1-800-321-5584

Thank you for your business!
Lou Capece Music Distributors
2555 North Jerusalem Rd., East Meadow, NY 11554
    `.trim()

    // Build email subject
    const emailSubject = subject || `Invoice #${displayNumber} from Lou Capece Music Distributors`

    // Build recipient list
    const allRecipients = [toEmail, ...(ccEmails || [])]
      .filter(email => email && email.trim())
      .join(',')

    // Prepare form data for Mailgun
    const formData = new FormData()
    formData.append('from', 'Lou Capece Music <marketing@mg.musicsupplies.com>')
    formData.append('to', toEmail)
    if (ccEmails && ccEmails.length > 0) {
      formData.append('cc', ccEmails.filter(e => e && e.trim()).join(','))
    }
    formData.append('subject', emailSubject)
    formData.append('text', textContent)
    formData.append('html', htmlContent)
    formData.append('h:Reply-To', 'marketing@loucapecemusic.com')

    console.log(`Sending invoice email via Mailgun to ${allRecipients}`)

    // Send via Mailgun API
    const mailgunResponse = await fetch(
      `https://api.mailgun.net/v3/${mailgunDomain}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(`api:${apiKey}`)}`
        },
        body: formData
      }
    )

    const responseText = await mailgunResponse.text()
    let responseJson: any = null

    try {
      responseJson = responseText ? JSON.parse(responseText) : null
    } catch {
      responseJson = { raw: responseText }
    }

    if (!mailgunResponse.ok) {
      console.error('Mailgun error:', mailgunResponse.status, responseJson)
      return new Response(
        JSON.stringify({
          success: false,
          error: `Email sending failed: ${mailgunResponse.status}`,
          details: responseJson
        }),
        { status: mailgunResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Invoice email sent successfully:', responseJson)

    // Update invoice with email sent timestamp
    await supabaseClient
      .from('tbl_inv_headers')
      .update({ invoice_emailed: new Date().toISOString() })
      .eq('ivd', invoiceId)

    // Log the activity
    try {
      await supabaseClient
        .from('activity_log')
        .insert({
          action_type: 'invoice_emailed',
          action_details: {
            invoice_id: invoiceId,
            display_number: displayNumber,
            recipient: toEmail,
            cc_recipients: ccEmails || [],
            mailgun_id: responseJson?.id,
            timestamp: new Date().toISOString()
          }
        })
    } catch (logError) {
      console.log('Failed to log invoice email (non-critical):', logError)
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Invoice email sent successfully',
        invoiceId,
        displayNumber,
        recipient: toEmail,
        ccRecipients: ccEmails || [],
        mailgunId: responseJson?.id
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Send Invoice Email error:', error)
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
