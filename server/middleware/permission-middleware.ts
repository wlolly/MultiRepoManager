/**
 * 权限中间件
 * 用于检查用户是否有权限访问特定资源
 */
import { Request, Response, NextFunction } from 'express';
import { eq, and, or } from 'drizzle-orm';
import { db } from '../db';
import { teamMembers, teamPagePermissions, teamWarehousePermissions, users } from '../../shared/schema';

/**
 * 需要页面权限的中间件
 * 检查当前用户是否有权限访问指定页面
 * @param pageName 页面名称
 */
export function requirePagePermission(pageName: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.session?.userId) {
      return res.status(401).json({ message: '未登录，请先登录' });
    }
    
    try {
      // 获取当前用户信息
      const userResult = await db.select().from(users).where(eq(users.id, req.session.userId));
      if (!userResult || userResult.length === 0) {
        return res.status(401).json({ message: '用户不存在' });
      }
      
      const user = userResult[0];
      
      // 管理员和超级管理员有所有权限
      if (user.role === 'admin' || user.role === 'super_admin') {
        return next();
      }
      
      // 获取用户所在的团队
      const userTeams = await db.select().from(teamMembers).where(eq(teamMembers.userId, user.id));
      if (!userTeams || userTeams.length === 0) {
        return res.status(403).json({ message: '没有访问权限：未加入任何团队' });
      }
      
      // 检查用户团队是否有权限访问页面
      const teamIds = userTeams.map(t => t.teamId);
      const teamPermissions = await db.select()
        .from(teamPagePermissions)
        .where(
          and(
            teamPagePermissions.pageName === pageName,
            teamPagePermissions.teamId.in(teamIds)
          )
        );
      
      if (teamPermissions && teamPermissions.length > 0) {
        return next();
      }
      
      return res.status(403).json({ message: `没有访问"${pageName}"页面的权限` });
    } catch (err) {
      console.error('权限检查错误:', err);
      return res.status(500).json({ message: '服务器错误：权限检查失败' });
    }
  };
}

/**
 * 需要仓库访问权限的中间件
 * 检查当前用户是否有权限访问指定仓库
 * @param checkManage 是否需要管理权限 (true: 需要管理权限, false: 只需要查看权限)
 */
export function requireWarehousePermission(checkManage: boolean = false) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.session?.userId) {
      return res.status(401).json({ message: '未登录，请先登录' });
    }
    
    // 从请求中获取仓库ID
    const warehouseId = parseInt(req.params.warehouseId || req.body.warehouseId);
    if (!warehouseId || isNaN(warehouseId)) {
      return res.status(400).json({ message: '无效的仓库ID' });
    }
    
    try {
      // 获取当前用户信息
      const userResult = await db.select().from(users).where(eq(users.id, req.session.userId));
      if (!userResult || userResult.length === 0) {
        return res.status(401).json({ message: '用户不存在' });
      }
      
      const user = userResult[0];
      
      // 管理员和超级管理员有所有权限
      if (user.role === 'admin' || user.role === 'super_admin') {
        return next();
      }
      
      // 获取用户所在的团队
      const userTeams = await db.select().from(teamMembers).where(eq(teamMembers.userId, user.id));
      if (!userTeams || userTeams.length === 0) {
        return res.status(403).json({ message: '没有访问权限：未加入任何团队' });
      }
      
      // 检查用户团队是否有权限访问仓库
      const teamIds = userTeams.map(t => t.teamId);
      const warehousePermissions = await db.select()
        .from(teamWarehousePermissions)
        .where(
          and(
            eq(teamWarehousePermissions.warehouseId, warehouseId),
            teamWarehousePermissions.teamId.in(teamIds)
          )
        );
      
      if (warehousePermissions && warehousePermissions.length > 0) {
        // 如果需要管理权限，则检查canManage字段
        if (checkManage) {
          const hasManagePermission = warehousePermissions.some(p => p.canManage);
          if (hasManagePermission) {
            return next();
          } else {
            return res.status(403).json({ message: `没有管理仓库(ID:${warehouseId})的权限` });
          }
        }
        // 只需要查看权限，所有团队成员都自动有查看权限
        return next();
      }
      
      return res.status(403).json({ message: `没有访问仓库(ID:${warehouseId})的权限` });
    } catch (err) {
      console.error('仓库权限检查错误:', err);
      return res.status(500).json({ message: '服务器错误：仓库权限检查失败' });
    }
  };
}

/**
 * 获取用户的页面权限
 * @param userId 用户ID
 * @returns 页面权限列表
 */
export async function getUserPagePermissions(userId: number): Promise<{[key: string]: boolean}> {
  const permissions: {[key: string]: boolean} = {};
  
  try {
    // 获取用户信息
    const userResult = await db.select().from(users).where(eq(users.id, userId));
    if (!userResult || userResult.length === 0) {
      return permissions;
    }
    
    const user = userResult[0];
    
    // 管理员和超级管理员有所有权限
    if (user.role === 'admin' || user.role === 'super_admin') {
      // 设置所有页面权限为true
      const allPagePermissions = ['dashboard', 'products', 'warehouses', 'warehouse-products', 
                                 'inbound-orders', 'outbound-orders', 'warehouse-transfers', 
                                 'users', 'teams', 'team-permissions', 'api-configurations', 
                                 'settings'];
      allPagePermissions.forEach(page => {
        permissions[page] = true;
      });
      return permissions;
    }
    
    // 获取用户所在的团队
    const userTeams = await db.select().from(teamMembers).where(eq(teamMembers.userId, user.id));
    if (!userTeams || userTeams.length === 0) {
      return permissions;
    }
    
    // 获取团队的页面权限
    const teamIds = userTeams.map(t => t.teamId);
    const teamPermissions = await db.select()
      .from(teamPagePermissions)
      .where(teamPagePermissions.teamId.in(teamIds));
    
    // 设置权限
    teamPermissions.forEach(permission => {
      permissions[permission.pageName] = true;
    });
    
    return permissions;
  } catch (error) {
    console.error('获取用户页面权限失败:', error);
    return permissions;
  }
}

/**
 * 获取用户的仓库权限
 * @param userId 用户ID
 * @returns 仓库权限列表
 */
export async function getUserWarehousePermissions(userId: number): Promise<{[key: number]: {canView: boolean, canManage: boolean}}> {
  const permissions: {[key: number]: {canView: boolean, canManage: boolean}} = {};
  
  try {
    // 获取用户信息
    const userResult = await db.select().from(users).where(eq(users.id, userId));
    if (!userResult || userResult.length === 0) {
      return permissions;
    }
    
    const user = userResult[0];
    
    // 获取用户所在的团队
    const userTeams = await db.select().from(teamMembers).where(eq(teamMembers.userId, user.id));
    if (!userTeams || userTeams.length === 0) {
      return permissions;
    }
    
    // 如果是管理员或超级管理员，获取所有仓库并设置完全权限
    if (user.role === 'admin' || user.role === 'super_admin') {
      // 在实际实现中，这里应该查询所有仓库并赋予权限
      // 简化实现，实际应用中应该从数据库获取所有仓库ID
      return permissions;
    }
    
    // 获取团队的仓库权限
    const teamIds = userTeams.map(t => t.teamId);
    const warehousePermissions = await db.select()
      .from(teamWarehousePermissions)
      .where(teamWarehousePermissions.teamId.in(teamIds));
    
    // 设置权限
    warehousePermissions.forEach(permission => {
      if (!permissions[permission.warehouseId]) {
        permissions[permission.warehouseId] = {
          canView: true,
          canManage: !!permission.canManage
        };
      } else if (permission.canManage) {
        // 如果有多个团队赋予同一仓库的权限，只要有一个是管理权限，就设为管理权限
        permissions[permission.warehouseId].canManage = true;
      }
    });
    
    return permissions;
  } catch (error) {
    console.error('获取用户仓库权限失败:', error);
    return permissions;
  }
}