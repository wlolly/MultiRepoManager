/**
 * 权限中间件
 * 提供统一的权限验证和管理功能
 */
import { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import * as schema from '../../shared/schema';
import { eq } from 'drizzle-orm';

/**
 * 根据用户角色获取默认权限
 */
function getDefaultPermissionsByRole(role?: string | null) {
  // 基础页面权限（所有已认证用户）
  const basePages = ['dashboard', 'profile', 'products'];
  const baseActions = ['view'];
  
  // 基于角色的权限
  switch (role) {
    case 'super_admin':
      return {
        pages: ['all'],
        actions: ['all'],
        warehouses: { all: { view: true, manage: true } }
      };
    case 'admin':
      return {
        pages: [
          ...basePages,
          'users',
          'teams',
          'warehouses',
          'inbound-orders',
          'outbound-orders',
          'order-audit',
          'warehouse-transfers',
          'warehouse-reports',
          'settings',
          'api-configurations',
          'team-permissions'
        ],
        actions: ['view', 'create', 'edit', 'delete', 'export', 'import'],
        warehouses: { all: { view: true, manage: true } }
      };
    case 'user':
    default:
      return {
        pages: basePages,
        actions: baseActions,
        warehouses: {}
      };
  }
}

/**
 * 验证管理员权限
 * 更严格的管理员权限验证，确保：
 * 1. 用户必须存在且处于活跃状态
 * 2. 用户必须具有正确的角色
 * 3. 会话必须有效且包含正确的权限标记
 */
async function verifyAdminAccess(userId: number, req: Request): Promise<boolean> {
  try {
    // 检查用户是否存在且处于活跃状态
    const user = await db.select({
      id: schema.users.id,
      role: schema.users.role,
      isactive: schema.users.isactive
    })
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .limit(1);

    if (!user || user.length === 0 || !user[0].isactive) {
      console.log(`[权限验证] 用户${userId}不存在或未激活`);
      return false;
    }

    const isAdminRole = user[0].role === 'admin' || user[0].role === 'super_admin';
    if (!isAdminRole) {
      console.log(`[权限验证] 用户${userId}不是管理员角色`);
      return false;
    }

    // 验证会话状态
    if (!req.session?.authenticated && !req.session?.isAuthenticated) {
      console.log(`[权限验证] 用户${userId}会话未认证`);
      return false;
    }

    // 验证会话中的权限标记
    const hasAdminFlag = req.session.isAdmin === true || req.session.hasSuperAccess === true;
    if (!hasAdminFlag) {
      console.log(`[权限验证] 用户${userId}会话中缺少管理员标记`);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[权限验证] 验证管理员权限时出错:', error);
    return false;
  }
}

/**
 * 加载用户权限
 * @param userId 用户ID
 * @param req Express请求对象
 * @param role 用户角色（可选）
 * @returns 用户权限集合
 */
export async function loadUserPermissions(
  userId: number, 
  req: Request,
  role?: string | null
): Promise<{
  pages: string[],
  actions: string[],
  warehouses: Record<string, { view: boolean, manage: boolean }>
}> {
  try {
    // 如果没有提供角色，从数据库中获取用户角色
    if (!role && userId > 0) {
      const userResult = await db.select({ 
        role: schema.users.role,
        isactive: schema.users.isactive 
      })
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1);
      
      if (!userResult || userResult.length === 0 || !userResult[0].isactive) {
        console.log(`[权限加载] 用户${userId}不存在或未激活`);
        return getDefaultPermissionsByRole(null);
      }
      
      role = userResult[0].role;
    }
    
    // 首先获取基于角色的默认权限
    const defaultPermissions = getDefaultPermissionsByRole(role);
    
    // 检查是否是管理员角色
    const isAdminRole = role === 'super_admin' || role === 'admin';
    
    // 如果是管理员，进行严格的权限验证
    if (isAdminRole) {
      const hasAdminAccess = await verifyAdminAccess(userId, req);
      if (!hasAdminAccess) {
        console.log(`[权限加载] 用户${userId}管理员权限验证失败，降级为普通用户权限`);
        return getDefaultPermissionsByRole('user');
      }
      
      console.log(`[权限加载] 用户${userId}管理员权限验证通过，设置完整权限`);
      
      // 将权限保存到会话
      req.session.pagePermissions = defaultPermissions.pages;
      req.session.actionPermissions = defaultPermissions.actions;
      
      if (!req.session.permissions) {
        req.session.permissions = {
          pages: [],
          actions: [],
          warehouses: {},
          isAdmin: true,
          isSuperAdmin: role === 'super_admin'
        };
      }
      
      // 更新会话中的权限信息
      req.session.permissions = {
        ...req.session.permissions,
        ...defaultPermissions,
        isAdmin: true,
        isSuperAdmin: role === 'super_admin'
      };
      
      return defaultPermissions;
    }
    
    // 非管理员用户，加载团队权限
    try {
      // 获取用户所属的团队
      const teamMembers = await db.select()
        .from(schema.teamMembers)
        .where(eq(schema.teamMembers.userId, userId));
      
      // 如果用户属于任何团队，获取团队权限
      if (teamMembers && teamMembers.length > 0) {
        const teamIds = teamMembers.map(tm => tm.teamId);
        
        // 获取团队页面权限
        const pagePermissions = await db.select()
          .from(schema.teamPagePermissions)
          .where(eq(schema.teamPagePermissions.teamId, teamIds[0])); // 暂时只取第一个团队的权限
        
        // 获取团队仓库权限
        const warehousePermissions = await db.select()
          .from(schema.teamWarehousePermissions)
          .where(eq(schema.teamWarehousePermissions.teamId, teamIds[0]));
        
        // 合并团队权限到默认权限
        const mergedPermissions = {
          pages: [
            ...new Set([
              ...defaultPermissions.pages,
              ...pagePermissions.map(p => p.pageName)
            ])
          ],
          actions: defaultPermissions.actions,
          warehouses: {
            ...defaultPermissions.warehouses,
            ...Object.fromEntries(
              warehousePermissions.map(wp => [
                wp.warehouseId.toString(),
                { view: wp.canView, manage: wp.canManage }
              ])
            )
          }
        };
        
        // 保存到会话
        req.session.pagePermissions = mergedPermissions.pages;
        req.session.actionPermissions = mergedPermissions.actions;
        
        if (!req.session.permissions) {
          req.session.permissions = {
            pages: [],
            actions: [],
            warehouses: {},
            isAdmin: false,
            isSuperAdmin: false
          };
        }
        
        req.session.permissions = {
          ...req.session.permissions,
          ...mergedPermissions,
          isAdmin: false,
          isSuperAdmin: false
        };
        
        return mergedPermissions;
      }
    } catch (error) {
      console.error('[权限加载] 加载团队权限失败:', error);
      // 如果加载团队权限失败，返回默认权限
    }
    
    // 如果没有团队权限或加载失败，返回默认权限
    return defaultPermissions;
  } catch (error) {
    console.error('[权限加载] 加载用户权限失败:', error);
    return getDefaultPermissionsByRole(null);
  }
}

/**
 * 验证页面访问权限
 */
export function hasPageAccess(req: Request, pageName: string): boolean {
  const permissions = req.session?.permissions || { pages: [], isAdmin: false };
  
  // 管理员拥有所有页面权限
  if (permissions.isAdmin) {
    return true;
  }
  
  // 检查是否有'all'权限或特定页面权限
  return permissions.pages.includes('all') || permissions.pages.includes(pageName);
}

/**
 * 验证操作权限
 */
export function hasActionPermission(req: Request, actionName: string): boolean {
  const permissions = req.session?.permissions || { actions: [], isAdmin: false };
  
  // 管理员拥有所有操作权限
  if (permissions.isAdmin) {
    return true;
  }
  
  // 检查是否有'all'权限或特定操作权限
  return permissions.actions.includes('all') || permissions.actions.includes(actionName);
}

/**
 * 验证仓库访问权限
 */
export function hasWarehouseAccess(
  req: Request, 
  warehouseId: number | string,
  accessType: 'view' | 'manage'
): boolean {
  const permissions = req.session?.permissions || { warehouses: {}, isAdmin: false };
  
  // 管理员拥有所有仓库的完整权限
  if (permissions.isAdmin) {
    return true;
  }
  
  // 检查是否有全局仓库权限
  if (permissions.warehouses.all) {
    return permissions.warehouses.all[accessType] === true;
  }
  
  // 检查特定仓库权限
  const warehousePermissions = permissions.warehouses[warehouseId.toString()];
  return warehousePermissions ? warehousePermissions[accessType] === true : false;
}

/**
 * 管理员权限中间件
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.userId) {
    return res.status(401).json({
      success: false,
      message: '未登录'
    });
  }
  
  verifyAdminAccess(req.session.userId, req)
    .then(hasAccess => {
      if (hasAccess) {
        next();
      } else {
        res.status(403).json({
          success: false,
          message: '需要管理员权限'
        });
      }
    })
    .catch(error => {
      console.error('[权限中间件] 验证管理员权限时出错:', error);
      res.status(500).json({
        success: false,
        message: '验证权限时出错'
      });
    });
}

/**
 * 页面访问权限中间件
 */
export function requirePageAccess(pageName: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (hasPageAccess(req, pageName)) {
      next();
    } else {
      res.status(403).json({
        success: false,
        message: '没有访问权限'
      });
    }
  };
}

/**
 * 操作权限中间件
 */
export function requireActionPermission(actionName: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (hasActionPermission(req, actionName)) {
      next();
    } else {
      res.status(403).json({
        success: false,
        message: '没有操作权限'
      });
    }
  };
}

/**
 * 仓库访问权限中间件
 */
export function requireWarehouseAccess(accessType: 'view' | 'manage' = 'view') {
  return (req: Request, res: Response, next: NextFunction) => {
    const warehouseId = req.params.warehouseId || req.body.warehouseId;
    
    if (!warehouseId) {
      return res.status(400).json({
        success: false,
        message: '缺少仓库ID'
      });
    }
    
    if (hasWarehouseAccess(req, warehouseId, accessType)) {
      next();
    } else {
      res.status(403).json({
        success: false,
        message: '没有仓库访问权限'
      });
    }
  };
}

/**
 * 获取用户页面权限
 * @param userId 用户ID
 * @param role 用户角色
 * @returns 页面权限列表
 */
export async function getUserPagePermissions(userId: number, role?: string | null): Promise<string[]> {
  // 获取用户权限
  const permissions = await loadUserPermissions(userId, null, role);
  return permissions.pages;
}

/**
 * 获取用户仓库权限
 * @param userId 用户ID
 * @returns 仓库权限对象
 */
export async function getUserWarehousePermissions(userId: number): Promise<Record<string, { view: boolean, manage: boolean }>> {
  // 获取用户权限
  const permissions = await loadUserPermissions(userId, null);
  return permissions.warehouses;
}

/**
 * 检查用户是否有特定页面的权限
 * @param userId 用户ID
 * @param role 用户角色
 * @param pageName 页面名称
 * @returns 权限检查结果
 */
export async function checkSpecificPagePermissionResult(
  userId: number, 
  role: string, 
  pageName: string
): Promise<{
  hasPermission: boolean;
  isAdmin: boolean;
  pageName: string;
  success: boolean;
}> {
  try {
    // 检查用户是否是管理员
    const isAdminRole = role === 'admin' || role === 'super_admin';
    
    // 管理员拥有所有页面权限
    if (isAdminRole) {
      return {
        hasPermission: true,
        isAdmin: true,
        pageName,
        success: true
      };
    }
    
    // 获取用户页面权限
    const pagePermissions = await getUserPagePermissions(userId, role);
    
    // 检查是否有特定页面权限
    const hasPermission = pagePermissions.includes('all') || pagePermissions.includes(pageName);
    
    return {
      hasPermission,
      isAdmin: false,
      pageName,
      success: true
    };
  } catch (error) {
    console.error(`[权限检查] 检查页面${pageName}权限时出错:`, error);
    return {
      hasPermission: false,
      isAdmin: false,
      pageName,
      success: false
    };
  }
}