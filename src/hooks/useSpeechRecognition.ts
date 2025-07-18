import { useState, useRef, useCallback } from 'react';
import { SpeechRecognitionResult } from '../types';

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

export const useSpeechRecognition = () => {
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const startListening = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setError('Speech recognition not supported');
      return;
    }

    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'zh-CN';

      recognitionRef.current.addEventListener('start', () => {
        setIsListening(true);
        setError(null);
      });

      recognitionRef.current.addEventListener('result', (event: SpeechRecognitionEvent) => {
        let finalTranscript = '';
        
        for (let i = event.results.length - 1; i >= 0; i--) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript = result[0].transcript;
            break;
          }
        }
        
        if (finalTranscript) {
          setTranscript(finalTranscript);
        }
      });

      recognitionRef.current.addEventListener('error', () => {
        setError('Speech recognition error');
        setIsListening(false);
      });

      recognitionRef.current.addEventListener('end', () => {
        setIsListening(false);
      });

      recognitionRef.current.start();
    } catch (err) {
      setError('Failed to start speech recognition');
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, []);

  return {
    transcript,
    isListening,
    error,
    startListening,
    stopListening
  };
};