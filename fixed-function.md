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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const { website, business_name, city } = await req.json()

    if (!website) {
      throw new Error('Website is required')
    }

    console.log('Starting intelligence gathering for: ' + website)

    // NO NEW SCREENSHOT CAPTURE - Use existing screenshot from database only
    console.log('NO NEW SCREENSHOT CAPTURE - Using existing screenshot from database only')
    
    // Get existing screenshot URL from database (never generate new ones)
    let screenshotUrl = null
    try {
      const { data: existingData } = await supabaseClient
        .from('prospector')
        .select('homepage_screenshot_url')
        .eq('website', website)
        .eq('round_number', 1)
        .single()
      screenshotUrl = existingData?.homepage_screenshot_url
      console.log('Using existing screenshot: ' + (screenshotUrl ? 'Found' : 'None available'))
    } catch (error) {
      console.log('No existing screenshot found, proceeding without it')
    }

    // Update status directly to researching (NEVER use capturing phase)
    await supabaseClient
      .from('prospector')
      .update({
        intelligence_status: 'researching',
        last_intelligence_gather: new Date().toISOString()
      })
      .eq('website', website)
      .eq('round_number', 1)

    // Tavily research
    console.log('Starting Tavily research...')
    let tavilyData = null
    
    try {
      const tavilyApiKey = Deno.env.get('TAVILY_API_KEY')
      if (tavilyApiKey) {
        const tavilyResponse = await fetch('https://api.tavily.com/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + tavilyApiKey
          },
          body: JSON.stringify({
            query: (business_name || website) + ' music instruments business products services',
            search_depth: 'basic',
            include_answer: true,
            include_raw_content: false,
            max_results: 5,
            include_domains: [website]
          })
        })

        if (tavilyResponse.ok) {
          tavilyData = await tavilyResponse.json()
          console.log('Tavily research completed')
        }
      }
    } catch (error) {
      console.log('Tavily research failed: ' + (error instanceof Error ? error.message : String(error)))
    }

    // Update status to generating
    await supabaseClient
      .from('prospector')
      .update({ 
        intelligence_status: 'generating',
        tavily_research_data: tavilyData
      })
      .eq('website', website)
      .eq('round_number', 1)

    // Generate authentic icebreakers based on screenshot analysis
    console.log('Starting OpenAI analysis with screenshot focus...')
    
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured')
    }

    // Prepare context for OpenAI
    const businessContext = business_name ? 'Business: ' + business_name : ''
    const locationContext = city ? 'Location: ' + city : ''
    const tavilyContext = tavilyData ? 'Research: ' + JSON.stringify(tavilyData.answer || tavilyData.results?.slice(0, 3) || {}) : ''

    const systemPrompt = `Context:
You are assisting a wholesale distributor of musical instruments and accessories. We are building a sales enablement tool that uses screenshots of business homepages (e.g., music stores, pawn shops, gun shops, loan brokers) to create personalized ice breakers for outbound sales calls or emails.

These prospects often operate outside traditional retail and may vary in how clearly they showcase musical merchandise on their website.

You are being provided a screenshot of a potential prospect's homepage. Your job is to:

Objective:
Generate a short, conversational observation or ice breaker (1–3 sentences) that shows we've visited the homepage and made a genuine, specific, and relevant observation — not generic praise.

Guidelines for the Output:

DO extract any unique or interesting detail from the homepage. This could be:
- A specific product (e.g., "1955 Martin D-18" guitar)
- An unusual category (e.g., "Vintage banjos" or "Affordable rentals")
- A visual theme (e.g., "wall-to-wall acoustic display")
- A service they offer (e.g., "repairs" or "rentals")
- Local mentions (e.g., "serving Asheville and WNC")

DO NOT use vague or generic phrases like "your site looks great" or "you seem passionate about music."

If the screenshot contains limited information, do your best to make an honest but minimal observation (e.g., "The homepage image suggests you have an in-store focus on acoustic instruments.")

Maintain a conversational tone that a sales rep might use in a cold email or intro call.

ADDITIONAL INTELLIGENCE GATHERING REQUIREMENTS:

CRITICAL MISSION: Find "small little gems" - specific visual details or unique facts that show you actually looked at their business.

WHAT TO LOOK FOR IN SCREENSHOTS:
- Specific instruments (brands, models, colors, years): "1967 Fender Stratocaster in sunburst"
- Unique decorations: "That 1968 Corvette with the guitar in your lobby photo"
- Specific signage or displays: "The vintage Marshall amp stack behind your counter"
- Personal touches: "The family photo next to the drum kit"
- Unusual combinations: "Love how you display guitars next to the classic car memorabilia"
- Specific details: "That red Gibson SG hanging on the left wall"
- Store layout specifics: "The way you've arranged the acoustic guitars by the window"

WHAT TO EXTRACT FROM TAVILY RESEARCH:
- Specific years in business: "25 years" not just "long time"
- Unique specialties: "vintage tube amps" not just "music equipment"
- Awards or recognition: "2019 Dealer of the Year"
- Interesting history: "Started in your garage in 1995"
- Unique services: "custom guitar setups" or "amp repair"

FORBIDDEN GENERIC ICEBREAKERS:
- "What got you into business?"
- "What makes you interested in teaching music?"
- "Nice website"
- "I love music too"
- "How's business?"

REQUIRED AUTHENTIC ICEBREAKERS:
- "I saw that picture of the 1967 Corvette with the guitar - that's so awesome"
- "That vintage Ludwig drum kit in your front window caught my eye"
- "I noticed the Martin D-28 hanging behind your counter - beautiful instrument"
- "Your 23 years specializing in vintage tube amps shows real expertise"
- "That custom display case with the Fender collection is impressive"

CRITICAL: If you cannot find specific visual details or unique business facts, state: "No specific visual gems or unique business details found for authentic icebreakers - manual review recommended"`

    const userPrompt = `MISSION: Find specific visual "gems" and unique business details for authentic icebreakers.

Analyze this potential wholesale customer:
Website: ` + website + `
` + businessContext + `
` + locationContext + `
` + tavilyContext + `

` + (screenshotUrl ? 'Screenshot URL: ' + screenshotUrl : 'No screenshot available - analysis based on research data only') + `

SCREENSHOT ANALYSIS INSTRUCTIONS:
Look for SPECIFIC visual details like:
- Exact instrument brands/models/colors you can see
- Unique decorations or displays
- Personal touches or interesting combinations
- Specific signage or store layout details
- Any unusual or memorable visual elements

TAVILY RESEARCH EXTRACTION:
Find SPECIFIC facts like:
- Exact years in business
- Unique specialties or services
- Awards or recognition
- Interesting business history
- Specific expertise areas

Please provide:
1. A detailed sales intelligence report in markdown format
2. 3-5 AUTHENTIC icebreakers based ONLY on specific visual "gems" from the screenshot AND unique facts from Tavily research (or clearly state if none found)
3. Business grade (A-F) for wholesale potential and reasoning
4. Whether this business has music focus or potential (true/false)

Format your response as:
## Sales Intelligence Report
[Your detailed analysis here]

## Icebreakers
[List 3-5 specific, authentic icebreakers with exact visual details, or state "No specific visual gems or unique business details found for authentic icebreakers - manual review recommended"]

## Grade: [A-F]
## Reasoning: [Your reasoning for wholesale potential]
## Music Focus: [true/false]`

    const messages = [
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: userPrompt
      }
    ]

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + openaiApiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: messages,
        max_tokens: 2000,
        temperature: 0.7
      })
    })

    if (!openaiResponse.ok) {
      throw new Error('OpenAI API error: ' + openaiResponse.status)
    }

    const openaiData = await openaiResponse.json()
    const aiContent = openaiData.choices[0]?.message?.content || ''

    console.log('OpenAI analysis completed')

    // Parse the AI response to extract components
    const lines = aiContent.split('\n')
    let aiMarkdown = ''
    let icebreakers = ''
    let aiGrade = 'C'
    let aiGradeReason = 'Standard assessment'
    let aiMusicFocus = false

    // Extract icebreakers section
    let inIcebreakers = false
    let inMarkdown = true
    
    for (const line of lines) {
      if (line.toLowerCase().includes('icebreaker') || line.toLowerCase().includes('ice breaker')) {
        inIcebreakers = true
        inMarkdown = false
        continue
      }
      
      if (line.toLowerCase().includes('grade:')) {
        const gradeMatch = line.match(/grade:\s*([A-F])/i)
        if (gradeMatch) aiGrade = gradeMatch[1].toUpperCase()
        continue
      }
      
      if (line.toLowerCase().includes('music focus:')) {
        aiMusicFocus = line.toLowerCase().includes('true') || line.toLowerCase().includes('yes')
        continue
      }
      
      if (line.toLowerCase().includes('reasoning:') || line.toLowerCase().includes('reason:')) {
        aiGradeReason = line.split(':')[1]?.trim() || aiGradeReason
        continue
      }
      
      if (inIcebreakers && line.trim()) {
        icebreakers += line.trim() + '\n'
      } else if (inMarkdown && line.trim()) {
        aiMarkdown += line + '\n'
      }
    }

    // If no specific icebreakers were extracted, use the full content but warn
    if (!icebreakers.trim()) {
      icebreakers = 'No specific visual elements identified for authentic icebreakers. Manual review of screenshot recommended.'
    }

    // Final update with all results
    const { error: updateError } = await supabaseClient
      .from('prospector')
      .update({
        intelligence_status: 'complete',
        ai_markdown: aiMarkdown.trim() || aiContent,
        icebreakers: icebreakers.trim(),
        ai_grade: aiGrade,
        ai_grade_reason: aiGradeReason,
        ai_music_focus: aiMusicFocus,
        last_intelligence_gather: new Date().toISOString()
      })
      .eq('website', website)
      .eq('round_number', 1)

    if (updateError) {
      throw updateError
    }

    console.log('Intelligence gathering completed successfully')

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Intelligence gathering completed',
        screenshot_skipped: true,
        authentic_icebreakers: true
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Intelligence gathering error:', error)

    // Update status to error
    try {
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        {
          global: {
            headers: { Authorization: req.headers.get('Authorization')! },
          },
        }
      )

      const { website } = await req.json().catch(() => ({}))
      if (website) {
        await supabaseClient
          .from('prospector')
          .update({ intelligence_status: 'error' })
          .eq('website', website)
          .eq('round_number', 1)
      }
    } catch (updateError) {
      console.error('Failed to update error status:', updateError)
    }

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