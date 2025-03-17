/**
 * 权限刷新中间件
 * 
 * 用于确保用户的权限信息保持最新，并在需要时自动刷新
 * 提供缓存管理和定期清除过期缓存的功能
 */

import { Request, Response, NextFunction } from 'express';
import { loadUserPermissions, clearPermissionCache, clearAllPermissionCaches, setPermissionCache } from '../utils/permission-utils';
import { db, useFallbackStorage } from '../db';

// 缓存过期时间（分钟）
const CACHE_EXPIRY_MINUTES = 15;
// 缓存自动清理间隔（分钟）
const CACHE_CLEANUP_INTERVAL_MINUTES = 60;

// 存储最后一次权限检查的时间
const lastPermissionCheck = new Map<number, number>();

/**
 * 权限刷新中间件
 * 在请求处理前检查用户权限是否需要刷新
 */
export function permissionRefreshMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!req.session || !req.session.userId) {
    return next();
  }

  const userId = req.session.userId;
  const currentTime = Date.now();
  const lastCheckTime = lastPermissionCheck.get(userId) || 0;

  // 检查是否需要刷新权限
  const needsRefresh = (currentTime - lastCheckTime) > (CACHE_EXPIRY_MINUTES * 60 * 1000);

  if (needsRefresh) {
    // 记录最后检查时间
    lastPermissionCheck.set(userId, currentTime);

    // 异步刷新权限，不阻塞当前请求
    refreshUserPermissionsAsync(req, userId)
      .catch(err => {
        console.error(`权限刷新失败, userId=${userId}:`, err);
      });
  }

  next();
}

/**
 * 异步刷新用户权限
 * @param req 请求对象
 * @param userId 用户ID
 */
async function refreshUserPermissionsAsync(req: Request, userId: number) {
  try {
    // 加载最新的用户权限
    const permissions = await loadUserPermissions(userId, req.sessionID);
    
    // 更新会话中的权限信息
    if (req.session) {
      req.session.permissions = permissions;
      
      // 旧版格式兼容
      req.session.pagePermissions = permissions.pages;
      req.session.actionPermissions = permissions.actions;
      req.session.warehousePermissions = permissions.warehouses;
      req.session.isAdmin = permissions.isAdmin;
    }

    // 更新缓存
    setPermissionCache(userId, permissions);
    
    return permissions;
  } catch (error) {
    console.error(`刷新权限失败 (userId=${userId}):`, error);
    throw error;
  }
}

/**
 * 设置定期清理权限缓存的任务
 */
export function setupPermissionCacheCleanup() {
  // 设置定期清理任务
  const intervalMs = CACHE_CLEANUP_INTERVAL_MINUTES * 60 * 1000;
  
  setInterval(() => {
    try {
      // 清理过期的lastPermissionCheck记录
      const currentTime = Date.now();
      const expiryTime = CACHE_EXPIRY_MINUTES * 60 * 1000 * 2; // 双倍过期时间
      
      for (const [userId, lastCheck] of lastPermissionCheck) {
        if (currentTime - lastCheck > expiryTime) {
          lastPermissionCheck.delete(userId);
          clearPermissionCache(userId);
        }
      }
      
      console.log(`权限缓存清理完成，当前缓存数量: ${lastPermissionCheck.size}`);
    } catch (error) {
      console.error('权限缓存清理失败:', error);
    }
  }, intervalMs);
  
  console.log(`权限缓存清理任务已启动, 间隔: ${CACHE_CLEANUP_INTERVAL_MINUTES}分钟`);
}

/**
 * 手动刷新用户权限处理器
 * 用于路由中手动调用刷新权限的API端点
 */
export async function refreshUserPermissions(req: Request, res: Response) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({
      success: false,
      message: '用户未登录或会话已过期'
    });
  }

  try {
    // 清除缓存
    clearPermissionCache(req.session.userId);
    
    // 重新加载权限
    const permissions = await refreshUserPermissionsAsync(req, req.session.userId);
    
    return res.json({
      success: true,
      message: '权限已刷新',
      permissions,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('手动刷新权限失败:', error);
    return res.status(500).json({
      success: false,
      message: '刷新权限时发生错误',
      error: String(error)
    });
  }
}

/**
 * 获取用户权限处理器
 * 用于路由中获取当前用户权限的API端点
 */
export async function getUserPermissions(req: Request, res: Response) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({
      success: false,
      message: '用户未登录或会话已过期'
    });
  }

  try {
    // 使用会话中已有的权限或重新加载
    const permissions = req.session.permissions || 
                       await refreshUserPermissionsAsync(req, req.session.userId);

    return res.json({
      success: true,
      permissions,
      userId: req.session.userId,
      sessionId: req.sessionID,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('获取权限失败:', error);
    return res.status(500).json({
      success: false,
      message: '获取权限时发生错误',
      error: String(error)
    });
  }
}