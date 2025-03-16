import { Request, Response, NextFunction } from 'express';

/**
 * 会话同步中间件
 * 确保前端和后端使用相同的会话ID，解决会话丢失问题
 */
export function sessionSyncMiddleware(req: Request, res: Response, next: NextFunction) {
  const originalSessionID = req.sessionID;
  
  // 从全局存储中检查是否有持久化的会话ID
  if (global.sessionStorage && req.ip && typeof req.ip === 'string' && global.sessionStorage[req.ip]) {
    const persistentSessionId = global.sessionStorage[req.ip];
    console.log(`[会话同步] 发现持久化会话ID: ${persistentSessionId}`);
    
    // 如果服务器会话ID与持久化ID不同，使用持久化ID
    if (persistentSessionId !== req.sessionID) {
      console.log(`[会话同步] 使用持久化会话ID替换当前会话ID`);
      req.sessionID = persistentSessionId;
    }
  }
  
  // 记录请求路径和会话ID，方便调试
  console.log(`为路径 ${req.path} 使用会话ID: ${req.sessionID}`);
  console.log(`请求路径: ${req.path}, 会话ID: ${req.sessionID}, 已认证: ${req.session?.authenticated || false}`);
  
  // 始终在响应头中包含当前会话ID和来源信息
  res.setHeader('X-Original-Session-ID', originalSessionID);
  res.setHeader('X-Session-ID', req.sessionID);
  res.setHeader('X-Persistent-Session-ID', req.sessionID);
  
  // 获取客户端可能提供的会话ID (从多个可能的来源获取)
  const clientSessionId = 
    req.headers['x-session-id'] as string || 
    req.headers['x-client-session-id'] as string ||
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

  // 处理客户端会话ID
  if (clientSessionId && clientSessionId.length >= 10) {
    // 如果客户端提供的会话ID与当前会话ID不同
    if (clientSessionId !== req.sessionID) {
      console.log(`[会话同步] 客户端提供会话ID: ${clientSessionId}, 与服务器会话ID ${req.sessionID} 不同`);
      
      // 仅在当前会话未认证且客户端会话ID符合要求时替换
      if (!req.session?.authenticated) {
        // 验证客户端会话ID格式
        if (/^[a-f0-9]{16,64}$/.test(clientSessionId)) {
          console.log(`[会话同步] 当前会话未认证，使用客户端提供的会话ID: ${clientSessionId}`);
          req.sessionID = clientSessionId;
          
          // 更新全局持久化存储
          if (global.sessionStorage && req.ip && typeof req.ip === 'string') {
            global.sessionStorage[req.ip] = clientSessionId;
          }
          
          res.setHeader('X-Session-Source', 'client_session');
        } else {
          console.log(`[会话同步] 客户端提供的会话ID格式无效: ${clientSessionId}`);
        }
      } else {
        console.log(`[会话同步] 当前会话已认证，保留服务器会话ID: ${req.sessionID}`);
        res.setHeader('X-Session-Source', 'server_session');
      }
    } else {
      // 会话ID一致
      console.log(`[会话同步] 客户端会话ID与服务器一致: ${req.sessionID}`);
      res.setHeader('X-Session-Source', 'matching_session');
    }
  } else {
    // 没有客户端会话ID或无效
    console.log(`[会话同步] 客户端未提供有效会话ID，使用服务器生成的会话ID: ${req.sessionID}`);
    res.setHeader('X-Session-Source', 'newly_generated');
    res.setHeader('X-New-Session-ID', req.sessionID);
  }

  // 确保全局持久化存储始终包含当前会话ID
  if (global.sessionStorage && req.ip && typeof req.ip === 'string') {
    global.sessionStorage[req.ip] = req.sessionID;
  }

  // 确保cookie中包含正确的会话ID，使用安全的cookie设置
  const cookieOptions = {
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30天
    httpOnly: false, // 允许JavaScript访问，前端需要读取
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as 'lax',
    path: '/'
  };

  // 设置多个cookie确保在不同环境中都能正确识别会话
  res.cookie('sessionId', req.sessionID, cookieOptions);
  
  // 设置express-session的cookie，确保使用相同的会话ID
  res.cookie('warehouse.sid', req.sessionID, {
    ...cookieOptions,
    httpOnly: true, // 不允许JavaScript访问，安全性更高
  });
  
  // 为兼容性添加connect.sid cookie
  res.cookie('connect.sid', req.sessionID, {
    ...cookieOptions,
    httpOnly: true,
  });
  
  // 为已认证的会话添加特殊标记
  if (req.session?.authenticated) {
    res.cookie('auth_status', 'authenticated', {
      ...cookieOptions,
      httpOnly: false,
    });
    
    if (req.session.userId) {
      res.cookie('user_id', req.session.userId.toString(), {
        ...cookieOptions,
        httpOnly: false,
      });
    }
  }

  // 立即保存会话以确保一致性
  if (req.session) {
    req.session.save((err) => {
      if (err) {
        console.error('[会话同步] 保存会话失败:', err);
      }
      next();
    });
  } else {
    next();
  }
}