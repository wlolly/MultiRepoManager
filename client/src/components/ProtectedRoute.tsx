import { ReactNode, FC, useEffect, useState } from 'react';
import { Route, useLocation } from 'wouter';
import { usePermissions } from '@/hooks/use-permissions';

interface ProtectedRouteProps {
  component: FC<any>;
  path: string;
  pageName?: string;  // 页面名称用于权限检查
  warehouseId?: number;  // 仓库ID用于仓库权限检查
  requireManageWarehouse?: boolean;  // 是否需要仓库管理权限
  children?: ReactNode;
  exact?: boolean;
}

/**
 * 带权限检查的路由组件
 * 根据用户权限决定是否渲染路由内容
 */
export const ProtectedRoute: FC<ProtectedRouteProps> = ({
  component: Component,
  path,
  pageName,
  warehouseId,
  requireManageWarehouse = false,
  children,
  exact,
  ...rest
}) => {
  const { isAuthenticated, loading, hasPagePermission, canViewWarehouse, canManageWarehouse } = usePermissions();
  const [, navigate] = useLocation();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  // 使用useEffect检查权限，避免在渲染过程中导航
  useEffect(() => {
    if (loading) return;

    // 检查权限
    let permissionResult = true;

    // 如果未认证
    if (!isAuthenticated) {
      navigate('/login');
      permissionResult = false;
    }
    // 如果需要页面权限检查
    else if (pageName && !hasPagePermission(pageName)) {
      navigate('/');  // 无权限跳转到首页
      permissionResult = false;
    }
    // 如果需要仓库权限检查
    else if (warehouseId !== undefined) {
      if (requireManageWarehouse) {
        // 需要管理权限
        if (!canManageWarehouse(warehouseId)) {
          navigate('/warehouses');  // 无权限跳转到仓库列表
          permissionResult = false;
        }
      } else {
        // 只需要查看权限
        if (!canViewWarehouse(warehouseId)) {
          navigate('/warehouses');  // 无权限跳转到仓库列表
          permissionResult = false;
        }
      }
    }

    setHasPermission(permissionResult);
  }, [
    loading, 
    isAuthenticated, 
    pageName, 
    warehouseId, 
    requireManageWarehouse, 
    hasPagePermission, 
    canViewWarehouse, 
    canManageWarehouse,
    navigate
  ]);

  return (
    <Route
      path={path}
      exact={exact}
      {...rest}
    >
      {(params) => {
        // 权限检查
        if (loading || hasPermission === null) {
          // 权限加载中显示加载状态
          return <div className="flex items-center justify-center p-8">正在加载...</div>;
        }
        
        return hasPermission ? <Component {...params} /> : null;
      }}
    </Route>
  );
};

export default ProtectedRoute;