/**
 * 权限系统工具函数
 * 用于处理权限相关的转换、验证和兼容性处理
 * 
 * 增强版本 - 增加权限缓存管理和实时更新机制
 */

import { Request } from 'express';
import { db } from '../db';
import * as schema from '../../shared/schema';
import { and, eq, inArray } from 'drizzle-orm';

// 权限缓存记录 - 用于跟踪权限刷新时间
const permissionCacheMap = new Map<number, {
  lastRefreshed: Date;
  permissions: PermissionSet;
}>();

// 权限缓存最大有效期 (毫秒) - 5分钟
const PERMISSION_CACHE_MAX_AGE = 5 * 60 * 1000;

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
 * 获取权限缓存，如果缓存不存在或已过期则返回null
 * @param userId 用户ID
 * @returns 缓存的权限集合或null
 */
export function getPermissionCache(userId: number): PermissionSet | null {
  const cached = permissionCacheMap.get(userId);
  
  if (!cached) {
    return null;
  }
  
  // 检查缓存是否过期
  const now = Date.now();
  const lastRefreshed = cached.lastRefreshed.getTime();
  
  if (now - lastRefreshed > PERMISSION_CACHE_MAX_AGE) {
    console.log(`[权限缓存] 用户${userId}的权限缓存已过期，需要刷新`);
    return null;
  }
  
  return cached.permissions;
}

/**
 * 设置权限缓存
 * @param userId 用户ID
 * @param permissions 权限集合
 */
export function setPermissionCache(userId: number, permissions: PermissionSet): void {
  permissionCacheMap.set(userId, {
    lastRefreshed: new Date(),
    permissions
  });
  
  console.log(`[权限缓存] 已更新用户${userId}的权限缓存`);
}

/**
 * 清除用户的权限缓存
 * @param userId 用户ID
 */
export function clearPermissionCache(userId: number): void {
  if (permissionCacheMap.has(userId)) {
    permissionCacheMap.delete(userId);
    console.log(`[权限缓存] 已清除用户${userId}的权限缓存`);
  }
}

/**
 * 清除所有用户的权限缓存
 */
export function clearAllPermissionCaches(): void {
  permissionCacheMap.clear();
  console.log(`[权限缓存] 已清除所有用户的权限缓存`);
}

/**
 * 在用户或团队权限变更时触发权限缓存更新
 * @param affectedUsers 受影响的用户ID列表
 * @param teamId 可选的团队ID，如果是团队权限变更
 * @returns 成功清除的缓存数量
 */
export function triggerPermissionUpdates(affectedUsers: number[], teamId?: number): number {
  let clearCount = 0;
  
  // 记录操作
  const operation = teamId ? `团队(ID=${teamId})权限变更` : '用户权限变更';
  console.log(`[权限系统] ${operation} 触发权限更新，影响用户: ${affectedUsers.join(', ')}`);
  
  // 清除指定用户的权限缓存
  for (const userId of affectedUsers) {
    if (permissionCacheMap.has(userId)) {
      clearPermissionCache(userId);
      clearCount++;
    }
  }
  
  // 记录结果
  console.log(`[权限系统] 已清除 ${clearCount}/${affectedUsers.length} 个用户的权限缓存`);
  
  return clearCount;
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
 * 合并多个权限集合，处理权限冲突
 * 当用户属于多个团队时，合并所有团队的权限
 * 权限合并规则：
 * 1. 页面权限取并集
 * 2. 操作权限取并集
 * 3. 仓库权限优先级：manage > view
 * 
 * @param permissionSets 权限集合数组
 * @returns 合并后的权限集合
 */
export function mergePermissions(permissionSets: PermissionSet[]): PermissionSet {
  // 如果没有权限集合，返回空权限
  if (permissionSets.length === 0) {
    return {
      pages: [],
      actions: [],
      warehouses: {},
      isAdmin: false,
      isSuperAdmin: false
    };
  }
  
  // 如果只有一个权限集合，直接返回
  if (permissionSets.length === 1) {
    return permissionSets[0];
  }
  
  // 合并多个权限集合
  const result: PermissionSet = {
    pages: [],
    actions: [],
    warehouses: {},
    isAdmin: false,
    isSuperAdmin: false
  };
  
  // 页面和操作权限使用Set取并集
  const pageSet = new Set<string>();
  const actionSet = new Set<string>();
  
  // 仓库权限合并
  const warehouseMap: Record<string, { view: boolean, manage: boolean }> = {};
  
  // 遍历所有权限集合
  for (const permissions of permissionSets) {
    // 合并Admin和SuperAdmin标志
    result.isAdmin = result.isAdmin || permissions.isAdmin === true;
    result.isSuperAdmin = result.isSuperAdmin || permissions.isSuperAdmin === true;
    
    // 合并页面权限
    for (const page of permissions.pages) {
      pageSet.add(page);
    }
    
    // 合并操作权限
    for (const action of permissions.actions) {
      actionSet.add(action);
    }
    
    // 合并仓库权限
    for (const [warehouseId, permission] of Object.entries(permissions.warehouses)) {
      if (!warehouseMap[warehouseId]) {
        warehouseMap[warehouseId] = { view: false, manage: false };
      }
      
      // 使用或操作合并权限
      warehouseMap[warehouseId].view = warehouseMap[warehouseId].view || permission.view;
      warehouseMap[warehouseId].manage = warehouseMap[warehouseId].manage || permission.manage;
    }
  }
  
  // 转换Set为数组
  result.pages = Array.from(pageSet);
  result.actions = Array.from(actionSet);
  result.warehouses = warehouseMap;
  
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
 * 从数据库加载用户权限
 * 首先尝试从缓存获取，如果缓存不存在或已过期则从数据库加载
 * 
 * @param userId 用户ID
 * @param sessionId 可选会话ID (用于日志记录)
 * @param userRole 可选用户角色 (用于优化权限判断)
 * @returns 用户权限集合
 */
export async function loadUserPermissions(
  userId: number,
  sessionId: string | null = null,
  userRole: string | null = null
): Promise<PermissionSet> {
  console.log(`[权限加载] 开始为用户${userId}加载权限数据...`);
  
  // 检查是否有缓存的权限数据
  const cachedPermissions = getPermissionCache(userId);
  if (cachedPermissions) {
    console.log(`[权限加载] 使用缓存的权限数据，用户ID: ${userId}`);
    return cachedPermissions;
  }
  
  // 缓存不存在或已过期，从数据库加载权限
  console.log(`[权限加载] 缓存不存在或已过期，从数据库加载权限，用户ID: ${userId}`);
  
  try {
    // 先查询用户角色(如果未提供)
    let role = userRole;
    if (!role) {
      const user = await db.query.users.findFirst({
        where: eq(schema.users.id, userId),
        columns: {
          role: true
        }
      });
      role = user?.role || null;
    }
    
    // 初始化默认权限
    const permissions: PermissionSet = {
      pages: [],
      actions: [],
      warehouses: {},
      isAdmin: role === 'admin' || role === 'super_admin',
      isSuperAdmin: role === 'super_admin'
    };
    
    // 如果是管理员，直接赋予所有权限
    if (permissions.isAdmin) {
      console.log(`[权限加载] 用户${userId}是管理员，赋予所有权限`);
      
      // 1. 页面权限
      permissions.pages = ['all']; // 所有页面
      
      // 2. 操作权限
      permissions.actions = ['all']; // 所有操作
      
      // 3. 对所有仓库赋予完全访问权限
      const allWarehouses = await db.query.warehouses.findMany({
        columns: {
          id: true
        }
      });
      
      for (const warehouse of allWarehouses) {
        permissions.warehouses[warehouse.id.toString()] = {
          view: true,
          manage: true
        };
      }
      
      // 缓存并返回管理员权限
      setPermissionCache(userId, permissions);
      return permissions;
    }
    
    // 非管理员，需要查询团队权限
    console.log(`[权限加载] 用户${userId}不是管理员，加载团队权限`);
    
    // 1. 查询用户所在的团队
    // 使用直接SQL查询，确保字段名正确
    console.log(`[权限加载] 直接使用SQL查询团队成员信息，用户ID: ${userId}`);
    const teamMembersResult = await db.$client`
      SELECT teamid, isadmin FROM team_members WHERE userid = ${userId}
    `;
    
    console.log(`[权限加载] SQL查询结果: `, teamMembersResult);
    
    // 确保正确提取teamId字段
    const teamIds = teamMembersResult.map(member => member.teamid);
    
    if (teamIds.length === 0) {
      console.log(`[权限加载] 用户${userId}不属于任何团队，仅有基本权限`);
      // 用户不属于任何团队，仅有基本权限
      permissions.pages = ['dashboard']; // 通常仅允许访问仪表盘
      permissions.actions = ['view'];     // 仅查看权限
      
      // 缓存并返回基本权限
      setPermissionCache(userId, permissions);
      return permissions;
    }
    
    // 如果用户在多个团队中，我们需要为每个团队计算权限并合并
    console.log(`[权限加载] 用户${userId}属于${teamIds.length}个团队，构建合并权限`);
    
    // 为每个团队创建独立的权限对象
    const teamPermissions: PermissionSet[] = [];
    
    // 为每个团队查询权限
    for (const teamId of teamIds) {
      // 检查用户在该团队的角色
      const isTeamAdmin = teamMembersResult.find(member => member.teamid === teamId)?.isadmin || false;
      
      // 创建团队特定的权限对象
      const teamPermission: PermissionSet = {
        pages: [],
        actions: isTeamAdmin ? ['view', 'edit'] : ['view'],
        warehouses: {},
        isAdmin: false,
        isSuperAdmin: false
      };
      
      // 2. 查询团队页面权限
      console.log(`[权限加载] 查询团队${teamId}的页面权限`);
      const pagePermissionsResult = await db.$client`
        SELECT page_name, can_access FROM team_page_permissions 
        WHERE teamid = ${teamId}
      `;
      
      // 收集有权限的页面
      for (const permission of pagePermissionsResult) {
        if (permission.can_access) {
          teamPermission.pages.push(permission.page_name);
        }
      }
      
      // 3. 查询团队仓库权限
      console.log(`[权限加载] 查询团队${teamId}的仓库权限`);
      const warehousePermissionsResult = await db.$client`
        SELECT warehouseid, can_view, can_manage FROM team_warehouse_permissions 
        WHERE teamid = ${teamId}
      `;
      
      // 收集仓库权限
      for (const permission of warehousePermissionsResult) {
        const warehouseId = permission.warehouseid.toString();
        teamPermission.warehouses[warehouseId] = {
          view: !!permission.can_view,
          manage: !!permission.can_manage
        };
      }
      
      // 将团队权限添加到权限集合
      teamPermissions.push(teamPermission);
    }
    
    // 使用高级合并策略合并多个团队权限
    if (teamPermissions.length > 0) {
      let mergedPermissions = teamPermissions[0];
      
      // 从第二个团队开始合并
      for (let i = 1; i < teamPermissions.length; i++) {
        // 使用最高权限策略合并权限
        mergedPermissions = resolvePermissionConflicts(
          mergedPermissions,
          teamPermissions[i],
          'higher_privilege'
        );
      }
      
      // 将合并后的权限应用到用户权限
      permissions.pages = mergedPermissions.pages;
      permissions.actions = mergedPermissions.actions;
      permissions.warehouses = mergedPermissions.warehouses;
    } else {
      // 如果计算权限失败，设置基本权限
      permissions.pages = ['dashboard'];
      permissions.actions = ['view'];
    }
    
    // 特别处理: 如果用户在任一团队中是管理员，确保拥有编辑权限
    if (teamMembersResult.some(member => member.isadmin) && !permissions.actions.includes('edit')) {
      permissions.actions.push('edit');
    }
    
    // 缓存并返回完整权限
    setPermissionCache(userId, permissions);
    console.log(`[权限加载] 成功加载用户${userId}的权限: 页面(${permissions.pages.length}), 仓库(${Object.keys(permissions.warehouses).length})`);
    return permissions;
  } catch (error) {
    console.error(`[权限加载] 加载用户${userId}权限时出错:`, error);
    
    // 发生错误时返回最小权限
    return {
      pages: ['dashboard'],
      actions: ['view'],
      warehouses: {},
      isAdmin: false,
      isSuperAdmin: false
    };
  }
}

/**
 * 解决多团队权限冲突的高级合并策略
 * 处理特殊场景下的权限合并需求，支持角色优先级和权限优先级
 * 
 * @param basePermissions 基础权限集合
 * @param newPermissions 新权限集合
 * @param mergeStrategy 合并策略 (默认为'higher_privilege')
 * @returns 合并后的权限集合
 */
export function resolvePermissionConflicts(
  basePermissions: PermissionSet, 
  newPermissions: PermissionSet,
  mergeStrategy: 'higher_privilege' | 'role_based' | 'explicit_deny' = 'higher_privilege'
): PermissionSet {
  console.log(`[权限冲突] 开始解决权限冲突，策略: ${mergeStrategy}`);
  console.log(`[权限冲突] 基础权限: ${JSON.stringify(basePermissions)}`);
  console.log(`[权限冲突] 新权限: ${JSON.stringify(newPermissions)}`);
  
  // 创建结果副本
  const result: PermissionSet = {
    pages: [...basePermissions.pages],
    actions: [...basePermissions.actions],
    warehouses: { ...basePermissions.warehouses },
    isAdmin: basePermissions.isAdmin || false,
    isSuperAdmin: basePermissions.isSuperAdmin || false
  };
  
  // 根据不同策略合并权限
  switch (mergeStrategy) {
    case 'higher_privilege':
      // 权限优先级策略：取最高权限
      // Admin和SuperAdmin状态取或
      result.isAdmin = result.isAdmin || newPermissions.isAdmin || false;
      result.isSuperAdmin = result.isSuperAdmin || newPermissions.isSuperAdmin || false;
      
      // 页面和操作权限取并集
      result.pages = Array.from(new Set([...result.pages, ...newPermissions.pages]));
      result.actions = Array.from(new Set([...result.actions, ...newPermissions.actions]));
      
      // 仓库权限取最高权限
      for (const [warehouseId, permission] of Object.entries(newPermissions.warehouses)) {
        if (!result.warehouses[warehouseId]) {
          result.warehouses[warehouseId] = { view: false, manage: false };
        }
        
        // 使用或操作取最高权限
        result.warehouses[warehouseId].view = result.warehouses[warehouseId].view || permission.view;
        result.warehouses[warehouseId].manage = result.warehouses[warehouseId].manage || permission.manage;
      }
      break;
      
    case 'role_based':
      // 角色优先级策略：高角色权限覆盖低角色权限
      // 如果新权限来自更高角色，完全覆盖基础权限
      if ((newPermissions.isSuperAdmin && !result.isSuperAdmin) || 
          (newPermissions.isAdmin && !result.isAdmin && !result.isSuperAdmin)) {
        result.pages = [...newPermissions.pages];
        result.actions = [...newPermissions.actions];
        result.warehouses = { ...newPermissions.warehouses };
        result.isAdmin = newPermissions.isAdmin || false;
        result.isSuperAdmin = newPermissions.isSuperAdmin || false;
      } 
      // 如果同级角色，合并权限
      else if ((newPermissions.isSuperAdmin && result.isSuperAdmin) ||
              (newPermissions.isAdmin && result.isAdmin) ||
              (!newPermissions.isAdmin && !result.isAdmin)) {
        // 页面和操作权限取并集
        result.pages = Array.from(new Set([...result.pages, ...newPermissions.pages]));
        result.actions = Array.from(new Set([...result.actions, ...newPermissions.actions]));
        
        // 仓库权限取最高权限
        for (const [warehouseId, permission] of Object.entries(newPermissions.warehouses)) {
          if (!result.warehouses[warehouseId]) {
            result.warehouses[warehouseId] = { view: false, manage: false };
          }
          
          // 使用或操作取最高权限
          result.warehouses[warehouseId].view = result.warehouses[warehouseId].view || permission.view;
          result.warehouses[warehouseId].manage = result.warehouses[warehouseId].manage || permission.manage;
        }
      }
      break;
      
    case 'explicit_deny':
      // 显式拒绝策略：明确的拒绝权限优先级最高
      // Admin和SuperAdmin状态取或
      result.isAdmin = result.isAdmin || newPermissions.isAdmin || false;
      result.isSuperAdmin = result.isSuperAdmin || newPermissions.isSuperAdmin || false;
      
      // 页面和操作权限取并集
      result.pages = Array.from(new Set([...result.pages, ...newPermissions.pages]));
      result.actions = Array.from(new Set([...result.actions, ...newPermissions.actions]));
      
      // 仓库权限处理：明确的拒绝优先
      for (const [warehouseId, permission] of Object.entries(newPermissions.warehouses)) {
        if (!result.warehouses[warehouseId]) {
          result.warehouses[warehouseId] = { view: false, manage: false };
        }
        
        // 如果新权限明确拒绝查看，则覆盖基础权限
        if (permission.view === false) {
          result.warehouses[warehouseId].view = false;
        } else if (permission.view === true) {
          result.warehouses[warehouseId].view = true;
        }
        
        // 如果新权限明确拒绝管理，则覆盖基础权限
        if (permission.manage === false) {
          result.warehouses[warehouseId].manage = false;
        } else if (permission.manage === true) {
          result.warehouses[warehouseId].manage = true;
        }
      }
      break;
  }
  
  console.log(`[权限冲突] 合并后权限: ${JSON.stringify(result)}`);
  return result;
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