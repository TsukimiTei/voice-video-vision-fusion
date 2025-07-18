import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Settings, Key, Save } from 'lucide-react';
import { toast } from 'sonner';

interface SettingsPageProps {
  onBack: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ onBack }) => {
  const [apiKey, setApiKey] = useState('');

  useEffect(() => {
    // 从 localStorage 加载已保存的 API key
    const savedApiKey = localStorage.getItem('flux-kontext-api-key');
    if (savedApiKey) {
      setApiKey(savedApiKey);
    }
  }, []);

  const handleSaveApiKey = () => {
    if (!apiKey.trim()) {
      toast.error('请输入有效的 API 密钥');
      return;
    }

    localStorage.setItem('flux-kontext-api-key', apiKey.trim());
    toast.success('API 密钥已保存');
  };

  const handleClearApiKey = () => {
    setApiKey('');
    localStorage.removeItem('flux-kontext-api-key');
    toast.success('API 密钥已清除');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 relative overflow-hidden">
      {/* 背景装饰 */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
      <div className="absolute top-20 left-20 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />

      <Card className="relative z-10 p-8 bg-card/50 backdrop-blur-xl border-border/50 max-w-md w-full mx-6">
        <div className="space-y-6">
          {/* 头部 */}
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-r from-primary to-primary-glow rounded-full flex items-center justify-center shadow-glow">
                <Settings className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold">设置</h1>
                <p className="text-sm text-muted-foreground">配置 API 密钥</p>
              </div>
            </div>
          </div>

          {/* API 密钥设置 */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-primary">
              <Key className="w-4 h-4" />
              <span className="font-medium">Flux Kontext API 密钥</span>
            </div>

            <div className="space-y-2">
              <Label htmlFor="apiKey">API 密钥</Label>
              <Input
                id="apiKey"
                type="password"
                placeholder="请输入您的 Flux Kontext API 密钥"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="bg-background/50"
              />
              <p className="text-xs text-muted-foreground">
                请在 <a 
                  href="https://fluxkontext.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Flux Kontext 官网
                </a> 获取 API 密钥
              </p>
            </div>

            {/* 操作按钮 */}
            <div className="flex gap-3">
              <Button
                onClick={handleSaveApiKey}
                className="flex-1 bg-gradient-to-r from-primary to-primary-glow hover:shadow-glow transition-all duration-300"
                disabled={!apiKey.trim()}
              >
                <Save className="w-4 h-4 mr-2" />
                保存
              </Button>
              <Button
                onClick={handleClearApiKey}
                variant="outline"
                className="px-4"
              >
                清除
              </Button>
            </div>

            {/* 说明信息 */}
            <Card className="p-4 bg-secondary/50">
              <div className="space-y-2 text-sm">
                <p className="font-medium text-muted-foreground">说明：</p>
                <ul className="space-y-1 text-muted-foreground ml-2">
                  <li>• API 密钥将安全保存在本地浏览器中</li>
                  <li>• 用于 AI 图像生成功能</li>
                  <li>• 不会上传到任何服务器</li>
                </ul>
              </div>
            </Card>
          </div>
        </div>
      </Card>
    </div>
  );
};