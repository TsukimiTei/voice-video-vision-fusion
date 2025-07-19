import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface VideoCompilerResult {
  videoUrl: string;
  prompt: string;
}

export interface CompilerProgress {
  stage: 'processing' | 'video_generation' | 'video_merging' | 'completed';
  progress?: number;
  message?: string;
}

export const useVideoCompiler = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<VideoCompilerResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusLog, setStatusLog] = useState<string[]>([]);
  const [progress, setProgress] = useState<CompilerProgress | null>(null);

  const compileVideo = useCallback(async (videoBlob: Blob, prompt: string) => {
    setIsProcessing(true);
    setError(null);
    setResult(null);
    setStatusLog([]);
    setProgress(null);

    const addLog = (message: string) => {
      const timestamp = new Date().toLocaleTimeString();
      setStatusLog(prev => [...prev, `[${timestamp}] ${message}`]);
    };

    try {
      addLog("开始处理视频编译...");
      setProgress({ stage: 'processing', progress: 10 });
      
      // Check video size first
      const videoSizeMB = videoBlob.size / (1024 * 1024);
      addLog(`视频大小: ${videoSizeMB.toFixed(2)} MB`);
      
      if (videoSizeMB > 50) {
        addLog(`❌ 视频过大: ${videoSizeMB.toFixed(2)}MB，最大支持50MB`);
        throw new Error(`视频过大: ${videoSizeMB.toFixed(2)}MB，最大支持50MB`);
      }
      
      // Convert video blob to base64 in chunks to prevent memory issues
      addLog("开始转换视频格式...");
      const arrayBuffer = await videoBlob.arrayBuffer();
      
      // Check if array buffer is too large
      if (arrayBuffer.byteLength > 50 * 1024 * 1024) {
        addLog("❌ 视频数据过大，无法处理");
        throw new Error("视频数据过大，无法处理");
      }
      
      // Convert to base64 safely without spreading large arrays
      const uint8Array = new Uint8Array(arrayBuffer);
      let binaryString = '';
      const chunkSize = 8192; // Process in chunks to avoid call stack issues
      
      for (let i = 0; i < uint8Array.length; i += chunkSize) {
        const chunk = uint8Array.slice(i, i + chunkSize);
        binaryString += String.fromCharCode.apply(null, Array.from(chunk));
      }
      
      const videoBase64 = btoa(binaryString);
      
      addLog("视频转换完成，准备上传...");
      setProgress({ stage: 'processing', progress: 30 });
      
      addLog("开始提交视频编译请求...");
      setProgress({ stage: 'video_generation', progress: 50 });
      
      // Call Supabase Edge Function for video compilation
      const { data: compileData, error: compileError } = await supabase.functions.invoke('compile-video', {
        body: {
          prompt,
          video_base64: videoBase64
        }
      });

      if (compileError) {
        addLog(`❌ Supabase 函数调用失败: ${compileError.message}`);
        throw new Error(`API 调用失败: ${compileError.message}`);
      }

      addLog(`📡 收到 Edge Function 响应`);
      setProgress({ stage: 'video_merging', progress: 80 });
      
      if (compileData.success && compileData.videoUrl) {
        addLog("✅ 视频编译完成！");
        setProgress({ stage: 'completed', progress: 100 });
        setResult({
          videoUrl: compileData.videoUrl,
          prompt
        });
        addLog("🎉 视频下载成功！");
        return;
      }
      
      if (!compileData.success) {
        addLog("❌ 视频编译失败");
        throw new Error(compileData.error || '视频编译失败');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to compile video';
      addLog(`❌ 错误: ${errorMessage}`);
      setError(errorMessage);
      setProgress(null);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  return {
    compileVideo,
    isProcessing,
    result,
    error,
    statusLog,
    progress
  };
};