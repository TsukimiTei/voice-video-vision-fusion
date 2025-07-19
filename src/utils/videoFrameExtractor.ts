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
      
      // Seek to the end of the video (last frame)
      video.currentTime = video.duration;
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
      reject(new Error('Video loading error: ' + error));
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
      reject(new Error('Video loading error: ' + error));
    };
    
    // Load the video
    video.src = URL.createObjectURL(videoBlob);
    video.load();
  });
}