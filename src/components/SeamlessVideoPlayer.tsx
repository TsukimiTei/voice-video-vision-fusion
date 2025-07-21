import React, { useRef, useEffect, useState } from 'react';
import { Button } from './ui/button';
import { Play, Pause, RotateCcw } from 'lucide-react';

interface SeamlessVideoPlayerProps {
  originalVideoUrl?: string;
  generatedVideoUrl?: string;
  className?: string;
}

const SeamlessVideoPlayer: React.FC<SeamlessVideoPlayerProps> = ({
  originalVideoUrl,
  generatedVideoUrl,
  className = ''
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaSourceRef = useRef<MediaSource | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPhase, setCurrentPhase] = useState<'original' | 'generated' | 'none'>('none');

  const fetchVideoAsArrayBuffer = async (url: string): Promise<ArrayBuffer> => {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch video: ${response.status}`);
    }
    return response.arrayBuffer();
  };

  const initializeSeamlessPlayback = async () => {
    if (!originalVideoUrl || !generatedVideoUrl || !videoRef.current) return;

    try {
      setIsLoading(true);
      setError(null);

      // Check if MediaSource is supported
      if (!('MediaSource' in window)) {
        throw new Error('Media Source Extensions not supported');
      }

      const mediaSource = new MediaSource();
      mediaSourceRef.current = mediaSource;
      videoRef.current.src = URL.createObjectURL(mediaSource);

      await new Promise<void>((resolve, reject) => {
        mediaSource.addEventListener('sourceopen', () => resolve());
        mediaSource.addEventListener('error', reject);
      });

      // For simplicity, we'll use a different approach:
      // Create a playlist of videos that auto-advance
      setupSequentialPlayback();

    } catch (err) {
      console.error('Error initializing seamless playback:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize seamless playback');
    } finally {
      setIsLoading(false);
    }
  };

  const setupSequentialPlayback = () => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    
    // Remove all existing event listeners
    const cleanupListeners = () => {
      video.removeEventListener('ended', handleOriginalVideoEnd);
      video.removeEventListener('ended', handleGeneratedVideoEnd);
    };
    
    const handleOriginalVideoEnd = () => {
      if (generatedVideoUrl && currentPhase === 'original') {
        cleanupListeners();
        video.src = generatedVideoUrl;
        setCurrentPhase('generated');
        video.addEventListener('ended', handleGeneratedVideoEnd, { once: true });
        video.play().catch(console.error);
      }
    };

    const handleGeneratedVideoEnd = () => {
      if (currentPhase === 'generated') {
        cleanupListeners();
        setCurrentPhase('none');
        setIsPlaying(false);
      }
    };

    cleanupListeners(); // Clean up any existing listeners
    
    if (currentPhase === 'original') {
      video.addEventListener('ended', handleOriginalVideoEnd, { once: true });
    } else if (currentPhase === 'generated') {
      video.addEventListener('ended', handleGeneratedVideoEnd, { once: true });
    }
  };

  const handlePlay = async () => {
    if (!videoRef.current) return;

    try {
      if (currentPhase === 'none') {
        // Reset to beginning
        setCurrentPhase('original');
        videoRef.current.src = originalVideoUrl || '';
        setupSequentialPlayback();
      }
      
      await videoRef.current.play();
      setIsPlaying(true);
    } catch (err) {
      console.error('Error playing video:', err);
      setError('Failed to play video');
    }
  };

  const handlePause = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleRestart = () => {
    if (!videoRef.current || !originalVideoUrl) return;

    videoRef.current.pause();
    videoRef.current.src = originalVideoUrl;
    videoRef.current.currentTime = 0;
    setCurrentPhase('original');
    setIsPlaying(false);
    setupSequentialPlayback();
  };

  useEffect(() => {
    setupSequentialPlayback();
  }, [currentPhase, originalVideoUrl, generatedVideoUrl]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
    };
  }, []);

  if (!originalVideoUrl && !generatedVideoUrl) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="flex items-center justify-center p-8 bg-muted rounded-lg">
          <div className="text-center space-y-2">
            <p className="text-muted-foreground">无法加载无缝播放功能</p>
            <p className="text-sm text-muted-foreground">
              原始视频URL: {originalVideoUrl ? '✓' : '✗'} | 
              生成视频URL: {generatedVideoUrl ? '✓' : '✗'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="relative">
        <video
          ref={videoRef}
          className="w-full rounded-lg shadow-lg"
          controls={false}
          playsInline
        />
        
        {/* Video phase indicator */}
        <div className="absolute top-2 left-2 px-3 py-1 bg-black/70 text-white text-sm rounded-md">
          {currentPhase === 'original' && '原始视频'}
          {currentPhase === 'generated' && '生成视频'}
          {currentPhase === 'none' && '准备播放'}
        </div>

        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        )}
      </div>

      {/* Custom controls */}
      <div className="flex items-center justify-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={isPlaying ? handlePause : handlePlay}
          disabled={isLoading}
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          {isPlaying ? '暂停' : '播放'}
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={handleRestart}
          disabled={isLoading}
        >
          <RotateCcw className="h-4 w-4" />
          重新播放
        </Button>
      </div>

      {/* Error display */}
      {error && (
        <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md">
          {error}
        </div>
      )}

      {/* Fallback: Show individual videos if seamless fails */}
      {error && (originalVideoUrl || generatedVideoUrl) && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">切换到单独播放模式:</p>
          
          {originalVideoUrl && (
            <div>
              <h4 className="text-sm font-medium mb-2">原始视频</h4>
              <video src={originalVideoUrl} controls className="w-full rounded-lg" />
            </div>
          )}
          
          {generatedVideoUrl && (
            <div>
              <h4 className="text-sm font-medium mb-2">生成视频</h4>
              <video src={generatedVideoUrl} controls className="w-full rounded-lg" />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SeamlessVideoPlayer;