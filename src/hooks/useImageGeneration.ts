import { useState } from 'react';
import { GeneratedImageResult } from '../types';
import { FLUX_KONTEXT_API_URL, FLUX_KONTEXT_API_KEY } from '../constants';

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
      const submitResponse = await fetch(FLUX_KONTEXT_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          image: imageBase64,
          aspect_ratio: '1:1'
        }),
      }).catch((networkError) => {
        addLog(`❌ 网络错误: ${networkError.message}`);
        throw new Error(`网络连接失败: ${networkError.message}. 请检查网络连接或稍后重试。`);
      });

      addLog(`📡 收到响应状态: ${submitResponse.status}`);

      if (!submitResponse.ok) {
        let errorText;
        try {
          // Clone the response to avoid "body stream already read" error
          const responseClone = submitResponse.clone();
          const errorJson = await responseClone.json();
          errorText = errorJson.error || errorJson.details || `HTTP ${submitResponse.status}`;
        } catch {
          const errorText2 = await submitResponse.text();
          errorText = errorText2;
        }
        
        addLog(`❌ 请求失败: ${submitResponse.status} - ${errorText}`);
        
        // 根据错误码提供具体的错误信息
        if (submitResponse.status === 401) {
          throw new Error('API 密钥无效，请检查配置');
        } else if (submitResponse.status === 402) {
          throw new Error('余额不足，请充值后重试');
        } else if (submitResponse.status === 429) {
          throw new Error('请求过于频繁，请稍后重试');
        } else if (submitResponse.status === 400) {
          throw new Error(`请求参数错误: ${errorText}`);
        } else {
          throw new Error(`API 请求失败 (${submitResponse.status}): ${errorText}`);
        }
      }

      const submitData = await submitResponse.json();
      
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