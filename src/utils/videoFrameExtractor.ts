/**
 * Extract the last frame from a video blob as base64 image data
 */
export async function extractLastFrameFromVideo(videoBlob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      reject(new Error('Cannot create canvas context'));
      return;
    }
    
    video.onloadedmetadata = () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Seek to near the end but not exactly at duration to avoid black frame
      video.currentTime = Math.max(0, video.duration - 0.1);
    };
    
    video.onseeked = () => {
      try {
        // Draw the current frame to canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Convert canvas to base64 (without data: prefix)
        const base64Data = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
        
        // Clean up
        URL.revokeObjectURL(video.src);
        
        resolve(base64Data);
      } catch (error) {
        reject(error);
      }
    };
    
    video.onerror = (error) => {
      console.error('Video loading error:', error);
      const errorMsg = error instanceof Event ? error.type : String(error);
      reject(new Error(`Video loading failed: ${errorMsg}`));
    };
    
    // Load the video
    video.src = URL.createObjectURL(videoBlob);
    video.load();
  });
}

/**
 * Extract the first frame from a video blob as base64 image data (fallback)
 */
export async function extractFirstFrameFromVideo(videoBlob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      reject(new Error('Cannot create canvas context'));
      return;
    }
    
    video.onloadeddata = () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Seek to the beginning (first frame)
      video.currentTime = 0;
    };
    
    video.onseeked = () => {
      try {
        // Draw the current frame to canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Convert canvas to base64 (without data: prefix)
        const base64Data = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
        
        // Clean up
        URL.revokeObjectURL(video.src);
        
        resolve(base64Data);
      } catch (error) {
        reject(error);
      }
    };
    
    video.onerror = (error) => {
      console.error('Video loading error:', error);
      const errorMsg = error instanceof Event ? error.type : String(error);
      reject(new Error(`Video loading failed: ${errorMsg}`));
    };
    
    // Load the video
    video.src = URL.createObjectURL(videoBlob);
    video.load();
  });
}