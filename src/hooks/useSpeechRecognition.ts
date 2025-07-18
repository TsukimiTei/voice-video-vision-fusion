import { useState, useRef, useCallback } from 'react';
import { SpeechRecognitionResult } from '../types';
import { SPEECH_LANG } from '../constants';

export const useSpeechRecognition = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const startListening = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setError('Speech recognition not supported');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = SPEECH_LANG;
    
    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };
    
    recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscriptLocal = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscriptLocal += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }
      
      setTranscript(interimTranscript);
      if (finalTranscriptLocal) {
        setFinalTranscript(prev => prev + finalTranscriptLocal);
      }
    };
    
    recognition.onerror = (event) => {
      setError(`Speech recognition error: ${event.error}`);
      setIsListening(false);
    };
    
    recognition.onend = () => {
      setIsListening(false);
    };
    
    recognitionRef.current = recognition;
    recognition.start();
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setFinalTranscript('');
  }, []);

  return {
    isListening,
    transcript,
    finalTranscript,
    error,
    startListening,
    stopListening,
    resetTranscript
  };
};