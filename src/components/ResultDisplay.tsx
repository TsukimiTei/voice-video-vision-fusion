import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Download, Share2 } from 'lucide-react';
import { toast } from 'sonner';

interface ResultDisplayProps {
  originalImage: string;
  generatedImage: string;
  command: string;
  onBack: () => void;
}

export const ResultDisplay: React.FC<ResultDisplayProps> = ({
  originalImage,
  generatedImage,
  command,
  onBack
}) => {
  const downloadImage = async () => {
    try {
      const response = await fetch(generatedImage);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ai-generated-${Date.now()}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('图像已下载');
    } catch (error) {
      console.error('下载失败:', error);
      toast.error('下载失败');
    }
  };

  const shareImage = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'AI 生成的图像',
          text: `基于语音命令"${command}"生成的图像`,
          url: generatedImage,
        });
      } catch (error) {
        console.error('分享失败:', error);
      }
    } else {
      // 复制链接到剪贴板
      try {
        await navigator.clipboard.writeText(generatedImage);
        toast.success('图像链接已复制到剪贴板');
      } catch (error) {
        toast.error('分享功能不可用');
      }
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* 头部导航 */}
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={onBack}
            className="rounded-full"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回
          </Button>
          <h1 className="text-2xl font-bold">AI 生成结果</h1>
        </div>

        {/* 语音命令显示 */}
        <Card className="p-4 bg-secondary/30 border-border/50">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">
            检测到的语音命令：
          </h3>
          <p className="text-xl font-medium">{command}</p>
        </Card>

        {/* 图像对比展示 */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* 原始图像 */}
          <Card className="overflow-hidden bg-card/50 backdrop-blur-sm border-border/50">
            <div className="p-4 border-b border-border/50">
              <h3 className="font-semibold">原始画面</h3>
              <p className="text-sm text-muted-foreground">录制视频的最后一帧</p>
            </div>
            <div className="aspect-square bg-muted">
              <img
                src={originalImage}
                alt="原始画面"
                className="w-full h-full object-cover"
              />
            </div>
          </Card>

          {/* 生成的图像 */}
          <Card className="overflow-hidden bg-card/50 backdrop-blur-sm border-border/50">
            <div className="p-4 border-b border-border/50">
              <h3 className="font-semibold">AI 生成结果</h3>
              <p className="text-sm text-muted-foreground">基于语音命令生成</p>
            </div>
            <div className="aspect-square bg-muted">
              <img
                src={generatedImage}
                alt="AI 生成的图像"
                className="w-full h-full object-cover"
              />
            </div>
          </Card>
        </div>

        {/* 操作按钮 */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            onClick={downloadImage}
            className="bg-gradient-to-r from-accent to-green-500 hover:shadow-lg transition-all duration-300"
            size="lg"
          >
            <Download className="w-5 h-5 mr-2" />
            下载图像
          </Button>
          <Button
            onClick={shareImage}
            variant="outline"
            size="lg"
            className="border-border/50 hover:bg-secondary/50"
          >
            <Share2 className="w-5 h-5 mr-2" />
            分享结果
          </Button>
        </div>

        {/* 提示信息 */}
        <Card className="p-4 bg-muted/30 border-border/30">
          <p className="text-sm text-center text-muted-foreground">
            💡 提示：说出更具体的描述词可以获得更好的生成效果
          </p>
        </Card>
      </div>
    </div>
  );
};