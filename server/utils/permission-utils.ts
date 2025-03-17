/**
 * 权限系统工具函数
 * 用于处理权限相关的转换、验证和兼容性处理
 */

import { Request } from 'express';

/**
 * 权限集合类型
 */
export interface PermissionSet {
  pages: string[];
  actions: string[];
  warehouses: Record<string, { view: boolean, manage: boolean }>;
  isAdmin?: boolean;
  isSuperAdmin?: boolean;
}

/**
 * 仓库权限类型（兼容新旧两种格式）
 */
export type WarehousePermission = 
  | { view: boolean, manage: boolean } 
  | { canView: boolean, canManage: boolean };

/**
 * 标准化仓库权限对象
 * 将canView/canManage格式转换为view/manage格式
 * @param permission 仓库权限对象
 * @returns 标准化的权限对象 (view/manage格式)
 */
export function normalizeWarehousePermission(permission: WarehousePermission): { view: boolean, manage: boolean } {
  if ('canView' in permission) {
    return {
      view: permission.canView,
      manage: permission.canManage
    };
  }
  return permission;
}

/**
 * 从请求会话中获取标准化的权限集合
 * 优先使用新版权限格式（permissions对象），兼容旧版格式
 * @param req Express请求对象  
 * @returns 标准化的权限集合
 */
export function getPermissionsFromRequest(req: Request): PermissionSet {
  // 初始化默认空权限
  const defaultPermissions: PermissionSet = {
    pages: [],
    actions: [],
    warehouses: {},
    isAdmin: false,
    isSuperAdmin: false
  };

  // 如果没有会话，返回默认空权限
  if (!req.session) {
    return defaultPermissions;
  }

  // 优先使用新版权限格式
  if (req.session.permissions) {
    const permissions = req.session.permissions;
    
    // 确保warehouses属性存在且是标准格式
    const warehouses: Record<string, { view: boolean, manage: boolean }> = {};
    
    if (permissions.warehouses) {
      for (const [warehouseId, permission] of Object.entries(permissions.warehouses)) {
        warehouses[warehouseId] = normalizeWarehousePermission(permission);
      }
    }

    return {
      pages: permissions.pages || [],
      actions: permissions.actions || [],
      warehouses,
      isAdmin: permissions.isAdmin === true || req.session.isAdmin === true,
      isSuperAdmin: permissions.isSuperAdmin === true || req.session.hasSuperAccess === true
    };
  }

  // 兼容旧版格式
  const warehousePermissions = req.session.warehousePermissions || {};
  
  return {
    pages: req.session.pagePermissions || [],
    actions: req.session.actionPermissions || [],
    warehouses: warehousePermissions,
    isAdmin: req.session.isAdmin === true,
    isSuperAdmin: req.session.hasSuperAccess === true
  };
}

/**
 * 将仓库权限格式统一化
 * 确保所有仓库权限都是标准的view/manage格式
 * @param warehouses 仓库权限映射
 * @returns 标准化的仓库权限映射
 */
export function normalizeWarehousePermissions(
  warehouses: Record<string, WarehousePermission>
): Record<string, { view: boolean, manage: boolean }> {
  const result: Record<string, { view: boolean, manage: boolean }> = {};
  
  for (const [warehouseId, permission] of Object.entries(warehouses)) {
    result[warehouseId] = normalizeWarehousePermission(permission);
  }
  
  return result;
}

/**
 * 保存权限到请求会话，同时保存新旧两种格式
 * @param req Express请求对象
 * @param permissions 权限集合
 */
export function savePermissionsToSession(req: Request, permissions: PermissionSet): void {
  if (!req.session) {
    return;
  }
  
  // 保存旧版格式
  req.session.pagePermissions = permissions.pages;
  req.session.actionPermissions = permissions.actions;
  req.session.warehousePermissions = permissions.warehouses;
  req.session.isAdmin = permissions.isAdmin || false;
  req.session.hasSuperAccess = permissions.isSuperAdmin || false;
  
  // 保存新版格式
  req.session.permissions = {
    pages: permissions.pages,
    actions: permissions.actions,
    warehouses: permissions.warehouses,
    isAdmin: permissions.isAdmin || false,
    isSuperAdmin: permissions.isSuperAdmin || false
  };
}

/**
 * 检查用户是否拥有特定页面的访问权限
 * @param req Express请求对象
 * @param pageName 页面名称
 * @returns 是否有权限访问
 */
export function hasPagePermission(req: Request, pageName: string): boolean {
  const permissions = getPermissionsFromRequest(req);
  
  // 管理员拥有所有页面权限
  if (permissions.isAdmin) {
    return true;
  }
  
  return permissions.pages.includes(pageName);
}

/**
 * 检查用户是否拥有特定操作的权限
 * @param req Express请求对象
 * @param actionName 操作名称
 * @returns 是否有权限执行该操作
 */
export function hasActionPermission(req: Request, actionName: string): boolean {
  const permissions = getPermissionsFromRequest(req);
  
  // 管理员拥有所有操作权限
  if (permissions.isAdmin) {
    return true;
  }
  
  return permissions.actions.includes(actionName);
}

/**
 * 检查用户是否拥有特定仓库的访问或管理权限
 * @param req Express请求对象
 * @param warehouseId 仓库ID
 * @param permissionType 权限类型：'view'表示查看权限，'manage'表示管理权限
 * @returns 是否有相应权限
 */
export function hasWarehousePermission(
  req: Request, 
  warehouseId: number | string, 
  permissionType: 'view' | 'manage'
): boolean {
  const permissions = getPermissionsFromRequest(req);
  
  // 超级管理员拥有所有仓库的所有权限
  if (permissions.isSuperAdmin) {
    return true;
  }
  
  // 管理员拥有所有仓库的所有权限
  if (permissions.isAdmin) {
    return true;
  }
  
  const warehouseIdStr = warehouseId.toString();
  const warehousePermission = permissions.warehouses[warehouseIdStr];
  
  if (!warehousePermission) {
    return false;
  }
  
  return warehousePermission[permissionType] === true;
}

/**
 * 获取用户有权限访问的仓库ID列表
 * @param req Express请求对象
 * @param permissionType 权限类型：'view'表示查看权限，'manage'表示管理权限
 * @returns 仓库ID列表
 */
export function getAccessibleWarehouseIds(
  req: Request, 
  permissionType: 'view' | 'manage' = 'view'
): string[] {
  const permissions = getPermissionsFromRequest(req);
  
  // 管理员可以访问所有仓库
  if (permissions.isAdmin || permissions.isSuperAdmin) {
    // 注意：这里应该返回所有仓库的ID，但由于这个函数不访问数据库，
    // 所以只能返回已经在权限中定义的仓库ID
    return Object.keys(permissions.warehouses);
  }
  
  return Object.entries(permissions.warehouses)
    .filter(([_, permission]) => permission[permissionType])
    .map(([warehouseId, _]) => warehouseId);
}