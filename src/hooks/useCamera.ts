import { useState, useRef, useCallback } from 'react';
import { VideoRecorderState } from '../types';
import { getMediaConstraints } from '../utils/videoUtils';

export const useCamera = () => {
  const [state, setState] = useState<VideoRecorderState>({
    isRecording: false,
    stream: null,
    error: null
  });
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  
  const videoRef = useRef<HTMLVideoElement>(null);

  const startCamera = useCallback(async (useFacingMode?: 'user' | 'environment') => {
    try {
      setState(prev => ({ ...prev, error: null }));
      
      const currentFacingMode = useFacingMode || facingMode;
      const stream = await navigator.mediaDevices.getUserMedia(getMediaConstraints(currentFacingMode));
      
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
  }, [facingMode]);

  const switchCamera = useCallback(async () => {
    const newFacingMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newFacingMode);
    
    if (state.isRecording) {
      // Stop current stream
      if (state.stream) {
        state.stream.getTracks().forEach(track => track.stop());
      }
      
      // Start with new facing mode
      await startCamera(newFacingMode);
    }
  }, [facingMode, state.isRecording, state.stream, startCamera]);

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
    stopCamera,
    switchCamera,
    facingMode
  };
};