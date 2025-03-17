/**
 * 权限刷新中间件
 * 用于自动检查和刷新用户权限
 */

import { Request, Response, NextFunction } from 'express';
import { clearAllPermissionCaches, clearPermissionCache, loadUserPermissions } from '../utils/permission-utils';

// 最后一次全局权限缓存清理时间
let lastGlobalCacheClear = Date.now();

// 全局缓存清理间隔 (毫秒) - 4小时
const GLOBAL_CACHE_CLEAR_INTERVAL = 4 * 60 * 60 * 1000;

// 自动权限刷新间隔 (毫秒) - 5分钟
// 此间隔决定了对同一用户在多长时间内不会重复刷新权限
const AUTO_REFRESH_INTERVAL = 5 * 60 * 1000;

// 跟踪每个用户的最后权限刷新时间
const lastRefreshMap = new Map<number, number>();

/**
 * 权限刷新中间件
 * 在每个需要认证的请求上检查并按需刷新用户权限
 */
export async function refreshPermissionsMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    // 只对已认证用户执行权限刷新
    if (req.session?.userId) {
      const userId = req.session.userId;
      const now = Date.now();
      const lastRefresh = lastRefreshMap.get(userId) || 0;
      
      // 检查是否需要刷新权限 (已超过刷新间隔)
      if (now - lastRefresh > AUTO_REFRESH_INTERVAL) {
        console.log(`[权限刷新] 开始为用户${userId}刷新权限...`);
        
        // 记录刷新时间
        lastRefreshMap.set(userId, now);
        
        // 加载并保存最新权限到会话
        await loadUserPermissions(userId, req, req.session?.role || null);
        
        console.log(`[权限刷新] 用户${userId}权限刷新完成`);
      }
    }
    
    // 继续处理请求
    next();
  } catch (error) {
    console.error('[权限刷新] 刷新权限时出错:', error);
    // 出错时也继续处理请求，不阻断用户操作
    next();
  }
}

/**
 * 初始化权限缓存清理任务
 * 定期清理过期的权限缓存
 */
export function initPermissionCleanupTask() {
  console.log('[权限系统] 初始化权限缓存清理任务');
  
  // 设置定时器，定期清理全局权限缓存
  setInterval(() => {
    const now = Date.now();
    if (now - lastGlobalCacheClear > GLOBAL_CACHE_CLEAR_INTERVAL) {
      console.log('[权限系统] 执行全局权限缓存清理');
      clearAllPermissionCaches();
      lastGlobalCacheClear = now;
    }
  }, 60 * 60 * 1000); // 每小时检查一次
  
  // 清理过期的用户刷新记录
  setInterval(() => {
    const now = Date.now();
    let cleanCount = 0;
    
    // 清理超过2倍刷新间隔的记录
    for (const [userId, lastRefresh] of lastRefreshMap.entries()) {
      if (now - lastRefresh > AUTO_REFRESH_INTERVAL * 2) {
        lastRefreshMap.delete(userId);
        cleanCount++;
      }
    }
    
    if (cleanCount > 0) {
      console.log(`[权限系统] 清理了${cleanCount}条过期的用户权限刷新记录`);
    }
  }, 30 * 60 * 1000); // 每30分钟清理一次
}

/**
 * 主动触发特定用户的权限刷新
 * @param userId 用户ID
 * @param req 请求对象 (可选)
 * @returns 刷新是否成功
 */
export async function triggerPermissionRefresh(userId: number, req?: Request): Promise<boolean> {
  try {
    console.log(`[权限刷新] 触发用户${userId}的主动权限刷新`);
    
    // 清除用户权限缓存
    clearPermissionCache(userId);
    
    // 重置最后刷新时间
    lastRefreshMap.delete(userId);
    
    // 如果提供了请求对象，更新会话中的权限
    if (req && req.session) {
      await loadUserPermissions(userId, req, req.session.role || null);
      console.log(`[权限刷新] 用户${userId}的会话权限已更新`);
    }
    
    return true;
  } catch (error) {
    console.error(`[权限刷新] 触发用户${userId}权限刷新失败:`, error);
    return false;
  }
}