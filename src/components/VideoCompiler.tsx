import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { ArrowLeft, Camera, Play, X, Loader2, Download, CheckCircle, FlipHorizontal, Video } from 'lucide-react';
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
  const [isVideoRecording, setIsVideoRecording] = useState(false);
  const [confirmedTranscript, setConfirmedTranscript] = useState<string>('');
  
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
    finalTranscript,
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

  // Update confirmed transcript when finalTranscript changes
  useEffect(() => {
    if (finalTranscript && finalTranscript.trim().length > 0) {
      setConfirmedTranscript(finalTranscript);
      console.log('Confirmed transcript updated:', finalTranscript);
    }
  }, [finalTranscript]);

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
    if (viewState !== 'recording') {
      setViewState('recording');
      resetTranscript();
      setConfirmedTranscript('');
      await startCamera();
      await startListening();
      return;
    }
    
    // Start actual recording when in recording view
    if (stream && !mediaRecorderRef.current) {
      recordedChunksRef.current = [];
      
      // Try to use mp4 codec if available, fallback to webm
      const options = { mimeType: 'video/mp4' };
      let mediaRecorder;
      
      try {
        mediaRecorder = new MediaRecorder(stream, options);
      } catch (e) {
        // Fallback to webm if mp4 not supported
        mediaRecorder = new MediaRecorder(stream);
      }
      
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/mp4' });
        setRecordedBlob(blob);
        const url = URL.createObjectURL(blob);
        setRecordedVideoUrl(url);
        
        // Stop speech recognition first
        stopListening();
        
        // Direct check and proceed - remove the problematic dialog check
        // The actual compilation logic will handle the transcript validation
        console.log('Recording stopped, proceeding to processing');
        setViewState('processing');
      };
      
      mediaRecorderRef.current.start();
      setIsVideoRecording(true);
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
      setIsVideoRecording(false);
    }
  };

  const handleCompileVideo = useCallback(async () => {
    const currentTranscript = confirmedTranscript || finalTranscript;
    
    if (!recordedBlob || !currentTranscript) {
      toast.error('录制视频或语音指令缺失');
      return;
    }

    try {
      console.log('Starting video compilation with transcript:', currentTranscript);
      await compileVideo(recordedBlob, currentTranscript);
    } catch (error) {
      console.error('Video compilation failed:', error);
      if (error instanceof Error && error.message.includes('Request Moderated')) {
        setShowModerationDialog(true);
      }
    }
  }, [recordedBlob, confirmedTranscript, finalTranscript, compileVideo]);

  const handleReset = () => {
    // Clear any running timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    setViewState('home');
    setRecordedBlob(null);
    setConfirmedTranscript('');
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
    setConfirmedTranscript('');
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
    setConfirmedTranscript('');
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
    const currentTranscript = confirmedTranscript || finalTranscript;
    
    if (viewState === 'processing' && recordedBlob && !isProcessing && !result) {
      // Check if we have meaningful speech input before compilation
      if (!currentTranscript || currentTranscript.trim().length < 3) {
        console.log('No valid transcript found in processing, showing dialog');
        setShowNoSpeechDialog(true);
        setViewState('home');
        return;
      }
      
      console.log('Auto-triggering compilation with transcript:', currentTranscript);
      compileVideo(recordedBlob, currentTranscript);
    }
  }, [viewState, recordedBlob, confirmedTranscript, finalTranscript, isProcessing, result, compileVideo]);

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
      <div className="min-h-screen bg-background flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-background/95 backdrop-blur-sm border-b">
          <Button variant="ghost" onClick={handleCancelRecording} className="flex items-center gap-2">
            <X className="h-4 w-4" />
            取消
          </Button>
          <h1 className="text-lg font-medium">编译现实</h1>
          <div className="w-16" />
        </div>
        
        {/* Camera View - 1:1 Aspect Ratio at Top */}
        <div className="p-4">
          <div className="relative w-full max-w-sm mx-auto aspect-square bg-black rounded-2xl overflow-hidden shadow-2xl">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
            />
            
            {/* Recording Indicator */}
            {isVideoRecording && (
              <div className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm flex items-center gap-2 shadow-lg">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                录制中
              </div>
            )}
            
            {/* Voice Command Overlay - show confirmed and current transcript */}
            {(confirmedTranscript || finalTranscript || transcript) && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4">
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                  <div className="space-y-2">
                    {(confirmedTranscript || finalTranscript) && (
                      <p className="text-white text-sm leading-relaxed font-medium">
                        确认: {confirmedTranscript || finalTranscript}
                      </p>
                    )}
                    {transcript && (
                      <p className="text-white/70 text-xs leading-relaxed">
                        正在说: {transcript}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Controls - 32px below camera */}
        <div className="px-4" style={{ marginTop: '32px' }}>
          <div className="flex items-center justify-center max-w-sm mx-auto relative">
            {/* Record Button - Center */}
            <div className="relative">
              <div 
                className={`w-20 h-20 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform cursor-pointer select-none ${
                  isVideoRecording ? 'bg-red-500' : 'bg-purple-500'
                }`}
                onMouseDown={handleStartRecording}
                onMouseUp={handleStopRecording}
                onMouseLeave={handleStopRecording}
                onTouchStart={handleStartRecording}
                onTouchEnd={handleStopRecording}
              >
                <Video className="h-8 w-8 text-white" />
              </div>
            </div>
            
            {/* Camera Switch Button - Absolute positioned to the right */}
            <Button 
              onClick={switchCamera} 
              variant="outline" 
              size="icon"
              className="w-12 h-12 rounded-full bg-gray-700 border-gray-600 hover:bg-gray-600 absolute right-0"
            >
              <FlipHorizontal className="h-5 w-5 text-white" />
            </Button>
          </div>
          
          <p className="text-center text-sm text-muted-foreground mt-2">
            按住录制
          </p>
        </div>
        
        {/* Error Display */}
        {(cameraError || speechError) && (
          <div className="p-4">
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 max-w-sm mx-auto">
              <p className="text-destructive text-sm text-center">
                {cameraError || speechError}
              </p>
            </div>
          </div>
        )}
        
        {/* Spacer to push content up */}
        <div className="flex-1" />
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
                  <p><strong>语音指令：</strong> {confirmedTranscript || finalTranscript}</p>
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
