import { ReactNode, FC, useEffect, useState } from 'react';
import { Route, useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { ErrorHandler } from './ErrorHandler';
import { Loader2 } from 'lucide-react';

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
 * 使用AuthContext统一管理权限状态
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
  console.log(`ProtectedRoute [${path}] 检查权限, requireAuth=${requireAuth}, publicContent=${publicContent}`);
  
  // 使用统一的权限上下文
  const { 
    user, 
    isLoading, 
    isAuthenticated, 
    isRealUser,
    isAdmin,
    isVisitor,
    hasPagePermission, 
    canViewWarehouse, 
    canManageWarehouse 
  } = useAuth();
  
  const [, navigate] = useLocation();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  // 使用useEffect检查权限，避免在渲染过程中导航
  useEffect(() => {
    if (isLoading) return;

    try {
      // 检查权限
      let permissionResult = true;
      let errorMessage = null;
      
      console.log(`权限检查 - 路径: ${path}, 当前用户:`, user);
      console.log(`权限检查 - 是真实用户: ${isRealUser}, 是访客用户: ${isVisitor}`);
      
      // 首先检查是否是访客用户
      if (isVisitor) {
        // 访客有两种情况
        // 1. 页面允许公开访问（publicContent=true）- 允许访问
        // 2. 页面需要真实认证且不允许公开访问（requireAuth=true且publicContent=false）- 不允许访问
        if (publicContent) {
          console.log(`${path}页面遇到访客用户，允许访问公开内容`);
          permissionResult = true;
        } else if (requireAuth && !publicContent) {
          console.log(`${path}页面需要真实登录，访客用户不允许访问，重定向到仪表盘`);
          errorMessage = "此页面需要登录后才能访问";
          navigate('/');
          permissionResult = false;
        }
      } 
      // 然后检查未认证用户
      else if (!isAuthenticated) {
        // 未认证用户两种情况
        // 1. 页面不需要认证或允许公开访问 - 允许访问
        // 2. 页面需要认证且不允许公开访问 - 重定向到登录
        if (!requireAuth || publicContent) {
          console.log(`${path}页面允许非登录用户查看公开内容`);
          permissionResult = true;
        } else {
          console.log(`${path}页面需要登录，重定向到登录页面`);
          errorMessage = "请先登录系统";
          navigate('/login');
          permissionResult = false;
        }
      }
      // 对于已认证的管理员用户
      else if (isAdmin) {
        // 管理员可以访问所有内容
        console.log(`${path}页面访问者为管理员，允许访问所有内容`);
        permissionResult = true;
      }
      // 如果已登录但需要页面权限检查
      else if (isAuthenticated && pageName && !hasPagePermission(pageName)) {
        console.log(`用户无权访问${pageName}页面，重定向到首页`);
        errorMessage = `您没有访问${pageName}页面的权限`;
        navigate('/');  // 无权限跳转到首页
        permissionResult = false;
      }
      // 如果需要仓库权限检查
      else if (warehouseId !== undefined) {
        if (requireManageWarehouse) {
          // 需要管理权限
          if (!canManageWarehouse(warehouseId)) {
            console.log(`用户无仓库${warehouseId}管理权限，重定向到仓库列表`);
            errorMessage = `您没有管理此仓库的权限`;
            navigate('/warehouses');  // 无权限跳转到仓库列表
            permissionResult = false;
          }
        } else {
          // 只需要查看权限
          if (!canViewWarehouse(warehouseId)) {
            console.log(`用户无仓库${warehouseId}查看权限，重定向到仓库列表`);
            errorMessage = `您没有查看此仓库的权限`;
            navigate('/warehouses');  // 无权限跳转到仓库列表
            permissionResult = false;
          }
        }
      }

      setHasPermission(permissionResult);
      setPermissionError(errorMessage);
    } catch (error) {
      console.error('权限检查出错:', error);
      setPermissionError('权限验证过程中发生错误');
      setHasPermission(false);
    }
  }, [
    isLoading, 
    user,
    isAuthenticated,
    isRealUser,
    isAdmin,
    isVisitor,
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

  // 加载中状态
  if (isLoading || hasPermission === null) {
    return (
      <div className="flex flex-col items-center justify-center p-8 min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
        <p className="text-sm text-muted-foreground">正在验证权限...</p>
      </div>
    );
  }

  // 权限错误
  if (!hasPermission && permissionError) {
    return <ErrorHandler error={permissionError} />;
  }

  return (
    <Route
      path={path}
      exact={exact}
      {...rest}
    >
      {(params) => hasPermission ? <Component {...params} /> : null}
    </Route>
  );
};

export default ProtectedRoute;