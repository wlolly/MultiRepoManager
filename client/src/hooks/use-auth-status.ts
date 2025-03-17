import { useState, useEffect } from 'react';

/**
 * 认证状态Hook
 * 用于管理用户的认证状态
 * - isAuthenticated: 是否已认证（已登录）
 * - user: 当前用户信息（如果有）
 */
export function useAuthStatus() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 防止重复加载的状态标记
    const loadingKey = 'auth_status_loading';

    // 如果已经在加载中，跳过重复执行
    if (sessionStorage.getItem(loadingKey) === 'true') {
      console.log('认证状态检查已在进行中，跳过重复请求');
      return;
    }

    // 设置加载标记
    sessionStorage.setItem(loadingKey, 'true');
    
    // 记录开始检查认证状态的时间
    const startTime = performance.now();
    console.log('开始检查认证状态...');
    
    // 检查本地存储中的用户信息 - 提供快速的初始状态
    const checkStoredUser = () => {
      const storedUser = localStorage.getItem('currentUser');
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          setIsAuthenticated(true); // 存在用户信息，设置为已登录状态
        } catch (error) {
          console.error('解析存储的用户信息失败:', error);
          setIsAuthenticated(false);
          localStorage.removeItem('currentUser');
        }
      } else {
        setIsAuthenticated(false);
      }
    };

    // 检查服务器会话 - 获取最新状态
    const checkServerSession = async () => {
      try {
        // 添加随机查询参数，确保不会从缓存中获取结果
        const timestamp = new Date().getTime();
        const response = await fetch(`/api/auth/current-user?_t=${timestamp}`, {
          credentials: 'include', // 包含会话cookie
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'X-Requested-With': 'XMLHttpRequest',
            'Accept': 'application/json'
          }
        });
        
        console.log('认证检查响应状态:', response.status, response.statusText);
        
        if (response.ok) {
          const userData = await response.json();
          console.log('认证检查响应数据:', userData);
          
          // 存储用户数据并更新状态
          localStorage.setItem('currentUser', JSON.stringify(userData));
          setUser(userData);
          setIsAuthenticated(true);
          console.log('认证成功，用户已登录');
        } else {
          try {
            const errorData = await response.json();
            console.log('认证检查响应数据:', errorData);
            
            // 清除可能存在的用户数据
            localStorage.removeItem('currentUser');
            setUser(null);
            setIsAuthenticated(false);
            console.log('认证已过期，请重新登录');
          } catch (e) {
            // 如果响应不是JSON，则假设未登录
            localStorage.removeItem('currentUser');
            setUser(null);
            setIsAuthenticated(false);
            console.log('认证响应解析失败，用户未登录', e);
          }
        }
      } catch (error) {
        console.error('检查认证状态时出错:', error);
        // 网络错误，使用本地存储的结果
        console.log('网络错误，使用本地存储的用户信息');
      } finally {
        // 标记加载完成
        sessionStorage.removeItem(loadingKey);
        setLoading(false);
        // 计算并记录认证检查耗时
        const endTime = performance.now();
        console.log('认证状态检查完成，耗时', ((endTime - startTime) / 1000).toFixed(2), '秒');
      }
    };

    // 先快速检查本地存储获得初始状态
    checkStoredUser();
    
    // 然后验证服务器会话获得最新状态
    checkServerSession();
    
    // 清理函数 - 确保即使组件卸载也能清除加载标记
    return () => {
      sessionStorage.removeItem(loadingKey);
    };
  }, []);

  // 登出
  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error('登出时出错:', error);
    } finally {
      // 无论服务器响应如何，都清除本地状态
      localStorage.removeItem('currentUser');
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  // 更新认证状态（用于登录成功后）
  const updateAuthStatus = (newUser: any) => {
    if (newUser) {
      localStorage.setItem('currentUser', JSON.stringify(newUser));
      setUser(newUser);
      setIsAuthenticated(true);
    }
  };

  return {
    isAuthenticated,
    user,
    loading,
    logout,
    updateAuthStatus
  };
}