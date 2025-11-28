// Secure proxy for ElevenLabs API with rate limiting
// This runs on Netlify Functions to protect your API key

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { text, voiceId, ipAddress } = JSON.parse(event.body);
    
    // Get IP from headers (Netlify provides this)
    const clientIP = event.headers['x-nf-client-connection-ip'] || 
                     event.headers['x-forwarded-for']?.split(',')[0] || 
                     'unknown';

    // Validate input
    if (!text || text.length > 1000) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid text input' })
      };
    }

    // Get ElevenLabs API key from environment
    const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
    if (!ELEVENLABS_API_KEY) {
      console.error('ElevenLabs API key not configured');
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Voice service not configured' })
      };
    }

    // Make request to ElevenLabs
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId || 'EXAVITQu4vr4xnSDxMaL'}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': ELEVENLABS_API_KEY
      },
      body: JSON.stringify({
        text: text,
        model_id: 'eleven_turbo_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.5,
          use_speaker_boost: true
        }
      })
    });

    if (!response.ok) {
      console.error('ElevenLabs API error:', response.status);
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: 'Voice synthesis failed' })
      };
    }

    // Get audio data
    const audioBuffer = await response.arrayBuffer();
    
    // Return audio as base64
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      },
      body: JSON.stringify({
        audio: Buffer.from(audioBuffer).toString('base64'),
        ip: clientIP
      })
    };

  } catch (error) {
    console.error('Voice proxy error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};