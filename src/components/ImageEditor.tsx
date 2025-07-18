import { useState, useRef } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { ArrowLeft, Upload, Loader2, RotateCcw, Wand2 } from 'lucide-react';
import { useImageGeneration } from '../hooks/useImageGeneration';
import { toast } from 'sonner';

interface ImageEditorProps {
  onBack: () => void;
}

export const ImageEditor = ({ onBack }: ImageEditorProps) => {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { generateImage, isGenerating, result, error, statusLog } = useImageGeneration();

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('请选择图片文件');
        return;
      }
      
      setSelectedImage(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    if (!selectedImage || !prompt.trim()) {
      toast.error('请选择图片并输入编辑指令');
      return;
    }

    // Convert image to base64
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      const base64Data = base64.split(',')[1]; // Remove data:image/... prefix
      await generateImage(base64Data, prompt.trim());
    };
    reader.readAsDataURL(selectedImage);
  };

  const handleReset = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setPrompt('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 如果已经有生成结果，显示结果页面
  if (result) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="p-8 max-w-4xl w-full space-y-6">
          <div className="flex items-center justify-between">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={onBack}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              返回首页
            </Button>
            
            <h2 className="text-xl font-bold text-foreground">图像编辑结果</h2>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleReset}
              className="flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              重新编辑
            </Button>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* 原图 */}
            <div className="space-y-3">
              <h3 className="font-semibold">原图</h3>
              {imagePreview && (
                <img 
                  src={imagePreview} 
                  alt="原图" 
                  className="w-full rounded-lg border shadow-lg"
                />
              )}
            </div>
            
            {/* 生成图 */}
            <div className="space-y-3">
              <h3 className="font-semibold">编辑结果</h3>
              <img 
                src={result.imageUrl} 
                alt="AI编辑结果" 
                className="w-full rounded-lg border shadow-lg"
              />
            </div>
          </div>
          
          <Card className="p-4 bg-muted/50">
            <h3 className="font-semibold mb-2">编辑指令：</h3>
            <p className="text-muted-foreground">"{result.prompt}"</p>
          </Card>
          
          <div className="flex gap-3">
            <Button 
              onClick={handleReset}
              variant="outline" 
              className="flex-1"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              重新编辑
            </Button>
            
            <Button 
              onClick={onBack}
              className="flex-1"
            >
              完成
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="p-8 max-w-2xl w-full space-y-6">
        <div className="flex items-center justify-between">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={onBack}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            返回首页
          </Button>
          
          <h2 className="text-xl font-bold text-foreground">AI 图像编辑</h2>
          
          <div className="w-20"></div> {/* Spacer for alignment */}
        </div>

        {/* 图片上传区域 */}
        <div className="space-y-4">
          <h3 className="font-semibold">1. 选择图片</h3>
          
          <div 
            className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center cursor-pointer hover:border-muted-foreground/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            
            {imagePreview ? (
              <div className="space-y-4">
                <img 
                  src={imagePreview} 
                  alt="预览" 
                  className="max-h-64 mx-auto rounded-lg border"
                />
                <div className="flex items-center justify-center gap-2">
                  <Badge variant="default" className="gap-2">
                    <Upload className="h-3 w-3" />
                    图片已选择
                  </Badge>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReset();
                    }}
                  >
                    重新选择
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                <div>
                  <p className="text-foreground font-medium">点击上传图片</p>
                  <p className="text-muted-foreground text-sm">支持 JPG、PNG 等格式</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 编辑指令输入 */}
        <div className="space-y-4">
          <h3 className="font-semibold">2. 输入编辑指令</h3>
          <Textarea
            placeholder="描述你想要对图片进行的编辑，例如：改成夕阳背景、添加下雪效果、变成水彩画风格..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            className="resize-none"
          />
        </div>

        {/* 生成按钮 */}
        <Button 
          onClick={handleGenerate}
          disabled={!selectedImage || !prompt.trim() || isGenerating}
          size="lg"
          className="w-full"
        >
          {isGenerating ? (
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          ) : (
            <Wand2 className="mr-2 h-5 w-5" />
          )}
          {isGenerating ? '生成中...' : '开始编辑'}
        </Button>

        {/* API 调用明细 */}
        {isGenerating && statusLog.length > 0 && (
          <Card className="p-4 bg-muted/30">
            <h3 className="font-semibold mb-3 text-sm">API 调用明细：</h3>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {statusLog.map((log, index) => (
                <p key={index} className="text-xs font-mono text-muted-foreground">
                  {log}
                </p>
              ))}
            </div>
          </Card>
        )}

        {/* 错误信息 */}
        {error && (
          <Card className="p-4 bg-destructive/10 border-destructive/20">
            <h3 className="font-semibold mb-2 text-destructive">错误详情：</h3>
            <p className="text-sm text-destructive">{error}</p>
          </Card>
        )}
      </Card>
    </div>
  );
};