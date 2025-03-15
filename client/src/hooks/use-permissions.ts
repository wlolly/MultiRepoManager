/**
 * 权限Hook
 * 用于获取和检查用户权限
 */

import { useQuery } from '@tanstack/react-query';

// 页面权限接口
interface PagePermissions {
  [pageName: string]: boolean;
}

// 仓库权限接口
interface WarehousePermission {
  canView: boolean;
  canManage: boolean;
}

interface WarehousePermissions {
  [warehouseId: number]: WarehousePermission;
}

/**
 * 权限Hook
 * 用于获取和检查当前用户的页面和仓库权限
 */
export function usePermissions() {
  // 获取页面权限
  const {
    data: pagePermissions,
    isLoading: isLoadingPagePermissions,
    error: pagePermissionsError
  } = useQuery<PagePermissions>({
    queryKey: ['/api/permissions/pages'],
    retry: 1, // 权限不存在时不要重试太多次
  });

  // 获取仓库权限
  const {
    data: warehousePermissions,
    isLoading: isLoadingWarehousePermissions,
    error: warehousePermissionsError
  } = useQuery<WarehousePermissions>({
    queryKey: ['/api/permissions/warehouses'],
    retry: 1, // 权限不存在时不要重试太多次
  });

  /**
   * 检查是否有特定页面的访问权限
   * @param pageName 页面名称
   */
  const hasPagePermission = (pageName: string): boolean => {
    // 恢复原始权限检查逻辑
    if (!pagePermissions) return false;
    return pagePermissions[pageName] === true;
  };

  /**
   * 检查是否有特定仓库的查看权限
   * @param warehouseId 仓库ID
   */
  const canViewWarehouse = (warehouseId: number): boolean => {
    // 恢复原始权限检查逻辑
    if (!warehousePermissions) return false;
    const permission = warehousePermissions[warehouseId];
    return permission?.canView === true;
  };

  /**
   * 检查是否有特定仓库的管理权限
   * @param warehouseId 仓库ID
   */
  const canManageWarehouse = (warehouseId: number): boolean => {
    // 恢复原始权限检查逻辑
    if (!warehousePermissions) return false;
    const permission = warehousePermissions[warehouseId];
    return permission?.canManage === true;
  };

  // 获取用户可以查看的所有仓库ID列表
  const getViewableWarehouseIds = (): number[] => {
    // 恢复原始权限检查逻辑
    if (!warehousePermissions) return [];
    return Object.entries(warehousePermissions)
      .filter(([, permission]) => permission.canView)
      .map(([id]) => parseInt(id));
  };

  // 获取用户可以管理的所有仓库ID列表
  const getManageableWarehouseIds = (): number[] => {
    // 恢复原始权限检查逻辑
    if (!warehousePermissions) return [];
    return Object.entries(warehousePermissions)
      .filter(([, permission]) => permission.canManage)
      .map(([id]) => parseInt(id));
  };

  // 检查权限是否正在加载
  const isLoading = isLoadingPagePermissions || isLoadingWarehousePermissions;
  
  // 检查是否有错误
  const error = pagePermissionsError || warehousePermissionsError;

  return {
    pagePermissions,
    warehousePermissions,
    isLoading,
    error,
    hasPagePermission,
    canViewWarehouse,
    canManageWarehouse,
    getViewableWarehouseIds,
    getManageableWarehouseIds
  };
}