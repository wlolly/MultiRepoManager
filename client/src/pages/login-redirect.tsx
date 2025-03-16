import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from "lucide-react";

/**
 * 登录成功重定向页面
 * 在这个页面中加载新的会话状态并重定向到首页
 */
export default function LoginRedirect() {
  const { toast } = useToast();
  const [status, setStatus] = useState<string>('正在载入会话...');
  const [error, setError] = useState<string | null>(null);
  
  // 登录重定向处理
  
  useEffect(() => {
    // 在加载页面时显示提示
    toast.success("登录成功，正在验证会话...");
    
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
    setStatus('正在验证会话状态...');
    
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
        setError(`服务器返回错误: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      console.log('会话验证响应数据:', data);
      
      // 检查是否是已认证用户或假阳性登录(假阳性登录策略)
      if (data.authenticated || data.realAuthenticated) {
        setStatus('会话验证成功，准备跳转...');
        console.log('会话验证成功或符合登录策略:', data);
        
        // 存储用户信息
        if (data.id !== undefined) {
          // 直接数据就是用户对象的情况
          const userData = {
            ...data,
            realAuthenticated: data.realAuthenticated
          };
          localStorage.setItem('currentUser', JSON.stringify(userData));
          sessionStorage.setItem('currentUser', JSON.stringify(userData));
          console.log('保存用户数据(直接格式):', userData);
        } else if (data.user) {
          // 用户数据在user字段内的情况
          const userData = {
            ...data.user,
            realAuthenticated: data.realAuthenticated
          };
          localStorage.setItem('currentUser', JSON.stringify(userData));
          sessionStorage.setItem('currentUser', JSON.stringify(userData));
          console.log('保存用户数据(嵌套格式):', userData);
        } else if (data.fakePositive) {
          // 对于假阳性登录，创建一个访客用户对象
          const guestUser = {
            id: -1,
            username: data.fakeName || '访客用户',
            fullName: data.fakeName || '访客用户',
            role: 'anonymous',
            userSource: 'local',
            fakePositive: true,
            realAuthenticated: false,
            accessLevel: data.accessLevel || 'limited'
          };
          
          localStorage.setItem('currentUser', JSON.stringify(guestUser));
          sessionStorage.setItem('currentUser', JSON.stringify(guestUser));
          console.log('已创建假阳性登录访客用户:', guestUser);
        }
        
        // 使用延时确保数据已存储
        setTimeout(() => {
          setStatus('验证完成，正在跳转...');
          
          // 确保会话状态已保存
          
          // 使用window.location重定向到首页
          window.location.href = '/';
        }, 1000);
      } else {
        setError('会话验证失败');
        console.error('会话验证失败:', data);
        toast.error("登录会话验证失败，请重新登录");
        
        // 登录失败，留在此页面或重定向到登录页
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
      }
    })
    .catch(error => {
      setError('验证过程出错');
      console.error('会话验证请求错误:', error);
      toast.error("验证过程中发生错误，请重试");
      
      // 出错时重定向到登录页
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
    });
  }, []);
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-blue-50 to-gray-100">
      <div className="w-[360px] p-8 bg-white rounded-xl shadow-lg text-center">
        <div className="flex flex-col items-center justify-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
          <h2 className="text-2xl font-bold">{status}</h2>
          {error ? (
            <div className="mt-4 p-3 bg-red-50 text-red-700 border border-red-200 rounded">
              <p className="text-sm font-medium">{error}</p>
              <p className="text-xs mt-1">正在重定向到登录页...</p>
            </div>
          ) : (
            <p className="text-gray-500">请稍候，正在验证登录并跳转</p>
          )}
          
          {/* 测试用户特别提示 */}
          {isTestUser && (
            <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-700">
              检测到测试用户登录，正在特殊处理...
            </div>
          )}
        </div>
      </div>
      
      {/* 会话调试信息 - 开发环境可用 */}
      {process.env.NODE_ENV !== 'production' && (
        <div className="mt-6 w-[90%] max-w-[800px] p-4 bg-gray-800 rounded-lg text-gray-300 text-xs">
          <div className="font-mono">
            <p>会话调试:</p>
            <p>• Cookie 会话ID: {document.cookie.includes('sessionId=') ? '✓ 存在' : '✗ 不存在'}</p>
            <p>• 测试用户模式: {isTestUser ? '✓ 是' : '✗ 否'}</p>
            <p>• 当前状态: {status}</p>
            <p>• 错误信息: {error || '无'}</p>
          </div>
        </div>
      )}
    </div>
  );
}