import React, { useState } from 'react';
import { useRecorder } from '../hooks/useRecorder';
import { useSpeech } from '../hooks/useSpeech';
import { FLUX_KONTEXT_API_URL, FLUX_KONTEXT_API_KEY } from '../constants';

interface FluxResponse {
  generated_image_url: string;
}

export const Home: React.FC = () => {
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState(FLUX_KONTEXT_API_KEY);
  const [showApiKeyInput, setShowApiKeyInput] = useState(!FLUX_KONTEXT_API_KEY);

  const { stream, videoRef, isRecording, start: startRecording, stop: stopRecording, error: recordingError } = useRecorder();
  const { transcript, isListening, start: startSpeech, stop: stopSpeech, error: speechError } = useSpeech();

  const handleStartRecording = async () => {
    setGeneratedImageUrl(null);
    setApiError(null);
    await startRecording();
    startSpeech();
  };

  const handleStopRecording = async () => {
    stopSpeech();
    const lastFrame = await stopRecording();

    if (!lastFrame) {
      setApiError('Failed to capture video frame');
      return;
    }

    if (!transcript.trim()) {
      setApiError('No speech command detected');
      return;
    }

    if (!apiKey) {
      setApiError('API key not configured');
      return;
    }

    setIsGenerating(true);

    try {
      const response = await fetch(FLUX_KONTEXT_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          prompt: transcript,
          image_base64: lastFrame,
        }),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }

      const data: FluxResponse = await response.json();
      setGeneratedImageUrl(data.generated_image_url);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setApiError(`Failed to generate image: ${errorMessage}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleButtonClick = () => {
    if (isRecording) {
      handleStopRecording();
    } else {
      handleStartRecording();
    }
  };

  const handleApiKeySubmit = () => {
    if (apiKey.trim()) {
      localStorage.setItem('flux_api_key', apiKey.trim());
      setShowApiKeyInput(false);
      setApiError(null);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="max-w-2xl w-full space-y-6">
        {/* Title */}
        <h1 className="text-3xl font-bold text-center text-foreground">
          Voice Video Vision
        </h1>

        {/* API Key Input */}
        {showApiKeyInput && (
          <div className="bg-card rounded-lg p-6 border">
            <h2 className="text-lg font-semibold mb-4">Setup Required</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Enter your Flux Kontext API key to enable image generation:
            </p>
            <div className="flex gap-2">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your API key"
                className="flex-1 px-3 py-2 border border-input rounded-md bg-background text-foreground"
              />
              <button
                onClick={handleApiKeySubmit}
                className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90"
              >
                Save
              </button>
            </div>
          </div>
        )}

        {/* Video Container */}
        <div className="relative bg-card rounded-lg overflow-hidden shadow-lg">
          {stream ? (
            <div className="relative">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-auto"
              />
              
              {/* Live Captions Overlay */}
              {transcript && (
                <div className="absolute bottom-4 left-4 right-4 bg-black/50 rounded-lg p-3">
                  <p className="text-white text-center font-medium" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>
                    {transcript}
                  </p>
                </div>
              )}

              {/* Recording Indicator */}
              {isRecording && (
                <div className="absolute top-4 left-4 flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-white font-medium" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>
                    Recording...
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="aspect-video bg-muted flex items-center justify-center">
              <p className="text-muted-foreground">Camera feed will appear here</p>
            </div>
          )}
        </div>

        {/* Control Button */}
        <div className="text-center">
          <button
            onClick={handleButtonClick}
            disabled={isGenerating}
            className="bg-primary text-primary-foreground px-8 py-3 rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isGenerating
              ? 'Generating Image...'
              : isRecording
              ? 'Stop Recording'
              : 'Start Recording'}
          </button>
        </div>

        {/* Status Information */}
        {isListening && (
          <div className="text-center">
            <p className="text-sm text-muted-foreground">🎤 Listening for speech commands...</p>
          </div>
        )}

        {/* Error Messages */}
        {(recordingError || speechError || apiError) && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
            <p className="text-destructive text-sm">
              {recordingError || speechError || apiError}
            </p>
          </div>
        )}

        {/* Generated Image */}
        {generatedImageUrl && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-center text-foreground">
              Generated Image
            </h2>
            <div className="bg-card rounded-lg overflow-hidden shadow-lg">
              <img
                src={generatedImageUrl}
                alt="Generated based on voice command"
                className="w-full h-auto"
              />
            </div>
            <p className="text-center text-sm text-muted-foreground">
              Command: "{transcript}"
            </p>
          </div>
        )}
      </div>
    </div>
  );
};