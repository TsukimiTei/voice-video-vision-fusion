import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const KLING_API_BASE_URL = 'https://api.klingai.com'

interface CompileVideoRequest {
  prompt: string;
  image_base64: string; // Changed from video_base64 to image_base64
}

serve(async (req) => {
  console.log('=== Compile Video Function Started ===');
  console.log('Request method:', req.method);
  console.log('Request headers:', Object.fromEntries(req.headers.entries()));
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting compile video request...');
    
    let body;
    try {
      const bodyText = await req.text();
      console.log('Raw request body length:', bodyText.length);
      console.log('Raw request body sample:', bodyText.substring(0, 200));
      body = JSON.parse(bodyText);
    } catch (jsonError) {
      console.error('Failed to parse JSON:', jsonError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid JSON in request body',
          details: jsonError.message
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    const { prompt, image_base64 }: CompileVideoRequest = body;
    
    console.log('Request parsed successfully:', { 
      prompt: prompt ? prompt.substring(0, 100) + '...' : 'undefined', 
      imageSize: image_base64 ? image_base64.length : 0,
      hasPrompt: !!prompt,
      hasImage: !!image_base64
    });

    if (!prompt || !image_base64) {
      console.error('Missing required fields:', { hasPrompt: !!prompt, hasImage: !!image_base64 });
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required fields: prompt and image_base64 are required' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check image size (base64 should be reasonable size)
    const imageSizeMB = (image_base64.length * 3 / 4) / (1024 * 1024); // Convert base64 to actual size
    console.log(`Image size: ${imageSizeMB.toFixed(2)} MB`);
    
    if (imageSizeMB > 10) {
      console.error('Image too large:', imageSizeMB, 'MB');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Image too large: ${imageSizeMB.toFixed(2)}MB. Maximum size is 10MB.` 
        }),
        { 
          status: 413, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Processing image with Kling AI...');
    
    // Call Kling AI API directly with image data
    const klingResponse = await callKlingAI(image_base64, prompt);
    
    console.log('Kling AI response received:', { success: klingResponse.success });
    
    if (!klingResponse.success) {
      console.error('Kling AI API failed:', klingResponse.error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: klingResponse.error || 'Video generation failed' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    console.log('Video generated successfully');
    
    // Return the generated video URL directly (no merging needed for image-to-video)
    console.log('Video compilation completed successfully');
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        videoUrl: klingResponse.videoUrl 
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Critical error in compile-video function:', error);
    console.error('Error stack:', error.stack);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error',
        stack: error instanceof Error ? error.stack : undefined
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

// Call official Kling AI API for image-to-video generation
async function callKlingAI(imageBase64: string, prompt: string) {
  const accessKey = Deno.env.get('KLING_ACCESS_KEY');
  const secretKey = Deno.env.get('KLING_SECRET_KEY');
  
  console.log('Access Key found:', !!accessKey);
  console.log('Secret Key found:', !!secretKey);
  
  if (!accessKey || !secretKey) {
    console.error('Kling AI API keys not configured');
    return {
      success: false,
      error: 'Kling AI API keys not configured. Please set KLING_ACCESS_KEY and KLING_SECRET_KEY.'
    };
  }

  try {
    console.log('Calling official Kling AI API for image-to-video generation...');
    
    // Generate JWT token for authentication
    const jwtToken = await generateKlingJWT(accessKey, secretKey);
    console.log('JWT token generated successfully');
    
    // Prepare the request body for official Kling AI API
    // Remove data: prefix if present
    let cleanImageBase64 = imageBase64;
    if (imageBase64.startsWith('data:')) {
      const base64Index = imageBase64.indexOf(',');
      if (base64Index !== -1) {
        cleanImageBase64 = imageBase64.substring(base64Index + 1);
      }
    }
    
    const requestBody = {
      model_name: "kling-v1", // Use kling-v1 model
      mode: "std", // Standard mode (5 seconds)
      duration: "5",
      image: cleanImageBase64, // Base64 encoded image data (no data: prefix)
      prompt: prompt,
      cfg_scale: 0.5
    };

    console.log('Sending request to official Kling AI API...');
    console.log('Request body prepared with prompt:', prompt.substring(0, 50) + '...');
    
    const response = await fetch(`${KLING_API_BASE_URL}/v1/videos/image2video`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`
      },
      body: JSON.stringify(requestBody)
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Kling AI API error:', response.status, errorText);
      return {
        success: false,
        error: `Kling AI API error: ${response.status} ${errorText}`
      };
    }

    const result = await response.json();
    console.log('Kling AI API response:', result);
    
    if (result.code === 0 && result.data?.task_id) {
      // Poll for completion
      const videoUrl = await pollKlingTaskStatus(result.data.task_id, accessKey, secretKey);
      return {
        success: true,
        videoUrl: videoUrl
      };
    } else {
      return {
        success: false,
        error: result.message || 'No task ID returned from Kling AI API'
      };
    }

  } catch (error) {
    console.error('Error calling Kling AI API:', error);
    return {
      success: false,
      error: `Error calling Kling AI API: ${error.message}`
    };
  }
}

// Generate JWT token for Kling AI authentication
async function generateKlingJWT(accessKey: string, secretKey: string): Promise<string> {
  const currentTime = Math.floor(Date.now() / 1000);
  
  const header = {
    alg: "HS256",
    typ: "JWT"
  };
  
  const payload = {
    iss: accessKey,
    exp: currentTime + 1800, // Valid for 30 minutes
    nbf: currentTime - 5 // Valid from 5 seconds ago
  };
  
  console.log('JWT generation details:');
  console.log('- Current timestamp:', currentTime);
  console.log('- Access key:', accessKey);
  console.log('- Secret key length:', secretKey ? secretKey.length : 0);
  console.log('- Payload:', JSON.stringify(payload));
  
  // Use standard btoa for base64url encoding
  const encodedHeader = base64urlEncode(JSON.stringify(header));
  const encodedPayload = base64urlEncode(JSON.stringify(payload));
  
  console.log('- Encoded header:', encodedHeader);
  console.log('- Encoded payload:', encodedPayload);
  
  // Create signature using HMAC SHA256
  const message = `${encodedHeader}.${encodedPayload}`;
  console.log('- Message to sign:', message);
  
  const signature = await createHmacSha256Signature(message, secretKey);
  console.log('- Signature:', signature.substring(0, 20) + '...');
  
  const token = `${message}.${signature}`;
  console.log('- Final JWT token:', token);
  
  return token;
}

// Simple base64url encode using native btoa
function base64urlEncode(str: string): string {
  // Use native btoa which handles UTF-8 properly
  const base64 = btoa(str);
  // Convert to base64url format
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// Create HMAC SHA256 signature
async function createHmacSha256Signature(message: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  
  // Import the secret key
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  // Create signature
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  
  // Convert to base64url using native btoa
  const base64Signature = btoa(String.fromCharCode(...new Uint8Array(signature)));
  return base64Signature.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// Poll official Kling AI task status until completion
async function pollKlingTaskStatus(taskId: string, accessKey: string, secretKey: string): Promise<string> {
  const maxAttempts = 30; // 5 minutes max
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    try {
      console.log(`Polling task status, attempt ${attempts + 1}/${maxAttempts}`);
      
      // Generate JWT token for each request
      const jwtToken = await generateKlingJWT(accessKey, secretKey);
      
      const response = await fetch(`${KLING_API_BASE_URL}/v1/videos/image2video/${taskId}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwtToken}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Status check failed: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('Task status:', result);
      
      if (result.code === 0 && result.data) {
        const taskStatus = result.data.task_status;
        
        if (taskStatus === 'succeed' && result.data.task_result?.videos?.[0]?.url) {
          return result.data.task_result.videos[0].url;
        } else if (taskStatus === 'failed') {
          throw new Error(`Video generation failed: ${result.data.task_status_msg || 'Unknown error'}`);
        }
        // Continue polling if status is 'submitted' or 'processing'
      } else {
        console.error('Unexpected response format:', result);
      }
      
      // Wait 10 seconds before next poll
      await new Promise(resolve => setTimeout(resolve, 10000));
      attempts++;
      
    } catch (error) {
      console.error('Error polling task status:', error);
      throw error;
    }
  }
  
  throw new Error('Video generation timed out');
}