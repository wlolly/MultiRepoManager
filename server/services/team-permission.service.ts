/**
 * 团队权限服务
 * 提供团队权限相关的业务逻辑，包括权限初始化、验证和更新
 */

import { eq } from 'drizzle-orm';
import { db } from '../db';
import * as schema from '../../shared/schema';
import { 
  pageNameEnum, teamPagePermissions, teamWarehousePermissions, 
  InsertTeamPagePermission, InsertTeamWarehousePermission
} from '../../shared/schema';
import { clearPermissionCache, triggerPermissionUpdates } from '../utils/permission-utils';

/**
 * 初始化团队权限
 * 在创建新团队后自动设置默认权限配置
 * 
 * @param teamId 团队ID
 * @param teamType 团队类型 (可选，用于不同类型团队的不同默认权限)
 * @returns 初始化结果
 */
export async function initializeTeamPermissions(
  teamId: number, 
  teamType: 'general' | 'sales' | 'warehouse' | 'admin' = 'general'
): Promise<{ success: boolean, pagePermissions: number, warehousePermissions: number }> {
  console.log(`[团队权限] 开始初始化团队(ID=${teamId})权限，类型: ${teamType}`);
  
  try {
    // 1. 获取所有可用页面和仓库
    const availablePages = Object.values(pageNameEnum.enumValues);
    
    const warehouses = await db.select({ id: schema.warehouses.id })
      .from(schema.warehouses);
    
    // 2. 设置默认页面权限 - 根据团队类型分配不同的默认权限
    const pagePermResults = await initializeTeamPagePermissions(teamId, teamType, availablePages);
    
    // 3. 设置默认仓库权限 - 根据团队类型分配不同的仓库访问权限
    const warehousePermResults = await initializeTeamWarehousePermissions(
      teamId, 
      teamType, 
      warehouses.map(w => w.id)
    );
    
    console.log(`[团队权限] 团队(ID=${teamId})权限初始化完成，${pagePermResults.length}个页面权限，${warehousePermResults.length}个仓库权限`);
    
    return {
      success: true,
      pagePermissions: pagePermResults.length,
      warehousePermissions: warehousePermResults.length
    };
  } catch (error) {
    console.error(`[团队权限] 初始化团队(ID=${teamId})权限失败:`, error);
    return {
      success: false,
      pagePermissions: 0,
      warehousePermissions: 0
    };
  }
}

/**
 * 初始化团队页面权限
 * 根据团队类型设置不同的默认页面访问权限
 * 
 * @param teamId 团队ID
 * @param teamType 团队类型
 * @param availablePages 可用页面列表
 * @returns 创建的页面权限记录数组
 */
async function initializeTeamPagePermissions(
  teamId: number,
  teamType: string,
  availablePages: string[]
): Promise<any[]> {
  const results = [];
  
  // 根据团队类型获取默认页面权限配置
  const pagePermissions = getDefaultPagePermissions(teamType);
  
  // 为每个页面创建权限记录
  for (const pageName of availablePages) {
    // 检查页面是否已有权限记录
    const existingPerm = await db.select()
      .from(schema.teamPagePermissions)
      .where(
        eq(schema.teamPagePermissions.teamId, teamId) && 
        eq(schema.teamPagePermissions.pageName, pageName as any)
      )
      .limit(1);
    
    // 如果已存在则跳过
    if (existingPerm.length > 0) {
      continue;
    }
    
    // 检查页面是否在默认权限列表中
    const hasAccess = pageName in pagePermissions ? pagePermissions[pageName] : false;
    
    // 创建新的页面权限记录
    const insertData: InsertTeamPagePermission = {
      teamId,
      pageName: pageName as any,
      canAccess: hasAccess // 使用canAccess字段
    };
    
    const result = await db.insert(schema.teamPagePermissions)
      .values(insertData)
      .returning();
    
    if (result.length > 0) {
      results.push(result[0]);
    }
  }
  
  return results;
}

/**
 * 初始化团队仓库权限
 * 根据团队类型设置不同的默认仓库访问权限
 * 
 * @param teamId 团队ID
 * @param teamType 团队类型
 * @param warehouseIds 仓库ID列表
 * @returns 创建的仓库权限记录数组
 */
async function initializeTeamWarehousePermissions(
  teamId: number,
  teamType: string,
  warehouseIds: number[]
): Promise<any[]> {
  const results = [];
  
  // 根据团队类型确定默认仓库权限
  const canManageWarehouses = teamType === 'admin' || teamType === 'warehouse';
  const canViewWarehouses = canManageWarehouses || teamType === 'sales';
  
  // 为每个仓库创建权限记录
  for (const warehouseId of warehouseIds) {
    // 检查仓库是否已有权限记录
    const existingPerm = await db.select()
      .from(schema.teamWarehousePermissions)
      .where(
        eq(schema.teamWarehousePermissions.teamId, teamId) && 
        eq(schema.teamWarehousePermissions.warehouseId, warehouseId)
      )
      .limit(1);
    
    // 如果已存在则跳过
    if (existingPerm.length > 0) {
      continue;
    }
    
    // 创建新的仓库权限记录
    const insertData: InsertTeamWarehousePermission = {
      teamId,
      warehouseId,
      canView: canViewWarehouses,
      canManage: canManageWarehouses
    } as InsertTeamWarehousePermission;
    
    const result = await db.insert(schema.teamWarehousePermissions)
      .values(insertData)
      .returning();
    
    if (result.length > 0) {
      results.push(result[0]);
    }
  }
  
  return results;
}

/**
 * 获取不同团队类型的默认页面权限配置
 * 
 * @param teamType 团队类型
 * @returns 页面权限配置
 */
function getDefaultPagePermissions(teamType: string): Record<string, boolean> {
  // 基础权限 - 所有团队都可以访问的页面
  const basePermissions: Record<string, boolean> = {
    "dashboard": true
  };
  
  // 根据团队类型添加额外权限
  switch (teamType) {
    case 'admin':
      // 管理员团队可以访问所有页面
      return {
        "dashboard": true,
        "warehouses": true,
        "products": true,
        "warehouse-products": true,
        "inbound-orders": true,
        "outbound-orders": true,
        "warehouse-transfers": true,
        "api-configurations": true,
        "users": true,
        "teams": true,
        "team-permissions": true,
        "settings": true,
        "new-product": true,
        "create-outbound-order": true,
        "create-inbound-order": true,
        "create-warehouse-transfer": true
      };
    
    case 'warehouse':
      // 仓库团队可以访问与仓库管理相关的页面
      return {
        ...basePermissions,
        "warehouses": true,
        "products": true,
        "warehouse-products": true,
        "inbound-orders": true,
        "outbound-orders": true,
        "warehouse-transfers": true,
        "create-inbound-order": true,
        "create-warehouse-transfer": true
      };
    
    case 'sales':
      // 销售团队可以访问与销售相关的页面
      return {
        ...basePermissions,
        "products": true,
        "warehouse-products": true,
        "outbound-orders": true,
        "create-outbound-order": true
      };
    
    case 'general':
    default:
      // 普通团队只能访问基础页面
      return {
        ...basePermissions,
        "products": true
      };
  }
}

/**
 * 更新团队成员的权限缓存
 * 当团队权限变更时，需要清除所有团队成员的权限缓存
 * 
 * @param teamId 团队ID
 * @returns 更新结果
 */
export async function updateTeamMembersPermissionCache(teamId: number): Promise<{ success: boolean, updatedCount: number }> {
  try {
    console.log(`[团队权限] 开始更新团队(ID=${teamId})成员的权限缓存`);
    
    // 获取团队所有成员
    const teamMembers = await db.select({ userId: schema.teamMembers.userId })
      .from(schema.teamMembers)
      .where(eq(schema.teamMembers.teamId, teamId));
    
    if (!teamMembers.length) {
      console.log(`[团队权限] 团队(ID=${teamId})没有成员，无需更新权限缓存`);
      return {
        success: true,
        updatedCount: 0
      };
    }
    
    // 提取所有成员的用户ID
    const userIds = teamMembers.map(member => member.userId);
    
    // 触发这些用户的权限缓存更新
    const updatedCount = triggerPermissionUpdates(userIds, teamId);
    
    console.log(`[团队权限] 已更新${updatedCount}个团队成员的权限缓存`);
    return {
      success: true,
      updatedCount
    };
  } catch (error) {
    console.error(`[团队权限] 更新团队成员权限缓存失败:`, error);
    return {
      success: false,
      updatedCount: 0
    };
  }
}