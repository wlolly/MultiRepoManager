import { ReactNode, FC, useEffect, useState } from 'react';
import { Route, useLocation } from 'wouter';
import { usePermissions } from '@/hooks/use-permissions';

interface ProtectedRouteProps {
  component: FC<any>;
  path: string;
  pageName?: string;  // 页面名称用于权限检查
  warehouseId?: number;  // 仓库ID用于仓库权限检查
  requireManageWarehouse?: boolean;  // 是否需要仓库管理权限
  requireAuth?: boolean;  // 是否强制要求认证，默认为true
  publicContent?: boolean; // 是否显示非登录用户的公开内容，默认为false
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
  requireAuth = true,  // 默认要求认证
  publicContent = false, // 默认不显示公开内容
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

    // 如果未认证但又需要认证（除非是特殊路径如首页可以允许非登录状态）
    if (!isAuthenticated && requireAuth) {
      // 如果允许显示公开内容，则不强制重定向，仍然保持权限为true
      if (publicContent) {
        console.log(`${path}页面允许非登录用户查看公开内容`);
        permissionResult = true;
      } else {
        console.log(`${path}页面需要登录，重定向到登录页面`);
        navigate('/login');
        permissionResult = false;
      }
    }
    // 如果已登录但需要页面权限检查
    else if (isAuthenticated && pageName && !hasPagePermission(pageName)) {
      console.log(`用户无权访问${pageName}页面，重定向到首页`);
      navigate('/');  // 无权限跳转到首页
      permissionResult = false;
    }
    // 如果需要仓库权限检查
    else if (warehouseId !== undefined) {
      if (requireManageWarehouse) {
        // 需要管理权限
        if (!canManageWarehouse(warehouseId)) {
          console.log(`用户无仓库${warehouseId}管理权限，重定向到仓库列表`);
          navigate('/warehouses');  // 无权限跳转到仓库列表
          permissionResult = false;
        }
      } else {
        // 只需要查看权限
        if (!canViewWarehouse(warehouseId)) {
          console.log(`用户无仓库${warehouseId}查看权限，重定向到仓库列表`);
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
    requireAuth,
    publicContent,
    hasPagePermission, 
    canViewWarehouse, 
    canManageWarehouse,
    navigate,
    path
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