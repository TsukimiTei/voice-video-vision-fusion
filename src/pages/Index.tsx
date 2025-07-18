import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Camera, Sparkles } from 'lucide-react';
import { CameraInterface } from '@/components/CameraInterface';
import { ImageGenerator } from '@/components/ImageGenerator';
import { ResultDisplay } from '@/components/ResultDisplay';
import { toast } from 'sonner';

type AppState = 'home' | 'camera' | 'generate' | 'result';

const Index = () => {
  const [currentState, setCurrentState] = useState<AppState>('home');
  const [capturedImage, setCapturedImage] = useState<string>('');
  const [speechCommand, setSpeechCommand] = useState<string>('');
  const [generatedImage, setGeneratedImage] = useState<string>('');

  const handleStartCamera = () => {
    setCurrentState('camera');
  };

  const handleImageCapture = (imageData: string, command: string) => {
    setCapturedImage(imageData);
    setSpeechCommand(command);
    setCurrentState('generate');
  };

  const handleImageGenerated = (resultImage: string) => {
    setGeneratedImage(resultImage);
    setCurrentState('result');
  };

  const handleBackToHome = () => {
    setCurrentState('home');
    setCapturedImage('');
    setSpeechCommand('');
    setGeneratedImage('');
  };

  // 主页面
  if (currentState === 'home') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
        {/* 背景装饰 */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
        <div className="absolute top-20 left-20 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
        
        <Card className="relative z-10 p-8 bg-card/50 backdrop-blur-xl border-border/50 max-w-md w-full mx-6">
          <div className="text-center space-y-6">
            <div className="mx-auto w-20 h-20 bg-gradient-to-r from-primary to-primary-glow rounded-full flex items-center justify-center shadow-glow">
              <Camera className="w-10 h-10 text-primary-foreground" />
            </div>
            
            <div className="space-y-2">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
                AI 语音摄像
              </h1>
              <p className="text-muted-foreground">
                录制视频，说出创意，让 AI 为您生成全新的艺术作品
              </p>
            </div>

            <div className="space-y-4 text-left">
              <div className="flex items-center gap-3 text-sm">
                <div className="w-2 h-2 bg-primary rounded-full" />
                <span>语音识别实时转文字</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="w-2 h-2 bg-accent rounded-full" />
                <span>智能截取视频最后一帧</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="w-2 h-2 bg-primary-glow rounded-full" />
                <span>AI 图像生成与创作</span>
              </div>
            </div>

            <Button
              onClick={handleStartCamera}
              size="lg"
              className="w-full bg-gradient-to-r from-primary to-primary-glow hover:shadow-glow transition-all duration-300 text-lg py-6"
            >
              <Camera className="w-6 h-6 mr-3" />
              开始创作
            </Button>

            <p className="text-xs text-muted-foreground">
              需要摄像头和麦克风权限
            </p>
          </div>
        </Card>
      </div>
    );
  }

  // 摄像界面
  if (currentState === 'camera') {
    return <CameraInterface onGenerateImage={handleImageCapture} />;
  }

  // 图像生成界面
  if (currentState === 'generate') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <ImageGenerator
          sourceImage={capturedImage}
          command={speechCommand}
          onResult={handleImageGenerated}
        />
      </div>
    );
  }

  // 结果展示界面
  if (currentState === 'result') {
    return (
      <ResultDisplay
        originalImage={capturedImage}
        generatedImage={generatedImage}
        command={speechCommand}
        onBack={handleBackToHome}
      />
    );
  }

  return null;
};

export default Index;
