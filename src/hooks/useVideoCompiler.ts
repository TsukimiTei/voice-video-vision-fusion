import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { extractLastFrameFromVideo } from '../utils/videoFrameExtractor';

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
      
      // Extract last frame from video for Kling AI image-to-video API
      addLog("正在从视频中提取最后一帧...");
      setProgress({ stage: 'processing', progress: 20 });
      
      const imageBase64 = await extractLastFrameFromVideo(videoBlob);
      
      addLog("最后一帧提取完成，准备生成延续视频...");
      setProgress({ stage: 'processing', progress: 40 });
      
      addLog("开始提交视频编译请求...");
      setProgress({ stage: 'video_generation', progress: 50 });
      
      console.log('About to call compile-video function with:', { prompt, imageLength: imageBase64.length });
      
      // Call Supabase Edge Function for video compilation
      const { data: compileData, error: compileError } = await supabase.functions.invoke('compile-video', {
        body: {
          prompt,
          image_base64: imageBase64 // Send image data instead of video data
        }
      });

      console.log('Supabase response:', { compileData, compileError });
      console.log('CompileData type:', typeof compileData);
      console.log('CompileError type:', typeof compileError);

      if (compileError) {
        console.error('Supabase function error details:', compileError);
        const errorMsg = compileError.message || JSON.stringify(compileError);
        addLog(`❌ Supabase 函数调用失败: ${errorMsg}`);
        throw new Error(`Edge Function调用失败: ${errorMsg}`);
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