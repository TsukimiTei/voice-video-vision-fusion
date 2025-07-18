import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Wand2 } from 'lucide-react';
import { toast } from 'sonner';

interface ImageGeneratorProps {
  sourceImage: string;
  command: string;
  onResult: (resultImage: string) => void;
}

export const ImageGenerator: React.FC<ImageGeneratorProps> = ({
  sourceImage,
  command,
  onResult
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [apiKey, setApiKey] = useState('');

  const generateImage = async () => {
    if (!apiKey) {
      toast.error('请输入 Flux Kontext API 密钥');
      return;
    }

    setIsGenerating(true);
    
    try {
      // 将 base64 图像转换为 Blob
      const response = await fetch(sourceImage);
      const blob = await response.blob();
      
      // 创建 FormData
      const formData = new FormData();
      formData.append('image', blob, 'source.jpg');
      formData.append('prompt', command);
      formData.append('strength', '0.8');
      
      // 调用 Flux Kontext API
      const apiResponse = await fetch('https://api.fluxkontext.com/v1/image-to-image', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
        body: formData,
      });

      if (!apiResponse.ok) {
        throw new Error(`API 请求失败: ${apiResponse.status}`);
      }

      const result = await apiResponse.json();
      
      if (result.image_url) {
        onResult(result.image_url);
        toast.success('图像生成成功！');
      } else {
        throw new Error('API 响应中未找到图像 URL');
      }
    } catch (error) {
      console.error('图像生成失败:', error);
      toast.error('图像生成失败，请检查 API 密钥和网络连接');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-6 space-y-6">
      <Card className="p-6 bg-card/50 backdrop-blur-sm border-border/50">
        <div className="space-y-4">
          <div className="text-center">
            <h3 className="text-xl font-semibold mb-2">AI 图像生成</h3>
            <p className="text-muted-foreground">
              基于截取的画面和语音命令生成新图像
            </p>
          </div>

          {/* 原始图像预览 */}
          <div className="aspect-video bg-muted rounded-lg overflow-hidden">
            <img
              src={sourceImage}
              alt="原始画面"
              className="w-full h-full object-cover"
            />
          </div>

          {/* 语音命令显示 */}
          <Card className="p-4 bg-secondary/50">
            <Label className="text-sm font-medium text-muted-foreground">
              检测到的语音命令：
            </Label>
            <p className="text-lg font-medium mt-1">{command}</p>
          </Card>

          {/* API 密钥输入 */}
          <div className="space-y-2">
            <Label htmlFor="apiKey">Flux Kontext API 密钥</Label>
            <Input
              id="apiKey"
              type="password"
              placeholder="请输入您的 API 密钥"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="bg-background/50"
            />
            <p className="text-xs text-muted-foreground">
              请在 Flux Kontext 官网获取 API 密钥
            </p>
          </div>

          {/* 生成按钮 */}
          <Button
            onClick={generateImage}
            disabled={isGenerating || !apiKey}
            className="w-full bg-gradient-to-r from-primary to-primary-glow hover:shadow-glow transition-all duration-300"
            size="lg"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                生成中...
              </>
            ) : (
              <>
                <Wand2 className="w-5 h-5 mr-2" />
                生成 AI 图像
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
};