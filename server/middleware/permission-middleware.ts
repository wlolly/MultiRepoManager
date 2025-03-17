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
      isActive: schema.users.is_active
    })
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .limit(1);

    if (!user || user.length === 0 || !user[0].isActive) {
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
    // 使用权限工具类中的loadUserPermissions函数，它已经包含了缓存机制
    // 由于两个模块位于不同位置，调用外部工具类函数
    const utils = await import('../utils/permission-utils');

    // 首先尝试从缓存获取权限数据
    const sessionId = req.sessionID || null;

    // 使用外部工具类加载权限，它会处理缓存逻辑
    const permissions = await utils.loadUserPermissions(userId, sessionId, role);

    // 将权限保存到会话
    utils.savePermissionsToSession(req, permissions);

    // 返回加载的权限数据
    return permissions;
  } catch (error) {
    console.error('[权限加载] 加载用户权限失败:', error);

    // 出错时返回基本权限
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
 * 增强版本 - 添加用户活跃状态验证和严格的管理员权限检查
 */
export function hasWarehouseAccess(
  req: Request, 
  warehouseId: number | string,
  accessType: 'view' | 'manage'
): boolean {
  // 验证基本会话状态
  if (!req.session || !req.session.userId) {
    console.log(`[权限验证] 仓库权限检查失败：会话无效或未认证，仓库ID=${warehouseId}`);
    return false;
  }

  // 验证用户活跃状态 - 如果会话中有isActive标记且为false，则拒绝访问
  if (req.session.isActive === false) {
    console.log(`[权限验证] 仓库权限检查失败：用户账户未激活，用户ID=${req.session.userId}`);
    return false;
  }

  const permissions = req.session?.permissions || { warehouses: {}, isAdmin: false, isSuperAdmin: false };

  // 严格的管理员权限验证 - 确保管理员状态一致性
  const isAdminUser = permissions.isAdmin === true || permissions.isSuperAdmin === true;
  const hasAdminRole = req.session.role === 'admin' || req.session.role === 'super_admin';

  // 管理员拥有所有仓库的完整权限，但必须确保角色和权限标记一致
  if (isAdminUser && hasAdminRole) {
    console.log(`[权限验证] 管理员权限验证通过，允许访问仓库ID=${warehouseId}`);
    return true;
  }

  // 检查是否有全局仓库权限
  if (permissions.warehouses && permissions.warehouses.all) {
    return permissions.warehouses.all[accessType] === true;
  }

  // 防止warehouses为undefined
  if (!permissions.warehouses) {
    console.log(`[权限验证] 仓库权限检查失败：权限数据不完整，仓库ID=${warehouseId}`);
    return false;
  }

  // 检查特定仓库权限
  const warehousePermissions = permissions.warehouses[warehouseId.toString()];
  const hasPermission = warehousePermissions ? warehousePermissions[accessType] === true : false;

  if (!hasPermission) {
    console.log(`[权限验证] 仓库权限检查失败：无${accessType}权限，仓库ID=${warehouseId}，用户ID=${req.session.userId}`);
  }

  return hasPermission;
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
 * 仓库访问权限中间件 - 增强版本
 * 增加了数据存在性验证、用户状态验证和团队权限检查
 */
export function requireWarehouseAccess(accessType: 'view' | 'manage' = 'view') {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const warehouseId = parseInt(req.params.warehouseId || req.body.warehouseId);
      const userId = req.session?.userId;
      const userRole = req.session?.role;

      if (!warehouseId || !userId) {
        return res.status(400).json({
          success: false,
          message: '无效的请求参数'
        });
      }

      // 管理员直接放行
      if (userRole === 'admin' || userRole === 'super_admin') {
        return next();
      }

      const db = req.app.locals.storage;
      const user = await db.getUser(userId);

      if (!user?.primary_team_id) {
        return res.status(403).json({
          success: false,
          message: '没有访问权限'
        });
      }

      const permissions = await db.getTeamWarehousePermissions(user.primary_team_id);
      const warehousePermission = permissions.find(p => p.warehouseId === warehouseId);

      if (!warehousePermission) {
        return res.status(403).json({
          success: false,
          message: '没有该仓库的访问权限'
        });
      }

      if (accessType === 'manage' && !warehousePermission.canManage) {
        return res.status(403).json({
          success: false,
          message: '没有该仓库的管理权限'
        });
      }

      if (accessType === 'view' && !warehousePermission.canView) {
        return res.status(403).json({
          success: false,
          message: '没有该仓库的查看权限'
        });
      }

      next();
    } catch (error) {
      console.error('[权限验证] 仓库访问验证错误:', error);
      return res.status(500).json({
        success: false,
        message: '权限验证失败'
      });
    }
    try {
      const warehouseId = req.params.warehouseId || req.body.warehouseId;

      // 1. 验证仓库ID是否存在
      if (!warehouseId) {
        return res.status(400).json({
          success: false,
          message: '缺少仓库ID',
          error: 'MISSING_WAREHOUSE_ID'
        });
      }

      // 2. 验证用户会话状态
      if (!req.session || !req.session.userId) {
        return res.status(401).json({
          success: false,
          message: '用户未登录',
          error: 'USER_NOT_AUTHENTICATED'
        });
      }

      // 3. 验证用户活跃状态
      if (req.session.isActive === false) {
        return res.status(403).json({
          success: false,
          message: '用户账户未激活',
          error: 'USER_NOT_ACTIVE'
        });
      }

      // 4. 验证仓库是否存在
      try {
        const warehouse = await db.query.warehouses.findFirst({
          where: eq(schema.warehouses.id, parseInt(warehouseId.toString()))
        });

        if (!warehouse) {
          console.log(`[权限中间件] 仓库不存在，ID: ${warehouseId}`);
          return res.status(404).json({
            success: false,
            message: '仓库不存在',
            error: 'WAREHOUSE_NOT_FOUND'
          });
        }
      } catch (dbError) {
        console.error(`[权限中间件] 查询仓库时出错:`, dbError);
        // 继续执行，因为可能是临时数据库错误，不应影响权限检查
      }

      // 5. 检查用户是否有仓库权限
      if (hasWarehouseAccess(req, warehouseId, accessType)) {
        // 权限验证通过，记录访问日志
        console.log(`[权限验证] 用户${req.session.userId}具有仓库${warehouseId}的${accessType}权限`);
        return next();
      } else {
        // 6. 验证失败，返回错误
        return res.status(403).json({
          success: false,
          message: '没有仓库访问权限',
          error: 'WAREHOUSE_ACCESS_DENIED',
          requiredAccess: accessType
        });
      }
    } catch (error) {
      console.error('[权限中间件] 验证仓库权限时出错:', error);
      return res.status(500).json({
        success: false,
        message: '验证权限时出错',
        error: 'PERMISSION_CHECK_ERROR'
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
  try {
    // 创建一个简单的模拟请求对象
    const mockReq = {
      session: {
        userId: userId,
        role: role || null,
        sessionID: `mock-session-${userId}`
      },
      sessionID: `mock-session-${userId}`
    } as any;

    // 获取用户权限
    const permissions = await loadUserPermissions(userId, mockReq, role);
    return permissions.pages;
  } catch (error) {
    console.error(`[权限] 获取用户${userId}页面权限失败:`, error);
    return []; // 失败时返回空权限列表
  }
}

/**
 * 获取用户仓库权限
 * @param userId 用户ID
 * @returns 仓库权限对象
 */
export async function getUserWarehousePermissions(userId: number): Promise<Record<string, { view: boolean, manage: boolean }>> {
  try {
    // 创建一个简单的模拟请求对象
    const mockReq = {
      session: {
        userId: userId,
        sessionID: `mock-session-${userId}`
      },
      sessionID: `mock-session-${userId}`
    } as any;

    // 获取用户权限
    const permissions = await loadUserPermissions(userId, mockReq);
    return permissions.warehouses;
  } catch (error) {
    console.error(`[权限] 获取用户${userId}仓库权限失败:`, error);
    return {}; // 失败时返回空权限对象
  }
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

export async function checkUserPageAccess(userId: number, pageName: string): Promise<boolean> {
  // 获取用户信息
  const user = await db.getUser(userId);

  // 如果是管理员，直接返回true
  if (user && (user.role === 'admin' || user.role === 'super_admin')) {
    return true;
  }

  // 检查用户权限
  const permissions = await getUserPagePermissions(userId);
  return permissions.includes(pageName);
}