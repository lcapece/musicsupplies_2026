import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NetlifyRequest {
  action: 'list-sites' | 'get-site' | 'list-deploys' | 'trigger-deploy'
  siteId?: string
  siteName?: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get Netlify API token from vault secrets
    const netlifyApiToken = Deno.env.get('NETLIFY_API_TOKEN')

    if (!netlifyApiToken) {
      console.error('Netlify API token not configured in vault')
      return new Response(
        JSON.stringify({ error: 'Netlify service not configured' }),
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

    // Create Supabase client to verify admin access
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    )

    // Verify user is authenticated and has admin access
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user is admin (account 999) via staff table
    const { data: staffData, error: staffError } = await supabaseClient
      .from('staff')
      .select('account_number, role')
      .eq('id', user.id)
      .single()

    const isAdmin = staffData?.account_number === '999' || staffData?.role === 999
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const requestData: NetlifyRequest = await req.json()
    const { action, siteId, siteName } = requestData

    if (!action) {
      return new Response(
        JSON.stringify({ error: 'Action is required (list-sites, get-site, list-deploys, trigger-deploy)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const netlifyHeaders = {
      'Authorization': `Bearer ${netlifyApiToken}`,
      'Content-Type': 'application/json'
    }

    let response: any

    switch (action) {
      case 'list-sites': {
        const netlifyResponse = await fetch('https://api.netlify.com/api/v1/sites', {
          headers: netlifyHeaders
        })

        if (!netlifyResponse.ok) {
          throw new Error(`Netlify API error: ${netlifyResponse.status}`)
        }

        const sites = await netlifyResponse.json()

        // Find the music supplies site
        const currentSite = sites.find((site: any) =>
          site.name.includes('musicsupplies') ||
          site.url.includes('musicsupplies') ||
          sites.length === 1
        ) || sites[0]

        response = {
          success: true,
          sites: sites,
          currentSite: currentSite
        }
        break
      }

      case 'get-site': {
        if (!siteId) {
          throw new Error('siteId is required for get-site action')
        }

        const netlifyResponse = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}`, {
          headers: netlifyHeaders
        })

        if (!netlifyResponse.ok) {
          throw new Error(`Netlify API error: ${netlifyResponse.status}`)
        }

        const site = await netlifyResponse.json()
        response = {
          success: true,
          site: site
        }
        break
      }

      case 'list-deploys': {
        if (!siteId) {
          throw new Error('siteId is required for list-deploys action')
        }

        const netlifyResponse = await fetch(
          `https://api.netlify.com/api/v1/sites/${siteId}/deploys?per_page=5`,
          { headers: netlifyHeaders }
        )

        if (!netlifyResponse.ok) {
          throw new Error(`Netlify API error: ${netlifyResponse.status}`)
        }

        const deploys = await netlifyResponse.json()
        response = {
          success: true,
          deploys: deploys
        }
        break
      }

      case 'trigger-deploy': {
        if (!siteId) {
          throw new Error('siteId is required for trigger-deploy action')
        }

        const netlifyResponse = await fetch(
          `https://api.netlify.com/api/v1/sites/${siteId}/builds`,
          {
            method: 'POST',
            headers: netlifyHeaders
          }
        )

        if (!netlifyResponse.ok) {
          throw new Error(`Failed to trigger deployment: ${netlifyResponse.status}`)
        }

        const deployment = await netlifyResponse.json()

        // Log the deployment trigger
        try {
          await supabaseClient
            .from('activity_log')
            .insert({
              user_id: user.id,
              action_type: 'netlify_deploy_triggered',
              action_details: {
                site_id: siteId,
                deploy_id: deployment.id,
                timestamp: new Date().toISOString()
              }
            })
        } catch (logError) {
          console.log('Failed to log deploy event (non-critical):', logError)
        }

        response = {
          success: true,
          message: 'Deployment triggered successfully',
          deployment: deployment
        }
        break
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    return new Response(
      JSON.stringify(response),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Netlify Proxy error:', error)
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
