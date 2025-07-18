import { useState } from 'react';
import { toast } from 'sonner';
import { cleanBase64 } from '@/utils/imageUtils';

interface GenerationError {
  timestamp: string;
  errorType: string;
  errorMessage: string;
  errorStack: string;
  sourceImageType: string;
  sourceImageSize: number;
  originalCommand: string;
  finalPrompt: string;
  userAgent: string;
  url: string;
}

export const useImageGeneration = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateImage = async (sourceImage: string, prompt: string): Promise<string> => {
    setIsGenerating(true);
    setError(null);

    try {
      console.log('Starting image generation...');
      console.log('Prompt:', prompt);
      console.log('Source image size:', sourceImage.length);

      if (!prompt.trim()) {
        throw new Error('请输入生成提示词');
      }

      // 清理 base64 数据
      let cleanedBase64;
      try {
        cleanedBase64 = cleanBase64(sourceImage);
        console.log('Cleaned base64 size:', cleanedBase64.length);
      } catch (cleanError) {
        console.error('Base64 cleaning failed:', cleanError);
        throw new Error('图像数据格式错误，请重新拍摄');
      }

      // 准备请求数据
      const requestData = {
        prompt: prompt.trim(),
        image: cleanedBase64,
        strength: 0.8,
        aspect_ratio: "1:1"
      };

      console.log('Sending request to edge function...');

      // 调用 Supabase Edge Function
      const response = await fetch('/functions/v1/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API error response:', errorText);
        throw new Error(`API 请求失败: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('API response:', result);

      if (!result.success) {
        throw new Error(result.error || '图像生成失败');
      }

      if (!result.data) {
        throw new Error('API 返回数据为空');
      }

      console.log('Image generation successful');
      toast.success('图像生成成功！');
      
      return result.data;

    } catch (error: any) {
      console.error('Image generation error:', error);
      
      // 记录详细错误信息
      const errorDetails: GenerationError = {
        timestamp: new Date().toISOString(),
        errorType: error.constructor.name,
        errorMessage: error.message,
        errorStack: error.stack || '',
        sourceImageType: sourceImage.startsWith('data:') ? 'base64' : 'url',
        sourceImageSize: sourceImage.length,
        originalCommand: '',
        finalPrompt: prompt,
        userAgent: navigator.userAgent,
        url: window.location.href
      };
      
      console.error('完整错误日志:', JSON.stringify(errorDetails, null, 2));
      
      const errorMessage = error.message || '图像生成失败，请重试';
      setError(errorMessage);
      toast.error(errorMessage);
      
      throw error;
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    generateImage,
    isGenerating,
    error,
    clearError: () => setError(null)
  };
};