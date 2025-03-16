/**
 * 会话同步中间件 (增强版)
 * 负责协调客户端和服务器端的会话ID，确保会话持久性
 * 增强版本支持直接解析Cookie和多种会话ID传递机制，并包含详细日志
 */

import { Request, Response, NextFunction } from 'express';

export const sessionSyncMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // 添加会话同步响应头，允许跨域访问
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 
    'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Session-ID, X-Client-Session-ID, ' +
    'X-Original-Session-ID, sessionid, session-id, client-session-id, Cookie'
  );
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Expose-Headers', 
    'X-Session-ID, X-Original-Session-ID, X-New-Session-ID, X-Session-Restored, X-Session-Authenticated, X-User-ID, X-Session-Source, Set-Cookie'
  );
  
  // 如果是预检请求(OPTIONS)，直接返回200状态
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // 收集所有可能的会话ID来源，用于调试和优先级排序
  let clientSessionIds: Array<{source: string, id: string, priority: number}> = [];
  
  // 直接从请求Cookie字符串中解析，避免依赖cookie中间件
  const parseCookies = (cookieStr?: string): Record<string, string> => {
    const cookies: Record<string, string> = {};
    if (!cookieStr) return cookies;
    
    const pairs = cookieStr.split(';');
    for (let pair of pairs) {
      pair = pair.trim();
      const equalPos = pair.indexOf('=');
      if (equalPos === -1) continue;
      
      const key = pair.substring(0, equalPos).trim();
      let value = pair.substring(equalPos + 1).trim();
      
      // 处理签名cookie值
      if (value.startsWith('s%3A')) {
        value = value.substring(4);
      }
      
      // 如果值包含点号(.)，取第一部分
      if (value.includes('.')) {
        value = value.split('.')[0];
      }
      
      cookies[key] = value;
    }
    return cookies;
  };
  
  // 1. 优先从请求头中获取
  const headerNames = [
    'x-client-session-id', 'x-session-id', 'x-original-session-id',
    'sessionid', 'session-id', 'client-session-id'
  ];
  
  for (const name of headerNames) {
    const value = req.headers[name];
    if (value && typeof value === 'string' && value.length >= 10) {
      clientSessionIds.push({
        source: `请求头(${name})`, 
        id: value,
        priority: headerNames.indexOf(name) // 按数组中的位置确定优先级
      });
    }
  }
  
  // 2. 从Cookie中获取
  const rawCookies = parseCookies(req.headers.cookie as string);
  const cookieNames = ['sessionId', 'warehouse.sid', 'connect.sid', 'express.sid'];
  
  for (const name of cookieNames) {
    if (rawCookies[name] && rawCookies[name].length >= 10) {
      clientSessionIds.push({
        source: `Cookie(${name})`,
        id: rawCookies[name],
        priority: 10 + cookieNames.indexOf(name) // Cookie优先级略低于请求头
      });
    }
  }
  
  // 3. 从查询参数中获取
  if (req.query.sessionId && typeof req.query.sessionId === 'string' && req.query.sessionId.length >= 10) {
    clientSessionIds.push({
      source: '查询参数(sessionId)',
      id: req.query.sessionId,
      priority: 20 // 查询参数优先级最低
    });
  }
  
  // 按优先级排序
  clientSessionIds.sort((a, b) => a.priority - b.priority);
  
  // 重要请求的日志记录(认证和权限相关)
  const isImportantRequest = 
    req.path.includes('/api/auth/') || 
    req.path.includes('/current-user') || 
    req.path.includes('/permissions/');
  
  if (isImportantRequest) {
    if (clientSessionIds.length > 0) {
      console.log(`会话同步 - 客户端会话ID候选 (${req.path}):`, 
        clientSessionIds.map(s => `${s.source}: ${s.id.substring(0, 8)}...`).join(', '));
    } else {
      console.log(`会话同步 - 无客户端会话ID (${req.path})`);
    }
    
    console.log(`会话同步 - 服务器会话ID: ${req.sessionID || '无'}`);
  }
  
  // 将服务器当前使用的会话ID添加到响应头，确保客户端知道
  if (req.sessionID) {
    res.setHeader('X-Session-ID', req.sessionID);
    res.setHeader('X-Original-Session-ID', req.sessionID);
    
    // 如果会话已认证，添加特殊标记
    if (req.session?.userId) {
      res.setHeader('X-Session-Authenticated', 'true');
      res.setHeader('X-User-ID', req.session.userId.toString());
    }
  }
  
  // 找到客户端最高优先级的会话ID
  const topClientSessionId = clientSessionIds.length > 0 ? clientSessionIds[0] : null;
  
  // 如果客户端发送的会话ID与服务器当前使用的不同，记录差异
  if (topClientSessionId && req.sessionID && topClientSessionId.id !== req.sessionID) {
    if (isImportantRequest) {
      console.log(`会话同步 - ID不匹配: 客户端ID ${topClientSessionId.id.substring(0, 8)}... (来源: ${topClientSessionId.source}) 与服务器ID ${req.sessionID.substring(0, 8)}... 不一致`);
    }
    
    // 告诉客户端实际使用了哪个会话ID
    res.setHeader('X-Original-Session-ID', topClientSessionId.id);
    res.setHeader('X-New-Session-ID', req.sessionID);
    res.setHeader('X-Session-ID', req.sessionID);
    res.setHeader('X-Session-Source', 'server-generated');
  } 
  // 如果一致，记录一致性
  else if (topClientSessionId && req.sessionID && topClientSessionId.id === req.sessionID) {
    if (isImportantRequest) {
      console.log(`会话同步 - ID一致: 客户端ID与服务器ID ${req.sessionID.substring(0, 8)}... 匹配`);
    }
    res.setHeader('X-Session-Source', topClientSessionId.source);
  }
  
  // 确保会话cookie始终与当前会话ID同步 (关键修复)
  if (req.sessionID) {
    // 1. 设置非HttpOnly的sessionId供客户端JavaScript读取
    res.cookie('sessionId', req.sessionID, {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30天
      httpOnly: false, // 允许客户端读取
      path: '/'
    });
    
    // 2. 设置HttpOnly的warehouse.sid作为主会话cookie
    res.cookie('warehouse.sid', req.sessionID, {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30天
      httpOnly: true,
      path: '/'
    });
    
    // 3. 确保原始express-session使用的cookie也正确设置
    if (req.session && !req.session.cookie.expires) {
      req.session.cookie.expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000;
    }
  }
  
  next();
};