import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { VideoRecorder } from './VideoRecorder';
import { ImageEditor } from './ImageEditor';
import VideoCompiler from './VideoCompiler';
import VideoTaskHistory from './VideoTaskHistory';
import VideoTaskResult from './VideoTaskResult';
import { VideoTask } from '@/hooks/useVideoTasks';

type ViewType = 'home' | 'recorder' | 'image-editor' | 'video-compiler' | 'task-history' | 'task-result';

const HomePage: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewType>('home');
  const [selectedTask, setSelectedTask] = useState<VideoTask | null>(null);

  const handleBack = () => {
    setCurrentView('home');
    setSelectedTask(null);
  };

  const handleSelectTask = (task: VideoTask) => {
    setSelectedTask(task);
    setCurrentView('task-result');
  };

  const handleBackToHistory = () => {
    setCurrentView('task-history');
    setSelectedTask(null);
  };

  const handleCreateNewVideo = () => {
    setCurrentView('video-compiler');
    setSelectedTask(null);
  };

  switch (currentView) {
    case 'recorder':
      return <VideoRecorder onBack={handleBack} />;
    case 'image-editor':
      return <ImageEditor onBack={handleBack} />;
    case 'video-compiler':
      return <VideoCompiler onBack={handleBack} selectedTask={selectedTask} />;
    case 'task-history':
      return <VideoTaskHistory onBack={handleBack} onSelectTask={handleSelectTask} />;
    case 'task-result':
      return selectedTask ? (
        <VideoTaskResult 
          task={selectedTask} 
          onBack={handleBackToHistory} 
          onCreateNew={handleCreateNewVideo}
        />
      ) : (
        <VideoTaskHistory onBack={handleBack} onSelectTask={handleSelectTask} />
      );
    default:
      return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background/80 to-primary/5 p-4">
          <div className="container mx-auto max-w-4xl space-y-8">
            <div className="text-center space-y-4">
              <h1 className="text-4xl font-bold tracking-tight">AI 创意工具箱</h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                探索AI的无限可能，从图像编辑到视频生成，打造属于你的创意世界
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setCurrentView('video-compiler')}>
                <CardContent className="p-0 text-center space-y-4">
                  <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                    <span className="text-2xl">🎬</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-2">编译现实</h3>
                    <p className="text-sm text-muted-foreground">录制视频并生成AI续集</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setCurrentView('task-history')}>
                <CardContent className="p-0 text-center space-y-4">
                  <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                    <span className="text-2xl">📋</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-2">任务历史</h3>
                    <p className="text-sm text-muted-foreground">查看过往视频生成记录</p>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setCurrentView('recorder')}>
                <CardContent className="p-0 text-center space-y-4">
                  <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                    <span className="text-2xl">📹</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-2">AI拍照</h3>
                    <p className="text-sm text-muted-foreground">录制视频并生成图像</p>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setCurrentView('image-editor')}>
                <CardContent className="p-0 text-center space-y-4">
                  <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                    <span className="text-2xl">🎨</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-2">图像编辑</h3>
                    <p className="text-sm text-muted-foreground">AI智能图像处理</p>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                由 Flux Kontext Pro 和 Kling AI 提供技术支持
              </p>
            </div>
          </div>
        </div>
      );
  }
};

export default HomePage;