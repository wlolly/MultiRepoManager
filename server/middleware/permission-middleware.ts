/**
 * 权限中间件
 * 用于检查用户是否有权限访问特定资源
 */

import { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { eq, and } from 'drizzle-orm';
import { teams, teamMembers, teamPagePermissions, teamWarehousePermissions } from '../../shared/schema';

/**
 * 需要页面权限的中间件
 * 检查当前用户是否有权限访问指定页面
 * @param pageName 页面名称
 */
export function requirePagePermission(pageName: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // 检查是否有用户会话
      if (!req.session.userId) {
        return res.status(401).json({ error: '未授权，请先登录' });
      }

      const userId = req.session.userId;

      // 检查用户所属的团队及其页面权限
      const userTeams = await db.select()
        .from(teamMembers)
        .where(eq(teamMembers.userId, userId))
        .execute();

      if (!userTeams || userTeams.length === 0) {
        return res.status(403).json({ error: '无权访问，用户不属于任何团队' });
      }

      // 检查用户团队是否有此页面权限
      let hasPermission = false;
      for (const teamMember of userTeams) {
        const teamId = teamMember.teamId;
        
        // 检查团队是否有效
        const teamResult = await db.select()
          .from(teams)
          .where(eq(teams.id, teamId))
          .execute();
          
        if (!teamResult || teamResult.length === 0 || !teamResult[0].isActive) {
          continue; // 跳过无效的团队
        }
        
        // 检查团队是否有页面权限
        const pagePermission = await db.select()
          .from(teamPagePermissions)
          .where(
            and(
              eq(teamPagePermissions.teamId, teamId),
              eq(teamPagePermissions.pageName, pageName)
            )
          )
          .execute();
          
        if (pagePermission && pagePermission.length > 0 && pagePermission[0].canAccess) {
          hasPermission = true;
          break;
        }
      }

      if (!hasPermission) {
        return res.status(403).json({ error: `无权访问页面: ${pageName}` });
      }

      // 有权限，继续下一步
      next();
    } catch (error) {
      console.error('权限检查错误:', error);
      res.status(500).json({ error: '权限检查过程中发生错误' });
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
    try {
      // 检查是否有用户会话
      if (!req.session.userId) {
        return res.status(401).json({ error: '未授权，请先登录' });
      }

      // 获取请求中的仓库ID
      const warehouseId = parseInt(req.params.warehouseId || req.body.warehouseId);
      
      if (!warehouseId || isNaN(warehouseId)) {
        return res.status(400).json({ error: '请求中缺少有效的仓库ID' });
      }

      const userId = req.session.userId;

      // 检查用户所属的团队及其仓库权限
      const userTeams = await db.select()
        .from(teamMembers)
        .where(eq(teamMembers.userId, userId))
        .execute();

      if (!userTeams || userTeams.length === 0) {
        return res.status(403).json({ error: '无权访问，用户不属于任何团队' });
      }

      // 检查用户团队是否有此仓库权限
      let hasPermission = false;
      for (const teamMember of userTeams) {
        const teamId = teamMember.teamId;
        
        // 检查团队是否有效
        const teamResult = await db.select()
          .from(teams)
          .where(eq(teams.id, teamId))
          .execute();
          
        if (!teamResult || teamResult.length === 0 || !teamResult[0].isActive) {
          continue; // 跳过无效的团队
        }
        
        // 检查团队是否有仓库权限
        const warehousePermission = await db.select()
          .from(teamWarehousePermissions)
          .where(
            and(
              eq(teamWarehousePermissions.teamId, teamId),
              eq(teamWarehousePermissions.warehouseId, warehouseId)
            )
          )
          .execute();
          
        if (warehousePermission && warehousePermission.length > 0) {
          // 检查是否有查看权限
          if (warehousePermission[0].canView) {
            // 如果需要管理权限，则还需检查canManage
            if (!checkManage || warehousePermission[0].canManage) {
              hasPermission = true;
              break;
            }
          }
        }
      }

      if (!hasPermission) {
        return res.status(403).json({ 
          error: checkManage ? 
            `无权管理仓库: ${warehouseId}` : 
            `无权访问仓库: ${warehouseId}` 
        });
      }

      // 有权限，继续下一步
      next();
    } catch (error) {
      console.error('仓库权限检查错误:', error);
      res.status(500).json({ error: '仓库权限检查过程中发生错误' });
    }
  };
}

/**
 * 获取用户的页面权限
 * @param userId 用户ID
 * @returns 页面权限列表
 */
export async function getUserPagePermissions(userId: number): Promise<{[key: string]: boolean}> {
  try {
    // 检查用户所属的团队
    const userTeams = await db.select()
      .from(teamMembers)
      .where(eq(teamMembers.userId, userId))
      .execute();

    if (!userTeams || userTeams.length === 0) {
      return {}; // 没有团队，没有权限
    }

    // 获取所有有效团队ID
    const teamIds: number[] = [];
    for (const teamMember of userTeams) {
      const team = await db.select()
        .from(teams)
        .where(eq(teams.id, teamMember.teamId))
        .execute();
        
      if (team && team.length > 0 && team[0].isActive) {
        teamIds.push(teamMember.teamId);
      }
    }

    if (teamIds.length === 0) {
      return {}; // 没有有效团队，没有权限
    }

    // 收集所有团队的页面权限
    const permissions: {[key: string]: boolean} = {};
    
    for (const teamId of teamIds) {
      const pagePermissions = await db.select()
        .from(teamPagePermissions)
        .where(eq(teamPagePermissions.teamId, teamId))
        .execute();
        
      if (pagePermissions && pagePermissions.length > 0) {
        for (const perm of pagePermissions) {
          // 如果一个团队有权限，则用户就有权限
          if (perm.canAccess) {
            permissions[perm.pageName] = true;
          } else if (permissions[perm.pageName] !== true) {
            // 只有在没有其他团队给予权限的情况下才设置为false
            permissions[perm.pageName] = false;
          }
        }
      }
    }

    return permissions;
  } catch (error) {
    console.error('获取用户页面权限错误:', error);
    return {};
  }
}

/**
 * 获取用户的仓库权限
 * @param userId 用户ID
 * @returns 仓库权限列表
 */
export async function getUserWarehousePermissions(userId: number): Promise<{[key: number]: {canView: boolean, canManage: boolean}}> {
  try {
    // 检查用户所属的团队
    const userTeams = await db.select()
      .from(teamMembers)
      .where(eq(teamMembers.userId, userId))
      .execute();

    if (!userTeams || userTeams.length === 0) {
      return {}; // 没有团队，没有权限
    }

    // 获取所有有效团队ID
    const teamIds: number[] = [];
    for (const teamMember of userTeams) {
      const team = await db.select()
        .from(teams)
        .where(eq(teams.id, teamMember.teamId))
        .execute();
        
      if (team && team.length > 0 && team[0].isActive) {
        teamIds.push(teamMember.teamId);
      }
    }

    if (teamIds.length === 0) {
      return {}; // 没有有效团队，没有权限
    }

    // 收集所有团队的仓库权限
    const permissions: {[key: number]: {canView: boolean, canManage: boolean}} = {};
    
    for (const teamId of teamIds) {
      const warehousePermissions = await db.select()
        .from(teamWarehousePermissions)
        .where(eq(teamWarehousePermissions.teamId, teamId))
        .execute();
        
      if (warehousePermissions && warehousePermissions.length > 0) {
        for (const perm of warehousePermissions) {
          const warehouseId = perm.warehouseId;
          
          // 如果是第一次处理这个仓库的权限，初始化
          if (!permissions[warehouseId]) {
            permissions[warehouseId] = {
              canView: false,
              canManage: false
            };
          }
          
          // 如果任何团队有权限，则用户就有权限
          if (perm.canView) {
            permissions[warehouseId].canView = true;
          }
          
          if (perm.canManage) {
            permissions[warehouseId].canManage = true;
          }
        }
      }
    }

    return permissions;
  } catch (error) {
    console.error('获取用户仓库权限错误:', error);
    return {};
  }
}