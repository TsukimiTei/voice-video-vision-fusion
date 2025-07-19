import { useState } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Copy, TestTube } from 'lucide-react';

export const JWTTester = () => {
  const [jwtToken, setJwtToken] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  const generateJWT = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('test-kling-jwt');
      
      if (error) {
        toast.error(`生成失败: ${error.message}`);
        return;
      }
      
      if (data.success) {
        setJwtToken(data.jwtToken);
        setTestResult(data);
        toast.success(data.message);
      } else {
        toast.error(`生成失败: ${data.error}`);
      }
    } catch (err) {
      toast.error('生成JWT时出错');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('已复制到剪贴板');
  };

  return (
    <Card className="p-6 max-w-4xl mx-auto">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <TestTube className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Kling AI JWT 测试器</h2>
        </div>
        
        <Button 
          onClick={generateJWT} 
          disabled={isLoading}
          className="w-full sm:w-auto"
        >
          {isLoading ? '生成中...' : '生成 JWT Token'}
        </Button>

        {testResult && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Access Key:</label>
              <div className="flex items-center gap-2 mt-1">
                <code className="flex-1 p-2 bg-muted rounded text-sm font-mono break-all">
                  {testResult.accessKey}
                </code>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => copyToClipboard(testResult.accessKey)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Generated JWT Token:</label>
              <div className="flex items-center gap-2 mt-1">
                <code className="flex-1 p-2 bg-muted rounded text-sm font-mono break-all">
                  {jwtToken}
                </code>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => copyToClipboard(jwtToken)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">
                API测试状态: {testResult.testApiStatus}
              </label>
              <div className="mt-1">
                <code className="block p-2 bg-muted rounded text-sm font-mono whitespace-pre-wrap">
                  {testResult.testApiResponse}
                </code>
              </div>
            </div>

            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="font-medium text-blue-900 mb-2">使用说明:</h3>
              <ol className="text-sm text-blue-800 space-y-1">
                <li>1. 复制上面生成的JWT Token</li>
                <li>2. 访问 Kling AI 的验证器页面</li>
                <li>3. 粘贴JWT Token进行验证</li>
                <li>4. 如果验证失败，请检查API密钥是否正确</li>
              </ol>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};