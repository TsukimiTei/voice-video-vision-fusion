import { useState } from 'react';
import { GeneratedImageResult } from '../types';
import { supabase } from '@/integrations/supabase/client';

export const useImageGeneration = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<GeneratedImageResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusLog, setStatusLog] = useState<string[]>([]);

  const generateImage = async (imageBase64: string, prompt: string) => {
    setIsGenerating(true);
    setError(null);
    setResult(null);
    setStatusLog([]);

    const addLog = (message: string) => {
      const timestamp = new Date().toLocaleTimeString();
      setStatusLog(prev => [...prev, `[${timestamp}] ${message}`]);
    };

    try {
      addLog("开始处理图像...");
      
      // 检查图像大小 - BFL API 可能有大小限制
      if (imageBase64.length > 4 * 1024 * 1024) { // 4MB limit
        throw new Error('图像文件过大，请选择较小的图像文件');
      }
      
      addLog("开始提交图像生成请求...");
      
      // Step 1: Submit generation request via Supabase Edge Function
      const { data: submitData, error: submitError } = await supabase.functions.invoke('generate-image-edit', {
        body: {
          prompt,
          input_image: imageBase64
          // aspect_ratio will be automatically calculated from input image
        }
      });

      if (submitError) {
        addLog(`❌ Supabase 函数调用失败: ${submitError.message}`);
        throw new Error(`API 调用失败: ${submitError.message}`);
      }

      addLog(`📡 收到 Edge Function 响应`);
      
      if (submitData.success && submitData.imageUrl) {
        addLog("✅ 图像生成完成！");
        setResult({
          imageUrl: submitData.imageUrl,
          prompt
        });
        addLog("🎉 图像下载成功！");
        return;
      }
      
      if (!submitData.success) {
        addLog("❌ 图像生成失败");
        throw new Error(submitData.error || '图像生成失败');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate image';
      addLog(`❌ 错误: ${errorMessage}`);
      setError(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    generateImage,
    isGenerating,
    result,
    error,
    statusLog
  };
};