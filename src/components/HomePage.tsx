import { Button } from './ui/button';
import { Card } from './ui/card';
import { Camera, ImageIcon, Wand2, Video } from 'lucide-react';

interface HomePageProps {
  onVideoRecord: () => void;
  onImageEdit: () => void;
  onVideoCompile: () => void;
}

export const HomePage = ({ onVideoRecord, onImageEdit, onVideoCompile }: HomePageProps) => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="p-8 max-w-2xl w-full text-center space-y-8">
        <div className="space-y-4">
          <h1 className="text-3xl font-bold text-foreground">AI 创意工具</h1>
          <p className="text-muted-foreground text-lg">
            选择您想要使用的 AI 功能
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-6">
          {/* 视频录制生成 */}
          <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-primary/20" onClick={onVideoRecord}>
            <div className="space-y-4">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <Camera className="h-8 w-8 text-primary" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold">视频录制生成</h3>
                <p className="text-muted-foreground text-sm">
                  录制视频并说出指令，AI 将基于视频最后一帧和语音指令生成新图像
                </p>
              </div>
              <Button size="lg" className="w-full">
                开始录制
              </Button>
            </div>
          </Card>

          {/* 图像编辑 */}
          <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-primary/20" onClick={onImageEdit}>
            <div className="space-y-4">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <Wand2 className="h-8 w-8 text-primary" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold">图像编辑</h3>
                <p className="text-muted-foreground text-sm">
                  上传图片并输入编辑指令，AI 将根据您的要求对图像进行智能编辑
                </p>
              </div>
              <Button size="lg" className="w-full" variant="outline">
                <ImageIcon className="mr-2 h-5 w-5" />
                开始编辑
              </Button>
            </div>
          </Card>

          {/* 编译现实 */}
          <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-primary/20" onClick={onVideoCompile}>
            <div className="space-y-4">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <Video className="h-8 w-8 text-primary" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold">编译现实</h3>
                <p className="text-muted-foreground text-sm">
                  拍摄视频，AI 将基于尾帧生成延续视频并与原视频合并
                </p>
              </div>
              <Button size="lg" className="w-full" variant="secondary">
                <Video className="mr-2 h-5 w-5" />
                开始编译
              </Button>
            </div>
          </Card>
        </div>
        
        <div className="pt-4">
          <p className="text-xs text-muted-foreground">
            由 Flux Kontext Pro 提供 AI 图像生成技术支持
          </p>
        </div>
      </Card>
    </div>
  );
};