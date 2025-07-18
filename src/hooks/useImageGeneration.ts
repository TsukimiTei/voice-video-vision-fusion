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
      addLog("开始提交图像生成请求...");
      
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
        addLog(`❌ 请求失败: ${submitResponse.status} - ${errorText}`);
        throw new Error(`API request failed: ${submitResponse.status} - ${errorText}`);
      }

      const submitData = await submitResponse.json();
      addLog(`✅ 请求成功提交，任务ID: ${submitData.id}`);
      
      if (!submitData.id || !submitData.polling_url) {
        addLog("❌ 响应格式错误: 缺少 id 或 polling_url");
        throw new Error('Invalid response: missing id or polling_url');
      }

      addLog("开始轮询生成状态...");

      // Step 2: Poll for results
      const pollForResult = async (pollingUrl: string): Promise<any> => {
        const maxAttempts = 60; // 30 seconds with 0.5s interval
        
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          await new Promise(resolve => setTimeout(resolve, 500)); // Wait 0.5s
          
          addLog(`🔄 轮询中 (${attempt + 1}/${maxAttempts})...`);
          
          const pollResponse = await fetch(pollingUrl, {
            method: 'GET',
            headers: {
              'accept': 'application/json',
              'x-key': FLUX_KONTEXT_API_KEY,
            },
          });
          
          if (!pollResponse.ok) {
            addLog(`❌ 轮询失败: ${pollResponse.status}`);
            throw new Error(`Polling failed: ${pollResponse.status}`);
          }
          
          const pollData = await pollResponse.json();
          addLog(`📊 状态: ${pollData.status}`);
          
          if (pollData.status === 'Ready') {
            addLog("✅ 图像生成完成！");
            return pollData.result.sample;
          } else if (pollData.status === 'Error' || pollData.status === 'Failed') {
            addLog(`❌ 生成失败: ${pollData.status}`);
            throw new Error(`Generation failed: ${pollData.status}`);
          }
          // Continue polling if status is 'Pending' or other non-final status
        }
        
        addLog("⏰ 生成超时");
        throw new Error('Generation timeout - please try again');
      };

      const imageUrl = await pollForResult(submitData.polling_url);
      
      setResult({
        imageUrl,
        prompt
      });
      addLog("🎉 图像下载成功！");
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