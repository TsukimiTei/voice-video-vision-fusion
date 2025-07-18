export const captureVideoFrame = (video: HTMLVideoElement): string | null => {
  if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
    return null;
  }

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) return null;

  // Use the native video dimensions to preserve original quality and aspect ratio
  const sourceWidth = video.videoWidth;
  const sourceHeight = video.videoHeight;
  
  canvas.width = sourceWidth;
  canvas.height = sourceHeight;
  
  console.log(`Video capture: dimensions=${sourceWidth}x${sourceHeight}, aspect ratio=${(sourceWidth/sourceHeight).toFixed(2)}`);
  
  try {
    // Draw the video frame at its native resolution
    ctx.drawImage(video, 0, 0, sourceWidth, sourceHeight);
    const dataURL = canvas.toDataURL('image/jpeg', 0.8);
    return dataURL.split(',')[1]; // Remove data:image/jpeg;base64, prefix
  } catch (error) {
    console.error('Failed to capture frame:', error);
    return null;
  }
};

export const getMediaConstraints = (facingMode: 'user' | 'environment' = 'user'): MediaStreamConstraints => ({
  video: {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    facingMode: facingMode
  },
  audio: true
});

// Function to download image to device
export const downloadImage = async (imageUrl: string, filename: string = 'ai-generated-image.jpg') => {
  try {
    console.log('Starting image download:', imageUrl);
    
    // Handle different URL types
    let response: Response;
    if (imageUrl.startsWith('data:')) {
      // Handle data URLs
      const dataUrlMatch = imageUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (!dataUrlMatch) {
        throw new Error('Invalid data URL format');
      }
      
      const [, mimeType, base64Data] = dataUrlMatch;
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      const blob = new Blob([bytes], { type: mimeType });
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      console.log('Data URL download completed');
      return;
    }
    
    // Handle regular URLs with CORS proxy if needed
    try {
      response = await fetch(imageUrl, {
        mode: 'cors',
        headers: {
          'Accept': 'image/*'
        }
      });
    } catch (corsError) {
      console.warn('CORS error, trying with no-cors mode:', corsError);
      // Fallback: open in new tab if CORS fails
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = filename;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const blob = await response.blob();
    
    // Create download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    console.log('Image download completed successfully');
  } catch (error) {
    console.error('Failed to download image:', error);
    throw error;
  }
};