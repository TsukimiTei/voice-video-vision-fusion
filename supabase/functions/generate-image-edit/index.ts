import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, input_image, aspect_ratio = '1:1' } = await req.json();
    
    if (!prompt || !input_image) {
      return new Response(
        JSON.stringify({ error: 'Missing prompt or input_image' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Clean the image data - BFL API expects pure base64 without data URL prefix
    let cleanImageData = input_image;
    if (input_image.includes('data:image')) {
      // Remove data URL prefix (e.g., "data:image/jpeg;base64,")
      cleanImageData = input_image.split(',')[1];
    }
    
    console.log('Request details:', {
      prompt: prompt,
      imageDataLength: cleanImageData.length,
      aspectRatio: aspect_ratio
    });

    // Get BFL API key from environment
    const BFL_API_KEY = Deno.env.get('BFL_API_KEY');
    if (!BFL_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'BFL API key not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Starting FLUX Kontext image editing...');
    console.log('Image data sample (first 100 chars):', cleanImageData.substring(0, 100));
    console.log('Prompt:', prompt);

    // Submit generation request to BFL API using the correct endpoint
    const submitResponse = await fetch('https://api.bfl.ml/v1/flux-kontext-pro', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Key': BFL_API_KEY,
      },
      body: JSON.stringify({
        prompt,
        input_image: cleanImageData,
        aspect_ratio,
        output_format: 'jpeg',
        safety_tolerance: 2
      }),
    });

    if (!submitResponse.ok) {
      const errorText = await submitResponse.text();
      console.error('BFL API error:', submitResponse.status, errorText);
      return new Response(
        JSON.stringify({ 
          error: `BFL API error: ${submitResponse.status}`,
          details: errorText 
        }),
        { 
          status: submitResponse.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const submitData = await submitResponse.json();
    console.log('BFL API response:', JSON.stringify(submitData, null, 2));
    
    if (!submitData.id) {
      return new Response(
        JSON.stringify({ error: 'Invalid response from BFL API - no task ID' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Poll for results using the get-result endpoint
    const imageUrl = await pollForResult(submitData.id, BFL_API_KEY);
    
    return new Response(
      JSON.stringify({ 
        success: true,
        imageUrl: imageUrl,
        taskId: submitData.id 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function pollForResult(taskId: string, apiKey: string, maxAttempts = 120): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      // Wait before polling
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s
      
      const pollResponse = await fetch(`https://api.bfl.ml/v1/get_result?id=${taskId}`, {
        method: 'GET',
        headers: {
          'X-Key': apiKey,
        },
      });
      
      if (!pollResponse.ok) {
        console.error(`Polling failed with status ${pollResponse.status}`);
        continue;
      }
      
      const pollData = await pollResponse.json();
      console.log(`Polling attempt ${attempt + 1}:`, pollData.status);
      
      if (pollData.status === 'Ready') {
        if (pollData.result && pollData.result.sample) {
          console.log('Image generation completed successfully');
          return pollData.result.sample;
        } else {
          throw new Error('Generation completed but no image data found');
        }
      } else if (pollData.status === 'Error' || pollData.status === 'Failed') {
        const errorMessage = pollData.error?.message || pollData.failure_reason || 'Unknown error';
        throw new Error(`Generation failed: ${errorMessage}`);
      }
      
      // Continue polling if status is 'Pending' or other non-final status
    } catch (error) {
      console.error(`Polling attempt ${attempt + 1} failed:`, error);
      if (attempt === maxAttempts - 1) {
        throw new Error(`Polling failed after ${maxAttempts} attempts: ${error.message}`);
      }
    }
  }
  
  throw new Error(`Timeout: Image generation did not complete within ${maxAttempts} seconds`);
}