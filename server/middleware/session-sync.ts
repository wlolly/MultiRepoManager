/**
 * 会话同步中间件
 * 负责协调客户端和服务器端的会话ID，确保会话持久性
 */

import { Request, Response, NextFunction } from 'express';

export const sessionSyncMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // 添加会话同步响应头，允许跨域访问
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Session-ID, X-Client-Session-ID, X-Original-Session-ID');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Expose-Headers', 'X-Session-ID, X-Original-Session-ID, X-New-Session-ID');
  
  // 记录会话同步请求头，便于调试
  const clientSessionId = req.headers['x-client-session-id'];
  const originalSessionId = req.headers['x-original-session-id'];
  
  // 如果是预检请求(OPTIONS)，直接返回200状态
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // 如果客户端发送了一个会话ID，而服务器端生成了一个新的，需要记录关联 
  if (clientSessionId && req.sessionID && clientSessionId !== req.sessionID) {
    console.log(`会话同步: 客户端ID ${clientSessionId} 与服务器ID ${req.sessionID} 不匹配`);
    
    // 设置关联会话的响应头，使客户端知道变化
    res.setHeader('X-Original-Session-ID', clientSessionId);
    res.setHeader('X-New-Session-ID', req.sessionID);
    res.setHeader('X-Session-ID', req.sessionID);
  }
  
  // 确保响应头包含会话ID，简化客户端处理逻辑
  if (req.sessionID) {
    res.setHeader('X-Session-ID', req.sessionID);
    
    // 当没有客户端会话ID时，原始ID就是当前会话ID
    if (!res.getHeader('X-Original-Session-ID')) {
      res.setHeader('X-Original-Session-ID', req.sessionID);
    }
    
    // 如果请求路径包含auth，记录更详细的日志
    if (req.path.includes('/api/auth/')) {
      console.log(`会话同步: 认证路径 ${req.path} 使用会话ID ${req.sessionID}`);
    }
  }
  
  // 确保会话cookie与会话ID一致
  if (req.sessionID) {
    // 设置统一的会话cookie，确保客户端和服务器使用相同的会话ID
    res.cookie('warehouse.sid', req.sessionID, {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30天
      httpOnly: true,
      path: '/'
    });
    
    // 同时设置一个客户端可读的sessionId cookie
    res.cookie('sessionId', req.sessionID, {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30天
      httpOnly: false, // 允许客户端JavaScript访问
      path: '/'
    });
  }
  
  next();
};