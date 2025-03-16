import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

interface ErrorHandlerProps {
  error: string;
  retry?: () => void;
  className?: string;
}

/**
 * 错误处理组件
 * 显示友好的错误信息，并提供重试选项
 */
export function ErrorHandler({ error, retry, className = '' }: ErrorHandlerProps) {
  return (
    <Card className={`max-w-md mx-auto my-4 ${className}`}>
      <CardHeader className="bg-red-50 dark:bg-red-950/30">
        <CardTitle className="flex items-center text-red-600 dark:text-red-400">
          <AlertCircle className="mr-2 h-5 w-5" />
          出错了
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <p className="text-sm text-gray-700 dark:text-gray-300">{error}</p>
      </CardContent>
      {retry && (
        <CardFooter className="border-t bg-gray-50 dark:bg-gray-900/50">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={retry}
            className="w-full"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            重试
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}