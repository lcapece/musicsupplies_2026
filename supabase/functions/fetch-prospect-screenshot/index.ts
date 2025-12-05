import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Use service role key to bypass RLS for storage operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { website } = await req.json()

    if (!website) {
      throw new Error('Website is required')
    }

    console.log(`📸 Fetching screenshot for: ${website}`)

    // Build the target URL
    const targetUrl = website.startsWith('http') ? website : `https://${website}`

    // Get API key from environment
    const apiFlashKey = Deno.env.get('APIFLASH_KEY')
    if (!apiFlashKey) {
      throw new Error('APIFLASH_KEY not configured')
    }

    // Call ApiFlash to get screenshot
    const apiFlashUrl = `https://api.apiflash.com/v1/urltoimage?access_key=${apiFlashKey}&url=${encodeURIComponent(targetUrl)}&format=png&width=1280&height=800&full_page=true&fresh=true`

    console.log(`🌐 Calling ApiFlash for: ${targetUrl}`)

    const screenshotResponse = await fetch(apiFlashUrl)

    if (!screenshotResponse.ok) {
      throw new Error(`ApiFlash error: ${screenshotResponse.status} ${screenshotResponse.statusText}`)
    }

    const imageBlob = await screenshotResponse.blob()
    const imageArrayBuffer = await imageBlob.arrayBuffer()
    const imageUint8Array = new Uint8Array(imageArrayBuffer)

    console.log(`📦 Screenshot received: ${imageBlob.size} bytes`)

    // Upload to Supabase Storage using service role
    const screenshotFilename = `${website}.png`

    const { error: uploadError } = await supabaseAdmin.storage
      .from('prospect-screenshots')
      .upload(screenshotFilename, imageUint8Array, {
        contentType: 'image/png',
        upsert: true
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      throw new Error(`Storage upload failed: ${uploadError.message}`)
    }

    console.log(`✅ Screenshot uploaded: ${screenshotFilename}`)

    // Get the public URL
    const { data: urlData } = supabaseAdmin.storage
      .from('prospect-screenshots')
      .getPublicUrl(screenshotFilename)

    // Update the prospector record with the screenshot URL
    const { error: updateError } = await supabaseAdmin
      .from('prospector')
      .update({ homepage_screenshot_url: urlData.publicUrl })
      .eq('website', website)
      .eq('round_number', 1)

    if (updateError) {
      console.error('Database update error:', updateError)
      // Don't throw - the screenshot was still uploaded successfully
    }

    console.log(`✅ Screenshot fetch complete for: ${website}`)

    return new Response(
      JSON.stringify({
        success: true,
        screenshot_url: urlData.publicUrl,
        message: 'Screenshot captured and uploaded successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('❌ Screenshot fetch error:', error)

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : String(error),
        success: false
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
