/**
 * 基于角色的认证中间件
 * 提供各种角色级别的权限控制和认证中间件
 */

import { Request, Response, NextFunction } from 'express';
import { loadUserPermissions } from '../utils/permission-utils';
import { triggerPermissionRefresh } from './permission-refresh-middleware';

/**
 * 验证用户是否登录的中间件
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.userId) {
    return res.status(401).json({
      success: false,
      message: '用户未登录',
      error: 'NOT_AUTHENTICATED'
    });
  }
  
  next();
}

/**
 * 验证用户是否具有管理员角色的中间件
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.userId) {
    return res.status(401).json({
      success: false,
      message: '用户未登录',
      error: 'NOT_AUTHENTICATED'
    });
  }
  
  const isAdmin = req.session.role === 'admin' || req.session.role === 'super_admin' ||
                  req.session.permissions?.isAdmin === true;
  
  if (!isAdmin) {
    return res.status(403).json({
      success: false,
      message: '需要管理员权限',
      error: 'ADMIN_REQUIRED'
    });
  }
  
  next();
}

/**
 * 验证用户是否具有超级管理员角色的中间件
 */
export function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.userId) {
    return res.status(401).json({
      success: false,
      message: '用户未登录',
      error: 'NOT_AUTHENTICATED'
    });
  }
  
  const isSuperAdmin = req.session.role === 'super_admin' ||
                      req.session.permissions?.isSuperAdmin === true;
  
  if (!isSuperAdmin) {
    return res.status(403).json({
      success: false,
      message: '需要超级管理员权限',
      error: 'SUPER_ADMIN_REQUIRED'
    });
  }
  
  next();
}

/**
 * 刷新用户权限的API中间件
 * 用于用户角色变更或权限更新后手动刷新
 */
export async function refreshUserPermissions(req: Request, res: Response) {
  try {
    // 确保用户已登录
    if (!req.session?.userId) {
      return res.status(401).json({
        success: false,
        message: '用户未登录',
        error: 'NOT_AUTHENTICATED'
      });
    }
    
    const userId = req.session.userId;
    
    // 触发主动权限刷新
    const refreshed = await triggerPermissionRefresh(userId, req);
    
    if (refreshed) {
      return res.status(200).json({
        success: true,
        message: '权限已刷新',
        userId
      });
    } else {
      return res.status(500).json({
        success: false,
        message: '权限刷新失败',
        error: 'REFRESH_FAILED'
      });
    }
  } catch (error) {
    console.error('[权限刷新API] 刷新权限时出错:', error);
    
    return res.status(500).json({
      success: false,
      message: '处理请求时出错',
      error: 'INTERNAL_ERROR'
    });
  }
}

/**
 * 获取当前用户权限的API中间件
 */
export async function getUserPermissions(req: Request, res: Response) {
  try {
    // 确保用户已登录
    if (!req.session?.userId) {
      return res.status(401).json({
        success: false,
        message: '用户未登录',
        error: 'NOT_AUTHENTICATED'
      });
    }
    
    const userId = req.session.userId;
    const role = req.session.role;
    
    // 获取最新权限
    const permissions = req.session.permissions || {
      pages: [],
      actions: [],
      warehouses: {}
    };
    
    return res.status(200).json({
      success: true,
      userId,
      role,
      permissions,
      isAdmin: permissions.isAdmin === true,
      isSuperAdmin: permissions.isSuperAdmin === true
    });
  } catch (error) {
    console.error('[权限API] 获取权限时出错:', error);
    
    return res.status(500).json({
      success: false,
      message: '处理请求时出错',
      error: 'INTERNAL_ERROR'
    });
  }
}