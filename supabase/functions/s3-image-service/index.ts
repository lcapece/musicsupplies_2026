import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const action = url.searchParams.get('action')
    
    // Handle list action - return all files from S3 cache (kept for backward compatibility)
    if (action === 'list') {
      console.log(`[S3ImageService] List action requested`)
      
      // Initialize Supabase client
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      const supabase = createClient(supabaseUrl, supabaseKey)
      
      try {
        const { data: cacheData, error: cacheError } = await supabase
          .from('s3_image_cache')
          .select('file_name')
          .order('file_name')
        
        if (cacheError) {
          console.error('[S3ImageService] Error fetching file list:', cacheError)
          return new Response(
            JSON.stringify({
              success: false,
              message: `Database error: ${cacheError.message}`,
              files: []
            }),
            {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          )
        }
        
        const files = cacheData?.map(row => row.file_name).filter(Boolean) || []
        console.log(`[S3ImageService] Returning ${files.length} files from cache`)
        
        return new Response(
          JSON.stringify({
            success: true,
            files: files,
            count: files.length
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      } catch (error) {
        console.error('[S3ImageService] Exception in list action:', error)
        return new Response(
          JSON.stringify({
            success: false,
            message: `Error fetching file list: ${error.message}`,
            files: []
          }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
    }
    
    // Parse request body for POST requests (image lookup)
    let modelNumber: string | null = null

    if (req.method === 'POST') {
      const body = await req.json()
      modelNumber = body.modelNumber
    } else {
      // Fallback to URL parameters for GET requests
      modelNumber = url.searchParams.get('modelNumber')
    }

    console.log(`[S3ImageService] NEW SIMPLIFIED RULES - Request for modelNumber: ${modelNumber}`)

    if (!modelNumber) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'modelNumber parameter is required'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const bucketUrl = 'https://mus86077.s3.amazonaws.com'
    let foundImageUrl = null
    let searchSource = 'none'

    // NEW SIMPLIFIED RULES IMPLEMENTATION
    console.log(`[S3ImageService] Implementing new simplified image rules for: ${modelNumber}`)

    // Step 1: Get the image field from products_supabase table
    console.log(`[S3ImageService] Step 1: Querying products_supabase for image field`)
    
    const { data: productData, error: productError } = await supabase
      .from('products_supabase')
      .select('image')
      .eq('partnumber', modelNumber)
      .single()

    let imageFieldValue = null
    if (!productError && productData && productData.image) {
      imageFieldValue = productData.image.trim()
      console.log(`[S3ImageService] Found image field value: ${imageFieldValue}`)
    } else {
      console.log(`[S3ImageService] No image field found or error:`, productError)
    }

    // Step 2: Try the exact filename from image field (Priority 1)
    if (imageFieldValue) {
      const imageFieldUrl = `${bucketUrl}/${imageFieldValue.toLowerCase()}`
      console.log(`[S3ImageService] Step 2: Trying image field filename: ${imageFieldUrl}`)
      
      try {
        const response = await fetch(imageFieldUrl, { method: 'HEAD' })
        if (response.ok) {
          foundImageUrl = imageFieldUrl
          searchSource = 'image_field_exact'
          console.log(`[S3ImageService] SUCCESS: Found image using image field: ${foundImageUrl}`)
        } else {
          console.log(`[S3ImageService] Image field filename not found (${response.status}): ${imageFieldUrl}`)
        }
      } catch (error) {
        console.log(`[S3ImageService] Error checking image field filename:`, error)
      }
    }

    // Step 3: Try partnumber with extensions (Priority 2)
    if (!foundImageUrl) {
      const partnumberLower = modelNumber.toLowerCase()
      const extensions = ['jpg', 'png', 'tiff']
      
      console.log(`[S3ImageService] Step 3: Trying partnumber with extensions for: ${partnumberLower}`)
      
      for (const ext of extensions) {
        const testUrl = `${bucketUrl}/${partnumberLower}.${ext}`
        console.log(`[S3ImageService] Trying: ${testUrl}`)
        
        try {
          const response = await fetch(testUrl, { method: 'HEAD' })
          if (response.ok) {
            foundImageUrl = testUrl
            searchSource = `partnumber_${ext}`
            console.log(`[S3ImageService] SUCCESS: Found image using partnumber.${ext}: ${foundImageUrl}`)
            break
          } else {
            console.log(`[S3ImageService] Not found (${response.status}): ${testUrl}`)
          }
        } catch (error) {
          console.log(`[S3ImageService] Error checking ${testUrl}:`, error)
        }
      }
    }

    console.log(`[S3ImageService] Final result - Image URL: ${foundImageUrl}, Source: ${searchSource}`)

    // Return result
    if (foundImageUrl) {
      return new Response(
        JSON.stringify({
          success: true,
          imageUrl: foundImageUrl,
          modelNumber: modelNumber,
          source: searchSource
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    } else {
      return new Response(
        JSON.stringify({
          success: false,
          message: `No image found using simplified rules for: ${modelNumber}`,
          modelNumber: modelNumber,
          searchAttempts: {
            imageField: imageFieldValue || 'not_found',
            partnumberExtensions: ['jpg', 'png', 'tiff']
          }
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

  } catch (error) {
    console.error('Error in s3-image-service:', error)

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
