import { useState } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Camera, Square, Mic, MicOff, Loader2, ArrowLeft, RotateCcw, SwitchCamera, X, Download, Circle } from 'lucide-react';
import { useCamera } from '../hooks/useCamera';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useImageGeneration } from '../hooks/useImageGeneration';
import { useTranslation } from '../hooks/useTranslation';
import { captureVideoFrame, downloadImage } from '../utils/videoUtils';
import { toast } from 'sonner';

type ViewState = 'home' | 'recording' | 'result';

interface VideoRecorderProps {
  onBack?: () => void;
}

export const VideoRecorder = ({ onBack }: VideoRecorderProps = {}) => {
  const [viewState, setViewState] = useState<ViewState>('home');
  const [isRecordingActive, setIsRecordingActive] = useState(false);
  const { isRecording, videoRef, startCamera, stopCamera, switchCamera, facingMode, error: cameraError } = useCamera();
  const { 
    isListening, 
    transcript, 
    finalTranscript, 
    startListening, 
    stopListening, 
    resetTranscript,
    error: speechError 
  } = useSpeechRecognition();
  const { generateImage, isGenerating, result, error: imageError, statusLog } = useImageGeneration();
  // const { translateToEnglish, isTranslating } = useTranslation();

  const handleStartRecording = async () => {
    setViewState('recording');
    await startCamera();
    resetTranscript();
  };

  const handlePressStart = async () => {
    setIsRecordingActive(true);
    startListening();
  };

  const handlePressEnd = async () => {
    setIsRecordingActive(false);
    stopListening();
    
    if (videoRef.current) {
      const frameBase64 = captureVideoFrame(videoRef.current);
      if (frameBase64 && finalTranscript) {
        try {
          toast.success('Generating image...');
          await generateImage(frameBase64, finalTranscript);
          setViewState('result');
        } catch (error) {
          console.error('Generation error:', error);
          toast.error('Processing failed, please try again');
          setViewState('home');
        }
      } else if (!finalTranscript) {
        toast.error('No voice command detected');
        setViewState('home');
      } else {
        toast.error('Cannot capture video frame');
        setViewState('home');
      }
    }
    
    stopCamera();
  };

  const handleBackToHome = () => {
    setViewState('home');
    resetTranscript();
  };

  const handleTryAgain = () => {
    setViewState('home');
    resetTranscript();
  };

  const handleCancelRecording = () => {
    setIsRecordingActive(false);
    stopListening();
    stopCamera();
    setViewState('home');
    resetTranscript();
  };

  const handleDownloadImage = async () => {
    if (result?.imageUrl) {
      try {
        await downloadImage(result.imageUrl, `ai-generated-${Date.now()}.jpg`);
        toast.success('Image downloaded successfully');
      } catch (error) {
        toast.error('Failed to download image');
      }
    }
  };

  // 主页
  if (viewState === 'home') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="p-8 max-w-md w-full text-center space-y-6">
          {onBack && (
            <div className="flex justify-start">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={onBack}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Home
              </Button>
            </div>
          )}
          
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">AI Video Generator</h1>
            <p className="text-muted-foreground">
              Record video and speak commands in English. AI will generate new images based on the last frame and voice commands.
            </p>
          </div>
          
          <Button 
            onClick={handleStartRecording}
            size="lg"
            className="w-full"
          >
            <Camera className="mr-2 h-5 w-5" />
            Start Recording
          </Button>
        </Card>
      </div>
    );
  }

  // 结果页面
  if (viewState === 'result') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="p-8 max-w-2xl w-full space-y-6">
          <div className="flex items-center justify-between">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleBackToHome}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            
            <h2 className="text-xl font-bold text-foreground">Generation Result</h2>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleTryAgain}
              className="flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Record Again
            </Button>
          </div>

          {result ? (
            <div className="space-y-4">
              <div className="relative">
                <img 
                  src={result.imageUrl} 
                  alt="AI Generated Image" 
                  className="w-full rounded-lg border shadow-lg"
                />
              </div>
              
              <Card className="p-4 bg-muted/50">
                <h3 className="font-semibold mb-2">Voice Command:</h3>
                <p className="text-muted-foreground">"{result.prompt}"</p>
              </Card>
              
              <div className="flex gap-3">
                <Button 
                  onClick={handleTryAgain}
                  variant="outline" 
                  className="flex-1"
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Record Again
                </Button>
                
                <Button 
                  onClick={handleDownloadImage}
                  variant="outline" 
                  className="flex-1"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
                
                <Button 
                  onClick={handleBackToHome}
                  className="flex-1"
                >
                  Done
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center space-y-4">
                <Loader2 className="h-12 w-12 animate-spin mx-auto text-muted-foreground" />
                <p className="text-muted-foreground">Generating image, please wait...</p>
              </div>
              
              {/* API 调用明细 */}
              {statusLog.length > 0 && (
                <Card className="p-4 bg-muted/30">
                  <h3 className="font-semibold mb-3 text-sm">API Call Details:</h3>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {statusLog.map((log, index) => (
                      <p key={index} className="text-xs font-mono text-muted-foreground">
                        {log}
                      </p>
                    ))}
                  </div>
                </Card>
              )}
              
              {imageError && (
                <Card className="p-4 bg-destructive/10 border-destructive/20">
                  <h3 className="font-semibold mb-2 text-destructive">Error Details:</h3>
                  <p className="text-sm text-destructive">{imageError}</p>
                </Card>
              )}
            </div>
          )}
        </Card>
      </div>
    );
  }

  // 录制页面
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Video Preview */}
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        style={{ transform: 'scaleX(-1)' }}
        autoPlay
        muted
        playsInline
      />
      
      {/* UI Overlay */}
      <div className="absolute inset-0 flex flex-col">
        {/* Top Bar - Speech Status - Floating */}
        <div className="absolute top-4 left-4 right-4 z-10">
          <div className="flex items-center justify-between">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleCancelRecording}
              className="text-white hover:bg-white/20 bg-black/30 backdrop-blur-sm"
            >
              <X className="h-4 w-4" />
            </Button>
            
            <div className="flex items-center gap-3">
              <Badge variant={isListening ? "default" : "secondary"} className="gap-2 bg-black/30 backdrop-blur-sm">
                {isListening ? <Mic className="h-3 w-3" /> : <MicOff className="h-3 w-3" />}
                {isListening ? 'Listening...' : 'Speech Stopped'}
              </Badge>
              
              {isRecordingActive && (
                <Badge variant="destructive" className="animate-pulse bg-red-500/80 backdrop-blur-sm">
                  ● Recording
                </Badge>
              )}
            </div>

            <div className="w-10" /> {/* Spacer for balance */}
          </div>
        </div>

        {/* Speech Text Overlay */}
        {(transcript || finalTranscript) && (
          <div className="absolute top-20 left-4 right-4">
            <Card className="p-4 bg-black/50 backdrop-blur-sm border-white/20">
              <div className="space-y-2">
                {finalTranscript && (
                  <p className="text-white font-medium">
                    Confirmed: {finalTranscript}
                  </p>
                )}
                {transcript && (
                  <p className="text-white/70 text-sm">
                    Speaking: {transcript}
                  </p>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* Bottom Recording Button */}
        <div className="absolute bottom-0 left-0 right-0 flex justify-center pb-20">
          <div className="relative flex items-center">
            {/* Main Recording Button - Centered */}
            <div className="flex flex-col items-center gap-3">
              <Button
                onMouseDown={handlePressStart}
                onMouseUp={handlePressEnd}
                onTouchStart={handlePressStart}
                onTouchEnd={handlePressEnd}
                size="lg"
                variant={isRecordingActive ? "destructive" : "default"}
                className={`rounded-full h-24 w-24 transition-all duration-200 ${
                  isRecordingActive ? 'scale-110 shadow-lg' : 'hover:scale-105'
                }`}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <Loader2 className="h-8 w-8 animate-spin" />
                ) : isRecordingActive ? (
                  <Square className="h-8 w-8" />
                ) : (
                  <Circle className="h-8 w-8" />
                )}
              </Button>
              
              <p className="text-white text-center font-medium bg-black/30 px-3 py-1 rounded-full backdrop-blur-sm text-sm">
                {isGenerating ? 'Generating...' : isRecordingActive ? 'Recording... Release to stop' : 'Hold to record'}
              </p>
            </div>
            
            {/* Camera Switch Button - Right side */}
            <Button 
              variant="ghost" 
              size="lg"
              onClick={switchCamera}
              className="absolute left-36 text-white hover:bg-white/20 bg-black/30 backdrop-blur-sm rounded-full h-16 w-16"
            >
              <SwitchCamera className="h-8 w-8" />
            </Button>
          </div>
        </div>
      </div>

      {/* Error Messages */}
      {(cameraError || speechError || imageError) && (
        <div className="absolute top-4 right-4">
          <Card className="p-3 bg-destructive/90 text-destructive-foreground">
            <p className="text-sm">
              {cameraError || speechError || imageError}
            </p>
          </Card>
        </div>
      )}
    </div>
  );
};