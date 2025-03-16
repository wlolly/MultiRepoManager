import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useToast } from '@/hooks/use-toast';

// 用户类型
export interface User {
  id: number;
  username: string;
  role: string;
  fullName?: string;
  isActive: boolean;
  authenticated: boolean;
  permissions?: {
    pages: string[];
    actions: string[];
    warehouses: Record<number, { canView: boolean, canManage: boolean }>;
  };
}

// 权限上下文类型
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isRealUser: boolean;
  isAdmin: boolean;
  isVisitor: boolean;
  pagePermissions: Record<string, boolean>;
  warehousePermissions: Record<number, { canView: boolean; canManage: boolean }>;
  hasPagePermission: (pageName: string) => boolean;
  canViewWarehouse: (warehouseId: number) => boolean;
  canManageWarehouse: (warehouseId: number) => boolean;
  refreshPermissions: () => Promise<void>;
  logout: () => Promise<void>;
  login?: (username: string, password: string) => Promise<void>;
  checkAuth?: () => Promise<void>;
}

// 创建上下文
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 权限提供者组件
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [pagePermissions, setPagePermissions] = useState<Record<string, boolean>>({});
  const [warehousePermissions, setWarehousePermissions] = useState<Record<number, { canView: boolean; canManage: boolean }>>({});
  const [isLoading, setIsLoading] = useState(true);
  const { addToast } = useToast();

  // 计算派生状态
  const isAuthenticated = !!user?.authenticated;
  const isRealUser = isAuthenticated && user !== null;
  const isAdmin = isRealUser && (user?.role === 'admin' || user?.role === 'super_admin');
  const isVisitor = !isRealUser;

  // 获取用户数据和权限
  const fetchUserAndPermissions = async () => {
    setIsLoading(true);
    try {
      // 1. 获取用户信息
      const userResponse = await fetch('/api/auth/current-user', {
        credentials: 'include'
      });
      
      if (userResponse.ok) {
        const userData = await userResponse.json();
        console.log('AuthContext - 获取到用户数据:', userData);
        setUser(userData);
        localStorage.setItem('currentUser', JSON.stringify(userData));
      } else if (userResponse.status === 401) {
        console.log('AuthContext - 用户未认证');
        setUser(null);
        localStorage.removeItem('currentUser');
      }

      // 2. 获取页面权限
      const pagesResponse = await fetch('/api/permissions/pages', {
        credentials: 'include'
      });
      
      if (pagesResponse.ok) {
        const pagesData = await pagesResponse.json();
        console.log('AuthContext - 获取到页面权限:', pagesData);
        setPagePermissions(pagesData);
      }

      // 3. 获取仓库权限
      const warehouseResponse = await fetch('/api/permissions/warehouses', {
        credentials: 'include'
      });
      
      if (warehouseResponse.ok) {
        const warehouseData = await warehouseResponse.json();
        console.log('AuthContext - 获取到仓库权限:', warehouseData);
        setWarehousePermissions(warehouseData);
      }
    } catch (error) {
      console.error('AuthContext - 获取用户或权限数据失败:', error);
      addToast({
        title: '权限数据加载失败',
        description: '无法获取用户权限信息，部分功能可能不可用',
        type: 'error'
      });
    } finally {
      setIsLoading(false);
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

      await fetchUserAndPermissions();
      addToast({
        title: '登录成功',
        description: '欢迎回到系统',
        type: 'success'
      });
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

  // 初始加载
  useEffect(() => {
    console.log('AuthContext - 初始化加载用户和权限数据');
    fetchUserAndPermissions();
  }, []);

  // 权限检查函数
  const hasPagePermission = (pageName: string): boolean => {
    if (isAdmin) return true; // 管理员有所有页面权限
    return pagePermissions[pageName] === true;
  };

  const canViewWarehouse = (warehouseId: number): boolean => {
    if (isAdmin) return true; // 管理员可查看所有仓库
    return warehousePermissions[warehouseId]?.canView === true;
  };

  const canManageWarehouse = (warehouseId: number): boolean => {
    if (isAdmin) return true; // 管理员可管理所有仓库
    return warehousePermissions[warehouseId]?.canManage === true;
  };

  // 登出函数
  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
      setUser(null);
      localStorage.removeItem('currentUser');
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

  // 上下文值
  const contextValue: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    isRealUser,
    isAdmin,
    isVisitor,
    pagePermissions,
    warehousePermissions,
    hasPagePermission,
    canViewWarehouse,
    canManageWarehouse,
    refreshPermissions: fetchUserAndPermissions,
    logout,
    login,
    checkAuth: fetchUserAndPermissions
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
    throw new Error('useAuth必须在AuthProvider内使用');
  }
  return context;
}
