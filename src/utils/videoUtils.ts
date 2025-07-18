export const captureVideoFrame = (video: HTMLVideoElement): string | null => {
  if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
    return null;
  }

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) return null;

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  
  try {
    ctx.drawImage(video, 0, 0);
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
    const response = await fetch(imageUrl);
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
  } catch (error) {
    console.error('Failed to download image:', error);
    throw error;
  }
};