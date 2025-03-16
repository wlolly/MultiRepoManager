import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuthStatus } from '@/hooks/use-auth-status';
import { useTeamPermissions } from '@/hooks/use-team-permissions';

/**
 * 仓库权限钩子接口
 */
interface WarehousePermissionsHook {
  loading: boolean;
  // 仓库相关
  warehouses: Warehouse[];
  accessibleWarehouses: Warehouse[];
  managableWarehouses: Warehouse[];
  // 权限检查函数
  canViewWarehouse: (warehouseId: number) => boolean;
  canManageWarehouse: (warehouseId: number) => boolean;
  // 筛选函数
  getWarehousesByTeam: (teamId: number) => Warehouse[];
  // 刷新数据
  refreshWarehouseData: () => void;
}

/**
 * 仓库信息接口
 */
interface Warehouse {
  id: number;
  name: string;
  location: string;
  capacity: number;
  createdAt: string;
  // 权限信息 (运行时添加)
  canView?: boolean;
  canManage?: boolean;
  teamId?: number; // 拥有这个仓库的团队ID，如果属于多个团队则不设置
}

/**
 * 仓库权限接口
 */
interface WarehousePermission {
  warehouseId: number;
  canView: boolean;
  canManage: boolean;
  teamId: number;
}

/**
 * 仓库权限钩子
 * 用于管理仓库相关的权限和数据
 */
export function useWarehousePermissions(): WarehousePermissionsHook {
  const [loading, setLoading] = useState(true);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [warehousePermissions, setWarehousePermissions] = useState<WarehousePermission[]>([]);
  const [accessibleWarehouses, setAccessibleWarehouses] = useState<Warehouse[]>([]);
  const [managableWarehouses, setManagableWarehouses] = useState<Warehouse[]>([]);
  
  const { toast } = useToast();
  const { realAuthenticated, user } = useAuthStatus();
  const { activeTeamId } = useTeamPermissions();
  
  // 获取仓库和权限数据
  const fetchWarehouseData = async () => {
    try {
      setLoading(true);
      
      // 获取所有仓库列表
      const warehousesResponse = await fetch('/api/warehouses', {
        credentials: 'include'
      });
      
      let warehousesData: Warehouse[] = [];
      if (warehousesResponse.ok) {
        warehousesData = await warehousesResponse.json();
        setWarehouses(warehousesData);
      } else {
        console.error('获取仓库列表失败:', await warehousesResponse.text());
        setWarehouses([]);
      }
      
      // 未登录用户不获取权限数据
      if (!realAuthenticated) {
        setAccessibleWarehouses([]);
        setManagableWarehouses([]);
        setWarehousePermissions([]);
        setLoading(false);
        return;
      }
      
      // 获取仓库权限
      const permissionsResponse = await fetch('/api/permissions/warehouses', {
        credentials: 'include'
      });
      
      let permissions: Record<string, { canView: boolean, canManage: boolean }> = {};
      if (permissionsResponse.ok) {
        permissions = await permissionsResponse.json();
        
        // 转换权限格式并关联团队ID
        const permissionsArray: WarehousePermission[] = [];
        
        // 如果有活动团队，获取团队的仓库权限
        if (activeTeamId) {
          const teamWarehousesResponse = await fetch(`/api/teams/${activeTeamId}/warehouses`, {
            credentials: 'include'
          });
          
          if (teamWarehousesResponse.ok) {
            const teamWarehouseData = await teamWarehousesResponse.json();
            teamWarehouseData.forEach((item: any) => {
              permissionsArray.push({
                warehouseId: item.warehouseId,
                canView: true,
                canManage: item.canManage,
                teamId: activeTeamId
              });
            });
          }
        }
        
        // 合并API返回的通用权限
        Object.entries(permissions).forEach(([warehouseIdStr, permission]) => {
          const warehouseId = parseInt(warehouseIdStr);
          // 如果不存在该仓库的团队权限记录，添加一个通用记录
          if (!permissionsArray.some(p => p.warehouseId === warehouseId)) {
            permissionsArray.push({
              warehouseId,
              canView: permission.canView,
              canManage: permission.canManage,
              teamId: 0 // 0表示通用权限
            });
          }
        });
        
        setWarehousePermissions(permissionsArray);
        
        // 处理可访问和可管理的仓库列表
        const accessible = warehousesData.filter(wh => 
          permissionsArray.some(p => p.warehouseId === wh.id && p.canView)
        ).map(wh => {
          const permission = permissionsArray.find(p => p.warehouseId === wh.id);
          return {
            ...wh,
            canView: true,
            canManage: permission?.canManage || false,
            teamId: permission?.teamId
          };
        });
        
        setAccessibleWarehouses(accessible);
        
        const managable = accessible.filter(wh => wh.canManage);
        setManagableWarehouses(managable);
      } else {
        console.error('获取仓库权限失败:', await permissionsResponse.text());
        setWarehousePermissions([]);
        setAccessibleWarehouses([]);
        setManagableWarehouses([]);
      }
    } catch (error) {
      console.error('获取仓库数据时出错:', error);
      toast({
        title: "错误",
        description: "获取仓库数据失败，请重试",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  // 组件初始化时获取仓库数据
  useEffect(() => {
    fetchWarehouseData();
  }, [realAuthenticated, activeTeamId]);
  
  // 检查是否可以查看仓库
  const canViewWarehouse = (warehouseId: number): boolean => {
    // 管理员可以查看所有仓库
    if (user?.role === 'admin' || user?.role === 'super_admin') {
      return true;
    }
    
    // 检查权限
    return warehousePermissions.some(p => p.warehouseId === warehouseId && p.canView);
  };
  
  // 检查是否可以管理仓库
  const canManageWarehouse = (warehouseId: number): boolean => {
    // 管理员可以管理所有仓库
    if (user?.role === 'admin' || user?.role === 'super_admin') {
      return true;
    }
    
    // 检查权限
    return warehousePermissions.some(p => p.warehouseId === warehouseId && p.canManage);
  };
  
  // 获取特定团队的仓库
  const getWarehousesByTeam = (teamId: number): Warehouse[] => {
    return accessibleWarehouses.filter(wh => wh.teamId === teamId);
  };
  
  // 刷新仓库数据
  const refreshWarehouseData = () => {
    fetchWarehouseData();
  };
  
  return {
    loading,
    warehouses,
    accessibleWarehouses,
    managableWarehouses,
    canViewWarehouse,
    canManageWarehouse,
    getWarehousesByTeam,
    refreshWarehouseData
  };
}