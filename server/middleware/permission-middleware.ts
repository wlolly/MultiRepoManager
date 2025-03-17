/**
 * 权限中间件
 * 用于验证用户是否有权限访问特定页面或执行特定操作
 */
import { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { pageNameEnum } from '../../shared/schema';
import { z } from 'zod';
import { hasPagePermission as checkPageAccess, hasActionPermission, hasWarehousePermission, savePermissionsToSession } from '../utils/permission-utils';

/**
 * 根据用户角色获取默认权限
 * @param role 用户角色
 * @returns 默认权限对象
 */
function getDefaultPermissionsByRole(role: string): { pages: string[], actions: string[], warehouses: Record<string, { view: boolean, manage: boolean }> } {
  // 超级管理员拥有所有权限
  if (role === 'super_admin' || role === 'admin') {
    // 获取所有页面名称
    const allPages = pageNameEnum.enumValues;
    return {
      pages: allPages,
      actions: ['view', 'create', 'edit', 'delete', 'export', 'import'],
      warehouses: {},  // 仓库权限需要单独查询
    };
  }

  // 普通用户只有基础页面访问权限
  return {
    pages: ['dashboard'],
    actions: ['view'],
    warehouses: {},
  };
}

/**
 * 检查用户是否有访问特定页面的权限
 * 用于保护API端点
 */
export function checkPagePermission(pageName: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    // 如果用户未认证，返回401
    if (!req.session.userId) {
      return res.status(401).json({ 
        authenticated: false,
        message: '用户未登录',
        guestAccess: false
      });
    }
    
    // 使用统一的权限工具函数检查页面权限
    if (checkPageAccess(req, pageName)) {
      if (req.session.isAdmin === true || req.session.hasSuperAccess === true) {
        console.log(`[权限中间件] 用户${req.session.userId}具有管理员权限，允许访问${pageName}页面`);
      }
      return next();
    }

    // 如果没有权限，返回403禁止访问
    return res.status(403).json({
      authenticated: true, 
      message: '无权访问该页面',
      guestAccess: false
    });
  };
}

/**
 * 检查用户是否有执行特定操作的权限
 * 如创建、编辑、删除等
 */
export function checkActionPermission(actionName: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    // 如果用户未认证，返回401
    if (!req.session.userId) {
      return res.status(401).json({ 
        authenticated: false,
        message: '用户未登录',
        guestAccess: false
      });
    }
    
    // 使用统一的权限工具函数检查操作权限
    if (hasActionPermission(req, actionName)) {
      if (req.session.isAdmin === true || req.session.hasSuperAccess === true) {
        console.log(`[权限中间件] 用户${req.session.userId}具有管理员权限，允许执行${actionName}操作`);
      }
      return next();
    }

    // 如果没有权限，返回403禁止访问
    return res.status(403).json({
      authenticated: true, 
      message: '无操作权限',
      guestAccess: false  
    });
  };
}

/**
 * 检查用户是否可以访问特定仓库
 */
export function checkWarehouseViewPermission(warehouseIdParam: string = 'warehouseId') {
  return (req: Request, res: Response, next: NextFunction) => {
    // 如果用户未认证，返回401
    if (!req.session.userId) {
      return res.status(401).json({ 
        authenticated: false,
        message: '用户未登录',
        guestAccess: false
      });
    }

    // 获取请求中的仓库ID
    const warehouseId = Number(req.params[warehouseIdParam] || req.body[warehouseIdParam]);
    
    // 如果没有仓库ID，跳过验证
    if (!warehouseId) {
      return next();
    }
    
    // 使用统一的权限工具函数检查仓库权限
    if (hasWarehousePermission(req, warehouseId, 'view')) {
      if (req.session.isAdmin === true || req.session.hasSuperAccess === true) {
        console.log(`[权限中间件] 用户${req.session.userId}具有管理员权限，允许访问仓库`);
      }
      return next();
    }

    // 如果没有权限，返回403禁止访问
    return res.status(403).json({
      authenticated: true, 
      message: '无权访问该仓库',
      guestAccess: false
    });
  };
}

/**
 * 检查用户是否可以管理特定仓库
 */
export function checkWarehouseManagePermission(warehouseIdParam: string = 'warehouseId') {
  return (req: Request, res: Response, next: NextFunction) => {
    // 如果用户未认证，返回401
    if (!req.session.userId) {
      return res.status(401).json({ 
        authenticated: false,
        message: '用户未登录',
        guestAccess: false
      });
    }

    // 获取请求中的仓库ID
    const warehouseId = Number(req.params[warehouseIdParam] || req.body[warehouseIdParam]);
    
    // 如果没有仓库ID，跳过验证
    if (!warehouseId) {
      return next();
    }
    
    // 使用统一的权限工具函数检查仓库管理权限
    if (hasWarehousePermission(req, warehouseId, 'manage')) {
      if (req.session.isAdmin === true || req.session.hasSuperAccess === true) {
        console.log(`[权限中间件] 用户${req.session.userId}具有管理员权限，允许管理仓库`);
      }
      return next();
    }

    // 如果没有权限，返回403禁止访问
    return res.status(403).json({
      authenticated: true, 
      message: '无权管理该仓库',
      guestAccess: false
    });
  };
}

/**
 * 获取用户页面权限列表
 * @param userId 用户ID
 * @param role 用户角色 (可选，如果未提供则会从数据库中读取)
 * @returns 用户有权限访问的页面列表
 */
export async function getUserPagePermissions(userId: number, role?: string): Promise<string[] | { 
  pages: string[], 
  actions: string[], 
  isAdmin?: boolean,
  isSuperAdmin?: boolean
}> {
  try {
    // 如果没有提供角色，从数据库中获取用户角色
    if (!role && userId > 0) {
      const userResult = await db.query('SELECT role FROM users WHERE id = $1', [userId]);
      if (userResult && userResult.rows && userResult.rows.length > 0) {
        role = userResult.rows[0].role;
      }
    }
    
    console.log(`[权限] 获取用户(ID=${userId})权限, 角色=${role || '未知'}`);
    
    // 如果是超级管理员或管理员，可以访问所有页面
    if (role === 'super_admin' || role === 'admin') {
      // 为管理员返回完整权限结构，包括是否是管理员的标志
      const allPages = [
        "dashboard",
        "products",
        "warehouse-products", 
        "users",
        "teams",
        "warehouses",
        "inbound-orders",
        "outbound-orders",
        "order-audit",
        "warehouse-transfers",
        "create-warehouse-transfer",
        "warehouse-reports",
        "settings",
        "api-configurations",
        "team-permissions",
        "new-product",
        "create-outbound-order",
        "create-inbound-order"
      ];
      
      // 返回更丰富的权限结构，包括页面权限和操作权限
      return {
        pages: allPages,
        actions: ['view', 'create', 'edit', 'delete', 'export', 'import'],
        isAdmin: true,
        isSuperAdmin: role === 'super_admin'
      };
    }
    
    // 查询用户所属的团队
    const userTeams = await db.query(
      'SELECT team_id FROM team_members WHERE user_id = $1',
      [userId]
    );
    
    const teamIds = userTeams.rows.map((row: any) => row.team_id);
    
    // 如果用户不属于任何团队，只返回默认权限
    if (teamIds.length === 0) {
      // 对于普通用户，返回具有相同结构的有限权限
      return {
        pages: ['dashboard'],
        actions: ['view'],
        isAdmin: false
      };
    }
    
    // 查询团队页面权限
    const pagePermissions = await db.query(
      'SELECT page_name FROM team_page_permissions WHERE team_id = ANY($1::int[]) AND can_access = true',
      [teamIds]
    );
    
    // 构建页面权限列表，始终包含仪表盘
    const pages = [...new Set([
      'dashboard',
      ...pagePermissions.rows.map((row: any) => row.page_name)
    ])];
    
    // 对于普通用户，也返回结构一致的权限对象
    return {
      pages: pages,
      actions: ['view', 'create', 'edit'],  // 普通用户有基本操作权限
      isAdmin: false
    };
  } catch (error) {
    console.error('获取用户页面权限失败:', error);
    // 出错时返回基本权限结构
    return {
      pages: ['dashboard'],
      actions: ['view'],
      isAdmin: false
    };
  }
}

/**
 * 获取用户仓库权限映射
 * @param userId 用户ID
 * @param role 用户角色 (可选，如果未提供则会从数据库中读取)
 * @returns 用户仓库权限映射 {仓库ID: {view: 是否可查看, manage: 是否可管理}}
 */
export async function getUserWarehousePermissions(userId: number, role?: string): Promise<Record<string, { view: boolean, manage: boolean }>> {
  try {
    // 如果没有提供角色，从数据库中获取用户角色
    if (!role && userId > 0) {
      const userResult = await db.query('SELECT role FROM users WHERE id = $1', [userId]);
      if (userResult && userResult.rows && userResult.rows.length > 0) {
        role = userResult.rows[0].role;
      }
    }
    
    // 如果是超级管理员或管理员，可以管理所有仓库
    if (role === 'super_admin' || role === 'admin') {
      // 获取所有仓库
      const allWarehouses = await db.query('SELECT id FROM warehouses');
      const warehousePermissions: Record<string, { view: boolean, manage: boolean }> = {};
      
      if (allWarehouses && Array.isArray(allWarehouses.rows)) {
        allWarehouses.rows.forEach((warehouse: any) => {
          warehousePermissions[warehouse.id] = { view: true, manage: true };
        });
      }
      
      return warehousePermissions;
    }
    
    // 查询用户所属的团队
    const userTeams = await db.query(
      'SELECT team_id FROM team_members WHERE user_id = $1',
      [userId]
    );
    
    const teamIds = userTeams.rows.map((row: any) => row.team_id);
    
    // 如果用户不属于任何团队，没有仓库权限
    if (teamIds.length === 0) {
      return {};
    }
    
    // 查询团队仓库权限
    const warehousePermissions = await db.query(
      'SELECT warehouse_id, can_view, can_manage FROM team_warehouse_permissions WHERE team_id = ANY($1::int[])',
      [teamIds]
    );
    
    // 构建仓库权限映射
    const warehouses: Record<string, { view: boolean, manage: boolean }> = {};
    warehousePermissions.rows.forEach((row: any) => {
      const warehouseId = row.warehouse_id.toString();
      if (!warehouses[warehouseId]) {
        warehouses[warehouseId] = { view: false, manage: false };
      }
      
      // 如果任何团队有此仓库的权限，则授予用户此权限
      if (row.can_view) warehouses[warehouseId].view = true;
      if (row.can_manage) warehouses[warehouseId].manage = true;
    });
    
    return warehouses;
  } catch (error) {
    console.error('获取用户仓库权限失败:', error);
    // 出错时返回空权限
    return {};
  }
}

/**
 * 加载用户权限并添加到会话
 * 在用户登录后调用
 * @param userId 用户ID
 * @param role 用户角色 (可选，如果未提供则会从数据库中读取)
 * @param req Express请求对象
 * @returns 权限对象包含页面、操作和仓库权限
 */
/**
 * 检查用户是否有特定页面权限
 * @param userId 用户ID
 * @param role 用户角色 (可选，如果未提供则会从数据库中读取)
 * @param pageName 页面名称
 * @returns 是否有权限访问
 */
/**
 * 检查用户是否有特定页面权限 - 支持方法调用
 * @param userId 用户ID
 * @param role 用户角色 (可选，如果未提供则会从数据库中读取)
 * @param pageName 页面名称
 * @returns 是否有权限访问
 */
export async function hasPagePermission(userId: number, role?: string, pageName?: string): Promise<boolean> {
  try {
    // 如果没有提供页面名称，默认返回true
    if (!pageName) return true;
    
    // 如果没有提供角色，从数据库中获取用户角色
    if (!role && userId > 0) {
      const userResult = await db.query('SELECT role FROM users WHERE id = $1', [userId]);
      if (userResult && userResult.rows && userResult.rows.length > 0) {
        role = userResult.rows[0].role;
      }
    }
    
    // 管理员有所有页面权限
    if (role === 'super_admin' || role === 'admin') {
      return true;
    }
    
    // 获取用户页面权限 (处理新旧两种权限格式)
    const permissionData = await getUserPagePermissions(userId, role);
    
    // 检查是否是新格式（对象）
    if (permissionData && typeof permissionData === 'object' && !Array.isArray(permissionData) && 'pages' in permissionData) {
      // 新格式 - 从pages数组中查找
      return (permissionData as any).pages.includes(pageName);
    } else if (Array.isArray(permissionData)) {
      // 旧格式 - 直接检查字符串数组
      return permissionData.includes(pageName);
    }
    
    // 如果都不是，返回false
    return false;
  } catch (error) {
    console.error('检查页面权限失败:', error);
    return false;
  }
}

/**
 * 检查用户对特定页面的访问权限 - 用于API端点实时权限验证
 * 支持新的前端checkSpecificPagePermission方法调用
 * 适配新的权限结构
 * 
 * @param userId 用户ID
 * @param role 用户角色
 * @param pageName 要检查权限的页面名称
 * @returns 包含权限检查结果的对象
 */
export async function checkSpecificPagePermissionResult(
  userId: number, 
  role?: string, 
  pageName?: string
): Promise<{ 
  hasPermission: boolean;
  isAdmin: boolean;
  pageName: string;
  success: boolean;
}> {
  // 初始化结果对象
  const result = {
    hasPermission: false,
    isAdmin: false,
    pageName: pageName || '',
    success: true
  };
  
  try {
    // 如果没有提供页面名称，默认返回true
    if (!pageName) {
      result.hasPermission = true;
      return result;
    }
    
    // 如果没有提供角色，从数据库中获取用户角色
    if (!role && userId > 0) {
      const userResult = await db.query('SELECT role FROM users WHERE id = $1', [userId]);
      if (userResult && userResult.rows && userResult.rows.length > 0) {
        role = userResult.rows[0].role;
      }
    }
    
    // 检查是否为管理员
    if (role === 'super_admin' || role === 'admin') {
      result.hasPermission = true;
      result.isAdmin = true;
      return result;
    }
    
    // 对于普通用户，获取其页面权限列表并检查
    const permissionData = await getUserPagePermissions(userId, role);
    
    // 检查返回值格式，适配新的权限结构
    if (permissionData && typeof permissionData === 'object' && !Array.isArray(permissionData) && 'pages' in permissionData) {
      // 新格式 - 从pages数组中查找
      result.hasPermission = (permissionData as any).pages.includes(pageName);
      result.isAdmin = !!(permissionData as any).isAdmin;
    } else if (Array.isArray(permissionData)) {
      // 旧格式 - 直接检查字符串数组
      result.hasPermission = permissionData.includes(pageName);
    }
    
    return result;
    
  } catch (error) {
    console.error('实时检查页面权限失败:', error);
    // 出错时返回访问被拒绝，但标记操作成功失败
    result.hasPermission = false;
    result.success = false;
    return result;
  }
}

export async function loadUserPermissions(userId: number, role?: string, req: Request): Promise<{
  pages: string[],
  actions: string[],
  warehouses: Record<string, { view: boolean, manage: boolean }>
}> {
  try {
    // 如果没有提供角色，从数据库中获取用户角色
    if (!role && userId > 0) {
      const userResult = await db.query('SELECT role FROM users WHERE id = $1', [userId]);
      if (userResult && userResult.rows && userResult.rows.length > 0) {
        role = userResult.rows[0].role;
      }
    }
    
    // 首先获取基于角色的默认权限
    const defaultPermissions = getDefaultPermissionsByRole(role);
    
    // 检查是否是管理员角色
    const isAdminRole = role === 'super_admin' || role === 'admin';
    
    // 如果是超级管理员或管理员，或者具有isAdmin/hasSuperAccess标记，赋予完整权限
    if (
      isAdminRole || 
      req.session.isAdmin === true || 
      req.session.hasSuperAccess === true
    ) {
      console.log(`[权限加载] 用户${userId}是管理员(${role})或有管理员标记(${req.session.isAdmin})，设置完整权限`);
      
      // 将权限保存到会话 - 旧版格式
      req.session.pagePermissions = defaultPermissions.pages;
      req.session.actionPermissions = defaultPermissions.actions;
      
      // 确保权限标志正确设置 - 这是关键修复
      const isSuperAdmin = role === 'super_admin' || req.session.hasSuperAccess === true;
      req.session.isAdmin = true;
      req.session.hasSuperAccess = isSuperAdmin;
      
      // 新版格式 - 权限对象
      req.session.permissions = {
        pages: defaultPermissions.pages,
        actions: defaultPermissions.actions,
        isAdmin: true,
        isSuperAdmin: isSuperAdmin
      };
      
      // 为管理员加载所有仓库权限
      const allWarehouses = await db.query('SELECT id FROM warehouses');
      const warehousePermissions: Record<string, { view: boolean, manage: boolean }> = {};
      
      if (allWarehouses && Array.isArray(allWarehouses.rows)) {
        allWarehouses.rows.forEach((warehouse: any) => {
          warehousePermissions[warehouse.id] = { view: true, manage: true };
        });
      }
      
      // 同时设置旧版和新版格式的仓库权限
      req.session.warehousePermissions = warehousePermissions;
      
      if (!req.session.permissions) {
        req.session.permissions = { pages: [], actions: [], warehouses: {} };
      }
      req.session.permissions.warehouses = warehousePermissions;
      
      console.log(`[权限加载] 用户${userId}的管理员权限已设置，isAdmin=${req.session.isAdmin}`);
      
      return {
        pages: defaultPermissions.pages,
        actions: defaultPermissions.actions,
        warehouses: warehousePermissions
      };
    }
    
    // 对于普通用户，加载他们的团队权限
    // 查询用户所属的团队
    const userTeams = await db.query(
      'SELECT team_id FROM team_members WHERE user_id = $1',
      [userId]
    );
    
    const teamIds = userTeams.rows.map((row: any) => row.team_id);
    
    // 如果用户不属于任何团队，只返回默认权限
    if (teamIds.length === 0) {
      req.session.pagePermissions = defaultPermissions.pages;
      req.session.actionPermissions = defaultPermissions.actions;
      req.session.warehousePermissions = {};
      
      return defaultPermissions;
    }
    
    // 查询团队页面权限
    const pagePermissions = await db.query(
      'SELECT page_name FROM team_page_permissions WHERE team_id = ANY($1::int[]) AND can_access = true',
      [teamIds]
    );
    
    // 查询团队仓库权限
    const warehousePermissions = await db.query(
      'SELECT warehouse_id, can_view, can_manage FROM team_warehouse_permissions WHERE team_id = ANY($1::int[])',
      [teamIds]
    );
    
    // 将团队页面权限添加到默认权限
    const pages = [...new Set([
      ...defaultPermissions.pages,
      ...pagePermissions.rows.map((row: any) => row.page_name)
    ])];
    
    // 构建仓库权限映射
    const warehouses: Record<string, { view: boolean, manage: boolean }> = {};
    warehousePermissions.rows.forEach((row: any) => {
      const warehouseId = row.warehouse_id.toString();
      if (!warehouses[warehouseId]) {
        warehouses[warehouseId] = { view: false, manage: false };
      }
      
      // 如果任何团队有此仓库的权限，则授予用户此权限
      if (row.can_view) warehouses[warehouseId].view = true;
      if (row.can_manage) warehouses[warehouseId].manage = true;
    });
    
    // 保存到会话 - 兼容旧版和新版格式
    // 旧版格式
    req.session.pagePermissions = pages;
    req.session.actionPermissions = defaultPermissions.actions;
    req.session.warehousePermissions = warehouses;
    
    // 新版格式
    req.session.permissions = {
      pages: pages,
      actions: defaultPermissions.actions,
      warehouses: warehouses,
      isAdmin: false,
      isSuperAdmin: false
    };
    
    // 确保角色标志一致
    req.session.isAdmin = false;
    req.session.hasSuperAccess = false;
    
    console.log(`[权限加载] 用户${req.session.userId}加载了普通权限`);
    
    return {
      pages,
      actions: defaultPermissions.actions,
      warehouses
    };
  } catch (error) {
    console.error('加载用户权限失败:', error);
    // 出错时返回基本权限
    return getDefaultPermissionsByRole(role);
  }
}