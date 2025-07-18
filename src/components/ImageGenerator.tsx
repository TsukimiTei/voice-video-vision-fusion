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
  const [apiKey, setApiKey] = useState('');
  const [errorLog, setErrorLog] = useState<string | null>(null);
  const [manualPrompt, setManualPrompt] = useState('');

  // 从 localStorage 加载 API key 并初始化手动提示词
  React.useEffect(() => {
    const savedApiKey = localStorage.getItem('bfl-api-key');
    if (savedApiKey) {
      setApiKey(savedApiKey);
    }
    // 初始化手动提示词为语音命令
    setManualPrompt(command);
  }, [command]);

  const generateImage = async () => {
    if (!apiKey) {
      toast.error('请输入 BFL API 密钥');
      return;
    }

    if (!sourceImage) {
      toast.error('未找到源图像');
      return;
    }

    const finalPrompt = manualPrompt.trim() || command;
    if (!finalPrompt) {
      toast.error('请输入提示词或语音命令');
      return;
    }

    setIsGenerating(true);
    
    try {
      console.log('开始图像生成...');
      console.log('API Key状态:', apiKey ? '已设置' : '未设置');
      console.log('源图像URL:', sourceImage);
      console.log('最终提示词:', finalPrompt);
      
      // 检查源图像是否是有效的base64或URL
      let blob: Blob;
      
      if (sourceImage.startsWith('data:')) {
        // 如果是base64图像，直接转换
        console.log('处理base64图像...');
        const response = await fetch(sourceImage);
        if (!response.ok) {
          throw new Error(`无法处理base64图像: ${response.status}`);
        }
        blob = await response.blob();
      } else {
        // 如果是URL，需要添加CORS处理
        console.log('处理URL图像...');
        const response = await fetch(sourceImage, {
          mode: 'cors',
          headers: {
            'Accept': 'image/*'
          }
        });
        
        console.log('图像fetch响应状态:', response.status);
        
        if (!response.ok) {
          throw new Error(`获取源图像失败: ${response.status}`);
        }
        
        blob = await response.blob();
      }
      console.log('图像Blob大小:', blob.size, 'bytes');
      
      // 创建 FormData
      const formData = new FormData();
      formData.append('image', blob, 'source.jpg');
      formData.append('prompt', finalPrompt);
      formData.append('strength', '0.8');
      
      console.log('发送API请求到:', 'https://api.bfl.ai/v1/flux-kontext-pro');
      
      // 调用 BFL API (正确的API端点)
      const apiResponse = await fetch('https://api.bfl.ai/v1/flux-kontext-pro', {
        method: 'POST',
        headers: {
          'x-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: finalPrompt,
          image: sourceImage,
          strength: 0.8,
          aspect_ratio: "1:1"
        }),
      });

      console.log('API响应状态:', apiResponse.status);
      console.log('API响应headers:', Object.fromEntries(apiResponse.headers.entries()));

      if (!apiResponse.ok) {
        const errorText = await apiResponse.text();
        console.error('API错误响应:', errorText);
        throw new Error(`API 请求失败: ${apiResponse.status} - ${errorText}`);
      }

      const result = await apiResponse.json();
      console.log('API响应数据:', result);
      
      if (result.id && result.polling_url) {
        // BFL API 是异步的，需要轮询结果
        toast.success('图像生成请求已提交，正在处理...');
        await pollForResult(result.polling_url, apiKey);
      } else {
        console.error('API响应结构:', result);
        throw new Error('API 响应中未找到请求ID或轮询URL');
      }
    } catch (error) {
      console.error('图像生成详细错误:', error);
      
      // 生成详细错误日志
      const errorDetails = {
        timestamp: new Date().toISOString(),
        errorType: error.constructor.name,
        errorMessage: error.message,
        errorStack: error.stack,
        apiKeyConfigured: !!apiKey,
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
        toast.error('网络连接失败，请检查网络状态');
      } else if (error.message.includes('401')) {
        toast.error('API 密钥无效，请检查密钥是否正确');
      } else if (error.message.includes('429')) {
        toast.error('API 请求频率过高，请稍后重试');
      } else {
        toast.error(`图像生成失败: ${error.message}`);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const pollForResult = async (pollingUrl: string, apiKey: string) => {
    const maxAttempts = 60; // 最多轮询60次 (30秒)
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      try {
        await new Promise(resolve => setTimeout(resolve, 500)); // 等待0.5秒
        
        const pollResponse = await fetch(pollingUrl, {
          headers: {
            'x-key': apiKey,
            'accept': 'application/json'
          }
        });
        
        if (!pollResponse.ok) {
          throw new Error(`轮询失败: ${pollResponse.status}`);
        }
        
        const pollResult = await pollResponse.json();
        console.log('轮询状态:', pollResult.status);
        
        if (pollResult.status === 'Ready') {
          if (pollResult.result?.sample) {
            onResult(pollResult.result.sample);
            toast.success('图像生成完成！');
            return;
          } else {
            throw new Error('结果中未找到图像URL');
          }
        } else if (pollResult.status === 'Error' || pollResult.status === 'Failed') {
          throw new Error(`生成失败: ${JSON.stringify(pollResult)}`);
        }
        
        attempts++;
      } catch (error) {
        console.error('轮询错误:', error);
        throw error;
      }
    }
    
    throw new Error('图像生成超时，请重试');
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

          {/* API 密钥状态 */}
          {apiKey ? (
            <Card className="p-4 bg-secondary/50">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    API 密钥状态
                  </Label>
                  <p className="text-sm text-primary font-medium mt-1">✓ 已配置 BFL API 密钥</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                onClick={() => {
                  localStorage.removeItem('bfl-api-key');
                  setApiKey('');
                }}
                >
                  重新配置
                </Button>
              </div>
            </Card>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="apiKey">BFL API 密钥</Label>
              <Input
                id="apiKey"
                type="password"
                placeholder="请输入您的 API 密钥"
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  localStorage.setItem('bfl-api-key', e.target.value);
                }}
                className="bg-background/50"
              />
              <p className="text-xs text-muted-foreground">
                请在 BFL 官网 (api.bfl.ai) 获取 API 密钥
              </p>
            </div>
          )}

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