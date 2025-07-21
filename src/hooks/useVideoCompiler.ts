import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { extractLastFrameFromVideo } from '../utils/videoFrameExtractor';
import { useVideoTasks } from './useVideoTasks';

export interface VideoCompilerResult {
  videoUrl: string;
  prompt: string;
  generatedVideoUrl?: string;
  originalVideoUrl?: string;
  lastFrameImageUrl?: string;
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
  const [originalVideoBlob, setOriginalVideoBlob] = useState<Blob | null>(null);
  const [generatedVideoBlob, setGeneratedVideoBlob] = useState<Blob | null>(null);
  const [lastFrameImage, setLastFrameImage] = useState<string | null>(null);
  const { saveTask, updateTask } = useVideoTasks();

  const mergeVideos = useCallback(async (originalVideoBlob: Blob, generatedVideoUrl: string, addLog: (message: string) => void): Promise<string> => {
    try {
      addLog("正在下载生成的视频...");
      
      // Download the generated video
      const response = await fetch(generatedVideoUrl);
      if (!response.ok) {
        throw new Error('无法下载生成的视频');
      }
      
      const generatedVideoBlob = await response.blob();
      addLog("生成的视频下载完成");
      
      // Create video elements for both videos to get durations
      const originalVideo = document.createElement('video');
      const generatedVideo = document.createElement('video');
      
      // Create object URLs first
      const originalVideoUrl = URL.createObjectURL(originalVideoBlob);
      const generatedVideoObjectUrl = URL.createObjectURL(generatedVideoBlob);
      
      // Load original video to get duration
      const originalDuration = await new Promise<number>((resolve, reject) => {
        originalVideo.addEventListener('loadedmetadata', () => {
          resolve(originalVideo.duration);
        });
        originalVideo.addEventListener('error', reject);
        originalVideo.src = originalVideoUrl;
      });
      
      // Load generated video to get duration  
      const generatedDuration = await new Promise<number>((resolve, reject) => {
        generatedVideo.addEventListener('loadedmetadata', () => {
          resolve(generatedVideo.duration);
        });
        generatedVideo.addEventListener('error', reject);
        generatedVideo.src = generatedVideoObjectUrl;
      });
      
      addLog(`原始视频时长: ${originalDuration.toFixed(1)}秒, 生成视频时长: ${generatedDuration.toFixed(1)}秒`);
      
      // Create a simple concatenated video (original + generated)
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('无法创建canvas上下文');
      }
      
      // Set canvas dimensions to match video
      canvas.width = originalVideo.videoWidth || 1280;
      canvas.height = originalVideo.videoHeight || 720;
      
      addLog("开始拼接视频帧...");
      
      const chunks: Blob[] = [];
      const stream = canvas.captureStream(30); // 30 FPS
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9'
      });
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };
      
      const recordingComplete = new Promise<void>((resolve) => {
        mediaRecorder.onstop = () => resolve();
      });
      
      mediaRecorder.start();
      
      // Set up video playback and drawing
      originalVideo.currentTime = 0;
      generatedVideo.currentTime = 0;
      
      const fps = 30;
      const frameInterval = 1000 / fps;
      let frameCount = 0;
      const totalFrames = Math.floor((originalDuration + generatedDuration) * fps);
      
      const drawFrame = () => {
        const currentTime = frameCount / fps;
        
        if (currentTime < originalDuration) {
          // Draw original video frame
          originalVideo.currentTime = currentTime;
          ctx.drawImage(originalVideo, 0, 0, canvas.width, canvas.height);
        } else if (currentTime < originalDuration + generatedDuration) {
          // Draw generated video frame
          const generatedTime = currentTime - originalDuration;
          generatedVideo.currentTime = generatedTime;
          ctx.drawImage(generatedVideo, 0, 0, canvas.width, canvas.height);
        } else {
          // Recording complete
          mediaRecorder.stop();
          return;
        }
        
        frameCount++;
        if (frameCount < totalFrames) {
          setTimeout(drawFrame, frameInterval);
        } else {
          mediaRecorder.stop();
        }
      };
      
      // Start drawing frames
      setTimeout(drawFrame, 100); // Small delay to ensure videos are ready
      await recordingComplete;
      
      const mergedBlob = new Blob(chunks, { type: 'video/webm' });
      
      // Clean up
      URL.revokeObjectURL(originalVideoUrl);
      URL.revokeObjectURL(generatedVideoObjectUrl);
      
      // Create object URL for the merged video
      const mergedVideoUrl = URL.createObjectURL(mergedBlob);
      addLog("视频合并完成！");
      
      return mergedVideoUrl;
      
    } catch (error) {
      console.error('Error merging videos:', error);
      addLog(`❌ 视频合并失败: ${error instanceof Error ? error.message : '未知错误'}`);
      // Return the generated video URL as fallback
      addLog("⚠️ 返回生成的视频作为备用");
      return generatedVideoUrl;
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
          setProgress({ stage: 'video_merging', progress: 85 });
          addLog("正在拼接原始视频和生成的视频...");
          
          // Download and store the generated video blob
          try {
            const response = await fetch(statusData.videoUrl);
            const generatedBlob = await response.blob();
            setGeneratedVideoBlob(generatedBlob);
            
            // Create object URL for generated video
            const generatedVideoObjectUrl = URL.createObjectURL(generatedBlob);
            
            // Extract last frame image from original video
            const lastFrameImageData = await extractLastFrameFromVideo(originalVideoBlob!);
            const lastFrameImageUrl = `data:image/png;base64,${lastFrameImageData}`;
            setLastFrameImage(lastFrameImageUrl);
            
            // Merge original video with generated video
            const mergedVideoUrl = await mergeVideos(originalVideoBlob!, statusData.videoUrl, addLog);
            
            addLog("✅ 视频拼接完成！");
            setProgress({ stage: 'completed', progress: 100 });
            
            // Get the current prompt from the polling data or use a default
            const currentPrompt = statusData.prompt || '';
            
            setResult({
              videoUrl: mergedVideoUrl,
              prompt: currentPrompt,
              generatedVideoUrl: generatedVideoObjectUrl,
              originalVideoUrl: URL.createObjectURL(originalVideoBlob!),
              lastFrameImageUrl: lastFrameImageUrl
            });
            addLog("🎉 完整视频准备就绪！");
            
            // Update task in database with merged video URL and individual video URLs
            await updateTask(taskId, {
              status: 'completed',
              video_url: mergedVideoUrl,
              original_video_url: null, // We don't have a permanent URL for original video
              generated_video_url: statusData.videoUrl // Use the original Kling URL, not the object URL
            });
            
          } catch (downloadError) {
            console.error('Error downloading generated video:', downloadError);
            addLog(`❌ 下载生成视频失败: ${downloadError instanceof Error ? downloadError.message : '未知错误'}`);
            
            // Fallback: still show the generated video URL and update task with what we have
            setResult({
              videoUrl: statusData.videoUrl,
              prompt: statusData.prompt || '',
              generatedVideoUrl: statusData.videoUrl
            });
            
            // Update task with generated video URL even if merging failed
            await updateTask(taskId, {
              status: 'completed',
              video_url: statusData.videoUrl,
              generated_video_url: statusData.videoUrl
            });
          }
          
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
  }, [originalVideoBlob, updateTask, mergeVideos]);

  const compileVideo = useCallback(async (videoBlob: Blob, prompt: string) => {
    setIsProcessing(true);
    setError(null);
    setResult(null);
    setStatusLog([]);
    setProgress(null);
    setTaskId(null);
    setOriginalVideoBlob(videoBlob);

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
      
      // Store the last frame image for display
      const lastFrameImageUrl = `data:image/png;base64,${imageBase64}`;
      setLastFrameImage(lastFrameImageUrl);
      
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
  }, [saveTask, updateTask, taskId, pollTaskStatus]);

  const reset = useCallback(() => {
    setIsProcessing(false);
    setResult(null);
    setError(null);
    setStatusLog([]);
    setProgress(null);
    setTaskId(null);
    setOriginalVideoBlob(null);
    setGeneratedVideoBlob(null);
    setLastFrameImage(null);
  }, []);

  return {
    compileVideo,
    isProcessing,
    result,
    error,
    statusLog,
    progress,
    taskId,
    reset,
    lastFrameImage
  };
};