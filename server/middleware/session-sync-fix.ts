import { Request, Response, NextFunction } from 'express';

/**
 * 会话同步中间件修复版 (v2.0)
 * 增强会话稳定性，严格控制会话ID切换时机，确保会话一致性
 * 实现客户端和服务器会话的平稳过渡
 */
export function sessionSyncMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    // 保存原始会话ID用于日志
    const originalSessionID = req.sessionID || '';
    
    // 获取客户端可能提供的会话ID (按优先级)
    const clientSessionId = 
      req.headers['x-client-session-id'] as string || 
      req.headers['x-session-id'] as string ||
      req.headers['x-internal-user-id'] as string ||
      req.query.sessionId as string ||
      req.cookies?.sessionId;
    
    // 会话稳定性控制
    const isAuthPath = req.path.includes('/api/auth/');
    const isLoginPath = req.path.includes('/api/auth/login');
    const isStaticResource = req.path.includes('.') || 
                            req.path.startsWith('/src/') || 
                            req.path.startsWith('/node_modules/');
    
    // 会话切换决策标志
    let shouldUseClientId = false;
    let sessionAction = '';
    
    // 检查当前会话是否已认证
    const isAuthenticated = req.session && (
      req.session.authenticated === true || 
      req.session.isAuthenticated === true || 
      (req.session.userId && req.session.userId > 0)
    );
    
    // 从全局持久化存储加载之前的会话
    if (global.sessionStorage && req.ip && global.sessionStorage[req.ip]) {
      const persistentSessionId = global.sessionStorage[req.ip];
      
      // 记录持久化会话ID - 始终发送至响应头用于会话跟踪
      console.log(`[会话同步] 发现持久化会话ID: ${persistentSessionId}`);
      res.setHeader('X-Persistent-Session-ID', persistentSessionId);
      
      // 会话稳定性策略 - 已认证会话优先保持稳定
      if (isAuthenticated && originalSessionID && originalSessionID.length >= 10) {
        // 已认证会话，保持稳定，避免切换
        shouldUseClientId = false;
        sessionAction = 'keep_auth_session';
      }
      // 对于登录API，总是使用服务器新生成的会话
      else if (isLoginPath) {
        shouldUseClientId = false;
        sessionAction = 'login_new_session';
      }
      // 如果服务器有会话但客户端提供了不同的会话ID，且不在认证流程中
      else if (originalSessionID && 
              originalSessionID.length >= 10 && 
              persistentSessionId && 
              persistentSessionId !== originalSessionID && 
              !isAuthPath) {
        // 在非认证路径上保持当前服务器会话的稳定性
        shouldUseClientId = false;
        sessionAction = 'keep_server_session';
      } 
      // 对于认证相关API但不是登录API，如果客户端有会话ID，使用持久化的会话ID
      else if (isAuthPath && !isLoginPath && persistentSessionId && persistentSessionId.length >= 10) {
        req.sessionID = persistentSessionId;
        shouldUseClientId = false;
        sessionAction = 'use_persistent_session';
      }
      // 服务器会话ID缺失或格式不正确 - 使用持久化会话ID
      else if (!originalSessionID || originalSessionID.length < 10) {
        req.sessionID = persistentSessionId;
        shouldUseClientId = false;
        sessionAction = 'fallback_to_persistent';
      }
    }
    
    // 客户端会话ID策略 - 仅在特定条件下接受
    if (clientSessionId && clientSessionId.length >= 10) {
      // 已认证会话，保持稳定，避免切换
      if (isAuthenticated && originalSessionID && originalSessionID.length >= 10) {
        shouldUseClientId = false;
        sessionAction = 'auth_stability';
      }
      // 登录API，使用服务器生成的新会话，忽略客户端会话
      else if (isLoginPath) {
        shouldUseClientId = false;
        sessionAction = 'login_new_session';
      }
      // 认证API但不是登录API，且服务器没有有效会话 - 接受客户端会话
      else if (isAuthPath && !isLoginPath && (!originalSessionID || originalSessionID.length < 10)) {
        shouldUseClientId = true;
        sessionAction = 'auth_api_client_session';
      }
      // 服务器没有会话ID，使用客户端会话ID
      else if (!originalSessionID || originalSessionID.length < 10) {
        shouldUseClientId = true;
        sessionAction = 'server_missing_session';
      }
      // 客户端与服务器会话ID相同，保持一致性
      else if (clientSessionId === originalSessionID) {
        shouldUseClientId = false;
        sessionAction = 'matching_session';
      }
      // 其他情况 - 静态资源请求保持服务器会话稳定
      else if (isStaticResource) {
        shouldUseClientId = false;
        sessionAction = 'static_resource_stability';
      }
      // 如果都不符合以上条件，对于API请求可以考虑使用客户端会话ID
      else if (req.path.startsWith('/api/') && clientSessionId !== originalSessionID) {
        // 验证客户端会话ID格式
        if (/^[a-zA-Z0-9_-]{10,128}$/.test(clientSessionId)) {
          shouldUseClientId = true;
          sessionAction = 'api_client_session';
        }
      }
    }
    
    // 根据决策执行会话ID设置
    if (shouldUseClientId && clientSessionId && clientSessionId.length >= 10) {
      // 使用客户端会话ID
      console.log(`[会话同步] 使用客户端会话ID (${sessionAction}): ${clientSessionId}`);
      req.sessionID = clientSessionId;
      
      // 更新全局持久化存储
      if (global.sessionStorage && req.ip && typeof req.ip === 'string') {
        global.sessionStorage[req.ip] = clientSessionId;
      }
    } else {
      // 使用服务器会话ID
      if (sessionAction) {
        console.log(`[会话同步] 保留服务器会话ID (${sessionAction}): ${req.sessionID}`);
      }
      
      // 确保全局持久化存储始终包含当前会话ID
      if (req.sessionID && req.sessionID.length >= 10 && global.sessionStorage && req.ip && typeof req.ip === 'string') {
        global.sessionStorage[req.ip] = req.sessionID;
      }
    }
    
    // 确保会话包含lastActivity时间戳，用于衡量会话稳定性
    if (req.session) {
      req.session.lastActivity = Date.now();
    }
    
    // 准备响应头和会话调试信息
    const isRealAuthenticated = req.session && (
      req.session.authenticated === true || 
      req.session.isAuthenticated === true || 
      (req.session.userId && req.session.userId > 0)
    );
    
    // 添加会话调试信息
    const sessionInfo = {
      id: req.sessionID,
      userId: req.session?.userId,
      socialBound: req.session?.socialBound,
      isAuthenticated: isRealAuthenticated
    };
    
    // 记录日志 - 只记录一次会话状态
    console.log(`[会话]请求路径: ${req.path}, 会话ID: ${req.sessionID}, 已认证: ${isRealAuthenticated}`);
    
    // 设置会话响应头
    res.setHeader('X-Session-ID', req.sessionID);
    res.setHeader('X-Original-Session-ID', req.sessionID);
    if (originalSessionID !== req.sessionID) {
      res.setHeader('X-New-Session-ID', req.sessionID);
    }
    
    // 会话来源标记
    let sessionSource = 'server_session';
    if (shouldUseClientId && clientSessionId) {
      sessionSource = 'client_session';
    } else if (originalSessionID !== req.sessionID) {
      sessionSource = 'newly_generated';
    }
    res.setHeader('X-Session-Source', sessionSource);
    
    // 会话调试信息
    res.setHeader('X-Session-Debug', JSON.stringify({
      id: req.sessionID,
      isAuthenticated: isRealAuthenticated
    }));
    
    // 如果是已认证会话，添加认证状态头
    if (isRealAuthenticated) {
      res.setHeader('X-Session-Authenticated', 'true');
      res.setHeader('X-Real-Authenticated', 'true');
      if (req.session && req.session.userId) {
        res.setHeader('X-User-ID', req.session.userId.toString());
      }
    }
    
    // 使用一致的cookie选项
    const cookieOptions = {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30天
      httpOnly: false, // 客户端JavaScript可访问
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as 'lax',
      path: '/'
    };
    
    // 设置cookies - 维持三种cookie的一致性
    const cookies = [];
    
    // 1. sessionId cookie (客户端可访问)
    res.cookie('sessionId', req.sessionID, cookieOptions);
    cookies.push(`sessionId=${req.sessionID}; Max-Age=${cookieOptions.maxAge/1000}; Path=/; Expires=${new Date(Date.now() + cookieOptions.maxAge).toUTCString()}; SameSite=Lax`);
    
    // 2. warehouse.sid cookie (httpOnly)
    res.cookie('warehouse.sid', req.sessionID, {
      ...cookieOptions,
      httpOnly: true
    });
    cookies.push(`warehouse.sid=${req.sessionID}; Max-Age=${cookieOptions.maxAge/1000}; Path=/; Expires=${new Date(Date.now() + cookieOptions.maxAge).toUTCString()}; HttpOnly; SameSite=Lax`);
    
    // 3. connect.sid cookie (兼容Express)
    res.cookie('connect.sid', req.sessionID, {
      ...cookieOptions,
      httpOnly: true
    });
    cookies.push(`connect.sid=${req.sessionID}; Max-Age=${cookieOptions.maxAge/1000}; Path=/; Expires=${new Date(Date.now() + cookieOptions.maxAge).toUTCString()}; HttpOnly; SameSite=Lax`);
    
    // 记录所有设置的Cookie
    console.log('[会话] 设置Cookie:', cookies);
    
    // 添加会话调试信息
    console.log('[会话调试] 路径: ' + req.path + ', 会话信息:', JSON.stringify(sessionInfo, null, 2));
    console.log('[会话调试] 路径: ' + req.path + ', 会话信息:', sessionInfo);
    
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