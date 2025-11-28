import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders })
  }

  try {
    const { business_name, city, state, website } = await req.json()

    if (!business_name || !city || !state || !website) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: business_name, city, state, website' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get Google Maps API key from Supabase Edge secrets
    const googleMapsApiKey = Deno.env.get('GOOGLE_MAPS_API_KEY')
    if (!googleMapsApiKey) {
      console.error('Google Maps API key not found in environment variables')
      return new Response(
        JSON.stringify({ error: 'Google Maps API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Search for the business using Google Places API Text Search
    const searchQuery = `${business_name} ${city} ${state}`
    const placesSearchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(searchQuery)}&key=${googleMapsApiKey}`

    console.log(`Searching Google Places for: ${searchQuery}`)
    
    const searchResponse = await fetch(placesSearchUrl)
    const searchData = await searchResponse.json()

    if (searchData.status !== 'OK' || !searchData.results || searchData.results.length === 0) {
      console.log('No results found in Google Places search')
      return new Response(
        JSON.stringify({ error: 'No business found in Google Places', query: searchQuery }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get the first result's place_id
    const place = searchData.results[0]
    const placeId = place.place_id

    console.log(`Found place: ${place.name} with place_id: ${placeId}`)
    console.log(`Full place result:`, JSON.stringify(place, null, 2))

    // Get detailed information including phone number using Place Details API
    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=formatted_phone_number,international_phone_number,name,formatted_address&key=${googleMapsApiKey}`

    const detailsResponse = await fetch(detailsUrl)
    const detailsData = await detailsResponse.json()

    console.log(`Place details response:`, JSON.stringify(detailsData, null, 2))

    if (detailsData.status !== 'OK' || !detailsData.result) {
      console.log('Failed to get place details')
      return new Response(
        JSON.stringify({ error: 'Failed to get place details from Google Places' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const placeDetails = detailsData.result
    const phoneNumber = placeDetails.formatted_phone_number || placeDetails.international_phone_number

    console.log(`Extracted phone number: ${phoneNumber || 'NOT FOUND'}`)
    console.log(`Place details name: ${placeDetails.name}`)
    console.log(`Place details address: ${placeDetails.formatted_address}`)

    // Initialize Supabase client (moved before phone number check so we can still save place_id)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    if (phoneNumber) {
      console.log(`Found phone number: ${phoneNumber}`)
    } else {
      console.log('No phone number found for this business, but will still save place_id')
    }

    // First check if there's a record with null or empty phone
    const { data: existingRecord, error: checkError } = await supabase
      .from('prospector')
      .select('*')
      .eq('website', website)
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking prospector record:', checkError)
      return new Response(
        JSON.stringify({ error: 'Failed to check existing record', details: checkError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // If record exists and already has a phone number, skip phone update but still update place_id if missing
    if (existingRecord && existingRecord.phone && existingRecord.phone.trim() !== '') {
      console.log(`Record for ${website} already has a phone number: ${existingRecord.phone}`)

      // Still update place_id if it's missing
      if (!existingRecord.google_places_id) {
        const { error: placeIdUpdateError } = await supabase
          .from('prospector')
          .update({ google_places_id: placeId })
          .eq('website', website)

        if (!placeIdUpdateError) {
          console.log(`Updated place_id for ${website}`)
        }
      }

      return new Response(
        JSON.stringify({
          success: false,
          message: 'Record already has a phone number',
          existing_phone: existingRecord.phone,
          found_phone: phoneNumber,
          place_id: placeId,
          business_name: placeDetails.name,
          address: placeDetails.formatted_address,
          website: website
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Prepare update data - always include place_id and phone (use 000-000-0000 if no phone found)
    const updateData: any = {
      google_places_id: placeId,
      phone: phoneNumber || '000-000-0000'
    }

    // Update the prospector record with the found data (only if phone is null or empty)
    const { data: updatedRecord, error: updateError } = await supabase
      .from('prospector')
      .update(updateData)
      .eq('website', website)
      .or('phone.is.null,phone.eq.')
      .select()

    if (updateError) {
      console.error('Error updating prospector record:', updateError)
      return new Response(
        JSON.stringify({ error: 'Failed to update prospector record in database', details: updateError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (phoneNumber) {
      console.log(`Successfully updated phone number and place_id for ${website}`)
    } else {
      console.log(`Successfully updated place_id for ${website} and set phone to 000-000-0000 (no phone available in Google Places)`)
    }

    return new Response(
      JSON.stringify({
        success: phoneNumber ? true : false,
        phone_number: phoneNumber || '000-000-0000',
        place_id: placeId,
        business_name: placeDetails.name,
        address: placeDetails.formatted_address,
        website: website,
        message: phoneNumber ? 'Phone number and place_id updated' : 'Place_id updated, phone set to 000-000-0000 (no phone found)',
        updated_record: updatedRecord?.[0] || null
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in fetch-phone-from-places function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})