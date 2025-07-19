import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const KLING_API_BASE_URL = 'https://api.klingai.com'

interface CompileVideoRequest {
  prompt: string;
  image_base64: string;
}

serve(async (req) => {
  console.log('=== Compile Video Function Started ===');
  console.log('Request method:', req.method);
  console.log('Request URL:', req.url);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Request received successfully');
    
    // Add timeout for the entire request
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Function timeout after 9 minutes')), 9 * 60 * 1000);
    });
    
    const processPromise = async () => {
      // Parse request body with error handling
      let body: CompileVideoRequest;
      try {
        body = await req.json() as CompileVideoRequest;
      } catch (parseError) {
        console.error('Failed to parse request body:', parseError);
        throw new Error('Invalid JSON in request body');
      }
      
      const { prompt, image_base64 } = body;
      
      console.log('Request parsed:', { 
        hasPrompt: !!prompt, 
        hasImage: !!image_base64,
        promptLength: prompt?.length || 0,
        imageLength: image_base64?.length || 0
      });

      if (!prompt || !image_base64) {
        console.error('Missing required fields:', { hasPrompt: !!prompt, hasImage: !!image_base64 });
        throw new Error('Missing required fields: prompt and image_base64 are required');
      }

      console.log('Processing image with Kling AI...');
      
      // Call Kling AI API
      const klingResponse = await callKlingAI(image_base64, prompt);
      
      console.log('Kling AI response received:', { success: klingResponse.success });
      
      if (!klingResponse.success) {
        console.error('Kling AI API failed:', klingResponse.error);
        throw new Error(klingResponse.error || 'Video generation failed');
      }
      
      console.log('Video generated successfully');
      
      return {
        success: true,
        videoUrl: klingResponse.videoUrl
      };
    };
    
    // Race between the actual process and timeout
    const result = await Promise.race([processPromise(), timeoutPromise]);
    
    return new Response(
      JSON.stringify(result),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Critical error in compile-video function:', error);
    
    // Determine appropriate status code
    let statusCode = 500;
    let errorMessage = error instanceof Error ? error.message : 'Internal server error';
    
    if (errorMessage.includes('Missing required fields') || errorMessage.includes('Invalid JSON')) {
      statusCode = 400;
    } else if (errorMessage.includes('timeout')) {
      statusCode = 408;
    }
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage
      }),
      { 
        status: statusCode, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

// Call official Kling AI API for image-to-video generation
async function callKlingAI(imageBase64: string, prompt: string) {
  const accessKey = Deno.env.get('KLING_ACCESS_KEY');
  const secretKey = Deno.env.get('KLING_SECRET_KEY');
  
  console.log('Kling AI credentials check:', { 
    hasAccessKey: !!accessKey, 
    hasSecretKey: !!secretKey,
    accessKeyPrefix: accessKey ? accessKey.substring(0, 8) + '...' : 'undefined',
    secretKeyLength: secretKey ? secretKey.length : 0
  });
  
  if (!accessKey || !secretKey) {
    console.error('Kling AI API keys not configured');
    return {
      success: false,
      error: 'Kling AI API keys not configured. Please set KLING_ACCESS_KEY and KLING_SECRET_KEY.'
    };
  }

  try {
    console.log('Generating JWT token for Kling AI according to official documentation...');
    
    // Generate JWT token following official Kling AI documentation
    const jwtToken = await generateKlingJWT(accessKey, secretKey);
    console.log('JWT token generated successfully');
    
    // Extract pure base64 data (remove data URL prefix if present)
    let pureBase64 = imageBase64;
    
    // Remove data URL prefix if present
    if (imageBase64.startsWith('data:')) {
      const base64Index = imageBase64.indexOf(',');
      if (base64Index !== -1) {
        pureBase64 = imageBase64.substring(base64Index + 1);
      }
    }
    
    console.log('Image base64 format check:', {
      originalLength: imageBase64.length,
      pureBase64Length: pureBase64.length,
      isDataUrl: imageBase64.startsWith('data:')
    });
    
    // Prepare request body according to official API documentation
    // For Kling API: image should be a URL, not base64
    // We need to upload the image first or use a different approach
    const requestBody = {
      "model_name": "kling-v1", 
      "mode": "pro",
      "duration": "5",
      "image": `data:image/jpeg;base64,${pureBase64}`,  // Use data URL format as per some examples
      "prompt": prompt,
      "cfg_scale": 0.5
    };

    console.log('Sending request to official Kling AI API...');
    console.log('Request details:', {
      url: `${KLING_API_BASE_URL}/v1/videos/image2video`,
      model: requestBody.model_name,
      mode: requestBody.mode,
      prompt: prompt.substring(0, 100) + '...',
      imageDataLength: pureBase64.length
    });
    
    const response = await fetch(`${KLING_API_BASE_URL}/v1/videos/image2video`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${jwtToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    console.log('Kling API response status:', response.status);
    console.log('Kling API response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Kling AI API error response:', {
        status: response.status,
        statusText: response.statusText,
        errorText: errorText
      });
      
      // Parse error if it's JSON
      let errorMessage = `${response.status} ${response.statusText}`;
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.message || errorMessage;
      } catch (e) {
        // If not JSON, use the raw text
        errorMessage = errorText || errorMessage;
      }
      
      return {
        success: false,
        error: `Kling AI API error: ${errorMessage}`
      };
    }

    const result = await response.json();
    console.log('Kling AI API successful response:', result);
    
    // According to the official docs, successful response should have code: 0
    if (result.code === 0 && result.data?.task_id) {
      console.log('Task submitted successfully, task_id:', result.data.task_id);
      
      // Poll for completion
      const videoUrl = await pollKlingTaskStatus(result.data.task_id, accessKey, secretKey);
      return {
        success: true,
        videoUrl: videoUrl
      };
    } else {
      console.error('Unexpected API response format:', result);
      return {
        success: false,
        error: result.message || result.error || 'Unexpected response format from Kling AI API'
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

// Generate JWT token according to official Kling AI documentation (RFC 7519)
async function generateKlingJWT(accessKey: string, secretKey: string): Promise<string> {
  // Get current timestamp in seconds (matching Python's int(time.time()))
  const currentTime = Math.floor(Date.now() / 1000);
  
  // Header exactly as specified in official docs
  const header = {
    "alg": "HS256",
    "typ": "JWT"
  };
  
  // Payload exactly as specified in official docs
  const payload = {
    "iss": accessKey,  // Issuer: access key
    "exp": currentTime + 1800, // Expiration: current time + 30 minutes (1800s)
    "nbf": currentTime - 5     // Not before: current time - 5 seconds
  };
  
  console.log('JWT generation details:', {
    currentTime: currentTime,
    exp: payload.exp,
    nbf: payload.nbf,
    iss: accessKey.substring(0, 8) + '...',
    secretKeyLength: secretKey.length
  });
  
  // Encode header and payload using base64url (RFC 7515)
  const encodedHeader = base64urlEncode(JSON.stringify(header));
  const encodedPayload = base64urlEncode(JSON.stringify(payload));
  
  // Create the message to sign (header.payload)
  const message = `${encodedHeader}.${encodedPayload}`;
  
  // Create signature using HMAC SHA256
  const signature = await createHmacSha256Signature(message, secretKey);
  
  // Construct final JWT token
  const token = `${message}.${signature}`;
  
  console.log('JWT token generated:', {
    headerLength: encodedHeader.length,
    payloadLength: encodedPayload.length,
    signatureLength: signature.length,
    totalLength: token.length
  });
  
  return token;
}

// Base64url encoding following RFC 4648 Section 5
function base64urlEncode(str: string): string {
  // Convert string to UTF-8 bytes
  const encoder = new TextEncoder();
  const bytes = encoder.encode(str);
  
  // Convert bytes to binary string
  let binaryString = '';
  for (let i = 0; i < bytes.length; i++) {
    binaryString += String.fromCharCode(bytes[i]);
  }
  
  // Base64 encode using built-in btoa
  const base64 = btoa(binaryString);
  
  // Convert to base64url: replace + with -, / with _, and remove =
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// Create HMAC SHA256 signature following RFC standards
async function createHmacSha256Signature(message: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  
  // Import the secret key for HMAC
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  // Create signature
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  const signatureBytes = new Uint8Array(signatureBuffer);
  
  // Convert signature bytes to binary string
  let binaryString = '';
  for (let i = 0; i < signatureBytes.length; i++) {
    binaryString += String.fromCharCode(signatureBytes[i]);
  }
  
  // Base64 encode and convert to base64url
  const base64 = btoa(binaryString);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// Poll official Kling AI task status until completion
async function pollKlingTaskStatus(taskId: string, accessKey: string, secretKey: string): Promise<string> {
  const maxAttempts = 60; // 10 minutes max (10 seconds * 60)
  let attempts = 0;
  
  console.log(`Starting to poll task status for task_id: ${taskId}`);
  
  while (attempts < maxAttempts) {
    try {
      console.log(`Polling task status, attempt ${attempts + 1}/${maxAttempts}`);
      
      // Generate fresh JWT token for each request
      const jwtToken = await generateKlingJWT(accessKey, secretKey);
      
      const response = await fetch(`${KLING_API_BASE_URL}/v1/videos/image2video/${taskId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${jwtToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Status check request failed:', response.status, errorText);
        throw new Error(`Status check failed: ${response.status} ${errorText}`);
      }
      
      const result = await response.json();
      console.log('Task status response:', result);
      
      if (result.code === 0 && result.data) {
        const taskStatus = result.data.task_status;
        const taskStatusMsg = result.data.task_status_msg;
        
        console.log(`Task status: ${taskStatus}, message: ${taskStatusMsg}`);
        
        if (taskStatus === 'succeed') {
          // Check if we have the video URL
          const videoUrl = result.data.task_result?.videos?.[0]?.url;
          if (videoUrl) {
            console.log('Video generation completed successfully, URL:', videoUrl);
            return videoUrl;
          } else {
            console.error('Video generation succeeded but no URL found in response:', result.data);
            throw new Error('Video generation succeeded but no video URL returned');
          }
        } else if (taskStatus === 'failed') {
          console.error('Video generation failed:', taskStatusMsg);
          throw new Error(`Video generation failed: ${taskStatusMsg || 'Unknown error'}`);
        } else {
          // Status is 'submitted' or 'processing', continue polling
          console.log(`Task still in progress (${taskStatus}), waiting...`);
        }
      } else {
        console.error('Unexpected polling response format:', result);
        throw new Error(`Unexpected response format: code=${result.code}`);
      }
      
      // Wait 10 seconds before next poll
      await new Promise(resolve => setTimeout(resolve, 10000));
      attempts++;
      
    } catch (error) {
      console.error('Error during task status polling:', error);
      throw error;
    }
  }
  
  throw new Error(`Video generation timed out after ${maxAttempts * 10} seconds`);
}