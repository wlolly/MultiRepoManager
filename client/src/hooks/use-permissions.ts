import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';

// 页面权限类型
interface PagePermissions {
  [key: string]: boolean;
}

// 仓库权限类型
interface WarehousePermissions {
  [id: number]: {
    canView: boolean;
    canManage: boolean;
  };
}

// 权限钩子返回类型
interface PermissionsHook {
  loading: boolean;
  // 页面权限
  pagePermissions: PagePermissions;
  hasPagePermission: (pageName: string) => boolean;
  // 仓库权限
  warehousePermissions: WarehousePermissions;
  canViewWarehouse: (warehouseId: number) => boolean;
  canManageWarehouse: (warehouseId: number) => boolean;
  // 刷新权限
  refreshPermissions: () => void;
  // 认证状态
  isAuthenticated: boolean;
  setIsAuthenticated: (value: boolean) => void;
}

/**
 * 权限管理钩子
 * 用于获取并管理用户的页面和仓库权限
 */
export function usePermissions(): PermissionsHook {
  const [loading, setLoading] = useState(true);
  const [pagePermissions, setPagePermissions] = useState<PagePermissions>({});
  const [warehousePermissions, setWarehousePermissions] = useState<WarehousePermissions>({});
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { toast } = useToast();
  const [, navigate] = useLocation();

  // 获取权限数据
  const fetchPermissions = async () => {
    try {
      setLoading(true);
      
      // 检查认证状态
      const token = localStorage.getItem('token');
      if (!token) {
        setIsAuthenticated(false);
        setLoading(false);
        return;
      }
      
      // 获取页面权限
      const pageResponse = await fetch('/api/permissions/pages', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (pageResponse.status === 401) {
        // 认证失败，清除token并重定向到登录页面
        localStorage.removeItem('token');
        setIsAuthenticated(false);
        navigate('/login');
        toast({
          variant: "destructive",
          title: "认证失败",
          description: "请重新登录",
        });
        setLoading(false);
        return;
      }
      
      const pageData = await pageResponse.json();
      setPagePermissions(pageData);
      
      // 获取仓库权限
      const warehouseResponse = await fetch('/api/permissions/warehouses', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const warehouseData = await warehouseResponse.json();
      setWarehousePermissions(warehouseData);
      setIsAuthenticated(true);
      
    } catch (error) {
      console.error('获取权限失败:', error);
      toast({
        variant: "destructive",
        title: "权限加载失败",
        description: "无法获取您的权限信息",
      });
    } finally {
      setLoading(false);
    }
  };

  // 组件挂载时获取权限
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchPermissions();
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
      setLoading(false);
    }
  }, []);

  // 检查页面权限
  const hasPagePermission = (pageName: string): boolean => {
    // 如果页面权限为空或未找到指定页面权限，默认返回false
    if (!pagePermissions || !pagePermissions[pageName]) {
      return false;
    }
    return pagePermissions[pageName];
  };

  // 检查仓库查看权限
  const canViewWarehouse = (warehouseId: number): boolean => {
    // 如果仓库权限为空或未找到指定仓库权限，默认返回false
    if (!warehousePermissions || !warehousePermissions[warehouseId]) {
      return false;
    }
    return warehousePermissions[warehouseId].canView;
  };

  // 检查仓库管理权限
  const canManageWarehouse = (warehouseId: number): boolean => {
    // 如果仓库权限为空或未找到指定仓库权限，默认返回false
    if (!warehousePermissions || !warehousePermissions[warehouseId]) {
      return false;
    }
    return warehousePermissions[warehouseId].canManage;
  };

  // 刷新权限
  const refreshPermissions = () => {
    fetchPermissions();
  };

  return {
    loading,
    pagePermissions,
    hasPagePermission,
    warehousePermissions,
    canViewWarehouse,
    canManageWarehouse,
    refreshPermissions,
    isAuthenticated,
    setIsAuthenticated
  };
}