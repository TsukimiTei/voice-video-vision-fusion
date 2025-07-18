import { useState } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Camera, Square, Mic, MicOff, Loader2 } from 'lucide-react';
import { useCamera } from '../hooks/useCamera';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useImageGeneration } from '../hooks/useImageGeneration';
import { captureVideoFrame } from '../utils/videoUtils';
import { toast } from 'sonner';

export const VideoRecorder = () => {
  const [showCamera, setShowCamera] = useState(false);
  const { isRecording, videoRef, startCamera, stopCamera, error: cameraError } = useCamera();
  const { 
    isListening, 
    transcript, 
    finalTranscript, 
    startListening, 
    stopListening, 
    resetTranscript,
    error: speechError 
  } = useSpeechRecognition();
  const { generateImage, isGenerating, result, error: imageError } = useImageGeneration();

  const handleStartRecording = async () => {
    setShowCamera(true);
    await startCamera();
    startListening();
    resetTranscript();
  };

  const handleStopRecording = async () => {
    stopListening();
    
    if (videoRef.current) {
      const frameBase64 = captureVideoFrame(videoRef.current);
      if (frameBase64 && finalTranscript) {
        toast.success('正在生成图像...');
        await generateImage(frameBase64, finalTranscript);
      } else if (!finalTranscript) {
        toast.error('未检测到语音指令');
      } else {
        toast.error('无法截取视频帧');
      }
    }
    
    stopCamera();
    setShowCamera(false);
  };

  if (!showCamera) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="p-8 max-w-md w-full text-center space-y-6">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">AI 视频生成器</h1>
            <p className="text-muted-foreground">
              录制视频并说出指令，AI将基于视频最后一帧和语音指令生成新图像
            </p>
          </div>
          
          <Button 
            onClick={handleStartRecording}
            size="lg"
            className="w-full"
          >
            <Camera className="mr-2 h-5 w-5" />
            开始录制
          </Button>
          
          {result && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">生成结果：</h3>
              <img 
                src={result.imageUrl} 
                alt="Generated" 
                className="w-full rounded-lg border"
              />
              <p className="text-sm text-muted-foreground">
                指令：{result.prompt}
              </p>
            </div>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Video Preview */}
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        autoPlay
        muted
        playsInline
      />
      
      {/* UI Overlay */}
      <div className="absolute inset-0 flex flex-col">
        {/* Top Bar - Speech Status */}
        <div className="p-4 bg-black/20 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <Badge variant={isListening ? "default" : "secondary"} className="gap-2">
              {isListening ? <Mic className="h-3 w-3" /> : <MicOff className="h-3 w-3" />}
              {isListening ? '正在监听...' : '语音已停止'}
            </Badge>
            
            {isRecording && (
              <Badge variant="destructive" className="animate-pulse">
                ● 录制中
              </Badge>
            )}
          </div>
        </div>

        {/* Speech Text Overlay */}
        {(transcript || finalTranscript) && (
          <div className="absolute top-20 left-4 right-4">
            <Card className="p-4 bg-black/50 backdrop-blur-sm border-white/20">
              <div className="space-y-2">
                {finalTranscript && (
                  <p className="text-white font-medium">
                    已确认：{finalTranscript}
                  </p>
                )}
                {transcript && (
                  <p className="text-white/70 text-sm">
                    正在说：{transcript}
                  </p>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* Bottom Controls */}
        <div className="mt-auto p-6 bg-gradient-to-t from-black/50 to-transparent">
          <div className="flex justify-center">
            <Button
              onClick={handleStopRecording}
              size="lg"
              variant="destructive"
              className="rounded-full h-16 w-16"
              disabled={isGenerating}
            >
              {isGenerating ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <Square className="h-6 w-6" />
              )}
            </Button>
          </div>
          
          {isGenerating && (
            <p className="text-center text-white mt-4">
              正在生成图像，请稍候...
            </p>
          )}
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