import React from 'react';
import { ArrowLeft, Download, RotateCcw } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { VideoTask } from '../hooks/useVideoTasks';

interface VideoTaskResultProps {
  task: VideoTask;
  onBack: () => void;
  onCreateNew: () => void;
}

const VideoTaskResult: React.FC<VideoTaskResultProps> = ({ task, onBack, onCreateNew }) => {
  const handleDownloadVideo = () => {
    if (task.video_url) {
      const link = document.createElement('a');
      link.href = task.video_url;
      link.download = `generated-video-${task.task_id.slice(-8)}.mp4`;
      link.click();
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={onBack} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            返回历史
          </Button>
          <h1 className="text-xl font-bold">生成结果</h1>
          <div className="w-20" />
        </div>
        
        {/* Main result video */}
        {task.status === 'completed' && task.video_url && (
          <div className="space-y-6">
            {/* Final generated video */}
            <div className="text-center space-y-4">
              <h2 className="text-lg font-semibold">生成的视频</h2>
              <div className="max-w-2xl mx-auto">
                <video 
                  controls 
                  className="w-full rounded-lg shadow-lg"
                  src={task.video_url}
                />
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  生成提示词: {task.prompt}
                </p>
                <div className="flex gap-2 justify-center">
                  <Button onClick={handleDownloadVideo}>
                    <Download className="w-4 h-4 mr-2" />
                    下载视频
                  </Button>
                  <Button variant="outline" onClick={onCreateNew}>
                    <RotateCcw className="w-4 h-4 mr-2" />
                    生成新视频
                  </Button>
                </div>
              </div>
            </div>

            {/* Task information */}
            <Card className="p-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">任务详情</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">任务ID: </span>
                    <span className="font-mono">{task.task_id}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">状态: </span>
                    <span className="text-green-600 font-medium">已完成</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">创建时间: </span>
                    <span>{new Date(task.created_at).toLocaleString('zh-CN')}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">完成时间: </span>
                    <span>{new Date(task.updated_at).toLocaleString('zh-CN')}</span>
                  </div>
                </div>
                {task.prompt && (
                  <div>
                    <span className="text-muted-foreground">提示词: </span>
                    <p className="mt-1 p-3 bg-muted rounded-md">{task.prompt}</p>
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* Failed task display */}
        {task.status === 'failed' && (
          <Card className="p-6 border-destructive">
            <div className="text-center space-y-4">
              <h2 className="text-lg font-semibold text-destructive">生成失败</h2>
              <p className="text-muted-foreground">任务ID: {task.task_id}</p>
              <p className="text-muted-foreground">提示词: {task.prompt}</p>
              {task.error_message && (
                <div className="p-3 bg-destructive/10 rounded-md text-destructive text-sm">
                  错误信息: {task.error_message}
                </div>
              )}
              <Button variant="outline" onClick={onCreateNew}>
                <RotateCcw className="w-4 h-4 mr-2" />
                重新生成
              </Button>
            </div>
          </Card>
        )}

        {/* Processing task display */}
        {task.status === 'processing' && (
          <Card className="p-6">
            <div className="text-center space-y-4">
              <h2 className="text-lg font-semibold">正在处理中...</h2>
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground">任务ID: {task.task_id}</p>
              <p className="text-muted-foreground">提示词: {task.prompt}</p>
              <p className="text-sm text-muted-foreground">
                视频生成通常需要2-5分钟，请耐心等待...
              </p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default VideoTaskResult;