import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from "lucide-react";

/**
 * 登录成功重定向页面
 * 在这个页面中加载新的会话状态并重定向到首页
 */
export default function LoginRedirect() {
  const { toast } = useToast();
  
  useEffect(() => {
    // 在加载页面时显示提示
    toast.success("登录成功，正在跳转...");
    
    // 获取当前用户信息，验证会话有效性
    fetch('/api/auth/current-user', {
      credentials: 'include' // 确保包含cookie
    })
    .then(response => response.json())
    .then(data => {
      // 检查是否是已认证用户或假阳性登录(假阳性登录策略)
      if (data.authenticated || data.fakePositive) {
        console.log('会话验证成功或符合假阳性登录策略:', data);
        
        // 存储用户信息
        if (data.user) {
          localStorage.setItem('currentUser', JSON.stringify(data.user));
          sessionStorage.setItem('currentUser', JSON.stringify(data.user));
        } else if (data.fakePositive) {
          // 对于假阳性登录，创建一个访客用户对象
          const guestUser = {
            id: -1,
            username: data.fakeName || '访客用户',
            fullName: data.fakeName || '访客用户',
            role: 'anonymous',
            userSource: 'local',
            fakePositive: true,
            accessLevel: data.accessLevel || 'limited'
          };
          
          localStorage.setItem('currentUser', JSON.stringify(guestUser));
          sessionStorage.setItem('currentUser', JSON.stringify(guestUser));
          console.log('已创建假阳性登录访客用户:', guestUser);
        }
        
        // 使用延时确保数据已存储
        setTimeout(() => {
          // 使用window.location重定向到首页
          window.location.href = '/';
        }, 1000);
      } else {
        console.error('会话验证失败:', data);
        toast.error("登录会话验证失败，请重新登录");
        
        // 登录失败，留在此页面或重定向到登录页
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
      }
    })
    .catch(error => {
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
          <h2 className="text-2xl font-bold">正在载入会话...</h2>
          <p className="text-gray-500">请稍候，正在验证登录并跳转</p>
        </div>
      </div>
    </div>
  );
}