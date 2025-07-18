import { useState, useRef, useCallback, useEffect } from 'react';
import { SPEECH_LANG } from '../constants';

interface UseSpeechReturn {
  transcript: string;
  isListening: boolean;
  start: () => void;
  stop: () => void;
  error: string | null;
}

export const useSpeech = (): UseSpeechReturn => {
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    // Check if SpeechRecognition is available
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setError('Speech recognition not supported in this browser');
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
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      // Update with final transcript if available, otherwise show interim
      if (finalTranscript) {
        console.log('Final transcript:', finalTranscript);
        setTranscript(finalTranscript.trim());
      } else if (interimTranscript) {
        console.log('Interim transcript:', interimTranscript);
        setTranscript(interimTranscript.trim());
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

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const start = useCallback(() => {
    console.log('Starting speech recognition...');
    if (recognitionRef.current && !isListening) {
      setTranscript('');
      setError(null);
      try {
        recognitionRef.current.start();
        console.log('Speech recognition started');
      } catch (err) {
        console.error('Failed to start speech recognition:', err);
        setError('Failed to start speech recognition');
      }
    }
  }, [isListening]);

  const stop = useCallback(() => {
    console.log('Stopping speech recognition...');
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      console.log('Speech recognition stopped');
    }
  }, [isListening]);

  return {
    transcript,
    isListening,
    start,
    stop,
    error
  };
};