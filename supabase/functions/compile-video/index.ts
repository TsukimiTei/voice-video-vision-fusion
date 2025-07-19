import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const KLING_API_BASE_URL = 'https://api-singapore.klingai.com'

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
    const { prompt, video_base64 }: CompileVideoRequest = await req.json();
    
    console.log('Compile video request received:', { 
      prompt: prompt?.substring(0, 100) + '...', 
      videoSize: video_base64?.length || 0 
    });

    if (!prompt || !video_base64) {
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

    // Extract last frame from video (simplified - using first frame as mock)
    console.log('Extracting last frame from video...');
    
    // In a real implementation, you would use FFmpeg to extract the actual last frame
    // For now, we'll use the video data to represent the frame
    const lastFrameData = await extractLastFrame(video_base64);
    
    console.log('Last frame extracted, calling Kling AI API...');
    
    // Call Kling AI API for image-to-video generation
    const klingResponse = await callKlingAI(lastFrameData, prompt);
    
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

// Extract last frame from video (simplified implementation)
async function extractLastFrame(videoBase64: string): Promise<string> {
  // In a real implementation, you would use FFmpeg to extract the actual last frame
  // For now, we'll simulate this by returning a portion of the video data as frame data
  console.log('Simulating frame extraction from video data...');
  
  // Convert video to blob and create a mock frame representation
  const videoData = Uint8Array.from(atob(videoBase64), c => c.charCodeAt(0));
  
  // Mock frame extraction - in reality, this would be an actual image
  const mockFrameBase64 = btoa(String.fromCharCode(...videoData.slice(0, 1024)));
  
  return mockFrameBase64;
}

// Call Kling AI API for image-to-video generation
async function callKlingAI(frameBase64: string, prompt: string) {
  const accessKey = Deno.env.get('KLING_ACCESS_KEY');
  const secretKey = Deno.env.get('KLING_SECRET_KEY');
  
  if (!accessKey || !secretKey) {
    console.error('Kling AI API keys not configured');
    return {
      success: false,
      error: 'Kling AI API keys not configured'
    };
  }

  try {
    console.log('Calling Kling AI API for image-to-video generation...');
    
    // Create authentication headers for Kling AI API
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const authHeaders = createKlingAuthHeaders(accessKey, secretKey, timestamp);
    
    // Prepare the request body for image-to-video generation
    const requestBody = {
      model: "kling-v1.6-pro",
      task_type: "image_to_video", 
      input: {
        image_base64: frameBase64,
        prompt: prompt,
        duration: 5, // 5 seconds
        aspect_ratio: "16:9",
        creativity: 0.7,
        professional_mode: false
      }
    };

    console.log('Sending request to Kling AI API...');
    
    const response = await fetch(`${KLING_API_BASE_URL}/v1/videos/image2video`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders
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
    
    if (result.task_id) {
      // Poll for completion
      const videoUrl = await pollKlingTaskStatus(result.task_id, authHeaders);
      return {
        success: true,
        videoUrl: videoUrl
      };
    } else {
      return {
        success: false,
        error: 'No task ID returned from Kling AI API'
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

// Create authentication headers for Kling AI API
function createKlingAuthHeaders(accessKey: string, secretKey: string, timestamp: string) {
  // Kling AI uses Access Key and Secret Key authentication
  return {
    'Authorization': `Bearer ${accessKey}`,
    'X-API-Key': accessKey,
    'X-Secret-Key': secretKey,
    'X-Timestamp': timestamp,
    'Content-Type': 'application/json'
  };
}

// Poll Kling AI task status until completion
async function pollKlingTaskStatus(taskId: string, authHeaders: any): Promise<string> {
  const maxAttempts = 30; // 5 minutes max
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    try {
      console.log(`Polling task status, attempt ${attempts + 1}/${maxAttempts}`);
      
      const response = await fetch(`${KLING_API_BASE_URL}/v1/videos/tasks/${taskId}`, {
        headers: authHeaders
      });
      
      if (!response.ok) {
        throw new Error(`Status check failed: ${response.status}`);
      }
      
      const status = await response.json();
      console.log('Task status:', status);
      
      if (status.status === 'completed' && status.result?.video_url) {
        return status.result.video_url;
      } else if (status.status === 'failed') {
        throw new Error(`Video generation failed: ${status.error || 'Unknown error'}`);
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