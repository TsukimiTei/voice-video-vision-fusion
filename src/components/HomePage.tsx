import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { VideoRecorder } from './VideoRecorder';
import { ImageEditor } from './ImageEditor';
import { JWTTester } from './JWTTester';
import VideoCompiler from './VideoCompiler';
import VideoTaskHistory from './VideoTaskHistory';
import { VideoTask } from '@/hooks/useVideoTasks';

type ViewType = 'home' | 'recorder' | 'image-editor' | 'jwt-tester' | 'video-compiler' | 'task-history';

const HomePage: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewType>('home');
  const [selectedTask, setSelectedTask] = useState<VideoTask | null>(null);

  const handleBack = () => {
    setCurrentView('home');
    setSelectedTask(null);
  };

  const handleSelectTask = (task: VideoTask) => {
    setSelectedTask(task);
    setCurrentView('video-compiler');
  };

  switch (currentView) {
    case 'recorder':
      return <VideoRecorder onBack={handleBack} />;
    case 'image-editor':
      return <ImageEditor onBack={handleBack} />;
    case 'jwt-tester':
      return <JWTTester />;
    case 'video-compiler':
      return <VideoCompiler onBack={handleBack} selectedTask={selectedTask} />;
    case 'task-history':
      return <VideoTaskHistory onBack={handleBack} onSelectTask={handleSelectTask} />;
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
            
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl text-center">选择功能</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* 主要功能 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button 
                    onClick={() => setCurrentView('video-compiler')}
                    className="h-32 text-left"
                    variant="outline"
                  >
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold">视频编译器</h3>
                      <p className="text-sm text-muted-foreground">录制视频并生成AI续集</p>
                    </div>
                  </Button>
                  
                  <Button 
                    onClick={() => setCurrentView('task-history')}
                    className="h-32 text-left"
                    variant="outline"
                  >
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold">任务历史</h3>
                      <p className="text-sm text-muted-foreground">查看过往视频生成记录</p>
                    </div>
                  </Button>
                </div>
                
                {/* 其他工具 */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button 
                    onClick={() => setCurrentView('recorder')}
                    className="h-24 text-left"
                    variant="outline"
                  >
                    <div className="space-y-1">
                      <h4 className="font-semibold">视频录制</h4>
                      <p className="text-xs text-muted-foreground">录制并生成图像</p>
                    </div>
                  </Button>
                  
                  <Button 
                    onClick={() => setCurrentView('image-editor')}
                    className="h-24 text-left"
                    variant="outline"
                  >
                    <div className="space-y-1">
                      <h4 className="font-semibold">图像编辑</h4>
                      <p className="text-xs text-muted-foreground">AI智能图像处理</p>
                    </div>
                  </Button>
                  
                  <Button 
                    onClick={() => setCurrentView('jwt-tester')}
                    className="h-24 text-left"
                    variant="outline"
                  >
                    <div className="space-y-1">
                      <h4 className="font-semibold">JWT 测试</h4>
                      <p className="text-xs text-muted-foreground">API认证测试</p>
                    </div>
                  </Button>
                </div>
              </CardContent>
            </Card>
            
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