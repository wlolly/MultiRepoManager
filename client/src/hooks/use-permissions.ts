import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';

// 页面权限类型
interface PagePermissions {
  [key: string]: boolean;
}

// 仓库权限类型
interface WarehousePermissions {
  [id: number]: {
    canView: boolean;
    canManage: boolean;
  };
}

// 页面权限检查结果
export interface PagePermissionResult {
  hasPermission: boolean;
  isAdmin: boolean;
  pageName: string;
  success: boolean;
}

// 权限钩子返回类型
interface PermissionsHook {
  loading: boolean;
  // 为了兼容某些组件
  isLoading: boolean;
  // 页面权限
  pagePermissions: PagePermissions;
  hasPagePermission: (pageName: string) => boolean;
  // 实时页面权限检查（异步）
  checkSpecificPagePermission: (pageName: string) => Promise<PagePermissionResult>;
  // 仓库权限
  warehousePermissions: WarehousePermissions;
  canViewWarehouse: (warehouseId: number) => boolean;
  canManageWarehouse: (warehouseId: number) => boolean;
  // 刷新权限
  refreshPermissions: () => void;
  // 认证状态
  isAuthenticated: boolean;
  isRealAuthenticated: boolean; // 真实认证状态
  isActive: boolean; // 账户活跃状态
  isAdmin: boolean; // 管理员状态
  setIsAuthenticated: (value: boolean) => void;
}

/**
 * 权限管理钩子
 * 用于获取并管理用户的页面和仓库权限
 */
export function usePermissions(): PermissionsHook {
  const [loading, setLoading] = useState(true);
  const [pagePermissions, setPagePermissions] = useState<PagePermissions>({});
  const [warehousePermissions, setWarehousePermissions] = useState<WarehousePermissions>({});
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isRealAuthenticated, setIsRealAuthenticated] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const { toast } = useToast();
  const [, navigate] = useLocation();

  // 获取权限数据
  const fetchPermissions = async () => {
    try {
      setLoading(true);
      
      // 获取当前用户信息，检查会话是否有效
      const currentUserResponse = await fetch('/api/auth/current-user', {
        credentials: 'include' // 包含会话cookie
      });
      
      // 解析响应
      const userData = await currentUserResponse.json();
      console.log('权限钩子获取用户数据:', userData);
      
      // 处理各种认证情况
      if (currentUserResponse.status === 200) {
        // 用户信息获取成功，保存到本地存储
        localStorage.setItem('currentUser', JSON.stringify(userData));
        
        // 处理访客用户 vs 真实用户
        if (userData.realAuthenticated === false || userData.id === -1) {
          console.log('检测到访客用户，id=-1 或 realAuthenticated=false');
          // 访客用户(假阳性登录) - 设置为未认证状态，但允许查看公开内容
          setIsAuthenticated(false);
          setIsRealAuthenticated(false);
          setIsActive(false);
          setIsAdmin(false);
        } else {
          // 真实用户 - 设置为已认证状态
          console.log('检测到真实登录用户');
          setIsAuthenticated(true);
          setIsRealAuthenticated(true);
          
          // 设置用户活跃状态
          setIsActive(userData.user?.isActive || true);
          
          // 设置管理员状态
          const userRole = userData.user?.role || '';
          const isAdminRole = userRole === 'admin' || userRole === 'super_admin';
          setIsAdmin(isAdminRole);
          
          console.log('用户角色信息:', {
            role: userRole,
            isAdmin: isAdminRole,
            isActive: userData.user?.isActive
          });
        }
      } else if (currentUserResponse.status === 401) {
        // 服务器回复未认证，设置为未认证状态
        console.log('服务器返回401未认证状态');
        setIsAuthenticated(false);
        
        // 可以处理假阳性登录的特殊服务器响应
        if (userData.fakePositive || userData.guestAccess) {
          console.log('检测到访客访问权限响应:', userData);
          // 创建一个访客用户对象并存储
          const guestUser = {
            id: -1,
            username: userData.fakeName || '访客用户',
            fullName: userData.fakeName || '访客用户',
            role: 'anonymous',
            userSource: 'local',
            fakePositive: true,
            realAuthenticated: false,
            authenticated: false,
            accessLevel: userData.accessLevel || 'limited'
          };
          
          localStorage.setItem('currentUser', JSON.stringify(guestUser));
          
          // 清除可能存在的旧数据
          localStorage.removeItem('pagePermissionsCache');
          localStorage.removeItem('warehousePermissionsCache');
          sessionStorage.removeItem('currentUser');
        } else {
          // 未认证且无访客权限，清除所有本地存储的用户信息
          localStorage.removeItem('currentUser');
          sessionStorage.removeItem('currentUser');
        }
        
        setLoading(false);
        return;
      }
      
      // 获取页面权限
      try {
        const pageResponse = await fetch('/api/permissions/pages', {
          credentials: 'include' // 包含会话cookie
        });
        
        if (pageResponse.ok) {
          // 成功获取权限
          const pageData = await pageResponse.json();
          console.log('获取到页面权限:', pageData);
          
          // 处理新的权限格式（兼容）
          if (pageData && typeof pageData === 'object' && !Array.isArray(pageData) && 'pages' in pageData) {
            // 新格式 - 包含pages数组和其他属性
            console.log('检测到新的权限格式，页面列表:', pageData.pages);
            
            // 转换为老格式的PagePermissions对象
            const convertedPermissions: PagePermissions = {};
            
            // 每个页面名称都设置为true
            (pageData.pages as string[]).forEach(page => {
              convertedPermissions[page] = true;
            });
            
            // 保存格式化后的权限
            setPagePermissions(convertedPermissions);
            
            // 保存原始格式用于高级功能
            localStorage.setItem('rawPermissionsData', JSON.stringify(pageData));
          } else {
            // 旧格式 - 直接使用
            setPagePermissions(pageData);
          }
        } else {
          // 请求失败，使用空权限
          console.log('页面权限请求失败，设置空权限');
          setPagePermissions({});
        }
      } catch (error) {
        console.error('获取页面权限时出错:', error);
        // 出错时使用空权限集合
        setPagePermissions({});
      }
      
      // 获取仓库权限
      try {
        const warehouseResponse = await fetch('/api/permissions/warehouses', {
          credentials: 'include' // 包含会话cookie
        });
        
        if (warehouseResponse.ok) {
          // 成功获取权限
          const warehouseData = await warehouseResponse.json();
          console.log('获取到仓库权限:', warehouseData);
          
          // 处理新的权限格式
          if (warehouseData && 
              typeof warehouseData === 'object' && 
              !Array.isArray(warehouseData) && 
              'warehouses' in warehouseData) {
            
            console.log('检测到新的仓库权限格式:', warehouseData.warehouses);
            
            // 转换为老格式的WarehousePermissions对象
            const convertedPermissions: WarehousePermissions = {};
            
            // 处理warehouses对象 - 预期格式为: { "1": { view: true, manage: false }, "2": {...} }
            const warehousesObj = warehouseData.warehouses;
            
            // 遍历新权限对象
            Object.keys(warehousesObj).forEach(warehouseId => {
              // 确保ID为数值
              const numericId = parseInt(warehouseId, 10);
              if (!isNaN(numericId)) {
                // 兼容格式 - 为老格式中的canView和canManage赋值
                convertedPermissions[numericId] = {
                  canView: warehousesObj[warehouseId].view || false,
                  canManage: warehousesObj[warehouseId].manage || false
                };
              }
            });
            
            // 保存转换后的权限
            setWarehousePermissions(convertedPermissions);
            
            // 也保存原始格式，以供高级功能使用
            localStorage.setItem('rawWarehousePermissionsData', JSON.stringify(warehouseData));
          } else {
            // 旧格式 - 直接使用
            setWarehousePermissions(warehouseData);
          }
        } else {
          // 请求失败，使用空权限
          console.log('仓库权限请求失败，设置空权限');
          setWarehousePermissions({});
        }
      } catch (error) {
        console.error('获取仓库权限时出错:', error);
        // 出错时使用空权限集合
        setWarehousePermissions({});
      }
    } catch (error) {
      console.error('获取权限失败:', error);
      // 使用console.log代替toast，避免出错
      console.error('权限加载失败：无法获取您的权限信息');
    } finally {
      setLoading(false);
    }
  };

  // 组件挂载时获取权限
  useEffect(() => {
    // 尝试获取当前会话信息，检查认证状态
    fetchPermissions();
    
    // 每15秒自动刷新权限，确保权限状态保持最新
    const intervalId = setInterval(() => {
      console.log('执行权限自动刷新...');
      // 清除权限缓存，确保重新从服务器获取
      localStorage.removeItem('pagePermissionsCache');
      localStorage.removeItem('warehousePermissionsCache');
      fetchPermissions();
    }, 15000);
    
    // 清理定时器
    return () => clearInterval(intervalId);
  }, []);

  // 检查页面权限 (通用检查，使用缓存的权限)
  const hasPagePermission = (pageName: string): boolean => {
    // 如果页面权限为空或未找到指定页面权限，默认返回false
    if (!pagePermissions || !pagePermissions[pageName]) {
      return false;
    }
    return pagePermissions[pageName];
  };

  // 检查特定页面权限 (实时检查)
  const checkSpecificPagePermission = async (pageName: string): Promise<{
    hasPermission: boolean;
    isAdmin: boolean;
    pageName: string;
    success: boolean;
  }> => {
    try {
      // 调用新端点检查特定页面权限
      const response = await fetch(`/api/permissions/check-page/${pageName}`, {
        method: 'GET',
        credentials: 'include'
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log(`页面[${pageName}]权限检查结果:`, result);
        return result;
      } else {
        console.error(`页面权限检查失败，状态码: ${response.status}`);
        // 请求失败返回无权限
        return {
          hasPermission: false,
          isAdmin: false,
          pageName,
          success: false
        };
      }
    } catch (error) {
      console.error(`检查页面[${pageName}]权限时出错:`, error);
      // 出错时返回无权限
      return {
        hasPermission: false,
        isAdmin: false,
        pageName,
        success: false
      };
    }
  };

  // 检查仓库查看权限
  const canViewWarehouse = (warehouseId: number): boolean => {
    // 如果仓库权限为空或未找到指定仓库权限，默认返回false
    if (!warehousePermissions || !warehousePermissions[warehouseId]) {
      return false;
    }
    return warehousePermissions[warehouseId].canView;
  };

  // 检查仓库管理权限
  const canManageWarehouse = (warehouseId: number): boolean => {
    // 如果仓库权限为空或未找到指定仓库权限，默认返回false
    if (!warehousePermissions || !warehousePermissions[warehouseId]) {
      return false;
    }
    return warehousePermissions[warehouseId].canManage;
  };

  // 刷新权限
  const refreshPermissions = () => {
    fetchPermissions();
  };

  return {
    loading,
    isLoading: loading, // 添加别名，保持兼容性
    pagePermissions,
    hasPagePermission,
    checkSpecificPagePermission, // 添加实时权限检查方法
    warehousePermissions,
    canViewWarehouse,
    canManageWarehouse,
    refreshPermissions,
    isAuthenticated,
    isRealAuthenticated,
    isActive,
    isAdmin,
    setIsAuthenticated
  };
}