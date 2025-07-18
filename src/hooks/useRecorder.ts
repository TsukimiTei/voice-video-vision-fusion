import { useRef, useState, useCallback } from 'react';
import { VIDEO_CONSTRAINTS } from '../constants';

interface UseRecorderReturn {
  stream: MediaStream | null;
  videoRef: React.RefObject<HTMLVideoElement>;
  isRecording: boolean;
  start: () => Promise<void>;
  stop: () => Promise<string | null>;
  error: string | null;
}

export const useRecorder = (): UseRecorderReturn => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const start = useCallback(async () => {
    try {
      setError(null);
      console.log('🎥 Requesting camera and microphone access...');
      
      const mediaStream = await navigator.mediaDevices.getUserMedia(VIDEO_CONSTRAINTS);
      console.log('✅ Media stream obtained:', mediaStream.getTracks().map(track => ({ kind: track.kind, enabled: track.enabled })));
      
      setStream(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        console.log('📺 Video element srcObject set');
        
        // Wait for video to load and play
        await new Promise<void>((resolve, reject) => {
          if (videoRef.current) {
            const video = videoRef.current;
            
            const onLoadedMetadata = () => {
              console.log('📊 Video metadata loaded, dimensions:', video.videoWidth, 'x', video.videoHeight);
              video.play().then(() => {
                console.log('▶️ Video playback started');
                resolve();
              }).catch(reject);
            };
            
            const onError = (e: Event) => {
              console.error('❌ Video loading error:', e);
              reject(new Error('Video loading failed'));
            };
            
            video.addEventListener('loadedmetadata', onLoadedMetadata, { once: true });
            video.addEventListener('error', onError, { once: true });
            
            // Cleanup listeners after 5 seconds
            setTimeout(() => {
              video.removeEventListener('loadedmetadata', onLoadedMetadata);
              video.removeEventListener('error', onError);
            }, 5000);
          }
        });
      }
      
      setIsRecording(true);

      // Start MediaRecorder
      mediaRecorderRef.current = new MediaRecorder(mediaStream);
      console.log('🎬 MediaRecorder created');
      
      mediaRecorderRef.current.onstart = () => {
        console.log('🔴 MediaRecorder started');
      };
      
      mediaRecorderRef.current.onerror = (event) => {
        console.error('❌ MediaRecorder error:', event);
      };
      
      mediaRecorderRef.current.start();
      console.log('🎯 Recording started successfully');
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to access camera/microphone';
      console.error('💥 Failed to start recording:', err);
      setError(errorMessage);
      
      // Clean up partial state
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }
      setIsRecording(false);
    }
  }, [stream]);

  const stop = useCallback(async (): Promise<string | null> => {
    try {
      console.log('🛑 Stopping recording...');
      
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
        console.log('📹 MediaRecorder stopped');
      }

      setIsRecording(false);

      // Wait a moment for video to stabilize before capturing
      await new Promise(resolve => setTimeout(resolve, 100));

      // Capture last frame before stopping the stream
      console.log('🖼️ Attempting to capture video frame...');
      console.log('Video element:', videoRef.current);
      
      if (!videoRef.current) {
        console.error('❌ Video element reference is null');
        return null;
      }

      const video = videoRef.current;
      console.log('Video properties:', {
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight,
        readyState: video.readyState,
        currentTime: video.currentTime,
        duration: video.duration,
        ended: video.ended,
        paused: video.paused
      });

      if (video.videoWidth === 0 || video.videoHeight === 0) {
        console.error('❌ Video has zero dimensions');
        return null;
      }

      if (video.readyState < 2) {
        console.error('❌ Video not ready (readyState < 2)');
        return null;
      }

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        console.error('❌ Could not get canvas context');
        return null;
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      console.log('📐 Canvas dimensions set:', canvas.width, 'x', canvas.height);
      
      try {
        ctx.drawImage(video, 0, 0);
        console.log('✅ Image drawn to canvas');
        
        const dataURL = canvas.toDataURL('image/jpeg', 0.8);
        console.log('📸 Frame captured, data URL length:', dataURL.length);
        
        if (dataURL.length < 1000) {
          console.error('❌ Captured image too small, likely failed');
          return null;
        }
        
        // Stop stream only after successful capture
        if (stream) {
          stream.getTracks().forEach(track => {
            console.log('🔇 Stopping track:', track.kind);
            track.stop();
          });
          setStream(null);
        }
        
        // Remove data:image/jpeg;base64, prefix
        const base64Data = dataURL.split(',')[1];
        console.log('✅ Successfully captured frame, base64 length:', base64Data.length);
        return base64Data;
        
      } catch (drawError) {
        console.error('❌ Error drawing to canvas:', drawError);
        return null;
      }

    } catch (err) {
      console.error('💥 Failed to stop recording:', err);
      return null;
    } finally {
      // Ensure stream is stopped even if capture fails
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }
    }
  }, [stream]);

  return {
    stream,
    videoRef,
    isRecording,
    start,
    stop,
    error
  };
};