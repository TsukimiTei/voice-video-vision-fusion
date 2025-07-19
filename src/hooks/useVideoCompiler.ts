import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { extractLastFrameFromVideo } from '../utils/videoFrameExtractor';
import { useVideoTasks } from './useVideoTasks';

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
  const [taskId, setTaskId] = useState<string | null>(null);
  const { saveTask, updateTask } = useVideoTasks();

  const compileVideo = useCallback(async (videoBlob: Blob, prompt: string) => {
    setIsProcessing(true);
    setError(null);
    setResult(null);
    setStatusLog([]);
    setProgress(null);
    setTaskId(null);

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
      
      // Call Supabase Edge Function to start video generation
      const { data: compileData, error: compileError } = await supabase.functions.invoke('compile-video', {
        body: {
          prompt,
          image_base64: imageBase64
        }
      });

      console.log('Supabase response:', { compileData, compileError });

      if (compileError) {
        console.error('Supabase function error details:', compileError);
        const errorMsg = compileError.message || JSON.stringify(compileError);
        addLog(`❌ Supabase 函数调用失败: ${errorMsg}`);
        throw new Error(`Edge Function调用失败: ${errorMsg}`);
      }

      if (!compileData.success || !compileData.taskId) {
        addLog("❌ 提交视频生成请求失败");
        throw new Error(compileData.error || '视频生成任务创建失败');
      }

      const currentTaskId = compileData.taskId;
      setTaskId(currentTaskId);
      addLog(`📡 视频生成任务已提交，任务ID: ${currentTaskId}`);
      addLog("正在等待视频生成完成...");
      setProgress({ stage: 'video_generation', progress: 60 });
      
      // Save task to database
      await saveTask(currentTaskId, prompt, 'processing');
      
      // Start polling for task status
      await pollTaskStatus(currentTaskId, addLog);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to compile video';
      addLog(`❌ 错误: ${errorMessage}`);
      setError(errorMessage);
      setProgress(null);
      
      // Update task with error if we have a taskId
      if (taskId) {
        await updateTask(taskId, {
          status: 'failed',
          error_message: errorMessage
        });
      }
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const pollTaskStatus = useCallback(async (taskId: string, addLog: (message: string) => void) => {
    const maxAttempts = 120; // 20 minutes max (10 seconds * 120)
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      try {
        addLog(`检查任务状态 (${attempts + 1}/${maxAttempts})...`);
        
        const { data: statusData, error: statusError } = await supabase.functions.invoke('check-video-status', {
          body: { taskId }
        });

        if (statusError) {
          console.error('Status check error:', statusError);
          addLog(`❌ 状态检查失败: ${statusError.message}`);
          throw new Error(`状态检查失败: ${statusError.message}`);
        }

        if (!statusData.success) {
          addLog(`❌ 任务失败: ${statusData.error}`);
          throw new Error(statusData.error || '视频生成失败');
        }

        if (statusData.status === 'completed' && statusData.videoUrl) {
          addLog("✅ 视频生成完成！");
          setProgress({ stage: 'completed', progress: 100 });
          setResult({
            videoUrl: statusData.videoUrl,
            prompt: statusData.prompt || ''
          });
          addLog("🎉 视频准备就绪！");
          
          // Update task in database
          await updateTask(taskId, {
            status: 'completed',
            video_url: statusData.videoUrl
          });
          
          return;
        } else if (statusData.status === 'processing') {
          addLog(`⏳ 任务进行中: ${statusData.message || '处理中...'}`);
          setProgress({ stage: 'video_generation', progress: 60 + (attempts * 30 / maxAttempts) });
        } else if (statusData.status === 'failed') {
          addLog(`❌ 任务失败: ${statusData.error}`);
          await updateTask(taskId, {
            status: 'failed',
            error_message: statusData.error
          });
          throw new Error(statusData.error || '视频生成失败');
        }
        
        // Wait 10 seconds before next check
        await new Promise(resolve => setTimeout(resolve, 10000));
        attempts++;
        
      } catch (error) {
        console.error('Error during task status polling:', error);
        throw error;
      }
    }
    
    throw new Error(`视频生成超时，已等待 ${maxAttempts * 10} 秒`);
  }, []);

  return {
    compileVideo,
    isProcessing,
    result,
    error,
    statusLog,
    progress,
    taskId
  };
};