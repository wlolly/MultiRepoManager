/**
 * 会话同步中间件
 * 负责协调客户端和服务器端的会话ID，确保会话持久性
 * 增强版本支持多种会话ID传递机制和详细日志记录
 */

import { Request, Response, NextFunction } from 'express';

export const sessionSyncMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // 添加会话同步响应头，允许跨域访问
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 
    'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Session-ID, X-Client-Session-ID, ' +
    'X-Original-Session-ID, sessionid, session-id, client-session-id'
  );
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Expose-Headers', 
    'X-Session-ID, X-Original-Session-ID, X-New-Session-ID, X-Session-Restored, X-Session-Authenticated, X-User-ID'
  );
  
  // 如果是预检请求(OPTIONS)，直接返回200状态
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // 收集所有可能的会话ID来源，用于调试
  const sources: Record<string, string> = {};
  
  // 1. 从请求头收集
  const headerNames = [
    'x-client-session-id', 'x-session-id', 'x-original-session-id',
    'sessionid', 'session-id', 'client-session-id'
  ];
  
  for (const name of headerNames) {
    const value = req.headers[name];
    if (value && typeof value === 'string') {
      sources[name] = value;
    }
  }
  
  // 2. 从查询参数收集
  if (req.query.sessionId && typeof req.query.sessionId === 'string') {
    sources['query.sessionId'] = req.query.sessionId;
  }
  
  if (req.query.sid && typeof req.query.sid === 'string') {
    sources['query.sid'] = req.query.sid;
  }
  
  // 3. 从cookie收集
  if (req.cookies) {
    const cookieNames = ['sessionId', 'warehouse.sid', 'connect.sid', 'express.sid'];
    for (const name of cookieNames) {
      if (req.cookies[name]) {
        sources[`cookie.${name}`] = req.cookies[name];
      }
    }
  }
  
  // 4. 当前会话ID
  if (req.sessionID) {
    sources['req.sessionID'] = req.sessionID;
  }
  
  // 重要请求的日志记录
  const isImportantRequest = 
    req.path.includes('/api/auth/') || 
    req.path.includes('/current-user') || 
    req.path.includes('/permissions/');
  
  if (isImportantRequest && Object.keys(sources).length > 0) {
    console.log(`会话同步源 (${req.path}):`, sources);
  }
  
  // 确保响应头包含会话ID
  if (req.sessionID) {
    // 无条件设置这些头，确保客户端始终知道服务器使用的会话ID
    res.setHeader('X-Session-ID', req.sessionID);
    res.setHeader('X-Original-Session-ID', req.sessionID);
    
    // 对已认证的会话添加特殊标记
    if (req.session?.userId) {
      res.setHeader('X-Session-Authenticated', 'true');
      if (req.session.userId > 0) {
        res.setHeader('X-User-ID', req.session.userId.toString());
      }
    }
  }
  
  // 处理客户端发送的会话ID与服务器分配的会话ID不一致的情况
  const preferredClientId = 
    sources['x-client-session-id'] || 
    sources['x-session-id'] || 
    sources['sessionid'] || 
    sources['query.sessionId'];
  
  if (preferredClientId && req.sessionID && preferredClientId !== req.sessionID) {
    if (isImportantRequest) {
      console.log(`会话同步警告: 客户端ID ${preferredClientId} 与服务器ID ${req.sessionID} 不匹配`);
    }
    
    // 告诉客户端服务器使用了不同的会话ID
    res.setHeader('X-Original-Session-ID', preferredClientId);
    res.setHeader('X-New-Session-ID', req.sessionID);
    res.setHeader('X-Session-ID', req.sessionID);
  }
  
  // 确保会话cookie与会话ID一致，这里同时设置多种cookie名称提高兼容性
  if (req.sessionID && res.cookie) {
    // 1. 设置客户端JS可读的会话ID cookie
    res.cookie('sessionId', req.sessionID, {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30天
      httpOnly: false, // 允许JavaScript读取
      path: '/'
    });
    
    // 2. 设置标准名称的会话cookie，确保前后端一致
    res.cookie('warehouse.sid', req.sessionID, {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30天
      httpOnly: true,
      path: '/'
    });
  }
  
  next();
};