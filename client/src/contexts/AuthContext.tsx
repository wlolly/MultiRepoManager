
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useToast } from '@/hooks/use-toast';

// 用户类型 - 使用全小写字段名与后端保持一致
export interface User {
  id: number;
  username: string;
  role: string;
  fullname?: string; // 全小写字段名
  isactive: boolean; // 全小写字段名
  authenticated: boolean;
  avatarurl?: string; // 全小写字段名
  usersource?: string; // 全小写字段名 (local, wechat, whatsapp等)
  permissions?: {
    pages: string[];
    actions: string[];
    warehouses: Record<number, { canView: boolean; canManage: boolean }>;
  };
}

// 认证状态
interface AuthState {
  user: User | null;
  isLoading: boolean;
  pagePermissions: Record<string, boolean>;
  warehousePermissions: Record<number, { canView: boolean; canManage: boolean }>;
}

// 上下文类型
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isRealUser: boolean;
  isAdmin: boolean;
  isVisitor: boolean;
  pagePermissions: Record<string, boolean>;
  warehousePermissions: Record<number, { canView: boolean; canManage: boolean }>;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasPagePermission: (pageName: string) => boolean;
  canViewWarehouse: (warehouseId: number) => boolean;
  canManageWarehouse: (warehouseId: number) => boolean;
}

// 创建上下文
const AuthContext = createContext<AuthContextType | null>(null);

// 认证提供者组件
export function AuthProvider({ children }: { children: ReactNode }) {
  const { addToast } = useToast();
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    pagePermissions: {},
    warehousePermissions: {}
  });

  // 获取用户数据和权限 - 支持简化登录流程
  const fetchUserAndPermissions = async () => {
    try {
      // 首先检查本地存储中是否有用户数据（简化登录使用）
      const storedUser = localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser');
      
      // 尝试从服务器获取用户信息
      const response = await fetch('/api/auth/current-user', {
        credentials: 'include'
      });
      
      console.log('认证检查响应状态:', response.status, response.statusText);
      
      if (response.ok) {
        const userData = await response.json();
        console.log('权限钩子获取用户数据:', userData);
        
        // 服务器返回有效数据
        setState(prev => ({
          ...prev,
          user: userData,
          isLoading: false,
          pagePermissions: userData.permissions?.pages.reduce((acc: Record<string, boolean>, page: string) => {
            acc[page] = true;
            return acc;
          }, {}) || {},
          warehousePermissions: userData.permissions?.warehouses || {}
        }));
      } else {
        // 服务器返回错误，检查错误类型
        const errorData = await response.json();
        console.log('认证检查响应数据:', errorData);
        
        // 如果服务器支持访客模式
        if (errorData.guestAccess) {
          console.log('认证已过期，请重新登录');
          
          // 检查本地存储的用户数据
          if (storedUser) {
            try {
              const parsedUser = JSON.parse(storedUser);
              if (parsedUser && (parsedUser.fakePositive || !parsedUser.realAuthenticated)) {
                // 本地存储有访客用户数据，使用它
                console.log('使用本地存储的访客用户数据:', parsedUser);
                setState(prev => ({
                  ...prev,
                  user: {
                    ...parsedUser,
                    authenticated: false
                  },
                  isLoading: false,
                  // 访客只有仪表盘权限
                  pagePermissions: { dashboard: true },
                  warehousePermissions: {}
                }));
                return;
              }
            } catch (e) {
              console.error('解析存储的用户数据出错:', e);
            }
          }
          
          // 没有有效的本地用户数据，设置为未登录状态
          setState(prev => ({ ...prev, user: null, isLoading: false }));
        } else {
          // 服务器不支持访客模式，设置为未登录状态
          setState(prev => ({ ...prev, user: null, isLoading: false }));
        }
      }
    } catch (error) {
      console.error('获取用户数据失败:', error);
      
      // 发生错误时，尝试从本地存储中获取用户数据
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          if (parsedUser && (parsedUser.fakePositive || !parsedUser.realAuthenticated)) {
            // 使用本地存储的访客用户数据
            console.log('使用本地存储的访客用户数据:', parsedUser);
            setState(prev => ({
              ...prev,
              user: {
                ...parsedUser,
                authenticated: false
              },
              isLoading: false,
              pagePermissions: { dashboard: true }, // 访客只有仪表盘权限
              warehousePermissions: {}
            }));
            return;
          }
        } catch (e) {
          console.error('解析存储的用户数据出错:', e);
        }
      }
      
      // 没有本地数据或解析失败，设置为未登录状态
      setState(prev => ({ ...prev, user: null, isLoading: false }));
    }
  };

  // 登录函数
  const login = async (username: string, password: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password })
      });

      if (!response.ok) {
        throw new Error('登录失败');
      }

      const data = await response.json();
      if (data.success) {
        await fetchUserAndPermissions();
        addToast({
          title: '登录成功',
          description: '欢迎回来！',
          type: 'success'
        });
      } else {
        throw new Error(data.message || '登录失败');
      }
    } catch (error) {
      console.error('登录失败:', error);
      addToast({
        title: '登录失败',
        description: '用户名或密码错误',
        type: 'error'
      });
      throw error;
    }
  };

  // 登出函数
  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
      setState(prev => ({ ...prev, user: null }));
      addToast({
        title: '已退出登录',
        description: '您已成功退出系统',
        type: 'success'
      });
    } catch (error) {
      console.error('退出登录失败:', error);
      addToast({
        title: '退出失败',
        description: '退出登录操作失败，请重试',
        type: 'error'
      });
    }
  };

  // 权限检查函数
  const hasPagePermission = (pageName: string): boolean => {
    if (state.user?.role === 'admin') return true;
    return state.pagePermissions[pageName] === true;
  };

  const canViewWarehouse = (warehouseId: number): boolean => {
    if (state.user?.role === 'admin') return true;
    return state.warehousePermissions[warehouseId]?.canView === true;
  };

  const canManageWarehouse = (warehouseId: number): boolean => {
    if (state.user?.role === 'admin') return true;
    return state.warehousePermissions[warehouseId]?.canManage === true;
  };

  // 初始加载
  useEffect(() => {
    console.log('AuthContext - 初始化加载用户和权限数据');
    fetchUserAndPermissions();
  }, []);

  // 创建上下文值，使用更新后的字段名
  const contextValue: AuthContextType = {
    user: state.user,
    isLoading: state.isLoading,
    isAuthenticated: Boolean(state.user?.authenticated),
    isRealUser: Boolean(state.user?.id && state.user?.id > 0),
    isAdmin: state.user?.role === 'admin',
    // 检查用户是否为访客 (id <= 0 或不存在或未激活)
    isVisitor: !state.user || !state.user.id || state.user.id <= 0 || state.user.isactive === false,
    pagePermissions: state.pagePermissions,
    warehousePermissions: state.warehousePermissions,
    login,
    logout,
    hasPagePermission,
    canViewWarehouse,
    canManageWarehouse
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// 自定义钩子
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
