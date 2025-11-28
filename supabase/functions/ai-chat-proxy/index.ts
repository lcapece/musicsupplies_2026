import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

interface ChatRequest {
  provider: 'openai' | 'anthropic' | 'perplexity' | 'elevenlabs' | 'embedding'
  messages?: ChatMessage[]
  text?: string // For ElevenLabs TTS
  model?: string
  maxTokens?: number
  temperature?: number
  voiceId?: string // For ElevenLabs
  systemPrompt?: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify authorization
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Supabase client to verify the user is authenticated
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    )

    // Verify user is authenticated (optional - can be removed if you want public access)
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError) {
      console.log('Auth check skipped - using anon key access')
    }

    const requestData: ChatRequest = await req.json()
    const { provider, messages, text, model, maxTokens, temperature, voiceId, systemPrompt } = requestData

    if (!provider) {
      return new Response(
        JSON.stringify({ error: 'Provider is required (openai, anthropic, perplexity, elevenlabs, embedding)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let response: any

    switch (provider) {
      case 'openai': {
        const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
        if (!openaiApiKey) {
          throw new Error('OpenAI API key not configured')
        }

        const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openaiApiKey}`
          },
          body: JSON.stringify({
            model: model || 'gpt-4o',
            messages: messages || [],
            temperature: temperature ?? 0.7,
            max_tokens: maxTokens || 200
          })
        })

        if (!openaiResponse.ok) {
          const errorText = await openaiResponse.text()
          throw new Error(`OpenAI API error: ${openaiResponse.status} - ${errorText}`)
        }

        const data = await openaiResponse.json()
        response = {
          success: true,
          provider: 'openai',
          content: data.choices[0]?.message?.content || '',
          usage: data.usage
        }
        break
      }

      case 'anthropic': {
        const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY')
        if (!anthropicApiKey) {
          throw new Error('Anthropic API key not configured')
        }

        // Separate system message from other messages for Anthropic
        const systemMessage = systemPrompt || messages?.find(m => m.role === 'system')?.content || ''
        const chatMessages = messages?.filter(m => m.role !== 'system').map(msg => ({
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: msg.content
        })) || []

        const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': anthropicApiKey,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: model || 'claude-3-opus-20240229',
            max_tokens: maxTokens || 300,
            temperature: temperature ?? 0.7,
            system: systemMessage,
            messages: chatMessages
          })
        })

        if (!anthropicResponse.ok) {
          const errorText = await anthropicResponse.text()
          throw new Error(`Anthropic API error: ${anthropicResponse.status} - ${errorText}`)
        }

        const data = await anthropicResponse.json()
        response = {
          success: true,
          provider: 'anthropic',
          content: data.content[0]?.text || '',
          usage: data.usage
        }
        break
      }

      case 'perplexity': {
        const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY')
        if (!perplexityApiKey) {
          throw new Error('Perplexity API key not configured')
        }

        const perplexityResponse = await fetch('https://api.perplexity.ai/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${perplexityApiKey}`
          },
          body: JSON.stringify({
            model: model || 'pplx-70b-online',
            messages: messages || [],
            temperature: temperature ?? 0.7,
            max_tokens: maxTokens || 300
          })
        })

        if (!perplexityResponse.ok) {
          const errorText = await perplexityResponse.text()
          throw new Error(`Perplexity API error: ${perplexityResponse.status} - ${errorText}`)
        }

        const data = await perplexityResponse.json()
        response = {
          success: true,
          provider: 'perplexity',
          content: data.choices[0]?.message?.content || '',
          usage: data.usage
        }
        break
      }

      case 'elevenlabs': {
        const elevenLabsApiKey = Deno.env.get('elevenlabs-io-text-to-voice')
        if (!elevenLabsApiKey) {
          throw new Error('ElevenLabs API key not configured')
        }

        if (!text) {
          throw new Error('Text is required for text-to-speech')
        }

        const voiceIdToUse = voiceId || 'EXAVITQu4vr4xnSDxMaL' // Default "Bella" voice

        const ttsResponse = await fetch(
          `https://api.elevenlabs.io/v1/text-to-speech/${voiceIdToUse}`,
          {
            method: 'POST',
            headers: {
              'Accept': 'audio/mpeg',
              'Content-Type': 'application/json',
              'xi-api-key': elevenLabsApiKey
            },
            body: JSON.stringify({
              text: text,
              model_id: 'eleven_turbo_v2',
              voice_settings: {
                stability: 0.65,
                similarity_boost: 0.85,
                style: 0.35,
                use_speaker_boost: true
              }
            })
          }
        )

        if (!ttsResponse.ok) {
          const errorText = await ttsResponse.text()
          throw new Error(`ElevenLabs API error: ${ttsResponse.status} - ${errorText}`)
        }

        // Return audio as base64
        const audioBuffer = await ttsResponse.arrayBuffer()
        const base64Audio = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)))

        response = {
          success: true,
          provider: 'elevenlabs',
          audioBase64: base64Audio,
          contentType: 'audio/mpeg'
        }
        break
      }

      case 'embedding': {
        const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
        if (!openaiApiKey) {
          throw new Error('OpenAI API key not configured')
        }

        if (!text) {
          throw new Error('Text is required for embedding generation')
        }

        const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openaiApiKey}`
          },
          body: JSON.stringify({
            model: 'text-embedding-ada-002',
            input: text
          })
        })

        if (!embeddingResponse.ok) {
          const errorText = await embeddingResponse.text()
          throw new Error(`OpenAI Embedding API error: ${embeddingResponse.status} - ${errorText}`)
        }

        const data = await embeddingResponse.json()
        response = {
          success: true,
          provider: 'embedding',
          embedding: data.data[0]?.embedding || [],
          usage: data.usage
        }
        break
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown provider: ${provider}` }),
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
    console.error('AI Chat Proxy error:', error)
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
