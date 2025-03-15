import React from 'react';
import { Redirect } from 'wouter';
import { usePermissions } from '../hooks/use-permissions';
import { useTranslation } from 'react-i18next';

interface ProtectedRouteProps {
  component: React.ComponentType<any>;
  pageName: string;
  path?: string; // 可选，仅用于调试
}

/**
 * 受保护的路由组件
 * 用于根据用户权限控制页面访问
 */
export function ProtectedRoute({ component: Component, pageName, ...rest }: ProtectedRouteProps) {
  const { t } = useTranslation();
  const { hasPagePermission, isLoading } = usePermissions();
  
  // 如果权限数据正在加载，显示加载状态
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-center text-gray-600">{t('loading_permissions')}</p>
        </div>
      </div>
    );
  }
  
  // 检查权限
  const hasPermission = hasPagePermission(pageName);
  
  // 如果没有权限，根据默认设置显示拒绝访问页面或重定向
  if (!hasPermission) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
          <div className="text-red-500 text-center mb-4">
            <i className="ri-error-warning-line text-5xl"></i>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 text-center mb-4">
            {t('access_denied')}
          </h2>
          <p className="text-gray-600 text-center mb-6">
            {t('no_permission_message')}
          </p>
          <div className="flex justify-center">
            <Redirect to="/" />
          </div>
        </div>
      </div>
    );
  }
  
  // 有权限，渲染组件
  return <Component {...rest} />;
}

export default ProtectedRoute;