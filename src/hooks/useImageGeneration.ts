import { useState } from 'react';
import { GeneratedImageResult } from '../types';
import { FLUX_KONTEXT_API_URL, FLUX_KONTEXT_API_KEY } from '../constants';

export const useImageGeneration = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<GeneratedImageResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generateImage = async (imageBase64: string, prompt: string) => {
    setIsGenerating(true);
    setError(null);
    setResult(null);

    try {
      // Step 1: Submit generation request
      const submitResponse = await fetch(FLUX_KONTEXT_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-key': FLUX_KONTEXT_API_KEY,
        },
        body: JSON.stringify({
          prompt,
          image: imageBase64,
          aspect_ratio: '1:1'
        }),
      });

      if (!submitResponse.ok) {
        const errorText = await submitResponse.text();
        throw new Error(`API request failed: ${submitResponse.status} - ${errorText}`);
      }

      const submitData = await submitResponse.json();
      
      if (!submitData.id || !submitData.polling_url) {
        throw new Error('Invalid response: missing id or polling_url');
      }

      // Step 2: Poll for results
      const pollForResult = async (pollingUrl: string): Promise<any> => {
        const maxAttempts = 60; // 30 seconds with 0.5s interval
        
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          await new Promise(resolve => setTimeout(resolve, 500)); // Wait 0.5s
          
          const pollResponse = await fetch(pollingUrl, {
            method: 'GET',
            headers: {
              'accept': 'application/json',
              'x-key': FLUX_KONTEXT_API_KEY,
            },
          });
          
          if (!pollResponse.ok) {
            throw new Error(`Polling failed: ${pollResponse.status}`);
          }
          
          const pollData = await pollResponse.json();
          
          if (pollData.status === 'Ready') {
            return pollData.result.sample;
          } else if (pollData.status === 'Error' || pollData.status === 'Failed') {
            throw new Error(`Generation failed: ${pollData.status}`);
          }
          // Continue polling if status is 'Pending' or other non-final status
        }
        
        throw new Error('Generation timeout - please try again');
      };

      const imageUrl = await pollForResult(submitData.polling_url);
      
      setResult({
        imageUrl,
        prompt
      });
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