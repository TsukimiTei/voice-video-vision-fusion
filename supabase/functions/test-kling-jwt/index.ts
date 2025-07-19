import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const accessKey = Deno.env.get('KLING_ACCESS_KEY');
    const secretKey = Deno.env.get('KLING_SECRET_KEY');
    
    if (!accessKey || !secretKey) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'KLING_ACCESS_KEY or KLING_SECRET_KEY not configured' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Generating JWT for testing...');
    console.log('Access Key:', accessKey);
    console.log('Secret Key prefix:', secretKey.substring(0, 8) + '...');
    
    // Generate JWT token
    const jwtToken = await generateKlingJWT(accessKey, secretKey);
    
    // Test the token with a simple API call
    const testResponse = await fetch('https://api.klingai.com/v1/videos/text2video', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`
      }
    });
    
    const testResult = await testResponse.text();
    console.log('Test API response status:', testResponse.status);
    console.log('Test API response:', testResult);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        jwtToken: jwtToken,
        accessKey: accessKey,
        testApiStatus: testResponse.status,
        testApiResponse: testResult,
        message: testResponse.status === 200 ? 'JWT验证成功！' : 'JWT可能有问题，请检查API密钥'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error generating JWT:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

// Generate JWT token for Kling AI authentication
async function generateKlingJWT(accessKey: string, secretKey: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  
  const header = {
    alg: "HS256",
    typ: "JWT"
  };
  
  const payload = {
    iss: accessKey,
    exp: now + 1800, // Valid for 30 minutes
    nbf: now - 5 // Valid from 5 seconds ago
  };
  
  console.log('JWT payload:', payload);
  
  // Base64URL encode header and payload
  const encodedHeader = base64urlEncode(JSON.stringify(header));
  const encodedPayload = base64urlEncode(JSON.stringify(payload));
  
  // Create signature
  const message = `${encodedHeader}.${encodedPayload}`;
  const signature = await createHmacSha256Signature(message, secretKey);
  
  const token = `${message}.${signature}`;
  console.log('Generated JWT token:', token);
  
  return token;
}

// Base64URL encode (without padding)
function base64urlEncode(str: string): string {
  const base64 = btoa(str);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// Create HMAC SHA256 signature
async function createHmacSha256Signature(message: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  const base64Signature = btoa(String.fromCharCode(...new Uint8Array(signature)));
  return base64Signature.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}