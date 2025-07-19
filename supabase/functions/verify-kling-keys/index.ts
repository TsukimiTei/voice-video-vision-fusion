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
    
    console.log('=== Kling Keys Verification ===');
    console.log('Expected Access Key: 4041a809dc27410e86419fec86eec98e');
    console.log('Actual Access Key:', accessKey);
    console.log('Keys match:', accessKey === '4041a809dc27410e86419fec86eec98e');
    
    console.log('Expected Secret Key: fc4bdef4e03c4af3bdc2685961eaa984');
    console.log('Actual Secret Key:', secretKey);
    console.log('Secret keys match:', secretKey === 'fc4bdef4e03c4af3bdc2685961eaa984');
    
    if (!accessKey || !secretKey) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'KLING_ACCESS_KEY or KLING_SECRET_KEY not configured',
          details: {
            hasAccessKey: !!accessKey,
            hasSecretKey: !!secretKey
          }
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check if keys match expected values
    const expectedAccessKey = '4041a809dc27410e86419fec86eec98e';
    const expectedSecretKey = 'fc4bdef4e03c4af3bdc2685961eaa984';
    
    const accessKeyMatch = accessKey === expectedAccessKey;
    const secretKeyMatch = secretKey === expectedSecretKey;
    
    console.log('Key verification results:', {
      accessKeyMatch,
      secretKeyMatch,
      actualAccessKeyLength: accessKey.length,
      actualSecretKeyLength: secretKey.length
    });

    // Generate JWT token to test authentication
    const jwtToken = await generateKlingJWT(accessKey, secretKey);
    console.log('JWT token generated for testing');
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        verification: {
          accessKeyMatch,
          secretKeyMatch,
          accessKeyCorrect: accessKey === expectedAccessKey,
          secretKeyCorrect: secretKey === expectedSecretKey,
          accessKeyValue: accessKey,
          secretKeyValue: secretKey,
          jwtGenerated: !!jwtToken,
          jwtLength: jwtToken.length
        },
        message: (accessKeyMatch && secretKeyMatch) ? 
          'All keys are correctly configured!' : 
          'Keys do not match expected values!'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error verifying keys:', error);
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

// Generate JWT token according to official Kling AI documentation
async function generateKlingJWT(accessKey: string, secretKey: string): Promise<string> {
  const currentTime = Math.floor(Date.now() / 1000);
  
  const header = {
    "alg": "HS256",
    "typ": "JWT"
  };
  
  const payload = {
    "iss": accessKey,
    "exp": currentTime + 1800,
    "nbf": currentTime - 5
  };
  
  const encodedHeader = base64urlEncode(JSON.stringify(header));
  const encodedPayload = base64urlEncode(JSON.stringify(payload));
  const message = `${encodedHeader}.${encodedPayload}`;
  const signature = await createHmacSha256Signature(message, secretKey);
  
  return `${message}.${signature}`;
}

function base64urlEncode(str: string): string {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(str);
  
  let binaryString = '';
  for (let i = 0; i < bytes.length; i++) {
    binaryString += String.fromCharCode(bytes[i]);
  }
  
  const base64 = btoa(binaryString);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function createHmacSha256Signature(message: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  const signatureBytes = new Uint8Array(signatureBuffer);
  
  let binaryString = '';
  for (let i = 0; i < signatureBytes.length; i++) {
    binaryString += String.fromCharCode(signatureBytes[i]);
  }
  
  const base64 = btoa(binaryString);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}