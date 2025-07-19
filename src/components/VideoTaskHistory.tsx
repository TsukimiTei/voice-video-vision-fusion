import React from 'react';
import { ArrowLeft, Clock, CheckCircle2, XCircle, Calendar, PlayCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useVideoTasks, VideoTask } from '@/hooks/useVideoTasks';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface VideoTaskHistoryProps {
  onBack: () => void;
  onSelectTask: (task: VideoTask) => void;
}

const VideoTaskHistory: React.FC<VideoTaskHistoryProps> = ({ onBack, onSelectTask }) => {
  const { tasks, isLoading, error, refreshTasks } = useVideoTasks();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'processing':
        return <Clock className="w-4 h-4" />;
      case 'completed':
        return <CheckCircle2 className="w-4 h-4" />;
      case 'failed':
        return <XCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'processing':
        return 'default';
      case 'completed':
        return 'success';
      case 'failed':
        return 'destructive';
      default:
        return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'processing':
        return '处理中';
      case 'completed':
        return '已完成';
      case 'failed':
        return '失败';
      default:
        return '未知';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background/80 to-primary/5 p-4">
        <div className="container mx-auto max-w-4xl space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={onBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回
            </Button>
            <h1 className="text-2xl font-bold">视频生成历史</h1>
          </div>
          
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background/80 to-primary/5 p-4">
        <div className="container mx-auto max-w-4xl space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={onBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回
            </Button>
            <h1 className="text-2xl font-bold">视频生成历史</h1>
          </div>
          
          <Card className="border-destructive">
            <CardContent className="p-6 text-center">
              <XCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">加载失败</h3>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button onClick={refreshTasks}>
                <RefreshCw className="w-4 h-4 mr-2" />
                重试
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/80 to-primary/5 p-4">
      <div className="container mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={onBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回
            </Button>
            <h1 className="text-2xl font-bold">视频生成历史</h1>
          </div>
          
          <Button variant="outline" onClick={refreshTasks}>
            <RefreshCw className="w-4 h-4 mr-2" />
            刷新
          </Button>
        </div>

        {tasks.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Calendar className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">暂无历史记录</h3>
              <p className="text-muted-foreground">
                开始录制视频并生成内容后，您的任务历史将显示在这里
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {tasks.map((task) => (
              <Card 
                key={task.id} 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => onSelectTask(task)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base line-clamp-2">
                      {task.prompt}
                    </CardTitle>
                    <Badge variant={getStatusColor(task.status) as any} className="ml-2 shrink-0">
                      <div className="flex items-center gap-1">
                        {getStatusIcon(task.status)}
                        {getStatusText(task.status)}
                      </div>
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center gap-4">
                      <span>任务ID: {task.task_id.slice(-8)}</span>
                      {task.status === 'completed' && task.video_url && (
                        <div className="flex items-center gap-1">
                          <PlayCircle className="w-4 h-4" />
                          <span>视频已就绪</span>
                        </div>
                      )}
                    </div>
                    
                    <span>
                      {formatDistanceToNow(new Date(task.created_at), { 
                        addSuffix: true, 
                        locale: zhCN 
                      })}
                    </span>
                  </div>
                  
                  {task.error_message && (
                    <div className="mt-2 p-2 bg-destructive/10 rounded text-sm text-destructive">
                      错误: {task.error_message}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoTaskHistory;