import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/use-permissions';
import { queryClient } from '@/lib/query-client';
import { apiRequest } from '@/lib/query-client';

// 仓库权限类型
interface WarehousePermission {
  warehouseId: number;
  teamId: number;
  canView: boolean;
  canManage: boolean;
  id?: number;
  warehouse?: {
    id: number;
    name: string;
    location: string;
  };
}

/**
 * 仓库权限管理hook
 * 用于管理团队的仓库权限
 * @param teamId 团队ID
 */
export function useWarehousePermissions(teamId: number) {
  const [permissions, setPermissions] = useState<WarehousePermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { refreshPermissions } = usePermissions();
  const { toast } = useToast();

  // 获取团队的仓库权限
  const fetchWarehousePermissions = async () => {
    if (!teamId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/teams/${teamId}/warehouse-permissions`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '获取仓库权限失败');
      }
      
      const data = await response.json();
      setPermissions(data);
    } catch (err) {
      console.error('获取仓库权限出错:', err);
      setError((err as Error).message || '获取仓库权限时出错');
      toast({
        title: '获取权限失败',
        description: (err as Error).message || '无法获取团队仓库权限',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // 添加仓库权限
  const addWarehousePermission = async (warehouseId: number, canView: boolean, canManage: boolean) => {
    if (!teamId) return null;
    
    try {
      const response = await apiRequest({
        url: `/api/teams/${teamId}/warehouse-permissions`,
        method: 'POST',
        data: {
          warehouseId,
          canView,
          canManage
        }
      });
      
      // 刷新权限列表
      await fetchWarehousePermissions();
      
      // 刷新全局权限
      refreshPermissions();
      
      toast({
        title: '添加成功',
        description: '已成功添加仓库权限',
        variant: 'default'
      });
      
      // 刷新API查询缓存
      queryClient.invalidateQueries({ queryKey: ['/api/permissions/warehouses'] });
      queryClient.invalidateQueries({ queryKey: [`/api/teams/${teamId}/warehouse-permissions`] });
      
      return response;
    } catch (err) {
      console.error('添加仓库权限出错:', err);
      toast({
        title: '添加失败',
        description: (err as Error).message || '无法添加仓库权限',
        variant: 'destructive'
      });
      return null;
    }
  };

  // 更新仓库权限
  const updateWarehousePermission = async (permissionId: number, canView: boolean, canManage: boolean) => {
    if (!teamId) return null;
    
    try {
      const response = await apiRequest({
        url: `/api/teams/${teamId}/warehouse-permissions/${permissionId}`,
        method: 'PATCH',
        data: {
          canView,
          canManage
        }
      });
      
      // 刷新权限列表
      await fetchWarehousePermissions();
      
      // 刷新全局权限
      refreshPermissions();
      
      toast({
        title: '更新成功',
        description: '已成功更新仓库权限',
        variant: 'default'
      });
      
      // 刷新API查询缓存
      queryClient.invalidateQueries({ queryKey: ['/api/permissions/warehouses'] });
      queryClient.invalidateQueries({ queryKey: [`/api/teams/${teamId}/warehouse-permissions`] });
      
      return response;
    } catch (err) {
      console.error('更新仓库权限出错:', err);
      toast({
        title: '更新失败',
        description: (err as Error).message || '无法更新仓库权限',
        variant: 'destructive'
      });
      return null;
    }
  };

  // 删除仓库权限
  const removeWarehousePermission = async (permissionId: number) => {
    if (!teamId) return false;
    
    try {
      await apiRequest({
        url: `/api/teams/${teamId}/warehouse-permissions/${permissionId}`,
        method: 'DELETE'
      });
      
      // 刷新权限列表
      await fetchWarehousePermissions();
      
      // 刷新全局权限
      refreshPermissions();
      
      toast({
        title: '删除成功',
        description: '已成功删除仓库权限',
        variant: 'default'
      });
      
      // 刷新API查询缓存
      queryClient.invalidateQueries({ queryKey: ['/api/permissions/warehouses'] });
      queryClient.invalidateQueries({ queryKey: [`/api/teams/${teamId}/warehouse-permissions`] });
      
      return true;
    } catch (err) {
      console.error('删除仓库权限出错:', err);
      toast({
        title: '删除失败',
        description: (err as Error).message || '无法删除仓库权限',
        variant: 'destructive'
      });
      return false;
    }
  };

  // 组件挂载或teamId变化时获取权限
  useEffect(() => {
    if (teamId) {
      fetchWarehousePermissions();
    } else {
      setPermissions([]);
      setLoading(false);
    }
  }, [teamId]);

  return {
    permissions,
    loading,
    error,
    addWarehousePermission,
    updateWarehousePermission,
    removeWarehousePermission,
    refreshWarehousePermissions: fetchWarehousePermissions
  };
}