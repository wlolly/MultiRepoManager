import { Request, Response, NextFunction } from 'express';

/**
 * 会话同步中间件修复版
 * 确保前端和后端使用相同的会话ID，解决会话丢失问题
 * 减少日志输出，专注于关键问题修复
 */
export function sessionSyncMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
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
      isAuthenticated: req.session?.authenticated || req.session?.isAuthenticated || false
    }));
    
    // 专注只记录一次会话状态，减少日志混乱
    console.log(`[会话]请求路径: ${req.path}, 会话ID: ${req.sessionID}, 已认证: ${req.session?.authenticated || req.session?.isAuthenticated || false}`);
    
    // 处理客户端会话ID
    if (clientSessionId && clientSessionId.length >= 10) {
      // 如果客户端提供的会话ID与当前会话ID不同
      if (clientSessionId !== req.sessionID) {
        // 检查当前会话是否已认证
        const isAuthenticated = req.session && (
          req.session.authenticated === true || 
          req.session.isAuthenticated === true || 
          (req.session.userId && req.session.userId > 0)
        );
        
        // 仅在当前会话未认证且客户端会话ID符合要求时替换
        if (!isAuthenticated) {
          // 验证客户端会话ID格式 - 宽松匹配十六进制字符，支持更多格式
          if (/^[a-zA-Z0-9_-]{10,128}$/.test(clientSessionId)) {
            console.log(`[会话同步] 当前会话未认证，使用客户端提供的会话ID: ${clientSessionId}`);
            req.sessionID = clientSessionId;
            
            // 更新全局持久化存储
            if (global.sessionStorage && req.ip && typeof req.ip === 'string') {
              global.sessionStorage[req.ip] = clientSessionId;
            }
            
            res.setHeader('X-Session-Source', 'client_session');
          }
        } else {
          console.log(`[会话同步] 当前会话已认证，保留服务器会话ID: ${req.sessionID}`);
          res.setHeader('X-Session-Source', 'server_session');
        }
      } else {
        // 会话ID一致
        res.setHeader('X-Session-Source', 'matching_session');
      }
    } else {
      // 没有客户端会话ID或无效
      res.setHeader('X-Session-Source', 'newly_generated');
      res.setHeader('X-New-Session-ID', req.sessionID);
    }
    
    // 确保全局持久化存储始终包含当前会话ID
    if (global.sessionStorage && req.ip && typeof req.ip === 'string') {
      global.sessionStorage[req.ip] = req.sessionID;
    }
    
    // 使用一致的cookie选项
    const cookieOptions = {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30天
      httpOnly: false, // 允许JavaScript访问
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as 'lax',
      path: '/'
    };
    
    // 设置单一的会话ID cookie
    res.cookie('sessionId', req.sessionID, cookieOptions);
    
    // 设置httpOnly的session ID cookie
    res.cookie('warehouse.sid', req.sessionID, {
      ...cookieOptions,
      httpOnly: true
    });
    
    // 设置连接会话cookie
    res.cookie('connect.sid', req.sessionID, {
      ...cookieOptions,
      httpOnly: true
    });
    
    // 认证状态标记
    if (req.session?.authenticated || req.session?.isAuthenticated) {
      res.setHeader('X-Session-Authenticated', 'true');
      if (req.session.userId) {
        res.setHeader('X-User-ID', req.session.userId.toString());
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
  } catch (error) {
    console.error('[会话同步] 错误:', error);
    next(error);
  }
}