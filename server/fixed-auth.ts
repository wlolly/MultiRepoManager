/**
 * 认证相关功能 - 修复版本
 * 简化版验证逻辑，直接基于数据库会话进行验证
 */
import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { z } from 'zod';

// 已有的导出和函数...

/**
 * 获取当前用户信息
 * 改进版本，专注于会话验证和用户信息获取
 */
export async function getCurrentUser(req: Request, res: Response) {
  try {
    // 获取数据库访问
    const db = req.app.locals.storage;
    if (!db) {
      console.error('[认证系统] 错误：存储接口未初始化');
      return res.status(500).json({
        authenticated: false,
        message: '系统错误',
        guestAccess: true
      });
    }

    // 获取会话ID (优先使用客户端提供的会话ID)
    const clientSessionId = req.headers['x-session-id'] as string;
    const sessionId = clientSessionId || req.sessionID;
    
    console.log('[认证系统] 当前会话信息:', {
      id: sessionId,
      clientId: clientSessionId,
      expressId: req.sessionID,
      authenticated: req.session?.authenticated,
      userId: req.session?.userId
    });

    // 先检查Express会话状态
    if (req.session?.authenticated && req.session?.userId) {
      const user = await db.getUser(req.session.userId);
      if (user?.is_active) {
        // 确保数据库会话存在
        const dbSession = await db.getUserSessionById(sessionId);
        if (!dbSession?.isValid) {
          // 如果数据库会话不存在，创建一个新的
          await db.createUserSession({
            sessionId,
            userId: user.id,
            ipAddress: req.ip,
            userAgent: req.get('user-agent') || '',
            isValid: true,
            lastActivity: new Date(),
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          });
        }
        
        // 构建权限信息
        const permissions = {
          pages: user.role === 'admin' ? ['all'] : ['dashboard', 'profile'],
          actions: user.role === 'admin' ? ['all'] : ['read'],
          warehouses: user.role === 'admin' ? { all: { canView: true, canManage: true } } : {}
        };

        return res.status(200).json({
          authenticated: true,
          user: {
            id: user.id,
            username: user.username,
            role: user.role,
            fullName: user.full_name,
            language: user.language || 'zh',
            isactive: user.is_active
          },
          permissions
        });
      }
    }

    // 检查数据库会话
    if (sessionId) {
      const dbSession = await db.getUserSessionById(sessionId);
      console.log('[认证系统] 数据库会话状态:', {
        exists: !!dbSession,
        isValid: dbSession?.isValid,
        userId: dbSession?.userId
      });
      
      // 如果数据库会话有效
      if (dbSession?.isValid && dbSession?.userId) {
        const user = await db.getUser(dbSession.userId);
        if (user?.is_active) {
          // 更新Express会话
          req.session.authenticated = true;
          req.session.userId = user.id;
          req.session.role = user.role;
          
          // 构建权限信息
          const permissions = {
            pages: user.role === 'admin' ? ['all'] : ['dashboard', 'profile'],
            actions: user.role === 'admin' ? ['all'] : ['read'],
            warehouses: user.role === 'admin' ? { all: { canView: true, canManage: true } } : {}
          };

          return res.status(200).json({
            authenticated: true,
            user: {
              id: user.id,
              username: user.username,
              role: user.role,
              fullName: user.full_name,
              language: user.language || 'zh',
              isactive: user.is_active
            },
            permissions
          });
        }
      }
    }

    // 保存新的访客会话
    const guestSessionId = sessionId || crypto.randomBytes(32).toString('hex');
    
    try {
      await db.createUserSession({
        sessionId: guestSessionId,
        userId: null,
        ipAddress: req.ip,
        userAgent: req.get('user-agent') || '',
        isValid: true,
        lastActivity: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 访客会话1天过期
      });
    } catch (error) {
      console.warn('[认证系统] 创建访客会话失败:', error);
    }

    // 返回访客访问权限
    return res.status(401).json({
      authenticated: false,
      message: '用户未登录',
      guestAccess: true,
      sessionId: guestSessionId,
      allowedPages: ['dashboard'],
      permissions: {
        pages: ['dashboard'],
        actions: ['view'],
        warehouses: {}
      }
    });:`, {
      id: req.sessionID,
      authenticated: req.session?.authenticated || false,
      isAuthenticated: req.session?.isAuthenticated || false,
      userId: req.session?.userId || null
    });

    // 检查客户端传来的会话ID
    const clientSessionId = req.headers['x-session-id'] as string;
    if (clientSessionId && clientSessionId !== req.sessionID) {
      console.log(`[认证系统] 客户端会话ID: ${clientSessionId}, 与服务器会话ID不匹配`);
    }
    
    // 确保存储接口已初始化
    if (!req.app || !req.app.locals || !req.app.locals.storage) {
      console.error('[认证系统] 存储接口未初始化');
      return res.status(500).json({
        authenticated: false,
        message: '系统错误，请稍后再试'
      });
    }
    
    const db = req.app.locals.storage;
    
    // 检查已授权的Express会话
    if (req.session && (req.session.authenticated || req.session.isAuthenticated) && req.session.userId) {
      // 从数据库获取用户信息
      const user = await db.getUser(req.session.userId);
      if (user) {
        // 更新会话最后活动时间
        try {
          await db.updateUserSession(req.sessionID, {
            lastActivity: new Date()
          });
        } catch (error) {
          console.warn('[认证系统] 更新会话活动时间失败:', error);
        }
        
        // 构建权限信息
        const permissions = {
          pages: user.role === 'admin' ? ['all'] : ['dashboard', 'profile'],
          actions: user.role === 'admin' ? ['all'] : ['read'],
          warehouses: user.role === 'admin' ? { all: { canView: true, canManage: true } } : {}
        };
        
        // 返回成功响应
        return res.status(200).json({
          authenticated: true,
          message: "登录有效",
          user: {
            id: user.id,
            username: user.username,
            role: user.role,
            fullName: user.full_name || user.username,
            language: user.language || 'zh',
            isactive: user.is_active,
            isSocialUser: !!user.social_id
          },
          permissions,
          sessionId: req.sessionID
        });
      }
    }
    
    // 检查数据库会话
    const dbSession = await db.getUserSessionById(req.sessionID);
    console.log(`[认证系统] 数据库会话查询结果: ${dbSession ? '找到会话' : '会话不存在'}`);
    
    // 如果数据库会话存在且有效
    if (dbSession && dbSession.isValid && dbSession.userId) {
      // 获取用户信息
      const user = await db.getUser(dbSession.userId);
      if (user) {
        // 更新Express会话状态
        req.session.userId = user.id;
        req.session.authenticated = true;
        req.session.isAuthenticated = true;
        req.session.role = user.role;
        
        // 保存会话状态
        await new Promise<void>((resolve) => {
          req.session.save((err) => {
            if (err) {
              console.error('[认证系统] 保存会话状态失败:', err);
            }
            resolve();
          });
        });
        
        // 更新会话最后活动时间
        try {
          await db.updateUserSession(req.sessionID, {
            lastActivity: new Date()
          });
        } catch (error) {
          console.warn('[认证系统] 更新会话活动时间失败:', error);
        }
        
        // 构建权限信息
        const permissions = {
          pages: user.role === 'admin' ? ['all'] : ['dashboard', 'profile'],
          actions: user.role === 'admin' ? ['all'] : ['read'],
          warehouses: user.role === 'admin' ? { all: { canView: true, canManage: true } } : {}
        };
        
        // 返回成功响应
        return res.status(200).json({
          authenticated: true,
          message: "登录有效",
          user: {
            id: user.id,
            username: user.username,
            role: user.role,
            fullName: user.full_name || user.username,
            language: user.language || 'zh',
            isactive: user.is_active,
            isSocialUser: !!user.social_id
          },
          permissions,
          sessionId: req.sessionID
        });
      }
    }
    
    // 如果到这里，表示无有效会话
    // 更新会话最后活动时间
    if (dbSession) {
      try {
        await db.updateUserSession(req.sessionID, {
          lastActivity: new Date()
        });
      } catch (error) {
        console.warn('[认证系统] 更新会话活动时间失败:', error);
      }
    }
    
    // 返回未认证状态
    return res.status(401).json({
      authenticated: false,
      message: "会话未关联用户，请登录",
      guestAccess: true,
      sessionId: req.sessionID,
      allowedPages: ['dashboard'], // 访客可访问的页面列表
      permissions: {
        pages: ['dashboard'],
        actions: ['view'],
        warehouses: {}
      }
    });
    
  } catch (error) {
    console.error('[认证系统] 获取当前用户时出错:', error);
    return res.status(500).json({
      authenticated: false,
      message: "服务器错误，请稍后再试",
      error: process.env.NODE_ENV === 'production' ? undefined : error.message
    });
  }
}