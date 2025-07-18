import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

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
    const { prompt, image, strength = 0.8, aspect_ratio = "1:1" } = await req.json()

    // Get BFL API key from Supabase secrets
    const bflApiKey = Deno.env.get('BFL_API_KEY')
    if (!bflApiKey) {
      throw new Error('BFL API key not configured')
    }

    console.log('发送请求到 BFL API...')
    console.log('Prompt:', prompt)
    console.log('Image size:', image.length)

    // Call BFL API
    const response = await fetch('https://api.bfl.ai/v1/flux-kontext-pro', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-key': bflApiKey,
      },
      body: JSON.stringify({
        prompt,
        image,
        strength,
        aspect_ratio
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('BFL API error:', errorText)
      throw new Error(`BFL API error: ${response.status} - ${errorText}`)
    }

    const result = await response.json()
    console.log('BFL API response:', result)

    if (result.id && result.polling_url) {
      // Start polling for result
      const finalResult = await pollForResult(result.polling_url, bflApiKey)
      
      return new Response(
        JSON.stringify({ success: true, data: finalResult }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        },
      )
    } else {
      throw new Error('Invalid response from BFL API')
    }

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        details: error.stack 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})

async function pollForResult(pollingUrl: string, apiKey: string, maxAttempts = 60) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise(resolve => setTimeout(resolve, 500)) // Wait 0.5 seconds
    
    try {
      const pollResponse = await fetch(pollingUrl, {
        headers: {
          'x-key': apiKey,
          'accept': 'application/json'
        }
      })
      
      if (!pollResponse.ok) {
        throw new Error(`Polling failed: ${pollResponse.status}`)
      }
      
      const pollResult = await pollResponse.json()
      console.log(`Polling attempt ${attempt + 1}, status:`, pollResult.status)
      
      if (pollResult.status === 'Ready') {
        if (pollResult.result?.sample) {
          return pollResult.result.sample
        } else {
          throw new Error('No image URL in result')
        }
      } else if (pollResult.status === 'Error' || pollResult.status === 'Failed') {
        throw new Error(`Generation failed: ${JSON.stringify(pollResult)}`)
      }
      
    } catch (error) {
      console.error('Polling error:', error)
      throw error
    }
  }
  
  throw new Error('Generation timeout')
}