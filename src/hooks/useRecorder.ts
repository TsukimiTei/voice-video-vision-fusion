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
      console.log('Requesting camera and microphone access...');
      
      const mediaStream = await navigator.mediaDevices.getUserMedia(VIDEO_CONSTRAINTS);
      console.log('Media stream obtained:', mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        console.log('Video element srcObject set');
        
        // Wait for video to load
        await new Promise<void>((resolve) => {
          if (videoRef.current) {
            videoRef.current.onloadedmetadata = () => {
              console.log('Video metadata loaded');
              resolve();
            };
          }
        });
      }
      
      setStream(mediaStream);
      setIsRecording(true);

      // Start MediaRecorder
      mediaRecorderRef.current = new MediaRecorder(mediaStream);
      console.log('MediaRecorder created');
      
      mediaRecorderRef.current.onstart = () => {
        console.log('MediaRecorder started');
      };
      
      mediaRecorderRef.current.onerror = (event) => {
        console.error('MediaRecorder error:', event);
      };
      
      mediaRecorderRef.current.start();
      console.log('Recording started');
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to access camera/microphone';
      console.error('Failed to start recording:', err);
      setError(errorMessage);
    }
  }, []);

  const stop = useCallback(async (): Promise<string | null> => {
    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }

      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }

      setIsRecording(false);

      // Capture last frame
      if (videoRef.current && videoRef.current.videoWidth > 0 && videoRef.current.videoHeight > 0) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (ctx) {
          canvas.width = videoRef.current.videoWidth;
          canvas.height = videoRef.current.videoHeight;
          console.log('Capturing frame with dimensions:', canvas.width, 'x', canvas.height);
          
          ctx.drawImage(videoRef.current, 0, 0);
          
          const dataURL = canvas.toDataURL('image/png');
          console.log('Frame captured, data URL length:', dataURL.length);
          
          // Remove data:image/png;base64, prefix
          return dataURL.split(',')[1];
        }
      } else {
        console.error('Video element not ready for frame capture');
      }

      return null;
    } catch (err) {
      console.error('Failed to stop recording:', err);
      return null;
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