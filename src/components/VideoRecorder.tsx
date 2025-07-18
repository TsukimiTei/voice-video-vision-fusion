import { useState } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Camera, Square, Mic, MicOff, Loader2, ArrowLeft, RotateCcw } from 'lucide-react';
import { useCamera } from '../hooks/useCamera';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useImageGeneration } from '../hooks/useImageGeneration';
import { useTranslation } from '../hooks/useTranslation';
import { captureVideoFrame } from '../utils/videoUtils';
import { toast } from 'sonner';

type ViewState = 'home' | 'recording' | 'result';

interface VideoRecorderProps {
  onBack?: () => void;
}

export const VideoRecorder = ({ onBack }: VideoRecorderProps = {}) => {
  const [viewState, setViewState] = useState<ViewState>('home');
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
  const { generateImage, isGenerating, result, error: imageError, statusLog } = useImageGeneration();
  const { translateToEnglish, isTranslating } = useTranslation();

  const handleStartRecording = async () => {
    setViewState('recording');
    await startCamera();
    startListening();
    resetTranscript();
  };

  const handleStopRecording = async () => {
    stopListening();
    
    if (videoRef.current) {
      const frameBase64 = captureVideoFrame(videoRef.current);
      if (frameBase64 && finalTranscript) {
        try {
          toast.success('正在翻译指令...');
          const englishPrompt = await translateToEnglish(finalTranscript);
          
          toast.success('正在生成图像...');
          await generateImage(frameBase64, englishPrompt);
          setViewState('result');
        } catch (error) {
          console.error('Translation or generation error:', error);
          toast.error('处理失败，请重试');
          setViewState('home');
        }
      } else if (!finalTranscript) {
        toast.error('未检测到语音指令');
        setViewState('home');
      } else {
        toast.error('无法截取视频帧');
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
                返回首页
              </Button>
            </div>
          )}
          
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
              返回
            </Button>
            
            <h2 className="text-xl font-bold text-foreground">生成结果</h2>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleTryAgain}
              className="flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              重新录制
            </Button>
          </div>

          {result ? (
            <div className="space-y-4">
              <div className="relative">
                <img 
                  src={result.imageUrl} 
                  alt="AI生成的图像" 
                  className="w-full rounded-lg border shadow-lg"
                />
              </div>
              
              <Card className="p-4 bg-muted/50">
                <h3 className="font-semibold mb-2">语音指令：</h3>
                <p className="text-muted-foreground">"{result.prompt}"</p>
              </Card>
              
              <div className="flex gap-3">
                <Button 
                  onClick={handleTryAgain}
                  variant="outline" 
                  className="flex-1"
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  重新录制
                </Button>
                
                <Button 
                  onClick={handleBackToHome}
                  className="flex-1"
                >
                  完成
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center space-y-4">
                <Loader2 className="h-12 w-12 animate-spin mx-auto text-muted-foreground" />
                <p className="text-muted-foreground">正在生成图像，请稍候...</p>
              </div>
              
              {/* API 调用明细 */}
              {statusLog.length > 0 && (
                <Card className="p-4 bg-muted/30">
                  <h3 className="font-semibold mb-3 text-sm">API 调用明细：</h3>
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
                  <h3 className="font-semibold mb-2 text-destructive">错误详情：</h3>
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
              disabled={isGenerating || isTranslating}
            >
              {isGenerating || isTranslating ? (
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