import { useState, useRef, useCallback } from 'react';
import { VideoRecorderState } from '../types';
import { getMediaConstraints } from '../utils/videoUtils';

export const useCamera = () => {
  const [state, setState] = useState<VideoRecorderState>({
    isRecording: false,
    stream: null,
    error: null
  });
  
  const videoRef = useRef<HTMLVideoElement>(null);

  const startCamera = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, error: null }));
      
      const stream = await navigator.mediaDevices.getUserMedia(getMediaConstraints());
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      
      setState(prev => ({ ...prev, stream, isRecording: true }));
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to access camera'
      }));
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (state.stream) {
      state.stream.getTracks().forEach(track => track.stop());
    }
    
    setState({
      isRecording: false,
      stream: null,
      error: null
    });
  }, [state.stream]);

  return {
    ...state,
    videoRef,
    startCamera,
    stopCamera
  };
};