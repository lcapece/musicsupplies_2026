import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SmsRequest {
  message: string
  eventName?: string
  customPhones?: string[]
  source?: string
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
    // Get ClickSend credentials from vault secrets
    const clicksendUsername = Deno.env.get('CLICKSEND_USERNAME')
    const clicksendApiKey = Deno.env.get('CLICKSEND_API_KEY')
    const clicksendSenderId = Deno.env.get('CLICKSEND_SENDER_ID') || 'MusicSupplies'

    if (!clicksendUsername || !clicksendApiKey) {
      console.error('ClickSend credentials not configured in vault')
      return new Response(
        JSON.stringify({ error: 'SMS service not configured' }),
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

    const requestData: SmsRequest = await req.json()
    const { message, eventName, customPhones, source } = requestData

    if (!message || !message.trim()) {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get admin phone numbers from database if no custom phones provided
    let recipientPhones: string[] = []

    if (customPhones && customPhones.length > 0) {
      recipientPhones = customPhones.map(normalizeUSPhone)
    } else {
      // Fetch admin phones from the database (staff table with role 999 or admin_phones config)
      try {
        // First try to get from staff table
        const { data: staffData, error: staffError } = await supabaseClient
          .from('staff')
          .select('phone')
          .eq('role', 999)
          .not('phone', 'is', null)

        if (!staffError && staffData && staffData.length > 0) {
          recipientPhones = staffData
            .filter(s => s.phone)
            .map(s => normalizeUSPhone(s.phone))
        }

        // If no staff found, try admin_config table
        if (recipientPhones.length === 0) {
          const { data: configData } = await supabaseClient
            .from('admin_config')
            .select('config_value')
            .eq('config_key', 'admin_phones')
            .single()

          if (configData?.config_value) {
            const phones = JSON.parse(configData.config_value)
            if (Array.isArray(phones)) {
              recipientPhones = phones.map(normalizeUSPhone)
            }
          }
        }
      } catch (dbError) {
        console.error('Error fetching admin phones from database:', dbError)
      }

      // Fallback: If still no phones, return error (don't hardcode)
      if (recipientPhones.length === 0) {
        return new Response(
          JSON.stringify({
            error: 'No admin phone numbers configured. Please set up admin phones in the staff table or admin_config.'
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Create ClickSend auth header
    const auth = btoa(`${clicksendUsername}:${clicksendApiKey}`)

    // Prepare message payload
    const payload = {
      messages: recipientPhones.map(to => ({
        source: source || 'MusicSupplies-Admin',
        body: message,
        to: to,
        from: clicksendSenderId
      }))
    }

    console.log(`Sending SMS to ${recipientPhones.length} recipients via ClickSend`)

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
      console.error('ClickSend HTTP error:', clicksendResponse.status, responseJson)
      return new Response(
        JSON.stringify({
          success: false,
          error: `ClickSend error: ${clicksendResponse.status}`,
          details: responseJson
        }),
        { status: clicksendResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('SMS sent successfully via ClickSend')

    // Log the SMS send event
    try {
      await supabaseClient
        .from('activity_log')
        .insert({
          action_type: 'sms_sent',
          action_details: {
            event_name: eventName || 'admin_notification',
            recipient_count: recipientPhones.length,
            source: source || 'edge_function',
            timestamp: new Date().toISOString()
          }
        })
    } catch (logError) {
      console.log('Failed to log SMS event (non-critical):', logError)
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'SMS sent successfully',
        recipientCount: recipientPhones.length,
        clicksendResponse: responseJson
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Send Admin SMS error:', error)
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
