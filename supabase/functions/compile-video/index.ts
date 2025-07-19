import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const KLING_API_BASE_URL = 'https://api.klingai.com'

interface CompileVideoRequest {
  prompt: string;
  video_base64: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting compile video request...');
    
    let body;
    try {
      body = await req.json();
    } catch (jsonError) {
      console.error('Failed to parse JSON:', jsonError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid JSON in request body' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    const { prompt, video_base64 }: CompileVideoRequest = body;
    
    console.log('Request parsed successfully:', { 
      prompt: prompt ? prompt.substring(0, 100) + '...' : 'undefined', 
      videoSize: video_base64 ? video_base64.length : 0 
    });

    if (!prompt || !video_base64) {
      console.error('Missing required fields:', { hasPrompt: !!prompt, hasVideo: !!video_base64 });
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required fields: prompt and video_base64 are required' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check video size (base64 should be reasonable size)
    const videoSizeMB = (video_base64.length * 3 / 4) / (1024 * 1024); // Convert base64 to actual size
    console.log(`Video size: ${videoSizeMB.toFixed(2)} MB`);
    
    if (videoSizeMB > 50) {
      console.error('Video too large:', videoSizeMB, 'MB');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Video too large: ${videoSizeMB.toFixed(2)}MB. Maximum size is 50MB.` 
        }),
        { 
          status: 413, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Processing video with Kling AI...');
    
    // Extract/prepare video data for Kling AI
    const videoData = await extractLastFrame(video_base64);
    
    // Call Kling AI API for video-to-video generation
    const klingResponse = await callKlingAI(videoData, prompt);
    
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
    
    console.log('Video generated successfully, merging with original...');
    
    // Mock video merging process
    // In a real implementation, you would use FFmpeg to concatenate videos
    const mergedVideoUrl = await mockVideoMerging(video_base64, klingResponse.videoUrl);
    
    console.log('Video compilation completed successfully');
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        videoUrl: mergedVideoUrl 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in compile-video function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

// Extract last frame from video (Deno-compatible implementation)
async function extractLastFrame(videoBase64: string): Promise<string> {
  console.log('Processing video data for Kling AI...');
  
  try {
    // Since we're in Deno environment without DOM APIs, 
    // we'll send the video data directly to Kling AI
    // Kling AI can handle video data and extract frames on their end
    
    // Validate and potentially compress the video data
    const maxVideoSize = 50 * 1024 * 1024; // 50MB limit
    
    if (videoBase64.length > maxVideoSize) {
      console.log('Video too large, compressing...');
      // Take a portion of the video data (this is a fallback)
      return videoBase64.substring(0, maxVideoSize);
    }
    
    console.log(`Video data ready for Kling AI (${videoBase64.length} chars)`);
    return videoBase64;
    
  } catch (error) {
    console.error('Error processing video data:', error);
    throw new Error('Failed to process video data');
  }
}

// Call official Kling AI API for image-to-video generation
async function callKlingAI(imageBase64: string, prompt: string) {
  const accessKey = Deno.env.get('KLING_ACCESS_KEY');
  const secretKey = Deno.env.get('KLING_SECRET_KEY');
  
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
    
    // Prepare the request body for official Kling AI API
    const requestBody = {
      model_name: "kling-v1", // Use kling-v1 model
      mode: "std", // Standard mode (5 seconds)
      duration: "5",
      image: imageBase64, // Base64 encoded image data (no data: prefix)
      prompt: prompt,
      cfg_scale: 0.5
    };

    console.log('Sending request to official Kling AI API...');
    
    const response = await fetch(`${KLING_API_BASE_URL}/v1/videos/image2video`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`
      },
      body: JSON.stringify(requestBody)
    });

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
  
  // Base64URL encode header and payload
  const encodedHeader = base64urlEncode(JSON.stringify(header));
  const encodedPayload = base64urlEncode(JSON.stringify(payload));
  
  // Create signature
  const message = `${encodedHeader}.${encodedPayload}`;
  const signature = await createHmacSha256Signature(message, secretKey);
  
  return `${message}.${signature}`;
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

// Video merging function (simplified implementation)
async function mockVideoMerging(originalVideoBase64: string, generatedVideoUrl: string) {
  console.log('Starting video merging process...');
  
  // Simulate video processing delay
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // In a real implementation, you would:
  // 1. Download the generated video from generatedVideoUrl
  // 2. Use FFmpeg to concatenate originalVideo + generatedVideo
  // 3. Upload the merged video to a CDN/storage service
  // 4. Return the URL of the merged video
  
  console.log('Video merging completed (mock)');
  
  // For now, return the generated video URL as the merged result
  return generatedVideoUrl;
}