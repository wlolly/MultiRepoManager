import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from "lucide-react";
import { useTranslation } from 'react-i18next';

/**
 * 登录成功重定向页面
 * 在这个页面中加载新的会话状态并重定向到首页
 */
export default function LoginRedirect() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [status, setStatus] = useState<string>(t('auth.loading_session'));
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    // 在加载页面时显示提示
    toast.success(t('auth.please_wait_verifying'));
    
    // 尝试从sessionStorage加载用户信息（从之前的登录页）
    const storedUserData = sessionStorage.getItem('currentUser');
    if (storedUserData) {
      try {
        const userData = JSON.parse(storedUserData);
        console.log('从SessionStorage恢复用户数据:', userData);
      } catch (e) {
        console.error('解析存储的用户数据时出错:', e);
      }
    }
    
    // 检查Cookie中的会话ID
    const cookieSessionId = document.cookie
      .split('; ')
      .find(row => row.startsWith('sessionId='))
      ?.split('=')[1];
    
    console.log('当前Cookie中的会话ID:', cookieSessionId);
    
    // 设置状态更新
    setStatus(t('auth.verifying_session'));
    
    // 获取当前用户信息，验证会话有效性
    fetch('/api/auth/current-user', {
      credentials: 'include', // 确保包含cookie
      headers: {
        'X-Client-Session-ID': cookieSessionId || '', // 提供会话ID作为备用
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Requested-With': 'XMLHttpRequest'
      }
    })
    .then(response => {
      console.log(`会话验证状态: ${response.status} ${response.statusText}`);
      if (!response.ok) {
        setError(`${t('auth.verification_error')}: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      console.log('会话验证响应数据:', data);
      
      // 检查是否是已认证用户或访客用户
      if (data.authenticated === true) {
        // 已认证用户处理流程
        setStatus(t('auth.session_verification_success'));
        console.log('认证用户会话验证成功:', data);
        
        // 确保保存完整的认证状态
        let userData;
        
        if (data.id !== undefined) {
          // 直接响应就是用户对象的情况
          userData = {
            ...data,
            authenticated: true,
            realAuthenticated: true
          };
          console.log('保存认证用户数据(直接格式):', userData);
        } else if (data.user) {
          // 用户数据在user字段内的情况
          userData = {
            ...data.user,
            authenticated: true,
            realAuthenticated: true
          };
          console.log('保存认证用户数据(嵌套格式):', userData);
        } else {
          // 回退情况：数据格式异常但仍然认证成功
          userData = {
            id: data.userId || 1,
            username: 'user',
            role: data.userRole || 'user',
            authenticated: true,
            realAuthenticated: true
          };
          console.log('保存认证用户数据(备用格式):', userData);
        }
        
        // 保存到存储中
        localStorage.setItem('currentUser', JSON.stringify(userData));
        sessionStorage.setItem('currentUser', JSON.stringify(userData));
        
        // 显示成功提示
        toast.success(t('auth.login_success'));
        
        // 使用延时确保数据已存储
        setTimeout(() => {
          setStatus(t('auth.verification_complete'));
          
          // 使用window.location重定向到首页
          window.location.href = '/';
        }, 1000);
      } else if (data.guestAccess === true) {
        // 访客用户处理流程
        setStatus(t('auth.guest_verification_success'));
        console.log('访客用户会话验证成功:', data);
        
        // 创建访客用户数据
        const guestUserData = {
          id: -1,
          username: t('auth.guest_user'),
          fullname: t('auth.guest_user'),
          role: 'anonymous',
          authenticated: false,
          realAuthenticated: false,
          guestAccess: true,
          permissions: data.permissions || {
            pages: ['dashboard'],
            actions: ['view'],
            warehouses: {}
          }
        };
        
        // 保存到存储中
        localStorage.setItem('currentUser', JSON.stringify(guestUserData));
        sessionStorage.setItem('currentUser', JSON.stringify(guestUserData));
        console.log('保存访客用户数据:', guestUserData);
        
        // 显示访客模式提示
        toast({
          title: t('auth.guest_mode_active'),
          description: t('auth.limited_features_available'),
          type: "default" // 修正为有效的类型值
        });
        
        // 使用延时确保数据已存储
        setTimeout(() => {
          setStatus(t('auth.verification_complete'));
          
          // 使用window.location重定向到首页
          window.location.href = '/';
        }, 1000);
      } else {
        // 验证失败的情况
        setError(t('auth.session_verification_failed'));
        console.error('会话验证失败:', data);
        toast.error(t('auth.session_verification_failed'));
        
        // 登录失败，留在此页面或重定向到登录页
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
      }
    })
    .catch(error => {
      setError(t('auth.verification_error'));
      console.error('会话验证请求错误:', error);
      toast.error(t('auth.error_try_again'));
      
      // 出错时重定向到登录页
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
    });
  }, [t, toast]);
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-blue-50 to-gray-100">
      <div className="w-[360px] p-8 bg-white rounded-xl shadow-lg text-center">
        <div className="flex flex-col items-center justify-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
          <h2 className="text-2xl font-bold">{status}</h2>
          {error ? (
            <div className="mt-4 p-3 bg-red-50 text-red-700 border border-red-200 rounded">
              <p className="text-sm font-medium">{error}</p>
              <p className="text-xs mt-1">{t('auth.redirecting_to_login')}</p>
            </div>
          ) : (
            <p className="text-gray-500">{t('auth.please_wait_verifying')}</p>
          )}
          
          {/* 登录处理提示 */}
          <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
            {t('auth.processing_login')}
          </div>
        </div>
      </div>
      
      {/* 会话调试信息 - 开发环境可用 */}
      {process.env.NODE_ENV !== 'production' && (
        <div className="mt-6 w-[90%] max-w-[800px] p-4 bg-gray-800 rounded-lg text-gray-300 text-xs">
          <div className="font-mono">
            <p>会话调试:</p>
            <p>• Cookie 会话ID: {document.cookie.includes('sessionId=') ? '✓ 存在' : '✗ 不存在'}</p>
            <p>• 请求时间: {new Date().toLocaleTimeString()}</p>
            <p>• 当前状态: {status}</p>
            <p>• 错误信息: {error || '无'}</p>
          </div>
        </div>
      )}
    </div>
  );
}