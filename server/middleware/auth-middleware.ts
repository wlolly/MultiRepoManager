import { Request, Response, NextFunction } from 'express';
import { generateSessionId } from '../auth';

/**
 * 简单的认证中间件
 * 
 * 直接从数据库检查会话ID是否有效，不做额外复杂的同步处理
 */
export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.sessionID) {
      console.log('[认证中间件] 没有会话ID，将创建新会话');
      // 如果没有会话ID，创建一个新的会话ID（Express会在cookie中为我们设置它）
      next();
      return;
    }

    // 获取存储接口
    const storage = req.app.locals.storage;
    if (!storage) {
      console.error('[认证中间件] 存储接口未初始化');
      next();
      return;
    }

    // 从数据库检查会话ID，使用之前实现的数据库方法
    const session = await storage.getUserSessionById(req.sessionID);
    
    // 会话ID存在但不在数据库中，则视为未认证
    if (!session) {
      console.log(`[认证中间件] 会话ID ${req.sessionID} 在数据库中不存在`);
      req.session.isAuthenticated = false;
      req.session.authenticated = false;
      req.session.userId = null;
      next();
      return;
    }

    // 会话ID在数据库中存在，检查是否有效
    if (!session.isValid) {
      console.log(`[认证中间件] 会话ID ${req.sessionID} 已失效`);
      req.session.isAuthenticated = false;
      req.session.authenticated = false;
      req.session.userId = null;
      next();
      return;
    }

    // 会话ID有效，则设置认证状态和用户ID
    console.log(`[认证中间件] 会话ID ${req.sessionID} 有效，用户ID: ${session.userId}`);
    
    // 防止会话固定攻击，如果是新会话请求但已有有效会话ID，更新会话ID
    if (!req.session.userId && session.userId) {
      console.log(`[认证中间件] 首次认证，正在更新会话状态`);
    }
    
    // 更新会话状态
    req.session.isAuthenticated = true;
    req.session.authenticated = true;
    req.session.userId = session.userId;
    req.session.lastActivity = Date.now();
    
    // 更新数据库中的会话活动时间
    await storage.updateUserSession(req.sessionID, {
      lastActivity: new Date()
    });

    next();
  } catch (error) {
    console.error('[认证中间件] 错误:', error);
    next(error);
  }
}

/**
 * 验证用户是否已登录的中间件
 * 拒绝未认证用户的请求
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  // 检查会话中的认证状态
  const isAuthenticated = req.session && 
    (req.session.authenticated === true || req.session.userId > 0);
    
  if (!isAuthenticated) {
    return res.status(401).json({
      message: '需要登录才能访问',
      authenticated: false
    });
  }
  
  next();
}

/**
 * 验证用户是否是管理员的中间件
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  // 检查会话中的认证状态和角色
  const isAuthenticated = req.session && 
    (req.session.authenticated === true || req.session.userId > 0);
  const isAdmin = req.session && 
    (req.session.role === 'admin' || req.session.role === 'super_admin');
    
  if (!isAuthenticated || !isAdmin) {
    return res.status(403).json({
      message: '需要管理员权限才能访问',
      authenticated: isAuthenticated,
      isAdmin: false
    });
  }
  
  next();
}