/**
 * 团队权限审计服务
 * 提供团队权限审计功能，包括权限一致性检查和过期权限清理
 */

import { db } from '../db';
import * as schema from '../../shared/schema';
import { eq, inArray, and, sql } from 'drizzle-orm';
import { clearPermissionCache, triggerPermissionUpdates } from '../utils/permission-utils';

// 审计结果类型
interface AuditResult {
  success: boolean;
  issues: AuditIssue[];
  affectedTeams: number[];
  affectedUsers: number[];
  modified: boolean;
  timestamp: Date;
}

// 权限一致性问题
interface AuditIssue {
  type: 'warehouse_access' | 'page_access' | 'role_mismatch' | 'orphaned_permission' | 'missing_permission';
  description: string;
  teamId?: number;
  userId?: number;
  itemId?: number;
  fixed: boolean;
}

/**
 * 执行团队权限一致性审计
 * 检查并解决权限问题
 * 
 * @param autoFix 是否自动修复发现的问题
 * @returns 审计结果
 */
export async function auditTeamPermissions(autoFix: boolean = false): Promise<AuditResult> {
  console.log(`[团队权限审计] 开始执行团队权限审计，自动修复: ${autoFix}`);
  
  const result: AuditResult = {
    success: true,
    issues: [],
    affectedTeams: [],
    affectedUsers: [],
    modified: false,
    timestamp: new Date()
  };
  
  try {
    // 1. 检查孤立的团队成员记录（引用了不存在的团队）
    await auditOrphanedTeamMembers(result, autoFix);
    
    // 2. 检查孤立的团队页面权限记录
    await auditOrphanedPagePermissions(result, autoFix);
    
    // 3. 检查孤立的团队仓库权限记录
    await auditOrphanedWarehousePermissions(result, autoFix);
    
    // 4. 检查团队成员角色是否与团队类型匹配
    await auditTeamMemberRoles(result, autoFix);
    
    // 5. 检查超级管理员是否有所有团队权限
    await auditSuperAdminTeamAccess(result, autoFix);
    
    // 6. 如果自动修复模式并且有进行过修改,刷新所有受影响用户的权限缓存
    if (autoFix && result.modified && result.affectedUsers.length > 0) {
      const uniqueUsers = [...new Set(result.affectedUsers)];
      console.log(`[团队权限审计] 正在刷新 ${uniqueUsers.length} 个受影响用户的权限缓存`);
      
      for (const userId of uniqueUsers) {
        clearPermissionCache(userId);
      }
    }
    
    // 记录审计结果统计
    console.log(`[团队权限审计] 审计完成，发现 ${result.issues.length} 个问题，已修复 ${result.issues.filter(i => i.fixed).length} 个问题`);
    console.log(`[团队权限审计] 受影响的团队数量: ${result.affectedTeams.length}`);
    console.log(`[团队权限审计] 受影响的用户数量: ${result.affectedUsers.length}`);
    
    return result;
  } catch (error) {
    console.error(`[团队权限审计] 审计过程中发生错误:`, error);
    return {
      success: false,
      issues: [{
        type: 'warehouse_access',
        description: `审计过程中发生错误: ${error}`,
        fixed: false
      }],
      affectedTeams: [],
      affectedUsers: [],
      modified: false,
      timestamp: new Date()
    };
  }
}

/**
 * 生成团队权限配置报告
 * @returns 权限配置报告
 */
export async function generateTeamPermissionReport(): Promise<{
  total: {
    teams: number;
    users: number;
    teamMembers: number;
    pagePermissions: number;
    warehousePermissions: number;
  };
  teams: any[];
}> {
  // 获取所有团队
  const teams = await db.query.teams.findMany();
  
  // 获取团队成员统计
  const teamMemberCounts = await db.$client`
    SELECT teamid, COUNT(*) as member_count 
    FROM team_members 
    GROUP BY teamid
  `;
  
  // 获取团队页面权限统计
  const pagePermissionCounts = await db.$client`
    SELECT teamid, COUNT(*) as page_count 
    FROM team_page_permissions 
    GROUP BY teamid
  `;
  
  // 获取团队仓库权限统计
  const warehousePermissionCounts = await db.$client`
    SELECT teamid, COUNT(*) as warehouse_count 
    FROM team_warehouse_permissions 
    GROUP BY teamid
  `;
  
  // 创建按团队索引的统计映射
  const teamMemberMap: Record<number, number> = {};
  const pagePermissionMap: Record<number, number> = {};
  const warehousePermissionMap: Record<number, number> = {};
  
  teamMemberCounts.forEach((item: any) => {
    teamMemberMap[item.teamid] = parseInt(item.member_count);
  });
  
  pagePermissionCounts.forEach((item: any) => {
    pagePermissionMap[item.teamid] = parseInt(item.page_count);
  });
  
  warehousePermissionCounts.forEach((item: any) => {
    warehousePermissionMap[item.teamid] = parseInt(item.warehouse_count);
  });
  
  // 生成团队报告
  const report = teams.map(team => ({
    id: team.id,
    name: team.name,
    description: team.description,
    isActive: team.isActive,
    createdAt: team.createdAt,
    updatedAt: team.updatedAt,
    memberCount: teamMemberMap[team.id] || 0,
    pagePermissionCount: pagePermissionMap[team.id] || 0,
    warehousePermissionCount: warehousePermissionMap[team.id] || 0
  }));
  
  // 汇总统计
  const totalTeams = teams.length;
  const totalMembers = teamMemberCounts.reduce((sum: number, item: any) => sum + parseInt(item.member_count), 0);
  const totalPagePermissions = pagePermissionCounts.reduce((sum: number, item: any) => sum + parseInt(item.page_count), 0);
  const totalWarehousePermissions = warehousePermissionCounts.reduce((sum: number, item: any) => sum + parseInt(item.warehouse_count), 0);
  
  // 获取用户总数
  const userResult = await db.$client`SELECT COUNT(*) as user_count FROM users`;
  const totalUsers = parseInt(userResult[0].user_count);
  
  return {
    total: {
      teams: totalTeams,
      users: totalUsers,
      teamMembers: totalMembers,
      pagePermissions: totalPagePermissions,
      warehousePermissions: totalWarehousePermissions
    },
    teams: report
  };
}

/**
 * 审计孤立的团队成员（引用了不存在的团队或用户）
 */
async function auditOrphanedTeamMembers(result: AuditResult, autoFix: boolean): Promise<void> {
  // 获取所有引用不存在团队的团队成员记录
  const orphanedTeamMembers = await db.$client`
    SELECT tm.id, tm.teamid, tm.userid
    FROM team_members tm
    LEFT JOIN teams t ON tm.teamid = t.id
    WHERE t.id IS NULL
  `;
  
  // 获取所有引用不存在用户的团队成员记录
  const orphanedUserMembers = await db.$client`
    SELECT tm.id, tm.teamid, tm.userid
    FROM team_members tm
    LEFT JOIN users u ON tm.userid = u.id
    WHERE u.id IS NULL
  `;
  
  // 记录并处理孤立的团队成员记录
  for (const member of orphanedTeamMembers) {
    const issue: AuditIssue = {
      type: 'orphaned_permission',
      description: `孤立的团队成员记录 (ID=${member.id})，引用了不存在的团队 (ID=${member.teamid})`,
      teamId: member.teamid,
      userId: member.userid,
      itemId: member.id,
      fixed: false
    };
    
    if (autoFix) {
      try {
        // 删除孤立记录
        await db.$client`DELETE FROM team_members WHERE id = ${member.id}`;
        issue.fixed = true;
        result.modified = true;
        
        if (!result.affectedUsers.includes(member.userid)) {
          result.affectedUsers.push(member.userid);
        }
      } catch (error) {
        console.error(`[团队权限审计] 无法删除孤立的团队成员记录 (ID=${member.id}):`, error);
      }
    }
    
    result.issues.push(issue);
  }
  
  // 记录并处理引用不存在用户的团队成员记录
  for (const member of orphanedUserMembers) {
    const issue: AuditIssue = {
      type: 'orphaned_permission',
      description: `孤立的团队成员记录 (ID=${member.id})，引用了不存在的用户 (ID=${member.userid})`,
      teamId: member.teamid,
      userId: member.userid,
      itemId: member.id,
      fixed: false
    };
    
    if (autoFix) {
      try {
        // 删除孤立记录
        await db.$client`DELETE FROM team_members WHERE id = ${member.id}`;
        issue.fixed = true;
        result.modified = true;
        
        if (!result.affectedTeams.includes(member.teamid)) {
          result.affectedTeams.push(member.teamid);
        }
      } catch (error) {
        console.error(`[团队权限审计] 无法删除孤立的团队成员记录 (ID=${member.id}):`, error);
      }
    }
    
    result.issues.push(issue);
  }
}

/**
 * 审计孤立的团队页面权限记录
 */
async function auditOrphanedPagePermissions(result: AuditResult, autoFix: boolean): Promise<void> {
  // 获取所有引用不存在团队的页面权限记录
  const orphanedPermissions = await db.$client`
    SELECT tpp.id, tpp.teamid, tpp.page_name
    FROM team_page_permissions tpp
    LEFT JOIN teams t ON tpp.teamid = t.id
    WHERE t.id IS NULL
  `;
  
  // 记录并处理孤立的页面权限记录
  for (const permission of orphanedPermissions) {
    const issue: AuditIssue = {
      type: 'orphaned_permission',
      description: `孤立的团队页面权限记录 (ID=${permission.id})，引用了不存在的团队 (ID=${permission.teamid})`,
      teamId: permission.teamid,
      itemId: permission.id,
      fixed: false
    };
    
    if (autoFix) {
      try {
        // 删除孤立记录
        await db.$client`DELETE FROM team_page_permissions WHERE id = ${permission.id}`;
        issue.fixed = true;
        result.modified = true;
      } catch (error) {
        console.error(`[团队权限审计] 无法删除孤立的团队页面权限记录 (ID=${permission.id}):`, error);
      }
    }
    
    result.issues.push(issue);
  }
}

/**
 * 审计孤立的团队仓库权限记录
 */
async function auditOrphanedWarehousePermissions(result: AuditResult, autoFix: boolean): Promise<void> {
  // 获取所有引用不存在团队的仓库权限记录
  const orphanedTeamPermissions = await db.$client`
    SELECT twp.id, twp.teamid, twp.warehouseid
    FROM team_warehouse_permissions twp
    LEFT JOIN teams t ON twp.teamid = t.id
    WHERE t.id IS NULL
  `;
  
  // 获取所有引用不存在仓库的权限记录
  const orphanedWarehousePermissions = await db.$client`
    SELECT twp.id, twp.teamid, twp.warehouseid
    FROM team_warehouse_permissions twp
    LEFT JOIN warehouses w ON twp.warehouseid = w.id
    WHERE w.id IS NULL
  `;
  
  // 记录并处理孤立的团队仓库权限记录
  for (const permission of orphanedTeamPermissions) {
    const issue: AuditIssue = {
      type: 'orphaned_permission',
      description: `孤立的团队仓库权限记录 (ID=${permission.id})，引用了不存在的团队 (ID=${permission.teamid})`,
      teamId: permission.teamid,
      itemId: permission.id,
      fixed: false
    };
    
    if (autoFix) {
      try {
        // 删除孤立记录
        await db.$client`DELETE FROM team_warehouse_permissions WHERE id = ${permission.id}`;
        issue.fixed = true;
        result.modified = true;
      } catch (error) {
        console.error(`[团队权限审计] 无法删除孤立的团队仓库权限记录 (ID=${permission.id}):`, error);
      }
    }
    
    result.issues.push(issue);
  }
  
  // 记录并处理引用不存在仓库的权限记录
  for (const permission of orphanedWarehousePermissions) {
    const issue: AuditIssue = {
      type: 'orphaned_permission',
      description: `孤立的团队仓库权限记录 (ID=${permission.id})，引用了不存在的仓库 (ID=${permission.warehouseid})`,
      teamId: permission.teamid,
      itemId: permission.id,
      fixed: false
    };
    
    if (autoFix) {
      try {
        // 删除孤立记录
        await db.$client`DELETE FROM team_warehouse_permissions WHERE id = ${permission.id}`;
        issue.fixed = true;
        result.modified = true;
        
        if (!result.affectedTeams.includes(permission.teamid)) {
          result.affectedTeams.push(permission.teamid);
        }
      } catch (error) {
        console.error(`[团队权限审计] 无法删除孤立的团队仓库权限记录 (ID=${permission.id}):`, error);
      }
    }
    
    result.issues.push(issue);
  }
}

/**
 * 审计团队成员角色与团队类型是否匹配
 * 例如，销售团队的成员应该有销售相关的页面权限
 */
async function auditTeamMemberRoles(result: AuditResult, autoFix: boolean): Promise<void> {
  // 获取所有团队信息及其类型
  const teams = await db.query.teams.findMany();
  
  for (const team of teams) {
    // 根据团队名称判断团队类型
    let teamType = 'general';
    const name = team.name.toLowerCase();
    
    if (name.includes('admin') || name.includes('管理')) {
      teamType = 'admin';
    } else if (name.includes('sales') || name.includes('销售')) {
      teamType = 'sales';
    } else if (name.includes('warehouse') || name.includes('仓库')) {
      teamType = 'warehouse';
    }
    
    // 获取团队页面权限
    const pagePermissions = await db.$client`
      SELECT page_name FROM team_page_permissions 
      WHERE teamid = ${team.id} AND can_access = true
    `;
    
    const currentPages = pagePermissions.map((p: any) => p.page_name);
    
    // 获取该团队类型应有的默认页面权限
    let expectedPages: string[] = [];
    
    switch (teamType) {
      case 'admin':
        expectedPages = [
          "dashboard", "warehouses", "products", "warehouse-products",
          "inbound-orders", "outbound-orders", "warehouse-transfers",
          "api-configurations", "users", "teams", "team-permissions",
          "settings", "new-product", "create-outbound-order",
          "create-inbound-order", "create-warehouse-transfer"
        ];
        break;
        
      case 'warehouse':
        expectedPages = [
          "dashboard", "warehouses", "products", "warehouse-products", 
          "inbound-orders", "outbound-orders", "warehouse-transfers",
          "create-inbound-order", "create-warehouse-transfer"
        ];
        break;
        
      case 'sales':
        expectedPages = [
          "dashboard", "products", "warehouse-products", 
          "outbound-orders", "create-outbound-order"
        ];
        break;
        
      default:
        expectedPages = ["dashboard", "products"];
        break;
    }
    
    // 检查缺失的页面权限
    const missingPages = expectedPages.filter(page => !currentPages.includes(page));
    
    if (missingPages.length > 0) {
      const issue: AuditIssue = {
        type: 'missing_permission',
        description: `团队 "${team.name}" (ID=${team.id}) 缺少以下页面权限: ${missingPages.join(', ')}`,
        teamId: team.id,
        fixed: false
      };
      
      if (autoFix) {
        try {
          // 添加缺失的页面权限
          for (const pageName of missingPages) {
            await db.insert(schema.teamPagePermissions)
              .values({
                teamId: team.id,
                pageName,
                canAccess: true
              } as any)
              .onConflictDoUpdate({
                target: [schema.teamPagePermissions.teamId, schema.teamPagePermissions.pageName],
                set: { canAccess: true }
              });
          }
          
          issue.fixed = true;
          result.modified = true;
          
          if (!result.affectedTeams.includes(team.id)) {
            result.affectedTeams.push(team.id);
          }
          
          // 获取受影响的用户
          const teamMembers = await db.$client`
            SELECT userid FROM team_members WHERE teamid = ${team.id}
          `;
          
          for (const member of teamMembers) {
            if (!result.affectedUsers.includes(member.userid)) {
              result.affectedUsers.push(member.userid);
            }
          }
        } catch (error) {
          console.error(`[团队权限审计] 无法为团队 "${team.name}" (ID=${team.id}) 添加缺失的页面权限:`, error);
        }
      }
      
      result.issues.push(issue);
    }
  }
}

/**
 * 审计超级管理员用户的团队访问权限
 * 确保所有超级管理员都有权限访问所有团队
 */
async function auditSuperAdminTeamAccess(result: AuditResult, autoFix: boolean): Promise<void> {
  // 获取所有超级管理员
  const superAdmins = await db.query.users.findMany({
    where: eq(schema.users.role, 'super_admin'),
    columns: { id: true, username: true }
  });
  
  // 获取所有团队
  const teams = await db.query.teams.findMany({
    columns: { id: true, name: true }
  });
  
  // 检查每个超级管理员是否有权访问所有团队
  for (const admin of superAdmins) {
    // 获取该管理员已加入的团队
    const memberTeams = await db.$client`
      SELECT teamid FROM team_members WHERE userid = ${admin.id}
    `;
    
    const joinedTeamIds = memberTeams.map((t: any) => t.teamid);
    
    // 找出未加入的团队
    const unjoinedTeams = teams.filter(team => !joinedTeamIds.includes(team.id));
    
    if (unjoinedTeams.length > 0) {
      const issue: AuditIssue = {
        type: 'missing_permission',
        description: `超级管理员 "${admin.username}" (ID=${admin.id}) 未加入以下团队: ${unjoinedTeams.map(t => `"${t.name}" (ID=${t.id})`).join(', ')}`,
        userId: admin.id,
        fixed: false
      };
      
      if (autoFix) {
        try {
          // 将超级管理员添加到所有未加入的团队
          for (const team of unjoinedTeams) {
            await db.insert(schema.teamMembers)
              .values({
                teamId: team.id,
                userId: admin.id,
                isAdmin: true  // 超级管理员应该是所有团队的管理员
              } as any)
              .onConflictDoNothing();
              
            // 添加到受影响的团队列表
            if (!result.affectedTeams.includes(team.id)) {
              result.affectedTeams.push(team.id);
            }
          }
          
          issue.fixed = true;
          result.modified = true;
          
          // 超级管理员本身也是受影响用户
          if (!result.affectedUsers.includes(admin.id)) {
            result.affectedUsers.push(admin.id);
          }
        } catch (error) {
          console.error(`[团队权限审计] 无法将超级管理员 "${admin.username}" (ID=${admin.id}) 添加到未加入的团队:`, error);
        }
      }
      
      result.issues.push(issue);
    }
  }
}

/**
 * 创建定期审计任务
 * @param intervalHours 间隔时间（小时）
 * @param autoFix 是否自动修复
 */
export function schedulePermissionAudit(intervalHours: number = 24, autoFix: boolean = false): NodeJS.Timeout {
  console.log(`[团队权限审计] 设置定期权限审计任务，间隔: ${intervalHours}小时，自动修复: ${autoFix}`);
  
  // 初始运行一次
  setTimeout(() => {
    console.log(`[团队权限审计] 执行初始权限审计`);
    auditTeamPermissions(autoFix).catch(error => {
      console.error(`[团队权限审计] 初始权限审计失败:`, error);
    });
  }, 10 * 60 * 1000); // 系统启动10分钟后运行第一次审计
  
  // 设置定期任务
  const intervalMs = intervalHours * 60 * 60 * 1000;
  
  const timer = setInterval(() => {
    console.log(`[团队权限审计] 执行定期权限审计`);
    auditTeamPermissions(autoFix).catch(error => {
      console.error(`[团队权限审计] 定期权限审计失败:`, error);
    });
  }, intervalMs);
  
  return timer;
}