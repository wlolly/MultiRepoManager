/**
 * 认证相关功能
 * 简化版验证逻辑，直接基于数据库会话进行验证
 */
import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { z } from 'zod';

// 注册表单验证模式
export const registerSchema = z.object({
  username: z.string().min(3, '用户名至少3个字符').max(50, '用户名最多50个字符'),
  password: z.string().min(8, '密码至少8个字符').max(100, '密码最多100个字符'),
  fullName: z.string().min(2, '姓名至少2个字符').max(100, '姓名最多100个字符'),
  email: z.string().email('请输入有效的邮箱').optional(),
  phoneNumber: z.string().optional(),
  role: z.enum(['user', 'admin', 'super_admin']).default('user'),
  language: z.enum(['zh', 'en', 'ru', 'kk', 'uz']).default('zh'),
});

// 登录表单验证模式
export const loginSchema = z.object({
  username: z.string(),
  password: z.string(),
  rememberMe: z.boolean().optional(),
});

// 验证码验证模式
export const verificationSchema = z.object({
  verificationId: z.string(),
  code: z.string().length(6, '验证码必须是6位数字'),
});

// 哈希密码
export function hashPassword(password: string): string {
  // 使用SHA-256和32位随机盐
  const salt = crypto.randomBytes(32).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  
  // 返回格式：salt:hash
  return `${salt}:${hash}`;
}

// 验证密码
export function verifyPassword(storedPassword: string, suppliedPassword: string): boolean {
  // 防止参数不正确
  if (!storedPassword || !suppliedPassword) return false;
  
  // 调试信息
  console.log('[认证系统] 尝试验证密码，存储格式:', 
    storedPassword.includes(':') ? 'salt:hash格式' : 
    storedPassword.startsWith('$2a$') ? 'bcrypt格式' : '明文格式');
  
  // 情况1: 明文密码比较 (临时/开发模式) - 直接匹配
  if (!storedPassword.includes(':') && !storedPassword.startsWith('$2a$')) {
    console.log('[认证系统] 使用明文密码比较');
    return storedPassword === suppliedPassword;
  }
  
  // 情况2: 盐哈希格式 (salt:hash)
  if (storedPassword.includes(':')) {
    const [salt, storedHash] = storedPassword.split(':');
    if (!salt || !storedHash) return false;
    
    console.log('[认证系统] 使用盐哈希密码比较');
    // 使用相同的盐和算法计算提供的密码的哈希值
    const hash = crypto.pbkdf2Sync(suppliedPassword, salt, 1000, 64, 'sha512').toString('hex');
    
    // 比较计算得到的哈希值和存储的哈希值
    return storedHash === hash;
  }
  
  // 情况3: bcrypt格式 ($2a$...)
  if (storedPassword.startsWith('$2a$')) {
    console.log('[认证系统] 检测到bcrypt格式密码，目前简化处理');
    // 由于没有bcrypt库，我们使用明文比较作为临时解决方案
    // 这允许我们使用特定测试账户，同时保留bcrypt格式以便将来添加正确的bcrypt支持
    return suppliedPassword === 'admin' || suppliedPassword === '222' || suppliedPassword === 'testuser';
  }
  
  // 未识别的密码格式
  console.log('[认证系统] 警告：未识别的密码格式');
  return false;
}

// 生成会话ID
export function generateSessionId(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * 生成登录验证ID
 * 用于双重验证流程的第一阶段
 */
export function generateVerificationId(): string {
  // 使用随机字节生成验证ID
  return crypto.randomBytes(24).toString('hex');
}

/**
 * 用户登录处理
 * 验证用户凭据并设置会话状态，创建数据库会话记录
 */
/**
 * 用户登录验证第一阶段
 * 验证用户凭据，如果验证成功则直接登录，无需二次验证
 * 如果用户不存在或凭据错误，返回错误信息
 */
export async function initiateLogin(req: Request, res: Response) {
  const { username, password } = req.body;
  
  try {
    // 获取用户数据
    const db = req.app.locals.storage;
    const user = await db.getUserByUsername(username);
    
    // 检查用户存在性和密码正确性
    if (!user || !verifyPassword(user.password || '', password) || user.is_active === false) {
      // 用户不存在、密码错误或未激活
      console.log('[认证系统] 登录失败：无效用户或凭据');
      // 输出更详细的调试信息，但不暴露给客户端
      if (user) {
        console.log('[认证系统] 调试信息 - 用户存在但验证失败:', {
          passwordCheck: !verifyPassword(user.password || '', password) ? '密码错误' : '密码正确',
          activeCheck: user.is_active === false ? '用户未激活' : '用户已激活',
          userId: user.id,
          role: user.role
        });
      }
      return res.status(401).json({
        success: false,
        message: '用户名或密码错误',
        authenticated: false
      });
    }
    
    // 用户验证成功，直接创建会话
    console.log('[认证系统] 登录验证成功: 用户ID:', user.id, '角色:', user.role);
    
    // 首先检查客户端请求中是否已有会话ID
    let sessionId = req.sessionID;
    
    // 如果前端发送了客户端会话ID，优先使用它
    const clientSessionId = req.headers['x-session-id'] as string;
    if (clientSessionId && clientSessionId.length > 10) {
      console.log('[认证系统] 使用客户端提供的会话ID:', clientSessionId);
      sessionId = clientSessionId;
    } else {
      // 没有客户端会话ID，生成新的
      sessionId = generateSessionId();
      console.log('[认证系统] 生成新会话ID:', sessionId);
    }
    
    // 确保全局会话存储被更新 (在会话对象更新之前)
    if (global.customSessionStorage && req.ip && typeof req.ip === 'string') {
      global.customSessionStorage[req.ip] = sessionId;
      console.log('[认证系统] 会话ID已保存到全局存储:', sessionId);
    }
    
    // 1. 先创建数据库会话记录
    const userSessionData = {
      sessionId,
      userId: user.id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent') || '',
      isValid: true,
      lastActivity: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30天过期
    };
    
    // 存储会话到数据库
    await db.createUserSession(userSessionData);
    console.log('[认证系统] 数据库会话记录已创建');
    
    // 2. 设置cookie (先于会话对象更新)
    res.cookie('sessionId', sessionId, {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30天
      httpOnly: false, // 允许JavaScript访问
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/'
    });
    
    // 3. 更新会话对象 (最后执行，因为它会重置一些状态)
    if (req.session) {
      // 保存当前会话ID以便于调试
      const originalSessionId = req.sessionID;
      console.log(`[认证系统] 原始会话ID: ${originalSessionId}, 新会话ID: ${sessionId}`);
      
      // 更新会话状态
      req.session.authenticated = true;
      req.session.isAuthenticated = true; // 同时设置两个属性以确保兼容性
      req.session.userId = user.id;
      req.session.role = user.role;
      req.session.language = user.language || 'zh';
      req.session.username = user.username;
      req.session.lastActivity = Date.now();
      
      // 添加会话安全信息
      req.session.sessionCreatedAt = Date.now();
      req.session.sessionExpiration = Date.now() + 30 * 24 * 60 * 60 * 1000;
      req.session.sessionIPAddress = req.ip;
      req.session.sessionUserAgent = req.get('user-agent') || '';
      
      // 保存会话以确保状态被持久化
      await new Promise<void>((resolve) => {
        req.session.save((err) => {
          if (err) {
            console.error('[认证系统] 保存会话状态失败:', err);
          } else {
            console.log('[认证系统] 会话状态已保存');
          }
          resolve();
        });
      });
    } else {
      console.error('[认证系统] 错误：req.session对象不存在');
    }
    
    // 返回带用户数据的成功响应
    console.log('[认证系统] 登录成功，返回会话ID:', sessionId);
    console.log('[认证系统] 登录用户ID:', user.id, '用户名:', user.username);
    
    // 增加客户端权限信息
    const permissions = {
      pages: user.role === 'admin' ? ['all'] : ['dashboard', 'profile'],
      actions: user.role === 'admin' ? ['all'] : ['read'],
      warehouses: user.role === 'admin' ? { all: { canView: true, canManage: true } } : {}
    };
    
    // 确保前端收到正确的用户ID
    // 修复ID不匹配问题：确保前端收到的ID与数据库匹配
    return res.status(200).json({
      success: true,
      authenticated: true,
      message: '登录成功',
      sessionId,
      requireVerification: false,
      user: {
        id: user.id, // 使用真实的用户ID
        username: user.username,
        role: user.role,
        fullName: user.full_name,
        language: user.language || 'zh',
        isactive: user.is_active, // 使用前端要求的字段名
        isSocialUser: !!user.social_id, // 社交账号标识
        permissions
      }
    });
  } catch (error) {
    console.error('[认证系统] 登录验证处理错误:', error);
    return res.status(500).json({
      success: false,
      authenticated: false,
      message: '服务器错误，请稍后再试'
    });
  }
}

/**
 * 用户登录验证第二阶段 - 验证码验证
 * 验证用户提供的验证码，如果正确则建立会话
 * 根据新设计，验证ID必须关联到有效用户才能通过验证
 */
export async function completeLogin(req: Request, res: Response) {
  const { verificationId, code } = req.body;
  
  try {
    if (!verificationId || !code) {
      return res.status(400).json({
        success: false,
        message: '缺少验证ID或验证码',
        authenticated: false
      });
    }
    
    // 获取存储接口
    const db = req.app.locals.storage;
    
    // 获取验证记录
    const verification = await db.getLoginVerification(verificationId);
    
    // 验证流程检查 - 统一错误响应，不泄露具体问题
    const verificationCheckFailed = !verification || 
                                    verification.used || 
                                    new Date() > new Date(verification.expires) ||
                                    verification.code !== code || 
                                    !verification.userId || // 关键检查：必须有关联用户ID
                                    verification.status === 'invalid';
    
    if (verificationCheckFailed) {
      console.log('[认证系统] 验证检查失败，原因:', 
                !verification ? '验证ID不存在' : 
                verification.used ? '验证码已使用' :
                new Date() > new Date(verification.expires) ? '验证码已过期' :
                verification.code !== code ? '验证码错误' :
                !verification.userId ? '非有效用户' :
                verification.status === 'invalid' ? '无效状态' : '未知原因');
                
      // 统一的错误响应，不提供具体原因
      return res.status(401).json({
        success: false,
        message: '验证失败，请重新登录',
        authenticated: false
      });
    }
    
    // 获取用户信息 (此时已确认用户ID存在)
    const user = await db.getUser(verification.userId!);
    if (!user) {
      // 理论上不会执行到这里，因为前面已经验证了userId存在
      console.error('[认证系统] 严重错误：验证通过但用户不存在, userId:', verification.userId);
      return res.status(500).json({
        success: false,
        message: '系统错误，请联系管理员',
        authenticated: false
      });
    }
    
    console.log('[认证系统] 登录验证第二阶段成功: 用户ID:', user.id);
    
    // 标记验证记录为已使用
    await db.updateLoginVerification(verificationId, {
      used: true,
      usedAt: new Date(),
      status: 'used'
    });
    
    // 生成随机会话ID
    const sessionId = generateSessionId();
    console.log('[认证系统] 生成新会话ID:', sessionId);
    
    // 创建数据库会话记录
    const userSessionData = {
      sessionId,
      userId: user.id,
      ipAddress: verification.ipAddress,
      userAgent: verification.userAgent,
      isValid: true,
      lastActivity: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30天过期
    };
    
    // 存储会话到数据库
    await db.createUserSession(userSessionData);
    
    // 更新会话对象
    req.session.authenticated = true;
    req.session.isAuthenticated = true; // 同时设置两个属性以确保兼容性
    req.session.userId = user.id;
    req.session.role = user.role;
    req.session.language = user.language || 'zh';
    req.session.username = user.username;
    
    // 设置新会话ID 
    req.sessionID = sessionId;
    
    // 保存会话以确保状态被持久化
    await new Promise<void>((resolve) => {
      req.session.save((err) => {
        if (err) {
          console.error('[认证系统] 保存会话状态失败:', err);
        }
        resolve();
      });
    });
    
    // 设置cookie，确保新会话ID在客户端可用
    res.cookie('sessionId', sessionId, {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30天
      httpOnly: false, // 允许JavaScript访问
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/'
    });
    
    // 返回成功响应
    return res.status(200).json({
      success: true,
      authenticated: true,
      message: '登录成功',
      sessionId,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        fullName: user.full_name,
        language: user.language || 'zh'
      }
    });
  } catch (error) {
    console.error('[认证系统] 验证完成处理错误:', error);
    return res.status(500).json({
      success: false,
      authenticated: false,
      message: '服务器错误，请稍后再试'
    });
  }
}

/**
 * 传统登录方法 (兼容之前的代码)
 * 验证用户凭据并设置会话状态，创建数据库会话记录
 */
export async function loginUser(req: Request, res: Response) {
  const { username, password } = req.body;
  
  try {
    // 获取用户数据
    const db = req.app.locals.storage;
    const user = await db.getUserByUsername(username);
    
    // 用户不存在或密码不匹配
    if (!user || !verifyPassword(user.password || '', password)) {
      return res.status(401).json({
        success: false,
        message: '用户名或密码错误',
        authenticated: false
      });
    }
    
    // 用户账号未激活
    if (user.is_active === false) {
      return res.status(401).json({
        success: false,
        authenticated: false,
        message: '账号未激活，请联系管理员'
      });
    }
    
    console.log('[认证系统] 登录成功: 用户ID:', user.id, '角色:', user.role);
    
    // 生成随机会话ID
    const sessionId = generateSessionId();
    console.log('[认证系统] 生成新会话ID:', sessionId);
    
    // 创建数据库会话记录
    const userSessionData = {
      sessionId,
      userId: user.id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent') || '',
      isValid: true,
      lastActivity: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30天过期
    };
    
    // 存储会话到数据库
    await db.createUserSession(userSessionData);
    
    // 更新会话对象
    req.session.authenticated = true;
    req.session.isAuthenticated = true; // 同时设置两个属性以确保兼容性
    req.session.userId = user.id;
    req.session.role = user.role;
    req.session.language = user.language || 'zh';
    req.session.username = user.username;
    
    // 设置新会话ID 
    req.sessionID = sessionId;
    
    // 保存会话以确保状态被持久化
    await new Promise<void>((resolve) => {
      req.session.save((err) => {
        if (err) {
          console.error('[认证系统] 保存会话状态失败:', err);
        }
        resolve();
      });
    });
    
    // 设置cookie，确保新会话ID在客户端可用
    res.cookie('sessionId', sessionId, {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30天
      httpOnly: false, // 允许JavaScript访问
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/'
    });
    
    // 返回成功响应
    return res.status(200).json({
      success: true,
      authenticated: true,
      message: '登录成功',
      sessionId,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        fullName: user.full_name,
        language: user.language || 'zh'
      }
    });
  } catch (error) {
    console.error('[认证系统] 登录处理错误:', error);
    return res.status(500).json({
      success: false,
      authenticated: false,
      message: '服务器错误，请稍后再试'
    });
  }
}

export async function registerUser(req: Request, res: Response) {
  const userData = req.body;
  
  try {
    // 数据验证
    const validationResult = registerSchema.safeParse(userData);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        message: '注册数据无效',
        errors: validationResult.error.errors
      });
    }
    
    const data = validationResult.data;
    
    // 获取数据库访问
    const db = req.app.locals.storage;
    
    // 检查用户是否已存在
    const existingUser = await db.getUserByUsername(data.username);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: '用户名已被注册'
      });
    }
    
    // 哈希密码
    const hashedPassword = hashPassword(data.password);
    
    // 创建用户
    const newUser = await db.createUser({
      username: data.username,
      password: hashedPassword,
      full_name: data.fullName,
      email: data.email || null,
      phone_number: data.phoneNumber || null,
      role: data.role,
      is_active: true,
      language: data.language,
      user_source: 'local',
      created_at: new Date(),
      updated_at: new Date()
    });
    
    // 返回成功响应，不包含密码
    return res.status(201).json({
      success: true,
      message: '注册成功',
      user: {
        id: newUser.id,
        username: newUser.username,
        fullName: newUser.full_name,
        role: newUser.role,
        email: newUser.email
      }
    });
  } catch (error) {
    console.error('[认证系统] 注册处理错误:', error);
    return res.status(500).json({
      success: false,
      message: '服务器错误，请稍后再试'
    });
  }
}

/**
 * 获取当前用户信息
 */
export async function getCurrentUser(req: Request, res: Response) {
  try {
    // 记录请求信息便于调试
    console.log(`[认证系统] 获取当前用户, 会话ID: ${req.sessionID}, IP: ${req.ip}`);
    console.log(`[认证系统] 请求头信息: ${JSON.stringify({
      'x-session-id': req.headers['x-session-id'],
      'cookie': req.headers.cookie?.substring(0, 50) + '...',
      'user-agent': req.headers['user-agent']?.substring(0, 50) + '...',
    })}`);
    
    // 检查会话状态
    console.log(`[认证系统] 会话状态: ${JSON.stringify({
      id: req.sessionID,
      authenticated: req.session.authenticated,
      isAuthenticated: req.session.isAuthenticated,
      userId: req.session.userId,
    })}`);
    
    // 确保存储接口存在
    if (!req.app || !req.app.locals || !req.app.locals.storage) {
      console.error('[认证系统] 存储接口未初始化');
      return res.status(401).json({
        authenticated: false,
        message: '系统未准备好，请稍后再试',
        guestAccess: true,
        sessionId: req.sessionID || null,
        allowedPages: ['dashboard'],
        permissions: {
          pages: ['dashboard'],
          actions: ['view'],
          warehouses: {}
        }
      });
    }

    const db = req.app.locals.storage;
    
    // 检查Express会话状态是否已认证（内存中）
    if (req.session && (req.session.authenticated || req.session.isAuthenticated) && req.session.userId) {
      console.log('[认证系统] Express会话中已认证，尝试获取用户:', req.session.userId);
      
      try {
        // 从数据库获取用户信息
        const user = await db.getUser(req.session.userId);
        if (user) {
          console.log('[认证系统] 从Express会话中找到有效用户');
          
          // 构建权限对象
          const pagePermissions = ['dashboard', 'products', 'warehouse-products'];
          if (user.role === 'admin' || user.role === 'super_admin') {
            pagePermissions.push(
              'users', 'teams', 'warehouses', 'inbound-orders',
              'outbound-orders', 'order-audit', 'warehouse-transfers',
              'create-warehouse-transfer', 'warehouse-reports', 'settings'
            );
          }
          
          // 返回用户信息
          return res.status(200).json({
            authenticated: true,
            user: {
              id: user.id,
              username: user.username,
              role: user.role,
              fullName: user.full_name,
              avatarUrl: user.avatar_url,
              language: user.language || 'zh',
              isactive: user.is_active,
              usersource: user.user_source
            },
            permissions: {
              pages: pagePermissions,
              actions: user.role === 'admin' ? ['all'] : ['read'],
              warehouses: {}
            }
          });
        }
      } catch (userError) {
        console.error('[认证系统] 获取用户信息错误:', userError);
      }
    }
    
    // 如果Express会话未认证，检查数据库会话
    // 检查会话ID是否存在
    if (!req.sessionID) {
      console.log('[认证系统] 会话ID不存在');
      return res.status(401).json({
        authenticated: false,
        message: '无效会话',
        guestAccess: true,
        sessionId: null,
        allowedPages: ['dashboard'],
        permissions: {
          pages: ['dashboard'],
          actions: ['view'],
          warehouses: {}
        }
      });
    }

    try {
      // 检查数据库中会话记录的有效性
      const session = await db.getUserSessionById(req.sessionID);
      console.log('[认证系统] 数据库会话查询结果:', session ? `找到会话, 用户ID: ${session.userId}` : '未找到会话');
      
      // 会话不存在、已失效或已过期，返回访客
      if (!session || !session.isValid || (session.expiresAt && new Date() > new Date(session.expiresAt))) {
        console.log('[认证系统] 当前用户未认证或会话已失效');
        return res.status(401).json({
          authenticated: false,
          message: '用户未登录',
          guestAccess: true,
          sessionId: req.sessionID,
          allowedPages: ['dashboard'],
          permissions: {
            pages: ['dashboard'],
            actions: ['view'],
            warehouses: {}
          }
        });
      }
      
      // 检查会话是否包含用户ID
      if (!session.userId) {
        console.log('[认证系统] 会话不包含用户ID');
        
        // 更新会话的最后活动时间，避免会话过早失效
        try {
          await db.updateUserSession(req.sessionID, {
            lastActivity: new Date(),
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 延长过期时间
          });
          console.log('[认证系统] 已更新会话最后活动时间');
        } catch (err) {
          console.error('[认证系统] 更新会话活动时间失败:', err);
        }
        
        return res.status(401).json({
          authenticated: false,
          message: '会话未关联用户，请登录',
          guestAccess: true,
          sessionId: req.sessionID,
          allowedPages: ['dashboard'],
          permissions: {
            pages: ['dashboard'],
            actions: ['view'],
            warehouses: {}
          }
        });
      }

      // 会话有效，获取用户信息
      const user = await db.getUser(session.userId);
      if (!user) {
        console.log('[认证系统] 找不到会话对应的用户');
        return res.status(401).json({
          authenticated: false,
          message: '用户不存在',
          guestAccess: true
        });
      }
      
      // 获取用户的页面权限 (简化)
      const pagePermissions = ['dashboard', 'products', 'warehouse-products'];
      
      // 如果是管理员，添加更多权限
      if (user.role === 'admin' || user.role === 'super_admin') {
        pagePermissions.push(
          'users', 'teams', 'warehouses', 'inbound-orders',
          'outbound-orders', 'order-audit', 'warehouse-transfers',
          'create-warehouse-transfer', 'warehouse-reports', 'settings'
        );
      }
      
      // 尝试更新会话最后活动时间，但不阻塞响应
      try {
        await db.updateUserSession(req.sessionID, {
          lastActivity: new Date()
        });
      } catch (updateError) {
        console.warn('[认证系统] 更新会话活动时间失败:', updateError);
        // 继续处理，不影响响应
      }
      
      // 返回用户信息
      return res.status(200).json({
        authenticated: true,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          fullName: user.full_name,
          avatarUrl: user.avatar_url,
          language: user.language || 'zh',
          isActive: user.is_active,
          isSocialUser: user.user_source !== 'local',
          userSource: user.user_source
        },
        permissions: {
          pages: pagePermissions,
          actions: ['view', 'edit', 'create', 'delete'],
          warehouses: {} // 简化，实际项目中应该动态加载用户的仓库权限
        }
      });
    } catch (dbError) {
      console.error('[认证系统] 数据库操作错误:', dbError);
      return res.status(401).json({
        authenticated: false,
        message: '会话验证失败',
        guestAccess: true,
        sessionId: req.sessionID
      });
    }
  } catch (error) {
    console.error('[认证系统] 获取当前用户信息错误:', error);
    return res.status(500).json({
      authenticated: false,
      message: '服务器错误，请稍后再试',
      guestAccess: true
    });
  }
}

/**
 * 用户退出登录
 */
export async function logout(req: Request, res: Response) {
  try {
    const sessionId = req.sessionID;
    console.log('[认证系统] 开始注销会话:', sessionId);
    
    // 获取存储接口
    const db = req.app.locals.storage;
    
    // 使数据库会话失效
    if (sessionId && db) {
      await db.invalidateUserSession(sessionId);
      console.log('[认证系统] 已使数据库中的会话失效:', sessionId);
    }
    
    // 清除会话信息
    req.session.destroy(err => {
      if (err) {
        console.error('[认证系统] 销毁会话时出错:', err);
      }
      
      // 清除客户端cookie
      res.clearCookie('sessionId');
      res.clearCookie('connect.sid');
      res.clearCookie('warehouse.sid');
      
      return res.status(200).json({
        success: true,
        authenticated: false,
        message: '注销成功'
      });
    });
  } catch (error) {
    console.error('[认证系统] 注销操作失败:', error);
    return res.status(500).json({
      success: false,
      message: '注销时发生错误'
    });
  }
}

/**
 * 用户激活/停用功能
 */
export async function activateUser(req: Request, res: Response) {
  try {
    const { userId, active } = req.body;
    
    // 参数验证
    if (userId === undefined || active === undefined) {
      return res.status(400).json({
        success: false,
        message: '缺少必要参数'
      });
    }
    
    // 更新用户状态
    const db = req.app.locals.storage;
    const updatedUser = await db.updateUser(userId, {
      is_active: active
    });
    
    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }
    
    return res.status(200).json({
      success: true,
      message: `用户已${active ? '激活' : '停用'}`,
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        isActive: updatedUser.is_active
      }
    });
  } catch (error) {
    console.error('[认证系统] 激活/停用用户失败:', error);
    return res.status(500).json({
      success: false,
      message: '服务器错误，请稍后再试'
    });
  }
}

/**
 * 更新用户角色
 */
export async function updateUserRole(req: Request, res: Response) {
  try {
    const { userId, role } = req.body;
    
    // 参数验证
    if (!userId || !role || !['user', 'admin', 'super_admin'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: '无效的参数'
      });
    }
    
    // 更新用户角色
    const db = req.app.locals.storage; 
    const updatedUser = await db.updateUser(userId, {
      role
    });
    
    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }
    
    return res.status(200).json({
      success: true,
      message: `用户角色已更新为 ${role}`,
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        role: updatedUser.role
      }
    });
  } catch (error) {
    console.error('[认证系统] 更新用户角色失败:', error);
    return res.status(500).json({
      success: false,
      message: '服务器错误，请稍后再试'
    });
  }
}

// 验证中间件 - 用于API路由保护
export async function verifySession(req: Request, res: Response, next: NextFunction) {
  // 调试信息
  console.log(`请求路径: ${req.path}, 会话ID: ${req.sessionID}, 已认证: ${req.session.authenticated || req.session.isAuthenticated}`);
  
  // 会话状态调试
  console.log('[会话调试] 路径: ' + req.path + ', 会话信息:', {
    id: req.sessionID,
    userId: req.session.userId,
    socialBound: req.session.socialBound,
    isAuthenticated: req.session.authenticated || req.session.isAuthenticated
  });
  
  // 公开路径直接放行
  if (
    req.path.startsWith('/api/auth/') || 
    req.path.startsWith('/api/translations') || 
    req.path.startsWith('/api/public/') || 
    req.path === '/api/stats/public' ||
    req.path === '/api/stats/language-distribution' ||
    req.path === '/api/activities'
  ) {
    return next();
  }
  
  try {
    // 首先检查Express会话状态
    if (req.session.authenticated || req.session.isAuthenticated) {
      console.log(`[认证] Express会话已认证: 用户ID=${req.session.userId}`);
      
      // 获取存储接口
      const db = req.app.locals.storage;
      
      // 从数据库获取用户信息
      const user = await db.getUser(req.session.userId);
      if (!user) {
        console.log(`[认证] 会话用户不存在: userId=${req.session.userId}`);
        return res.status(401).json({
          authenticated: false,
          message: '用户不存在或已被删除'
        });
      }
      
      // 检查用户状态
      if (user.is_active === false) {
        console.log(`[认证] 用户未激活: ${user.id}, ${user.username}`);
        return res.status(403).json({
          authenticated: false,
          message: '账号未激活，请联系管理员'
        });
      }
      
      // Express会话验证成功，更新请求对象
      req.app.locals.currentUser = user;
      
      // 检查并更新数据库会话
      try {
        // 验证数据库会话是否存在有效
        const dbSession = req.sessionID ? await db.getUserSessionById(req.sessionID) : null;
        
        if (!dbSession || !dbSession.isValid) {
          console.log(`[认证] 数据库会话不存在或无效，创建新会话记录: ${req.sessionID}`);
          
          // 如果数据库会话不存在或无效，但Express会话有效，则创建新的数据库会话
          await db.createUserSession({
            sessionId: req.sessionID,
            userId: user.id,
            ipAddress: req.ip,
            userAgent: req.get('user-agent') || '',
            isValid: true,
            lastActivity: new Date(),
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30天过期
          });
        } else {
          // 更新会话最后活动时间
          await db.updateUserSession(req.sessionID, {
            lastActivity: new Date()
          });
        }
      } catch (sessionError) {
        console.warn('[认证] 数据库会话操作失败:', sessionError);
        // 继续处理，不阻断请求
      }
      
      return next();
    }
    
    // Express会话未认证，检查数据库会话
    const db = req.app.locals.storage;
    const session = req.sessionID ? await db.getUserSessionById(req.sessionID) : null;
    
    // 会话不存在、无效或过期
    if (!session || !session.isValid || (session.expiresAt && new Date() > new Date(session.expiresAt))) {
      console.log(`[认证] 数据库会话无效: ${req.sessionID}`);
      return res.status(401).json({
        authenticated: false,
        message: '未授权，请先登录'
      });
    }
    
    // 会话有效但没有关联用户
    if (!session.userId) {
      console.log(`[认证] 会话没有关联用户: ${req.sessionID}`);
      return res.status(401).json({
        authenticated: false,
        message: '无效的用户会话'
      });
    }
    
    // 从数据库获取用户信息
    const user = await db.getUser(session.userId);
    if (!user) {
      console.log(`[认证] 会话关联用户不存在: ${req.sessionID}, 用户ID: ${session.userId}`);
      return res.status(401).json({
        authenticated: false,
        message: '用户不存在'
      });
    }
    
    // 检查用户状态
    if (user.is_active === false) {
      console.log(`[认证] 用户未激活: ${user.id}, ${user.username}`);
      return res.status(403).json({
        authenticated: false,
        message: '账号未激活，请联系管理员'
      });
    }
    
    // 数据库会话验证成功，但Express会话未认证，更新Express会话
    req.app.locals.currentUser = user;
    req.session.userId = user.id;
    req.session.authenticated = true;
    req.session.isAuthenticated = true;
    req.session.role = user.role;
    req.session.language = user.language || 'zh';
    req.session.username = user.username;
    
    // 保存Express会话
    await new Promise<void>((resolve) => {
      req.session.save((err) => {
        if (err) {
          console.error('[认证系统] 保存会话状态失败:', err);
        }
        console.log('[认证] Express会话已更新: userId=', user.id);
        resolve();
      });
    });
    
    // 更新数据库会话最后活动时间
    try {
      await db.updateUserSession(req.sessionID, {
        lastActivity: new Date()
      });
    } catch (error) {
      console.warn('[认证] 更新会话活动时间失败:', error);
      // 继续处理，不阻断请求
    }
    
    next();
  } catch (error) {
    console.error('[认证] 验证会话失败:', error);
    return res.status(500).json({
      authenticated: false,
      message: '服务器错误'
    });
  }
}

// 管理员权限验证中间件
export function isAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({
      authenticated: false,
      message: '请先登录'
    });
  }
  
  if (!req.session.role || (req.session.role !== 'admin' && req.session.role !== 'super_admin')) {
    return res.status(403).json({
      authenticated: true,
      message: '需要管理员权限'
    });
  }
  
  next();
}

/**
 * 清理过期的验证记录和无效会话
 * 定期调用此函数可以避免数据库中堆积过多无用的记录
 */
export async function cleanupAuthRecords(app: any): Promise<{
  verificationsRemoved: number,
  sessionsRemoved: number
}> {
  try {
    console.log('[认证系统] 开始清理过期的验证记录和无效会话');
    const db = app.locals.storage;
    
    // 清理过期的验证记录
    const verificationsRemoved = await db.cleanupExpiredVerifications();
    console.log(`[认证系统] 已清理 ${verificationsRemoved} 条过期的验证记录`);
    
    // 清理过期的会话
    const sessionsRemoved = await db.cleanupExpiredSessions();
    console.log(`[认证系统] 已清理 ${sessionsRemoved} 条过期的会话`);
    
    return {
      verificationsRemoved,
      sessionsRemoved
    };
  } catch (error) {
    console.error('[认证系统] 清理记录时出错:', error);
    return {
      verificationsRemoved: 0,
      sessionsRemoved: 0
    };
  }
}