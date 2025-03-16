/**
 * 权限中间件
 * 用于检查用户是否有权限访问特定资源
 */
import { Request, Response, NextFunction } from 'express';
import { eq, and, or, inArray, sql } from 'drizzle-orm';
import { db } from '../db';
import { teamMembers, teamPagePermissions, teamWarehousePermissions, users } from '../../shared/schema';

/**
 * 需要页面权限的中间件
 * 检查当前用户是否有权限访问指定页面
 * 支持假阳性登录策略和访客用户
 * @param pageName 页面名称
 */
export function requirePagePermission(pageName: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // 记录会话信息用于调试
    console.log(`[会话调试] 路径: ${req.path}, 会话信息:`, req.session);
    
    // 检查特定页面的公共访问权限 - 这些页面无需登录即可访问
    const publicPages = ['dashboard', 'products']; // 可以自定义哪些页面允许访客访问
    
    if (publicPages.includes(pageName)) {
      console.log(`${pageName} 是公共页面，允许访客访问`);
      return next();
    }
    
    // 判断是否已经登录
    if (!req.session?.userId && !req.user) {
      // 实现假阳性登录策略 - 返回401但是带上guest权限信息
      return res.status(401).json({ 
        message: '未登录',
        guestAccess: true,
        allowedPages: publicPages
      });
    }
    
    // 尝试获取用户ID - 可能来自会话或req.user
    const userId = req.session?.userId || (req.user as any)?.id;
    
    // 处理访客用户情况 (ID为-1的用户)
    if (userId === -1) {
      // 访客用户只能访问公共页面
      if (publicPages.includes(pageName)) {
        console.log(`访客用户允许访问${pageName}页面`);
        return next();
      } else {
        console.log(`访客用户尝试访问受限页面: ${pageName}`);
        return res.status(403).json({ 
          message: `访客用户无权访问"${pageName}"页面`,
          guestAccess: true,
          allowedPages: publicPages
        });
      }
    }
    
    try {
      // 获取当前用户信息
      const userResult = await db.select().from(users).where(eq(users.id, userId));
      if (!userResult || userResult.length === 0) {
        console.log(`用户ID ${userId} 不存在，降级为访客权限`);
        // 用户不存在但仍然允许访问公共页面
        if (publicPages.includes(pageName)) {
          return next();
        }
        return res.status(401).json({ 
          message: '用户不存在',
          guestAccess: true,
          allowedPages: publicPages
        });
      }
      
      const user = userResult[0];
      
      // 管理员和超级管理员有所有权限
      if (user.role === 'admin' || user.role === 'super_admin') {
        return next();
      }
      
      // 获取用户所在的团队
      const userTeams = await db.select().from(teamMembers).where(eq(teamMembers.userId, user.id));
      if (!userTeams || userTeams.length === 0) {
        // 如果用户没有加入任何团队，但请求的是公共页面，仍然允许访问
        if (publicPages.includes(pageName)) {
          return next();
        }
        return res.status(403).json({ message: '没有访问权限：未加入任何团队' });
      }
      
      // 检查用户团队是否有权限访问页面
      const teamIds = userTeams.map(t => t.teamId);
      
      // 使用SQL直接执行查询
      const query = sql`
        SELECT * FROM team_page_permissions 
        WHERE page_name = ${pageName} 
        AND team_id IN (${sql.join(teamIds, sql`, `)})
      `;
      
      const teamPermissions = await db.execute(query);
      
      if (teamPermissions && teamPermissions.rows && teamPermissions.rows.length > 0) {
        return next();
      }
      
      // 最后一次检查是否为公共页面
      if (publicPages.includes(pageName)) {
        return next();
      }
      
      return res.status(403).json({ message: `没有访问"${pageName}"页面的权限` });
    } catch (err) {
      console.error('权限检查错误:', err);
      // 错误情况下，仍然允许访问公共页面
      if (publicPages.includes(pageName)) {
        console.log(`发生错误，但仍允许访问公共页面 ${pageName}`);
        return next();
      }
      return res.status(500).json({ message: '服务器错误：权限检查失败' });
    }
  };
}

/**
 * 需要仓库访问权限的中间件
 * 检查当前用户是否有权限访问指定仓库
 * 支持假阳性登录策略和访客用户
 * @param checkManage 是否需要管理权限 (true: 需要管理权限, false: 只需要查看权限)
 */
export function requireWarehousePermission(checkManage: boolean = false) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // 记录会话信息用于调试
    console.log(`[会话调试] 路径: ${req.path}, 会话信息:`, req.session);
    
    // 尝试获取用户ID - 可能来自会话或req.user
    const userId = req.session?.userId || (req.user as any)?.id;
    
    // 判断是否已经登录
    if (!userId) {
      // 实现假阳性登录策略 - 返回401但是带上guest权限信息
      return res.status(401).json({ 
        message: '未登录',
        guestAccess: true,
        allowedAction: 'view' // 访客用户只能查看
      });
    }
    
    // 从请求中获取仓库ID
    const warehouseId = parseInt(req.params.warehouseId || req.body.warehouseId);
    if (!warehouseId || isNaN(warehouseId)) {
      return res.status(400).json({ message: '无效的仓库ID' });
    }
    
    // 访客用户特殊处理 (ID为-1的用户)
    if (userId === -1) {
      // 访客用户只能查看，不能管理
      if (checkManage) {
        console.log(`访客用户尝试管理仓库: ${warehouseId}`);
        return res.status(403).json({ 
          message: `访客用户无权管理仓库`,
          guestAccess: true,
          allowedAction: 'view'
        });
      } else {
        console.log(`访客用户允许查看仓库: ${warehouseId}`);
        return next(); // 允许访客查看仓库
      }
    }
    
    try {
      // 获取当前用户信息
      const userResult = await db.select().from(users).where(eq(users.id, userId));
      if (!userResult || userResult.length === 0) {
        console.log(`用户ID ${userId} 不存在，降级为访客权限`);
        
        // 用户不存在但仍然允许查看(不允许管理)
        if (checkManage) {
          return res.status(401).json({ 
            message: '用户不存在',
            guestAccess: true,
            allowedAction: 'view'
          });
        } else {
          return next(); // 允许查看
        }
      }
      
      const user = userResult[0];
      
      // 管理员和超级管理员有所有权限
      if (user.role === 'admin' || user.role === 'super_admin') {
        return next();
      }
      
      // 获取用户所在的团队
      const userTeams = await db.select().from(teamMembers).where(eq(teamMembers.userId, user.id));
      if (!userTeams || userTeams.length === 0) {
        // 没有加入团队的用户视为访客权限
        if (checkManage) {
          return res.status(403).json({ 
            message: '没有管理权限：未加入任何团队',
            guestAccess: true,
            allowedAction: 'view'
          });
        } else {
          return next(); // 允许查看
        }
      }
      
      // 检查用户团队是否有权限访问仓库
      const teamIds = userTeams.map(t => t.teamId);
      
      // 使用SQL直接执行查询
      const query = sql`
        SELECT * FROM team_warehouse_permissions 
        WHERE warehouse_id = ${warehouseId} 
        AND team_id IN (${sql.join(teamIds, sql`, `)})
      `;
      
      const result = await db.execute(query);
      const warehousePermissions = result.rows;
      
      if (warehousePermissions && warehousePermissions.length > 0) {
        // 如果需要管理权限，则检查canManage字段
        if (checkManage) {
          const hasManagePermission = warehousePermissions.some(p => p.can_manage === 1);
          if (hasManagePermission) {
            return next();
          } else {
            return res.status(403).json({ 
              message: `没有管理仓库(ID:${warehouseId})的权限`,
              guestAccess: true,
              allowedAction: 'view'
            });
          }
        }
        // 只需要查看权限，所有团队成员都自动有查看权限
        return next();
      }
      
      // 没有特定权限但仍允许查看
      if (!checkManage) {
        console.log(`用户 ${userId} 没有特定权限，但允许查看仓库 ${warehouseId}`);
        return next();
      }
      
      return res.status(403).json({ 
        message: `没有访问仓库(ID:${warehouseId})的权限`,
        guestAccess: true,
        allowedAction: 'view'
      });
    } catch (err) {
      console.error('仓库权限检查错误:', err);
      
      // 错误情况下，仍然允许查看（不允许管理）
      if (!checkManage) {
        console.log(`发生错误，但仍允许查看仓库 ${warehouseId}`);
        return next();
      }
      
      return res.status(500).json({ 
        message: '服务器错误：仓库权限检查失败',
        guestAccess: true,
        allowedAction: 'view'
      });
    }
  };
}

/**
 * 获取用户的页面权限
 * 支持访客用户，为访客自动分配公共页面权限
 * @param userId 用户ID
 * @returns 页面权限列表
 */
export async function getUserPagePermissions(userId: number): Promise<{[key: string]: boolean}> {
  const permissions: {[key: string]: boolean} = {};
  
  // 定义公共页面 - 访客可以访问的页面
  const publicPages = ['dashboard', 'products'];
  
  // 为公共页面设置权限
  publicPages.forEach(page => {
    permissions[page] = true;
  });
  
  // 访客用户 (ID为-1)只能访问公共页面
  if (userId === -1) {
    console.log('为访客用户返回基本权限');
    return permissions; // 只返回公共页面权限
  }
  
  try {
    // 获取用户信息
    const userResult = await db.select().from(users).where(eq(users.id, userId));
    if (!userResult || userResult.length === 0) {
      console.log(`用户ID ${userId} 不存在，返回访客权限`);
      return permissions; // 只返回公共页面权限
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
      console.log(`用户 ${userId} 未加入任何团队，只有基本权限`);
      return permissions; // 已包含公共页面权限
    }
    
    // 获取团队的页面权限
    const teamIds = userTeams.map(t => t.teamId);
    
    // 使用SQL直接执行查询
    const query = sql`
      SELECT page_name FROM team_page_permissions 
      WHERE team_id IN (${sql.join(teamIds, sql`, `)})
    `;
    
    const result = await db.execute(query);
    
    // 设置权限
    if (result && result.rows) {
      result.rows.forEach((row: any) => {
        permissions[row.page_name] = true;
      });
    }
    
    return permissions;
  } catch (error) {
    console.error('获取用户页面权限失败:', error);
    return permissions; // 已包含公共页面权限
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
    
    // 使用SQL直接执行查询
    const query = sql`
      SELECT warehouse_id, can_manage FROM team_warehouse_permissions 
      WHERE team_id IN (${sql.join(teamIds, sql`, `)})
    `;
    
    const result = await db.execute(query);
    
    // 设置权限
    if (result && result.rows) {
      result.rows.forEach((permission: any) => {
        const warehouseId = permission.warehouse_id;
        if (!permissions[warehouseId]) {
          permissions[warehouseId] = {
            canView: true,
            canManage: !!permission.can_manage
          };
        } else if (permission.can_manage) {
          // 如果有多个团队赋予同一仓库的权限，只要有一个是管理权限，就设为管理权限
          permissions[warehouseId].canManage = true;
        }
      });
    }
    
    return permissions;
  } catch (error) {
    console.error('获取用户仓库权限失败:', error);
    return permissions;
  }
}