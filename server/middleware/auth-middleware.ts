import { Request, Response, NextFunction } from 'express';
import { generateSessionId } from '../auth';

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    // 记录请求信息
    console.log(`[认证中间件] 请求: ${req.method} ${req.path}`);
    console.log(`[认证中间件] 会话状态:`, {
      id: req.sessionID,
      clientId: req.headers['x-session-id'],
      authenticated: req.session?.authenticated
    });

    // 会话ID处理逻辑
    const clientSessionId = req.headers['x-session-id'] as string;
    const cookieSessionId = req.cookies.sessionId;

    console.log(`[认证中间件] 会话ID来源检查:`, {
      headers: clientSessionId,
      cookie: cookieSessionId,
      express: req.sessionID
    });

    // 优先级: 客户端头部 > Cookie > Express
    if (clientSessionId && clientSessionId.length > 10) {
      req.sessionID = clientSessionId;
      global.sessionMap[req.ip] = clientSessionId;
      console.log(`[认证中间件] 使用客户端头部会话ID: ${clientSessionId}`);
    } else if (cookieSessionId && cookieSessionId.length > 10) {
      req.sessionID = cookieSessionId;
      global.sessionMap[req.ip] = cookieSessionId;
      console.log(`[认证中间件] 使用Cookie会话ID: ${cookieSessionId}`);
    } else if (global.sessionMap[req.ip]) {
      req.sessionID = global.sessionMap[req.ip];
      console.log(`[认证中间件] 使用全局存储会话ID: ${req.sessionID}`);
    }

    // 如果没有任何会话ID，创建新会话
    if (!req.sessionID) {
      console.log('[认证中间件] 没有会话ID，创建新会话');
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

    // 从数据库检查会话
    if (req.sessionID) {
      const session = await storage.getUserSessionById(req.sessionID);

      if (session && session.isValid && session.userId) {
        console.log(`[认证中间件] 找到有效会话: ${req.sessionID}`);
        req.session.authenticated = true;
        req.session.isAuthenticated = true;
        req.session.userId = session.userId;

        // 更新会话活动时间
        await storage.updateUserSession(req.sessionID, {
          lastActivity: new Date()
        });
      } else {
        console.log(`[认证中间件] 会话无效或不存在: ${req.sessionID}`);
        req.session.authenticated = false;
        req.session.isAuthenticated = false;
        req.session.userId = null;
      }
    }

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