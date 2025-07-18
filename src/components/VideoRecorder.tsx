import { useEffect } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { useCamera } from '../hooks/useCamera';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useImageGeneration } from '../hooks/useImageGeneration';
import { captureVideoFrame } from '../utils/videoUtils';
import { toast } from 'sonner';

export const VideoRecorder = () => {
  const { isRecording, videoRef, startCamera, stopCamera, error: cameraError } = useCamera();
  const { transcript, isListening, startListening, stopListening, error: speechError } = useSpeechRecognition();
  const { generateImage, isGenerating, result, error: imageError } = useImageGeneration();

  const handleStart = async () => {
    await startCamera();
    startListening();
  };

  const handleStop = async () => {
    stopListening();
    
    if (videoRef.current) {
      const frameData = captureVideoFrame(videoRef.current);
      
      if (frameData && transcript) {
        await generateImage(frameData, transcript);
      } else {
        toast.error('Failed to capture frame or no speech command detected');
      }
    }
    
    stopCamera();
  };

  useEffect(() => {
    if (cameraError) toast.error(cameraError);
    if (speechError) toast.error(speechError);
    if (imageError) toast.error(imageError);
  }, [cameraError, speechError, imageError]);

  if (!isRecording && !result) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8">
        <Card className="p-8 text-center">
          <h1 className="text-2xl font-bold mb-4">AI 语音摄像</h1>
          <p className="text-muted-foreground mb-6">
            点击开始录制，说出您的创意指令
          </p>
          <Button onClick={handleStart} size="lg">
            开始录制
          </Button>
        </Card>
      </div>
    );
  }

  if (isRecording) {
    return (
      <div className="relative w-full h-screen">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          muted
          playsInline
        />
        
        <div className="absolute inset-0 bg-black/20">
          <div className="absolute top-4 left-4 right-4">
            <Card className="p-4 bg-black/50 text-white">
              <p className="text-sm mb-2">
                {isListening ? '🎤 正在听取指令...' : '🔇 语音识别已停止'}
              </p>
              {transcript && (
                <p className="text-lg font-medium">
                  指令: {transcript}
                </p>
              )}
            </Card>
          </div>
          
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
            <Button onClick={handleStop} variant="destructive" size="lg">
              停止录制
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (isGenerating) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8">
        <Card className="p-8 text-center">
          <h2 className="text-xl font-bold mb-4">正在生成图像...</h2>
          <p className="text-muted-foreground">
            使用您的指令: "{transcript}"
          </p>
        </Card>
      </div>
    );
  }

  if (result) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8">
        <Card className="p-8 text-center max-w-2xl">
          <h2 className="text-xl font-bold mb-4">生成完成</h2>
          <p className="text-muted-foreground mb-4">
            指令: "{result.prompt}"
          </p>
          <img 
            src={result.imageUrl} 
            alt="Generated result" 
            className="w-full max-w-lg mx-auto rounded-lg mb-4"
          />
          <Button onClick={() => window.location.reload()}>
            重新开始
          </Button>
        </Card>
      </div>
    );
  }

  return null;
};