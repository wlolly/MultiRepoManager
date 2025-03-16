import { Request, Response, NextFunction } from 'express';

/**
 * 会话同步中间件
 * 确保前端和后端使用相同的会话ID，解决会话丢失问题
 */
export function sessionSyncMiddleware(req: Request, res: Response, next: NextFunction) {
  const originalSessionID = req.sessionID;
  
  // 记录请求路径和会话ID,方便调试
  console.log(`为路径 ${req.path} 重用之前的会话ID: ${req.sessionID}`);
  console.log(`请求路径: ${req.path}, 会话ID: ${req.sessionID}, 已认证: ${req.session?.authenticated || false}`);
  
  // 始终在响应头中包含当前会话ID和来源信息
  res.setHeader('X-Original-Session-ID', originalSessionID);
  res.setHeader('X-Session-ID', req.sessionID);
  
  // 获取客户端可能提供的会话ID (从多个可能的来源获取)
  const clientSessionId = req.headers['x-session-id'] as string || 
                         req.cookies?.sessionId ||
                         req.cookies?.['warehouse.sid'] ||
                         req.cookies?.['connect.sid'];
  
  // 将会话信息添加到响应头方便调试
  res.setHeader('X-Session-Debug', JSON.stringify({
    id: req.sessionID,
    isAuthenticated: req.session?.authenticated || false
  }));
  
  // 记录会话对象详细信息到日志
  console.log('[会话调试] 路径:', req.path, '会话信息:', {
    id: req.sessionID,
    isAuthenticated: req.session?.authenticated || false
  });
  console.log('[会话调试] 路径:', req.path, '会话信息:', {
    id: req.sessionID,
    userId: req.session?.userId,
    socialBound: req.session?.socialBound,
    isAuthenticated: req.session?.authenticated || false
  });

  // 如果客户端提供了会话ID，并且与当前会话ID不同，则尝试重用它
  if (clientSessionId && clientSessionId !== originalSessionID) {
    console.log(`[会话同步] 客户端提供会话ID: ${clientSessionId}, 与服务器会话ID ${originalSessionID} 不同`);
    
    // 仅在会话未认证时替换会话ID
    if (!req.session?.authenticated) {
      console.log(`[会话同步] 当前会话未认证，使用客户端提供的会话ID: ${clientSessionId}`);
      req.sessionID = clientSessionId;
      res.setHeader('X-Session-Source', 'client_session');
    } else {
      console.log(`[会话同步] 当前会话已认证，保留服务器会话ID: ${req.sessionID}`);
      res.setHeader('X-Session-Source', 'server_session');
    }
  } else if (!clientSessionId) {
    // 没有客户端会话ID
    console.log(`[会话同步] 客户端未提供会话ID，使用服务器生成的会话ID: ${req.sessionID}`);
    res.setHeader('X-Session-Source', 'newly_generated');
    res.setHeader('X-New-Session-ID', req.sessionID);
  } else {
    // 会话ID一致
    console.log(`[会话同步] 客户端会话ID与服务器一致: ${req.sessionID}`);
    res.setHeader('X-Session-Source', 'matching_session');
  }

  // 确保cookie中包含正确的会话ID，使用安全的cookie设置
  res.cookie('sessionId', req.sessionID, {
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30天
    httpOnly: false, // 允许JavaScript访问，前端需要读取
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  });

  // 设置express-session的cookie，确保使用相同的会话ID
  res.cookie('warehouse.sid', req.sessionID, {
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30天
    httpOnly: true, // 不允许JavaScript访问，安全性更高
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  });
  
  // 为兼容性添加connect.sid cookie
  res.cookie('connect.sid', req.sessionID, {
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30天
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  });

  next();
}