import React, { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Camera, Square } from 'lucide-react';
import { toast } from 'sonner';

interface CameraInterfaceProps {
  onGenerateImage: (imageData: string, command: string) => void;
}

export const CameraInterface: React.FC<CameraInterfaceProps> = ({ onGenerateImage }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<any>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [isRecording, setIsRecording] = useState(false);
  const [speechText, setSpeechText] = useState('');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);

  useEffect(() => {
    // 检查浏览器支持
    if (!navigator.mediaDevices || (!window.SpeechRecognition && !window.webkitSpeechRecognition)) {
      toast.error('您的浏览器不支持摄像头或语音识别功能');
      return;
    }

    // 初始化语音识别
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
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
        console.error('语音识别错误:', event.error);
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: true
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setStream(mediaStream);
      toast.success('摄像头已启动');
    } catch (error) {
      console.error('启动摄像头失败:', error);
      toast.error('无法访问摄像头，请检查权限设置');
    }
  };

  const startRecording = () => {
    if (!stream) return;

    try {
      const mediaRecorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        setRecordedChunks(chunks);
        await captureLastFrame();
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);

      // 开始语音识别
      if (recognitionRef.current) {
        recognitionRef.current.start();
      }

      toast.success('开始录制');
    } catch (error) {
      console.error('录制失败:', error);
      toast.error('录制失败');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      // 停止语音识别
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }

      toast.success('录制已停止');
    }
  };

  const captureLastFrame = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;

    try {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);
      
      // 使用更兼容的方法生成图像数据
      const imageBlob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Canvas toBlob failed'));
          }
        }, 'image/jpeg', 0.8);
      });
      
      console.log('成功创建Blob，大小:', imageBlob.size);
      
      // 转换为base64 - 添加错误处理
      const imageData = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = () => {
          const result = reader.result as string;
          if (result && result.length > 0) {
            console.log('FileReader成功，数据长度:', result.length);
            console.log('数据开头:', result.substring(0, 50));
            resolve(result);
          } else {
            reject(new Error('FileReader返回空数据'));
          }
        };
        
        reader.onerror = () => {
          reject(new Error('FileReader读取失败'));
        };
        
        try {
          reader.readAsDataURL(imageBlob);
        } catch (e) {
          reject(new Error('FileReader启动失败: ' + e.message));
        }
      });
      
      console.log('成功生成图像数据，大小:', imageData.length);
      
      // 总是进入下一步，即使没有语音输入
      onGenerateImage(imageData, speechText || '');
      if (!speechText) {
        toast.info('未检测到语音命令，请在下一步手动输入提示词');
      }
      
    } catch (error) {
      console.error('图像捕获失败:', error);
      toast.error('图像捕获失败，请重试');
    }
  };

  return (
    <div className="relative w-full h-screen bg-background overflow-hidden">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover"
      />
      
      <canvas ref={canvasRef} className="hidden" />
      
      {/* 控制界面覆盖层 */}
      <div className="absolute inset-0 flex flex-col justify-between p-6 bg-black/20">
        {/* 顶部：语音识别文字显示 */}
        {speechText && (
          <Card className="self-center bg-black/80 text-white border-none backdrop-blur-sm">
            <div className="p-4 text-center">
              <p className="text-lg font-medium">{speechText}</p>
            </div>
          </Card>
        )}

        {/* 底部：录制控制 */}
        <div className="flex items-center justify-center gap-6">
          {!stream ? (
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
          <div className="absolute top-6 left-6 flex items-center gap-2 bg-red-500/90 text-white px-3 py-1 rounded-full">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            <span className="text-sm font-medium">录制中</span>
          </div>
        )}
      </div>
    </div>
  );
};

// 添加 SpeechRecognition 类型声明
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}