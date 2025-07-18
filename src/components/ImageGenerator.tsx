import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Wand2, Copy, X } from 'lucide-react';
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
  const [errorLog, setErrorLog] = useState<string | null>(null);
  const [manualPrompt, setManualPrompt] = useState('');

  // 初始化手动提示词为语音命令
  React.useEffect(() => {
    setManualPrompt(command);
  }, [command]);

  const generateImage = async () => {
    const finalPrompt = manualPrompt.trim() || command;
    if (!finalPrompt) {
      toast.error('请输入提示词或语音命令');
      return;
    }

    if (!sourceImage) {
      toast.error('未找到源图像');
      return;
    }

    setIsGenerating(true);
    
    try {
      console.log('开始图像生成...');
      console.log('最终提示词:', finalPrompt);
      console.log('源图像类型:', sourceImage.startsWith('data:') ? 'base64' : 'url');
      
      // Extract and validate base64 data from data URL
      let base64Data = sourceImage;
      if (sourceImage.startsWith('data:')) {
        const base64Index = sourceImage.indexOf(',');
        if (base64Index !== -1) {
          base64Data = sourceImage.substring(base64Index + 1);
        }
      }
      
      console.log('原始图像长度:', sourceImage.length);
      console.log('处理后的base64数据长度:', base64Data.length);
      console.log('Base64开头:', base64Data.substring(0, 50));
      
      // Validate base64 format
      const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
      if (!base64Regex.test(base64Data)) {
        throw new Error('无效的base64格式');
      }
      
      // Try to validate base64 by attempting to decode it
      try {
        atob(base64Data);
      } catch (e) {
        throw new Error('Base64数据无法解码');
      }
      
      console.log('Base64验证通过');
      
      let requestBody;
      try {
        requestBody = JSON.stringify({
          prompt: finalPrompt,
          image: base64Data,
          strength: 0.8,
          aspect_ratio: "1:1"
        });
        console.log('JSON序列化成功，请求体长度:', requestBody.length);
      } catch (e) {
        throw new Error('JSON序列化失败: ' + e.message);
      }
      
      // Call Supabase Edge Function instead of BFL API directly
      const response = await fetch('/functions/v1/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY || ''}`,
        },
        body: requestBody,
      });

      console.log('Edge Function 响应状态:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Edge Function 错误:', errorData);
        throw new Error(`服务器错误: ${response.status} - ${errorData.error || 'Unknown error'}`);
      }

      const result = await response.json();
      console.log('Edge Function 响应:', result);
      
      if (result.success && result.data) {
        onResult(result.data);
        toast.success('图像生成完成！');
      } else {
        throw new Error(result.error || '图像生成失败');
      }
    } catch (error) {
      console.error('图像生成详细错误:', error);
      
      // 生成详细错误日志
      const errorDetails = {
        timestamp: new Date().toISOString(),
        errorType: error.constructor.name,
        errorMessage: error.message,
        errorStack: error.stack,
        sourceImageType: sourceImage.startsWith('data:') ? 'base64' : 'url',
        sourceImageSize: sourceImage.length,
        originalCommand: command,
        finalPrompt: finalPrompt,
        userAgent: navigator.userAgent,
        url: window.location.href
      };
      
      const errorLogString = JSON.stringify(errorDetails, null, 2);
      setErrorLog(errorLogString);
      console.error('完整错误日志:', errorLogString);
      
      if (error instanceof TypeError && error.message.includes('fetch')) {
        toast.error('网络连接失败，请检查网络状态或联系技术支持');
      } else if (error.message.includes('401')) {
        toast.error('认证失败，请检查配置');
      } else if (error.message.includes('429')) {
        toast.error('API 请求频率过高，请稍后重试');
      } else {
        toast.error(`图像生成失败: ${error.message}`);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const copyErrorLog = async () => {
    if (errorLog) {
      try {
        await navigator.clipboard.writeText(errorLog);
        toast.success('错误日志已复制到剪贴板');
      } catch (err) {
        toast.error('复制失败，请手动复制');
      }
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

          {/* 提示词输入区域 */}
          <div className="space-y-3">
            <Label htmlFor="prompt" className="text-sm font-medium">
              AI 生成提示词 {!command && <span className="text-primary">*</span>}
            </Label>
            {command ? (
              <Card className="p-3 bg-secondary/50">
                <p className="text-xs text-muted-foreground mb-2">
                  检测到的语音命令：
                </p>
                <p className="text-sm font-medium">{command}</p>
              </Card>
            ) : (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-md">
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  ⚠️ 未检测到语音命令，请手动输入提示词
                </p>
              </div>
            )}
            <textarea
              id="prompt"
              value={manualPrompt}
              onChange={(e) => setManualPrompt(e.target.value)}
              placeholder={command ? "您可以编辑语音命令或输入新的提示词..." : "请输入图像生成提示词，例如：把天空变成夜晚、添加彩虹、改变颜色等..."}
              className={`w-full min-h-[120px] p-3 rounded-md border resize-none focus:outline-none focus:ring-2 transition-all ${
                !command && !manualPrompt.trim() 
                  ? 'border-amber-300 bg-amber-50/50 dark:bg-amber-950/10 focus:ring-amber-400' 
                  : 'border-border bg-background/50 focus:ring-primary'
              }`}
            />
            <p className="text-xs text-muted-foreground">
              {command 
                ? "您可以编辑或重新输入提示词来指导 AI 图像生成" 
                : "请描述您希望如何修改图片，AI 将根据您的描述生成新图像"
              }
            </p>
          </div>

          {/* 提示说明 */}
          <Card className="p-4 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
            <div className="text-sm space-y-2">
              <p className="text-blue-700 dark:text-blue-300 font-medium">
                📋 使用说明：
              </p>
              <p className="text-blue-600 dark:text-blue-400">
                该功能使用 Supabase 后端处理图像生成，无需额外配置 API 密钥。
              </p>
            </div>
          </Card>

          {/* 生成按钮 */}
          <Button
            onClick={generateImage}
            disabled={isGenerating || !manualPrompt.trim()}
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

          {/* 错误日志显示 */}
          {errorLog && (
            <Card className="p-4 bg-destructive/10 border-destructive/20">
              <div className="flex items-start justify-between mb-2">
                <Label className="text-sm font-medium text-destructive">
                  错误详情日志
                </Label>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyErrorLog}
                    className="h-8 w-8 p-0"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setErrorLog(null)}
                    className="h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <pre className="text-xs bg-background/50 p-3 rounded-md overflow-x-auto max-h-40 overflow-y-auto border">
                {errorLog}
              </pre>
              <p className="text-xs text-muted-foreground mt-2">
                点击复制按钮将错误日志复制到剪贴板，以便技术支持分析
              </p>
            </Card>
          )}
        </div>
      </Card>
    </div>
  );
};