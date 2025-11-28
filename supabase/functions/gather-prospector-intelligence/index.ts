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

    console.log(`🚀 Starting intelligence gathering for: ${website}`)

    // NO NEW SCREENSHOT CAPTURE - Use existing screenshot from database only
    console.log('🚫 NO NEW SCREENSHOT CAPTURE - Using existing screenshot from database only')
    
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
      console.log(`📸 Using existing screenshot: ${screenshotUrl ? 'Found' : 'None available'}`)
    } catch (error) {
      console.log('⚠️ No existing screenshot found, proceeding without it')
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
    console.log('🔍 Starting Tavily research...')
    let tavilyData = null
    let extractedPhone = null
    let extractedEmail = null
    let extractedFacebook = null
    let extractedInstagram = null

    try {
      const tavilyApiKey = Deno.env.get('TAVILY_API_KEY')
      if (tavilyApiKey) {
        const tavilyResponse = await fetch('https://api.tavily.com/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            api_key: tavilyApiKey,
            query: `${business_name || website} music instruments business products services contact phone email`,
            search_depth: 'basic',
            include_answer: true,
            include_raw_content: true,
            max_results: 5,
            include_domains: [website]
          })
        })

        if (tavilyResponse.ok) {
          tavilyData = await tavilyResponse.json()
          console.log('✅ Tavily research completed')

          // Extract contact information from Tavily data
          const tavilyText = JSON.stringify(tavilyData)

          // Extract phone number (US formats)
          const phoneRegex = /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g
          const phoneMatches = tavilyText.match(phoneRegex)
          if (phoneMatches && phoneMatches.length > 0) {
            extractedPhone = phoneMatches[0].trim()
            console.log(`📞 Phone extracted from Tavily: ${extractedPhone}`)
          }

          // Extract email
          const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
          const emailMatches = tavilyText.match(emailRegex)
          if (emailMatches && emailMatches.length > 0) {
            extractedEmail = emailMatches[0].toLowerCase().trim()
            console.log(`📧 Email extracted from Tavily: ${extractedEmail}`)
          }

          // Extract Facebook URL
          const facebookRegex = /(?:https?:\/\/)?(?:www\.)?facebook\.com\/[a-zA-Z0-9.]+/gi
          const facebookMatches = tavilyText.match(facebookRegex)
          if (facebookMatches && facebookMatches.length > 0) {
            extractedFacebook = facebookMatches[0].trim()
            console.log(`📘 Facebook extracted from Tavily: ${extractedFacebook}`)
          }

          // Extract Instagram URL
          const instagramRegex = /(?:https?:\/\/)?(?:www\.)?instagram\.com\/[a-zA-Z0-9._]+/gi
          const instagramMatches = tavilyText.match(instagramRegex)
          if (instagramMatches && instagramMatches.length > 0) {
            extractedInstagram = instagramMatches[0].trim()
            console.log(`📷 Instagram extracted from Tavily: ${extractedInstagram}`)
          }
        }
      }
    } catch (error) {
      console.log('⚠️ Tavily research failed:', error instanceof Error ? error.message : String(error))
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

    // CRITICAL FIX 2: Generate authentic icebreakers based on screenshot analysis
    console.log('🤖 Starting OpenAI analysis with screenshot focus...')
    
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured')
    }

    // Prepare context for OpenAI
    const businessContext = business_name ? `Business: ${business_name}` : ''
    const locationContext = city ? `Location: ${city}` : ''
    const tavilyContext = tavilyData ? `Research: ${JSON.stringify(tavilyData.answer || tavilyData.results?.slice(0, 3) || {})}` : ''

    const messages = [
      {
        role: 'system',
        content: `Context:
You are assisting a wholesale distributor of musical instruments and accessories. We are building a sales enablement tool that uses screenshots of business homepages (e.g., music stores, pawn shops, gun shops, loan brokers) to create personalized ice breakers for outbound sales calls or emails.

These prospects often operate outside traditional retail and may vary in how clearly they showcase musical merchandise on their website.

You are being provided a screenshot of a potential prospect's homepage. Your job is to:

🧠 Objective:
Generate a short, conversational observation or ice breaker (1–3 sentences) that shows we've visited the homepage and made a genuine, specific, and relevant observation — not generic praise.

🎯 Guidelines for the Output:

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
❌ "What got you into business?"
❌ "What makes you interested in teaching music?"
❌ "Nice website"
❌ "I love music too"
❌ "How's business?"

REQUIRED AUTHENTIC ICEBREAKERS:
✅ "I saw that picture of the 1967 Corvette with the guitar - that's so awesome"
✅ "That vintage Ludwig drum kit in your front window caught my eye"
✅ "I noticed the Martin D-28 hanging behind your counter - beautiful instrument"
✅ "Your 23 years specializing in vintage tube amps shows real expertise"
✅ "That custom display case with the Fender collection is impressive"

CRITICAL: If you cannot find specific visual details or unique business facts, state: "No specific visual gems or unique business details found for authentic icebreakers - manual review recommended"

⚠️ CRITICAL WRITING REQUIREMENT - 4TH TO 5TH GRADE READING LEVEL:
ALL intelligence reports, analysis, and icebreakers MUST be written at a 4th to 5th grade reading level. This means:

✅ USE simple, everyday words
✅ USE short sentences (10-15 words per sentence)
✅ USE common words everyone knows
✅ USE active voice ("They sell guitars" not "Guitars are sold by them")
✅ AVOID complex industry jargon unless necessary, and explain it simply
✅ AVOID long, complicated sentences
✅ AVOID words with more than 3 syllables when possible

GOOD EXAMPLES (4th-5th grade level):
✅ "This store has been open for 25 years. They sell guitars and drums."
✅ "The shop fixes old guitars. They also rent instruments to students."
✅ "This business might be a good fit. They have a lot of music gear in stock."

BAD EXAMPLES (too complex):
❌ "This establishment has operated continuously for a quarter-century, specializing in stringed and percussion instruments."
❌ "The enterprise demonstrates considerable expertise in restoration services for vintage musical equipment."
❌ "This organization exhibits substantial wholesale procurement potential."

Remember: Write like you're explaining something to a 10-year-old. Keep it simple, clear, and easy to understand.`
      },
      {
        role: 'user',
        content: `MISSION: Find specific visual "gems" and unique business details for authentic icebreakers, AND extract contact information.

Analyze this potential wholesale customer:
Website: ${website}
${businessContext}
${locationContext}
${tavilyContext}

${screenshotUrl ? `Screenshot URL: ${screenshotUrl}` : 'No screenshot available - analysis based on research data only'}

SCREENSHOT ANALYSIS INSTRUCTIONS:
Look for SPECIFIC visual details like:
- Exact instrument brands/models/colors you can see
- Unique decorations or displays
- Personal touches or interesting combinations
- Specific signage or store layout details
- Any unusual or memorable visual elements

🔍 CRITICAL: CONTACT INFORMATION EXTRACTION
${extractedPhone ? `✅ Phone already found from Tavily: ${extractedPhone}` : '❗ EXTRACT PHONE NUMBER from screenshot OCR - look for any phone numbers visible in the image'}
${extractedEmail ? `✅ Email already found from Tavily: ${extractedEmail}` : '❗ EXTRACT EMAIL ADDRESS from screenshot OCR - look for any email addresses visible in the image'}
${extractedFacebook ? `✅ Facebook already found from Tavily: ${extractedFacebook}` : '❗ EXTRACT FACEBOOK PAGE from screenshot OCR - look for Facebook URLs, icons, or @handles visible in the image'}
${extractedInstagram ? `✅ Instagram already found from Tavily: ${extractedInstagram}` : '❗ EXTRACT INSTAGRAM PAGE from screenshot OCR - look for Instagram URLs, icons, or @handles visible in the image'}

IMPORTANT: If you can see any contact information in the screenshot (phone, email, Facebook, Instagram), YOU MUST extract it and include it in your response using the exact format below.

TAVILY RESEARCH EXTRACTION:
Find SPECIFIC facts like:
- Exact years in business
- Unique specialties or services
- Awards or recognition
- Interesting business history
- Specific expertise areas

Please provide:
1. A detailed sales intelligence report in markdown format - WRITTEN AT 4TH TO 5TH GRADE READING LEVEL
2. 3-5 AUTHENTIC icebreakers based ONLY on specific visual "gems" from the screenshot AND unique facts from Tavily research (or clearly state if none found) - WRITTEN AT 4TH TO 5TH GRADE READING LEVEL
3. Business grade (A-F) for wholesale potential and reasoning - WRITTEN AT 4TH TO 5TH GRADE READING LEVEL
4. Whether this business has music focus or potential (true/false)
5. CONTACT INFORMATION (if found in screenshot - use exact format below):

⚠️ REMINDER: ALL TEXT MUST BE AT 4TH TO 5TH GRADE READING LEVEL
- Use simple words
- Use short sentences (10-15 words)
- Write like you're talking to a 10-year-old
- Avoid big words and complex sentences

IMPORTANT FORMATTING INSTRUCTION:
When you identify negative aspects, limitations, or concerns about wholesale potential, wrap those specific sentences or phrases in <NEGATIVE> tags. For example:
- <NEGATIVE>This limits the potential for wholesale opportunities.</NEGATIVE>
- <NEGATIVE>The business appears to have minimal music inventory.</NEGATIVE>
- <NEGATIVE>Limited wholesale potential due to small scale operations.</NEGATIVE>

This will help highlight concerns for sales review.

Format your response as:
## Sales Intelligence Report
[Your detailed analysis here - use <NEGATIVE> tags for negative aspects - WRITTEN AT 4TH-5TH GRADE LEVEL]

## Icebreakers
[List 3-5 specific, authentic icebreakers with exact visual details, or state "<NEGATIVE>No specific visual gems or unique business details found for authentic icebreakers - manual review recommended</NEGATIVE>" - WRITTEN AT 4TH-5TH GRADE LEVEL]

## Contact Information
Phone: [phone number from screenshot, or "Not found"]
Email: [email address from screenshot, or "Not found"]
Facebook: [Facebook URL or @handle from screenshot, or "Not found"]
Instagram: [Instagram URL or @handle from screenshot, or "Not found"]

## Grade: [A-F]
## Reasoning: [Your reasoning for wholesale potential - use <NEGATIVE> tags for limitations - WRITTEN AT 4TH-5TH GRADE LEVEL]
## Music Focus: [true/false]`
      }
    ]

    // Add screenshot image to the user message if available
    if (screenshotUrl) {
      messages[1].content = [
        {
          type: 'text',
          text: messages[1].content
        },
        {
          type: 'image_url',
          image_url: {
            url: screenshotUrl,
            detail: 'high'
          }
        }
      ]
    }

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: messages,
        max_tokens: 2000,
        temperature: 0.7
      })
    })

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('OpenAI API error details:', errorText);
      throw new Error(`OpenAI API error: ${openaiResponse.status} - ${errorText.substring(0, 200)}...`);
    }

    const openaiData = await openaiResponse.json()
    const aiContent = openaiData.choices[0]?.message?.content || ''

    console.log('✅ OpenAI analysis completed')

    // Parse the AI response to extract components
    const lines = aiContent.split('\n')
    let aiMarkdown = ''
    let icebreakers = ''
    let aiGrade = 'C'
    let aiGradeReason = 'Standard assessment'
    let aiMusicFocus = false
    let aiPhone = null
    let aiEmail = null
    let aiFacebook = null
    let aiInstagram = null

    // Extract icebreakers section
    let inIcebreakers = false
    let inContactInfo = false
    let inMarkdown = true

    for (const line of lines) {
      if (line.toLowerCase().includes('icebreaker') || line.toLowerCase().includes('ice breaker')) {
        inIcebreakers = true
        inContactInfo = false
        inMarkdown = false
        continue
      }

      if (line.toLowerCase().includes('contact information')) {
        inContactInfo = true
        inIcebreakers = false
        inMarkdown = false
        continue
      }

      if (line.toLowerCase().includes('grade:')) {
        inContactInfo = false
        inIcebreakers = false
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

      // Extract contact information from AI response
      if (inContactInfo) {
        if (line.toLowerCase().includes('phone:')) {
          const phoneValue = line.split(':')[1]?.trim()
          if (phoneValue && !phoneValue.toLowerCase().includes('not found')) {
            aiPhone = phoneValue
          }
        }
        if (line.toLowerCase().includes('email:')) {
          const emailValue = line.split(':')[1]?.trim()
          if (emailValue && !emailValue.toLowerCase().includes('not found')) {
            aiEmail = emailValue
          }
        }
        if (line.toLowerCase().includes('facebook:')) {
          const facebookValue = line.split(':')[1]?.trim()
          if (facebookValue && !facebookValue.toLowerCase().includes('not found')) {
            aiFacebook = facebookValue
          }
        }
        if (line.toLowerCase().includes('instagram:')) {
          const instagramValue = line.split(':')[1]?.trim()
          if (instagramValue && !instagramValue.toLowerCase().includes('not found')) {
            aiInstagram = instagramValue
          }
        }
      }

      if (inIcebreakers && line.trim() && !line.toLowerCase().includes('contact information')) {
        icebreakers += line.trim() + '\n'
      } else if (inMarkdown && line.trim()) {
        aiMarkdown += line + '\n'
      }
    }

    // If no specific icebreakers were extracted, use the full content but warn
    if (!icebreakers.trim()) {
      icebreakers = 'No specific visual elements identified for authentic icebreakers. Manual review of screenshot recommended.'
    }

    // Merge contact information - prefer Tavily data, fall back to AI extraction
    const finalPhone = extractedPhone || aiPhone
    const finalEmail = extractedEmail || aiEmail
    const finalFacebook = extractedFacebook || aiFacebook
    const finalInstagram = extractedInstagram || aiInstagram

    // Log extracted contact information
    console.log('📞 Final Phone:', finalPhone || 'Not found')
    console.log('📧 Final Email:', finalEmail || 'Not found')
    console.log('📘 Final Facebook:', finalFacebook || 'Not found')
    console.log('📷 Final Instagram:', finalInstagram || 'Not found')

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
        phone: finalPhone,
        email: finalEmail,
        facebook_page: finalFacebook,
        instagram_page: finalInstagram,
        last_intelligence_gather: new Date().toISOString()
      })
      .eq('website', website)
      .eq('round_number', 1)

    if (updateError) {
      throw updateError
    }

    console.log('✅ Intelligence gathering completed successfully')

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
    console.error('❌ Intelligence gathering error:', error)

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
