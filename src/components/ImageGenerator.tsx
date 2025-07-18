import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Wand2, AlertCircle } from 'lucide-react';
import { useImageGeneration } from '@/hooks/useImageGeneration';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ImageGeneratorProps {
  sourceImage: string;
  command: string;
  onResult: (resultImage: string) => void;
  onBack: () => void;
}

export const ImageGenerator: React.FC<ImageGeneratorProps> = ({
  sourceImage,
  command,
  onResult,
  onBack
}) => {
  const [manualPrompt, setManualPrompt] = useState('');
  const { generateImage, isGenerating, error } = useImageGeneration();

  useEffect(() => {
    setManualPrompt(command);
  }, [command]);

  const handleGenerate = async () => {
    const finalPrompt = manualPrompt.trim() || command;
    
    if (!finalPrompt) {
      return;
    }

    try {
      const result = await generateImage(sourceImage, finalPrompt);
      onResult(result);
    } catch (error) {
      // 错误已在 hook 中处理
      console.error('Generation failed:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 relative overflow-hidden">
      {/* 背景装饰 */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
      <div className="absolute top-20 left-20 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />

      {/* 返回按钮 */}
      <div className="absolute top-6 left-6 z-20">
        <Button
          onClick={onBack}
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
      </div>

      <Card className="relative z-10 p-6 bg-card/50 backdrop-blur-xl border-border/50 max-w-2xl w-full">
        <div className="space-y-6">
          {/* 标题 */}
          <div className="text-center space-y-2">
            <div className="mx-auto w-16 h-16 bg-gradient-to-r from-primary to-primary-glow rounded-full flex items-center justify-center shadow-glow">
              <Wand2 className="w-8 h-8 text-primary-foreground" />
            </div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
              AI 图像生成
            </h2>
            <p className="text-muted-foreground">
              基于您的图像和指令，生成全新的创意作品
            </p>
          </div>

          {/* 原始图像预览 */}
          <div className="space-y-2">
            <Label>原始图像</Label>
            <div className="relative w-full h-48 bg-muted rounded-lg overflow-hidden">
              <img
                src={sourceImage}
                alt="Original"
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* 语音命令显示 */}
          {command && (
            <div className="space-y-2">
              <Label>识别的语音命令</Label>
              <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-blue-700 dark:text-blue-300 font-medium">"{command}"</p>
              </div>
            </div>
          )}

          {/* 手动输入提示词 */}
          <div className="space-y-2">
            <Label htmlFor="prompt">生成提示词</Label>
            <Textarea
              id="prompt"
              placeholder="请输入您希望生成的图像描述..."
              value={manualPrompt}
              onChange={(e) => setManualPrompt(e.target.value)}
              className="min-h-[100px] bg-background/50"
            />
            <p className="text-xs text-muted-foreground">
              例如：换一个颜色、变成卡通风格、添加花朵装饰等
            </p>
          </div>

          {/* 错误显示 */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* 使用说明 */}
          <Card className="p-4 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
            <div className="text-sm space-y-2">
              <p className="text-blue-700 dark:text-blue-300 font-medium">
                📋 使用说明：
              </p>
              <p className="text-blue-600 dark:text-blue-400">
                该功能使用 Supabase 后端处理图像生成，基于您的原始图像和提示词创建新的艺术作品。
              </p>
            </div>
          </Card>

          {/* 生成按钮 */}
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !manualPrompt.trim()}
            className="w-full bg-gradient-to-r from-primary to-primary-glow hover:shadow-glow transition-all duration-300 text-lg py-6"
          >
            {isGenerating ? (
              <>
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin mr-2" />
                生成中...
              </>
            ) : (
              <>
                <Wand2 className="w-5 h-5 mr-2" />
                开始生成
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
};