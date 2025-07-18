import { useState } from 'react';
import { GeneratedImageResult } from '../types';

const FLUX_KONTEXT_API_URL = 'https://api.fluxkontext.com/v1/generate';
const FLUX_KONTEXT_API_KEY = '06ca1d6d-ae68-4f25-a3eb-6b1caae2fbae';

export const useImageGeneration = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<GeneratedImageResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generateImage = async (imageBase64: string, prompt: string) => {
    setIsGenerating(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(FLUX_KONTEXT_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${FLUX_KONTEXT_API_KEY}`,
        },
        body: JSON.stringify({
          prompt,
          image: imageBase64,
          width: 1024,
          height: 1024,
          steps: 20,
          guidance: 7.5
        }),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.image) {
        setResult({
          imageUrl: `data:image/jpeg;base64,${data.image}`,
          prompt
        });
      } else {
        throw new Error('No image returned from API');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate image');
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    generateImage,
    isGenerating,
    result,
    error
  };
};