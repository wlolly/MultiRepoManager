import { useState, useEffect } from 'react';

/**
 * 认证状态Hook
 * 用于管理用户的认证状态
 * - isAuthenticated: 是否有任何认证状态（包括假阳性和真实登录）
 * - realAuthenticated: 是否真实登录（排除假阳性用户）
 * - user: 当前用户信息（如果有）
 */
export function useAuthStatus() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [realAuthenticated, setRealAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
          
          // 根据用户类型设置登录状态
          setIsAuthenticated(true); // 存在用户信息，至少处于"假阳性"登录状态
          
          // 根据用户属性判断是否为真实认证用户
          if (parsedUser.realAuthenticated === true || 
              (!parsedUser.fakePositive && parsedUser.id !== -1)) {
            setRealAuthenticated(true);
          } else {
            setRealAuthenticated(false);
          }
        } catch (error) {
          console.error('解析存储的用户信息失败:', error);
          setIsAuthenticated(false);
          setRealAuthenticated(false);
          localStorage.removeItem('currentUser');
        }
      } else {
        setIsAuthenticated(false);
        setRealAuthenticated(false);
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
          
          // 确保所有认证字段都正确设置
          userData.realAuthenticated = true; // 服务器确认为真实用户
          userData.authenticated = true;
          
          // 存储用户数据并更新状态
          localStorage.setItem('currentUser', JSON.stringify(userData));
          setUser(userData);
          setIsAuthenticated(true);
          setRealAuthenticated(true);
          console.log('认证成功，用户已登录');
        } else {
          // 尝试解析响应以检查假阳性登录
          try {
            const errorData = await response.json();
            if (errorData.fakePositive) {
              // 创建一个访客用户对象并存储
              const guestUser = {
                id: -1,
                username: errorData.fakeName || '访客用户',
                fullName: errorData.fakeName || '访客用户',
                role: 'anonymous',
                userSource: 'local',
                fakePositive: true,
                accessLevel: errorData.accessLevel || 'limited'
              };
              
              localStorage.setItem('currentUser', JSON.stringify(guestUser));
              setUser(guestUser);
              setIsAuthenticated(true);   // 假阳性登录也是一种认证状态
              setRealAuthenticated(false); // 但不是真实登录
              console.log('假阳性登录成功，使用访客账户');
            } else {
              // 清除可能存在的用户数据
              localStorage.removeItem('currentUser');
              setUser(null);
              setIsAuthenticated(false);
              setRealAuthenticated(false);
              console.log('认证失败，用户未登录');
            }
          } catch (e) {
            // 如果响应不是JSON，则假设未登录
            localStorage.removeItem('currentUser');
            setUser(null);
            setIsAuthenticated(false);
            setRealAuthenticated(false);
            console.log('认证响应解析失败，用户未登录', e);
          }
        }
      } catch (error) {
        console.error('检查认证状态时出错:', error);
        // 网络错误，使用本地存储的结果
        console.log('网络错误，使用本地存储的用户信息');
      } finally {
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
      setRealAuthenticated(false);
    }
  };

  // 更新认证状态（用于登录成功后）
  const updateAuthStatus = (newUser: any) => {
    if (newUser) {
      localStorage.setItem('currentUser', JSON.stringify(newUser));
      setUser(newUser);
      setIsAuthenticated(true);
      setRealAuthenticated(!newUser.fakePositive);
    }
  };

  return {
    isAuthenticated,
    realAuthenticated,
    user,
    loading,
    logout,
    updateAuthStatus
  };
}