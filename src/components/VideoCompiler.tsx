import { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { ArrowLeft, Camera, Play, X, Loader2, Download, CheckCircle } from 'lucide-react';
import { useCamera } from '../hooks/useCamera';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useVideoCompiler } from '../hooks/useVideoCompiler';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { toast } from 'sonner';

interface VideoCompilerProps {
  onBack: () => void;
}

type ViewState = 'home' | 'recording' | 'processing' | 'result';

export const VideoCompiler = ({ onBack }: VideoCompilerProps) => {
  const [viewState, setViewState] = useState<ViewState>('home');
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
  const [showNoSpeechDialog, setShowNoSpeechDialog] = useState(false);
  const [showTimeoutDialog, setShowTimeoutDialog] = useState(false);
  const [showModerationDialog, setShowModerationDialog] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const { 
    isRecording: isCameraRecording, 
    stream, 
    error: cameraError, 
    videoRef, 
    startCamera, 
    stopCamera, 
    switchCamera, 
    facingMode 
  } = useCamera();
  
  const { 
    isListening, 
    transcript, 
    resetTranscript, 
    startListening, 
    stopListening, 
    error: speechError 
  } = useSpeechRecognition();
  
  const {
    compileVideo,
    isProcessing,
    result,
    error: compilerError,
    statusLog,
    progress
  } = useVideoCompiler();

  // Monitor processing state and set timeout for unresponsive generation
  useEffect(() => {
    if (isProcessing) {
      console.log('Video compilation started, setting timeout...');
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      // Set new timeout for 30 seconds (video processing might take longer)
      timeoutRef.current = setTimeout(() => {
        console.log('Timeout triggered, isProcessing:', isProcessing);
        if (isProcessing) {
          setShowTimeoutDialog(true);
        }
      }, 30000);
    } else {
      console.log('Video compilation stopped, clearing timeout...');
      // Clear timeout when processing completes or state changes
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isProcessing]);

  const handleStartRecording = async () => {
    setViewState('recording');
    resetTranscript();
    await startCamera();
    await startListening();
    
    if (stream) {
      recordedChunksRef.current = [];
      mediaRecorderRef.current = new MediaRecorder(stream);
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        setRecordedBlob(blob);
        const url = URL.createObjectURL(blob);
        setRecordedVideoUrl(url);
      };
      
      mediaRecorderRef.current.start();
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    stopCamera();
    stopListening();
    
    // Check if we have meaningful speech input
    if (!transcript || transcript.trim().length < 3) {
      setShowNoSpeechDialog(true);
      return;
    }
    
    setViewState('processing');
  };

  const handleCompileVideo = async () => {
    if (!recordedBlob || !transcript) {
      toast.error('录制视频或语音指令缺失');
      return;
    }

    try {
      await compileVideo(recordedBlob, transcript);
    } catch (error) {
      console.error('Video compilation failed:', error);
      if (error instanceof Error && error.message.includes('Request Moderated')) {
        setShowModerationDialog(true);
      }
    }
  };

  const handleReset = () => {
    // Clear any running timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    setViewState('home');
    setRecordedBlob(null);
    if (recordedVideoUrl) {
      URL.revokeObjectURL(recordedVideoUrl);
      setRecordedVideoUrl(null);
    }
    resetTranscript();
    stopCamera();
  };

  const handleCancelProcessing = () => {
    // Clear any running timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    setViewState('home');
    resetTranscript();
    toast.success('编译已取消');
  };

  const handleCancelRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    stopCamera();
    stopListening();
    setViewState('home');
    resetTranscript();
  };

  const handleDownloadResult = () => {
    if (result?.videoUrl) {
      const a = document.createElement('a');
      a.href = result.videoUrl;
      a.download = `compiled-video-${Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success('视频下载开始');
    }
  };

  // Auto-trigger compilation when we have both video and transcript
  useEffect(() => {
    if (viewState === 'processing' && recordedBlob && transcript && !isProcessing && !result) {
      handleCompileVideo();
    }
  }, [viewState, recordedBlob, transcript, isProcessing, result]);

  if (viewState === 'home') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="p-8 max-w-2xl w-full text-center space-y-8">
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={onBack} className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              返回
            </Button>
            <h1 className="text-2xl font-bold">编译现实</h1>
            <div className="w-20" />
          </div>
          
          <div className="space-y-4">
            <div className="mx-auto w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center">
              <Camera className="h-12 w-12 text-primary" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold">开始录制视频</h2>
              <p className="text-muted-foreground">
                录制视频并说出延续指令，AI将基于视频尾帧生成延续视频并与原视频合并
              </p>
            </div>
          </div>
          
          <Button size="lg" onClick={handleStartRecording} className="w-full max-w-sm">
            <Camera className="mr-2 h-5 w-5" />
            开始录制
          </Button>
        </Card>
      </div>
    );
  }

  if (viewState === 'recording') {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={handleCancelRecording} className="flex items-center gap-2">
              <X className="h-4 w-4" />
              取消
            </Button>
            <h1 className="text-xl font-bold">录制中</h1>
            <Button onClick={switchCamera} variant="outline" size="sm">
              {facingMode === 'user' ? '后置' : '前置'}
            </Button>
          </div>
          
          <div className="grid lg:grid-cols-2 gap-6">
            {/* 视频预览 */}
            <Card className="p-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">视频预览</h3>
                <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  {isCameraRecording && (
                    <div className="absolute top-4 right-4 bg-red-500 text-white px-2 py-1 rounded-full text-sm flex items-center gap-1">
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                      录制中
                    </div>
                  )}
                </div>
              </div>
            </Card>
            
            {/* 语音识别 */}
            <Card className="p-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">语音指令</h3>
                <div className="min-h-32 p-4 bg-muted rounded-lg">
                  {isListening && (
                    <div className="flex items-center gap-2 text-primary mb-2">
                      <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                      听取中...
                    </div>
                  )}
                  <p className="text-foreground">
                    {transcript || '请说出您希望AI如何延续视频的指令...'}
                  </p>
                </div>
                {speechError && (
                  <p className="text-destructive text-sm">{speechError}</p>
                )}
              </div>
            </Card>
          </div>
          
          <div className="text-center">
            <Button size="lg" onClick={handleStopRecording} className="px-8">
              <CheckCircle className="mr-2 h-5 w-5" />
              完成录制
            </Button>
          </div>
          
          {cameraError && (
            <div className="text-center">
              <p className="text-destructive">{cameraError}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (viewState === 'processing' || viewState === 'result') {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={handleReset} className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              重新开始
            </Button>
            <h1 className="text-xl font-bold">编译结果</h1>
            <div className="w-20" />
          </div>
          
          <div className="grid lg:grid-cols-2 gap-6">
            {/* 原始视频 */}
            <Card className="p-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">原始视频</h3>
                <div className="bg-black rounded-lg overflow-hidden aspect-video">
                  {recordedVideoUrl && (
                    <video
                      src={recordedVideoUrl}
                      controls
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <div className="text-sm text-muted-foreground">
                  <p><strong>语音指令：</strong> {transcript}</p>
                </div>
              </div>
            </Card>
            
            {/* 处理状态或结果 */}
            <Card className="p-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">
                  {result ? '编译完成' : '编译状态'}
                </h3>
                
                {!result && isProcessing && (
                  <div className="text-center space-y-4">
                    <Loader2 className="h-12 w-12 animate-spin mx-auto text-muted-foreground" />
                    <div className="space-y-2">
                      <p className="text-muted-foreground">
                        {progress?.stage === 'video_generation' && '视频生成中...'}
                        {progress?.stage === 'video_merging' && '视频拼接中...'}
                        {progress?.stage === 'processing' && '处理中...'}
                        {!progress?.stage && '准备中...'}
                      </p>
                      {progress?.progress && (
                        <div className="w-full bg-muted rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full transition-all duration-300" 
                            style={{ width: `${progress.progress}%` }}
                          />
                        </div>
                      )}
                    </div>
                    
                    {/* Cancel Processing Button */}
                    <Button 
                      variant="outline" 
                      onClick={handleCancelProcessing}
                      className="mt-4"
                    >
                      <X className="mr-2 h-4 w-4" />
                      取消编译
                    </Button>
                  </div>
                )}
                
                {result && (
                  <div className="space-y-4">
                    <div className="bg-black rounded-lg overflow-hidden aspect-video">
                      <video
                        src={result.videoUrl}
                        controls
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <Button onClick={handleDownloadResult} className="w-full">
                      <Download className="mr-2 h-4 w-4" />
                      下载合并视频
                    </Button>
                  </div>
                )}
                
                {compilerError && (
                  <div className="text-center text-destructive">
                    <p>编译失败: {compilerError}</p>
                  </div>
                )}
              </div>
            </Card>
          </div>
          
          {/* 处理日志 */}
          {statusLog.length > 0 && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">处理日志</h3>
              <div className="bg-muted p-4 rounded-lg max-h-40 overflow-y-auto">
                <div className="space-y-1 text-sm">
                  {statusLog.map((log, index) => (
                    <div key={index} className="text-muted-foreground font-mono">
                      {log}
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}
        </div>
        
        {/* 无语音指令对话框 */}
        <AlertDialog open={showNoSpeechDialog} onOpenChange={setShowNoSpeechDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>未检测到语音指令</AlertDialogTitle>
              <AlertDialogDescription>
                请重新录制并说出您希望AI如何延续视频的指令。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction onClick={() => {
                setShowNoSpeechDialog(false);
                handleReset();
              }}>
                重新录制
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        
        {/* 处理超时对话框 */}
        <AlertDialog open={showTimeoutDialog} onOpenChange={setShowTimeoutDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>编译无响应</AlertDialogTitle>
              <AlertDialogDescription>
                视频编译时间过长，请重新录制并尝试。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction onClick={() => {
                setShowTimeoutDialog(false);
                handleReset();
              }}>
                重新录制
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        
        {/* NSFW内容对话框 */}
        <AlertDialog open={showModerationDialog} onOpenChange={setShowModerationDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>内容被拦截</AlertDialogTitle>
              <AlertDialogDescription>
                当前生成的内容被NSFW检测拦截，请重新录制使用不同的描述。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction onClick={() => {
                setShowModerationDialog(false);
                handleReset();
              }}>
                重新录制
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  return null;
};