import React, { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Camera, Square, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { captureFromVideo } from '@/utils/imageUtils';

interface CameraCaptureProps {
  onCapture: (imageData: string, command: string) => void;
  onBack: () => void;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onBack }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<any>(null);
  
  const [isRecording, setIsRecording] = useState(false);
  const [speechText, setSpeechText] = useState('');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);

  useEffect(() => {
    initializeSpeechRecognition();
    return cleanup;
  }, []);

  const initializeSpeechRecognition = () => {
    if (!window.SpeechRecognition && !window.webkitSpeechRecognition) {
      console.warn('Speech recognition not supported');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'zh-CN';
    
    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }
      if (finalTranscript) {
        setSpeechText(finalTranscript);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
    };

    recognitionRef.current = recognition;
  };

  const cleanup = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: true
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.onloadedmetadata = () => {
          setIsCameraReady(true);
        };
      }
      
      setStream(mediaStream);
      toast.success('摄像头已启动');
    } catch (error) {
      console.error('Camera access failed:', error);
      toast.error('无法访问摄像头，请检查权限设置');
    }
  };

  const startRecording = () => {
    if (!stream || !isCameraReady) return;

    try {
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.start();
      setIsRecording(true);

      // 开始语音识别
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (e) {
          console.warn('Speech recognition start failed:', e);
        }
      }

      toast.success('开始录制');
    } catch (error) {
      console.error('Recording failed:', error);
      toast.error('录制失败');
    }
  };

  const stopRecording = async () => {
    if (!mediaRecorderRef.current || !isRecording || !videoRef.current) return;

    try {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      // 停止语音识别
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.warn('Speech recognition stop failed:', e);
        }
      }

      // 捕获当前帧
      const imageData = await captureFromVideo(videoRef.current);
      
      console.log('Image captured successfully, size:', imageData.length);
      
      onCapture(imageData, speechText || '');
      
      if (!speechText) {
        toast.info('未检测到语音命令，请在下一步手动输入提示词');
      }

    } catch (error) {
      console.error('Stop recording failed:', error);
      toast.error('停止录制失败，请重试');
    }
  };

  return (
    <div className="relative w-full h-screen bg-background overflow-hidden">
      {/* 返回按钮 */}
      <div className="absolute top-6 left-6 z-20">
        <Button
          onClick={onBack}
          variant="ghost"
          size="icon"
          className="bg-black/50 text-white hover:bg-black/70 rounded-full"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
      </div>

      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover"
      />
      
      {/* 控制界面覆盖层 */}
      <div className="absolute inset-0 flex flex-col justify-between p-6 bg-black/20">
        {/* 顶部：语音识别文字显示 */}
        {speechText && (
          <Card className="self-center bg-black/80 text-white border-none backdrop-blur-sm mt-16">
            <div className="p-4 text-center">
              <p className="text-lg font-medium">{speechText}</p>
            </div>
          </Card>
        )}

        {/* 底部：录制控制 */}
        <div className="flex items-center justify-center gap-6">
          {!isCameraReady ? (
            <Button
              onClick={startCamera}
              size="lg"
              className="rounded-full w-20 h-20 bg-gradient-to-r from-primary to-primary-glow hover:shadow-glow transition-all duration-300"
            >
              <Camera className="w-8 h-8" />
            </Button>
          ) : (
            <Button
              onClick={isRecording ? stopRecording : startRecording}
              size="lg"
              className={`rounded-full w-20 h-20 transition-all duration-300 ${
                isRecording 
                  ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
                  : 'bg-gradient-to-r from-primary to-primary-glow hover:shadow-glow'
              }`}
            >
              {isRecording ? (
                <Square className="w-8 h-8" />
              ) : (
                <div className="w-6 h-6 bg-white rounded-full" />
              )}
            </Button>
          )}
        </div>

        {/* 录制状态指示 */}
        {isRecording && (
          <div className="absolute top-6 right-6 flex items-center gap-2 bg-red-500/90 text-white px-3 py-1 rounded-full">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            <span className="text-sm font-medium">录制中</span>
          </div>
        )}
      </div>
    </div>
  );
};

// 声明全局类型
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}