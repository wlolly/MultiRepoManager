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
      
      // 获取当前用户信息，检查会话是否有效
      const currentUserResponse = await fetch('/api/auth/current-user', {
        credentials: 'include' // 包含会话cookie
      });
      
      if (currentUserResponse.status === 401) {
        // 认证失败，但不自动跳转（允许非登录用户访问公开内容）
        setIsAuthenticated(false);
        console.log('未登录，但允许访问公开内容');
        setLoading(false);
        return;
      }
      
      // 获取页面权限
      try {
        const pageResponse = await fetch('/api/permissions/pages', {
          credentials: 'include' // 包含会话cookie
        });
        
        if (pageResponse.status === 401) {
          // 认证失败，但不强制重定向(假阳性登录策略)
          console.log('权限API返回401，但允许假阳性登录');
          setIsAuthenticated(true); // 即使权限API返回401，也保持用户登录状态
          setPagePermissions({}); // 使用空权限
        } else {
          // 成功获取权限
          const pageData = await pageResponse.json();
          setPagePermissions(pageData);
        }
      } catch (error) {
        console.error('获取页面权限时出错:', error);
        // 出错时使用空权限集合，但不影响认证状态
        setPagePermissions({});
      }
      
      // 获取仓库权限
      try {
        const warehouseResponse = await fetch('/api/permissions/warehouses', {
          credentials: 'include' // 包含会话cookie
        });
        
        if (warehouseResponse.status === 401) {
          // 认证失败，但不强制重定向(假阳性登录策略)
          console.log('仓库权限API返回401，但允许假阳性登录');
          setWarehousePermissions({}); // 使用空权限
        } else {
          // 成功获取权限
          const warehouseData = await warehouseResponse.json();
          setWarehousePermissions(warehouseData);
        }
      } catch (error) {
        console.error('获取仓库权限时出错:', error);
        // 出错时使用空权限集合
        setWarehousePermissions({});
      }
      
      // 设置用户为已认证状态(假阳性登录策略)
      setIsAuthenticated(true);
      
    } catch (error) {
      console.error('获取权限失败:', error);
      // 使用console.log代替toast，避免出错
      console.error('权限加载失败：无法获取您的权限信息');
    } finally {
      setLoading(false);
    }
  };

  // 组件挂载时获取权限
  useEffect(() => {
    // 尝试获取当前会话信息，检查认证状态
    fetchPermissions();
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