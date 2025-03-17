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

        // 获取用户仓库权限
        const warehousePermissions = await db.getTeamWarehousePermissions(user.primary_team_id);

        // 构建权限信息
        const permissions = {
          pages: user.role === 'admin' ? ['all'] : ['dashboard', 'profile'],
          actions: user.role === 'admin' ? ['all'] : ['read'],
          warehouses: user.role === 'admin' ? 
            { all: { canView: true, canManage: true } } : 
            warehousePermissions.reduce((acc, perm) => {
              acc[perm.warehouseId] = {
                canView: perm.canView,
                canManage: perm.canManage
              };
              return acc;
            }, {})
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

          // 获取用户基本权限
          const basePermissions = ['dashboard'];
          const authenticatedPermissions = ['profile', 'products', 'warehouses'];
          
          // 获取用户仓库权限
          const warehousePermissions = await db.getTeamWarehousePermissions(user.primary_team_id);
          
          // 获取团队页面权限
          const teamPagePermissions = await db.getTeamPagePermissions(user.primary_team_id);
          
          // 构建权限信息
          const permissions = {
            pages: user.role === 'admin' ? 
              ['all'] : 
              [...basePermissions, ...authenticatedPermissions, ...teamPagePermissions.map(p => p.pageName)],
            actions: user.role === 'admin' ? 
              ['all'] : 
              ['read', 'view', ...teamPagePermissions.map(p => p.actions || []).flat()],
            warehouses: user.role === 'admin' ? 
              { all: { canView: true, canManage: true } } : 
              warehousePermissions.reduce((acc, perm) => {
                acc[perm.warehouseId] = {
                  canView: perm.canView,
                  canManage: perm.canManage
                };
                return acc;
              }, {})
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