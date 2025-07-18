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
    const { prompt, image, aspect_ratio = '1:1' } = await req.json()
    
    if (!prompt || !image) {
      return new Response(
        JSON.stringify({ error: 'Missing prompt or image' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get BFL API key from environment
    const BFL_API_KEY = Deno.env.get('BFL_API_KEY')
    if (!BFL_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'BFL API key not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Submit generation request to BFL API
    const submitResponse = await fetch('https://api.bfl.ai/v1/flux-kontext-pro', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-key': BFL_API_KEY,
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        image,
        aspect_ratio,
        guidance: 3.5,
        safety_tolerance: 2
      }),
    })

    if (!submitResponse.ok) {
      const errorText = await submitResponse.text()
      return new Response(
        JSON.stringify({ 
          error: `BFL API error: ${submitResponse.status}`,
          details: errorText 
        }),
        { 
          status: submitResponse.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const submitData = await submitResponse.json()
    
    if (!submitData.id || !submitData.polling_url) {
      return new Response(
        JSON.stringify({ error: 'Invalid response from BFL API' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Poll for results
    const imageUrl = await pollForResult(submitData.polling_url, BFL_API_KEY)
    
    return new Response(
      JSON.stringify({ 
        success: true,
        imageUrl: imageUrl,
        taskId: submitData.id 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

async function pollForResult(pollingUrl: string, apiKey: string, maxAttempts = 120): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise(resolve => setTimeout(resolve, 500)) // Wait 0.5s
    
    const pollResponse = await fetch(pollingUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'x-key': apiKey,
      },
    })
    
    if (!pollResponse.ok) {
      throw new Error(`Polling failed: ${pollResponse.status}`)
    }
    
    const pollData = await pollResponse.json()
    
    if (pollData.status === 'Ready') {
      if (pollData.result && pollData.result.sample) {
        return pollData.result.sample
      } else {
        throw new Error('Generation completed but no image data found')
      }
    } else if (pollData.status === 'Error' || pollData.status === 'Failed') {
      const errorMessage = pollData.error?.message || pollData.failure_reason || 'Unknown error'
      throw new Error(`Generation failed: ${errorMessage}`)
    }
    
    // Continue polling if status is 'Pending' or other non-final status
  }
  
  throw new Error('Generation timeout')
}