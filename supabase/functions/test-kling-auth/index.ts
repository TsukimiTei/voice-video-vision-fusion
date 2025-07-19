import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const accessKey = Deno.env.get('KLING_ACCESS_KEY');
    const secretKey = Deno.env.get('KLING_SECRET_KEY');
    
    console.log('=== Kling API Key Test ===');
    console.log('Access Key:', accessKey);
    console.log('Secret Key length:', secretKey ? secretKey.length : 0);
    
    if (!accessKey || !secretKey) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Keys not configured'
      }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Test JWT generation exactly like the Python demo
    const jwtToken = await generateJWTToken(accessKey, secretKey);
    console.log('Generated JWT:', jwtToken);
    
    // Test with Kling API
    console.log('Testing JWT with Kling API...');
    const testResponse = await fetch('https://api.klingai.com/v1/videos/image2video', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${jwtToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model_name: "kling-v1",
        mode: "pro", 
        duration: "5",
        image: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=",
        prompt: "test prompt"
      })
    });
    
    const responseText = await testResponse.text();
    console.log('Kling API Response Status:', testResponse.status);
    console.log('Kling API Response:', responseText);
    
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      responseData = { raw: responseText };
    }
    
    return new Response(JSON.stringify({ 
      success: testResponse.status !== 401,
      status: testResponse.status,
      jwtToken: jwtToken,
      apiResponse: responseData,
      message: testResponse.status === 401 ? 'JWT Authentication Failed' : 'JWT Generated Successfully'
    }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    console.error('Test error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});

// Generate JWT exactly like the Python demo
async function generateJWTToken(ak: string, sk: string): Promise<string> {
  const currentTime = Math.floor(Date.now() / 1000);
  
  const headers = {
    "alg": "HS256",
    "typ": "JWT"
  };
  
  const payload = {
    "iss": ak,
    "exp": currentTime + 1800, // current time + 30min
    "nbf": currentTime - 5     // current time - 5s
  };
  
  console.log('JWT Payload:', payload);
  
  // Base64url encode header and payload
  const headerB64 = base64UrlEncode(JSON.stringify(headers));
  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  
  console.log('Header B64:', headerB64);
  console.log('Payload B64:', payloadB64);
  
  // Create signature
  const message = `${headerB64}.${payloadB64}`;
  const signature = await signHmacSha256(message, sk);
  
  console.log('Signature:', signature);
  
  const token = `${message}.${signature}`;
  console.log('Final Token:', token);
  
  return token;
}

function base64UrlEncode(str: string): string {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  
  // Convert Uint8Array to string
  let binary = '';
  for (let i = 0; i < data.length; i++) {
    binary += String.fromCharCode(data[i]);
  }
  
  // Base64 encode and make URL safe
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

async function signHmacSha256(message: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  const bytes = new Uint8Array(signature);
  
  // Convert to binary string
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  
  // Base64url encode
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}