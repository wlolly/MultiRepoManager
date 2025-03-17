import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ReloadIcon } from '@radix-ui/react-icons';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/use-permissions';

/**
 * 权限刷新按钮组件
 * 允许用户手动刷新权限
 */
export function PermissionRefreshButton() {
  const { toast } = useToast();
  const { refreshPermissions } = usePermissions();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 处理刷新权限请求
  const handleRefresh = async () => {
    if (isRefreshing) return;
    
    try {
      setIsRefreshing(true);
      
      // 调用权限刷新钩子
      await refreshPermissions();
      
      // 显示成功提示
      toast({
        title: '权限已更新',
        description: '您的权限已成功刷新',
        variant: 'default',
      });
      
    } catch (error) {
      console.error('刷新权限时出错:', error);
      
      // 显示错误提示
      toast({
        title: '刷新权限失败',
        description: '无法刷新您的权限，请稍后再试',
        variant: 'destructive',
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleRefresh}
      disabled={isRefreshing}
      className="px-3 py-2"
    >
      {isRefreshing ? (
        <>
          <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
          刷新中...
        </>
      ) : (
        <>
          <ReloadIcon className="mr-2 h-4 w-4" />
          刷新权限
        </>
      )}
    </Button>
  );
}