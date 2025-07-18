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
      
      // Step 1: Submit generation request
      const submitResponse = await fetch(FLUX_KONTEXT_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-key': FLUX_KONTEXT_API_KEY,
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          image: imageBase64,
          aspect_ratio: '1:1',
          guidance: 3.5,
          safety_tolerance: 2
        }),
      }).catch((networkError) => {
        addLog(`❌ 网络错误: ${networkError.message}`);
        throw new Error(`网络连接失败: ${networkError.message}. 请检查网络连接或稍后重试。`);
      });

      addLog(`📡 收到响应状态: ${submitResponse.status}`);

      if (!submitResponse.ok) {
        let errorText;
        try {
          const errorJson = await submitResponse.json();
          errorText = errorJson.error?.message || errorJson.message || `HTTP ${submitResponse.status}`;
        } catch {
          errorText = await submitResponse.text();
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
      addLog(`✅ 请求成功提交，任务ID: ${submitData.id}`);
      
      if (!submitData.id || !submitData.polling_url) {
        addLog("❌ 响应格式错误: 缺少 id 或 polling_url");
        addLog(`📋 收到的响应: ${JSON.stringify(submitData)}`);
        throw new Error('服务器响应格式错误，请稍后重试');
      }

      addLog("开始轮询生成状态...");

      // Step 2: Poll for results
      const pollForResult = async (pollingUrl: string): Promise<any> => {
        const maxAttempts = 120; // 60 seconds with 0.5s interval
        
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          await new Promise(resolve => setTimeout(resolve, 500)); // Wait 0.5s
          
          addLog(`🔄 轮询中 (${attempt + 1}/${maxAttempts})...`);
          
          const pollResponse = await fetch(pollingUrl, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'x-key': FLUX_KONTEXT_API_KEY,
            },
          }).catch((networkError) => {
            addLog(`❌ 轮询网络错误: ${networkError.message}`);
            throw new Error(`轮询时网络连接失败: ${networkError.message}`);
          });
          
          if (!pollResponse.ok) {
            addLog(`❌ 轮询失败: ${pollResponse.status}`);
            
            if (pollResponse.status === 401) {
              throw new Error('轮询时认证失败');
            } else if (pollResponse.status === 404) {
              throw new Error('任务未找到，可能已过期');
            } else {
              throw new Error(`轮询失败: HTTP ${pollResponse.status}`);
            }
          }
          
          const pollData = await pollResponse.json();
          addLog(`📊 状态: ${pollData.status}`);
          
          if (pollData.status === 'Ready') {
            addLog("✅ 图像生成完成！");
            if (pollData.result && pollData.result.sample) {
              return pollData.result.sample;
            } else {
              addLog("❌ 响应中缺少图像数据");
              throw new Error('生成完成但缺少图像数据');
            }
          } else if (pollData.status === 'Error' || pollData.status === 'Failed') {
            addLog(`❌ 生成失败: ${pollData.status}`);
            const errorMessage = pollData.error?.message || pollData.failure_reason || '未知错误';
            throw new Error(`图像生成失败: ${errorMessage}`);
          }
          // Continue polling if status is 'Pending' or other non-final status
        }
        
        addLog("⏰ 生成超时");
        throw new Error('图像生成超时，请稍后重试');
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