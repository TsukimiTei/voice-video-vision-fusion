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
      const mediaStream = await navigator.mediaDevices.getUserMedia(VIDEO_CONSTRAINTS);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      
      setStream(mediaStream);
      setIsRecording(true);

      // Start MediaRecorder
      mediaRecorderRef.current = new MediaRecorder(mediaStream);
      mediaRecorderRef.current.start();
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to access camera/microphone';
      setError(errorMessage);
      console.error('Failed to start recording:', err);
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
      if (videoRef.current) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (ctx) {
          canvas.width = videoRef.current.videoWidth;
          canvas.height = videoRef.current.videoHeight;
          ctx.drawImage(videoRef.current, 0, 0);
          
          const dataURL = canvas.toDataURL('image/png');
          // Remove data:image/png;base64, prefix
          return dataURL.split(',')[1];
        }
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