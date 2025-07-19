import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const KLING_API_BASE_URL = 'https://api.klingai.com'

interface CheckStatusRequest {
  taskId: string;
}

serve(async (req) => {
  console.log('=== Check Video Status Function Started ===');
  console.log('Request method:', req.method);
  console.log('Request URL:', req.url);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Request received successfully');
    
    // Parse request body with error handling
    let body: CheckStatusRequest;
    try {
      body = await req.json() as CheckStatusRequest;
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError);
      throw new Error('Invalid JSON in request body');
    }
    
    const { taskId } = body;
    
    console.log('Request parsed:', { 
      hasTaskId: !!taskId,
      taskId: taskId
    });

    if (!taskId) {
      console.error('Missing required field: taskId');
      throw new Error('Missing required field: taskId is required');
    }

    console.log('Checking video generation status...');
    
    // Check the status of the task
    const statusResult = await checkKlingTaskStatus(taskId);
    
    console.log('Status check completed:', statusResult);
    
    return new Response(
      JSON.stringify(statusResult),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Critical error in check-video-status function:', error);
    
    // Determine appropriate status code
    let statusCode = 500;
    let errorMessage = error instanceof Error ? error.message : 'Internal server error';
    
    if (errorMessage.includes('Missing required field') || errorMessage.includes('Invalid JSON')) {
      statusCode = 400;
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

// Check official Kling AI task status
async function checkKlingTaskStatus(taskId: string) {
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
    console.log(`Checking task status for task_id: ${taskId}`);
    
    // Generate JWT token
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
      return {
        success: false,
        error: `Status check failed: ${response.status} ${errorText}`
      };
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
          return {
            success: true,
            status: 'completed',
            videoUrl: videoUrl
          };
        } else {
          console.error('Video generation succeeded but no URL found in response:', result.data);
          return {
            success: false,
            error: 'Video generation succeeded but no video URL returned'
          };
        }
      } else if (taskStatus === 'failed') {
        console.error('Video generation failed:', taskStatusMsg);
        return {
          success: false,
          status: 'failed',
          error: `Video generation failed: ${taskStatusMsg || 'Unknown error'}`
        };
      } else {
        // Status is 'submitted' or 'processing', return current status
        console.log(`Task still in progress (${taskStatus})`);
        return {
          success: true,
          status: 'processing',
          message: `Task is ${taskStatus}${taskStatusMsg ? ': ' + taskStatusMsg : ''}`
        };
      }
    } else {
      console.error('Unexpected polling response format:', result);
      return {
        success: false,
        error: `Unexpected response format: code=${result.code}`
      };
    }

  } catch (error) {
    console.error('Error checking Kling AI task status:', error);
    return {
      success: false,
      error: `Error checking task status: ${error.message}`
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