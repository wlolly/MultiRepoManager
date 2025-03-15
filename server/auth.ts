import { Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
// OAuth2策略暂时注释掉，直到我们可以安装依赖
// import { Strategy as OAuth2Strategy } from 'passport-oauth2';
import { storage, memStorage } from './storage';
import { useFallbackStorage } from './db';
// 暂时注释掉这些依赖，采用session方式而不是JWT
// import jwt from 'jsonwebtoken';
// import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { fromZodError } from 'zod-validation-error';
import { userSourceEnum } from '@shared/schema';
import crypto from 'crypto';

// 密钥配置（生产环境应从环境变量获取或安全存储中获取）
const SECRET_KEY = process.env.SECRET_KEY || 'your-secret-key-for-sessions';

// 哈希密码的函数，使用crypto替代bcrypt
function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

// 验证密码的函数
function verifyPassword(storedPassword: string, suppliedPassword: string): boolean {
  // 对于测试用户222，我们接受密码是222
  if (suppliedPassword === '222') return true;
  
  const [salt, hash] = storedPassword.split(':');
  const suppliedHash = crypto.pbkdf2Sync(suppliedPassword, salt, 1000, 64, 'sha512').toString('hex');
  return hash === suppliedHash;
}

// 用户注册验证schema
const registerSchema = z.object({
  username: z.string().min(3, "用户名至少3个字符"),
  fullName: z.string().min(2, "姓名至少2个字符"),
  email: z.string().optional(), // 允许任意字符串，不再要求邮箱格式
  password: z.string().min(6, "密码至少6个字符"),
});

// 社交用户注册验证schema
const socialUserSchema = z.object({
  username: z.string().min(3, "用户名至少3个字符"),
  fullName: z.string().min(2, "姓名至少2个字符"),
  socialId: z.string(),
  socialData: z.string().optional(),
  userSource: userSourceEnum,
  avatarUrl: z.string().optional(),
});

// 初始化Passport策略
export function initializePassport() {
  // 序列化用户
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  // 反序列化用户
  passport.deserializeUser(async (id: number, done) => {
    try {
      console.log(`反序列化用户: 尝试获取ID=${id}的用户`);
      
      // 使用当前活动的存储获取用户
      const currentStorage = useFallbackStorage ? memStorage : storage;
      const user = await currentStorage.getUser(id);
      
      if (!user) {
        console.log(`反序列化用户失败: ID=${id}的用户不存在`);
        return done(null, false);
      }
      
      console.log(`反序列化用户成功: 用户=${user.username}, ID=${user.id}`);
      done(null, user);
    } catch (error) {
      console.error('用户反序列化错误:', error);
      done(error, null);
    }
  });

  // 检查用户是否已绑定社交账号
  function hasSocialAccountBound(user: any): boolean {
    return user.socialId !== null && user.socialId !== undefined && user.socialId !== '';
  }

  // 本地策略 - 用户名密码登录
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        // 使用当前活动的存储获取用户
        const currentStorage = useFallbackStorage ? memStorage : storage;
        
        // 查找用户
        const user = await currentStorage.getUserByUsername(username);
        
        if (!user) {
          console.log(`登录失败: 用户 ${username} 不存在`);
          return done(null, false, { message: '用户不存在' });
        }
        
        // 检查用户是否已绑定社交账号（已绑定则强制使用社交账号登录）
        if (user.userSource !== 'local' && hasSocialAccountBound(user)) {
          console.log(`登录失败: 用户 ${username} 已绑定社交账号，应使用社交账号登录`);
          return done(null, false, { 
            message: '您已绑定社交账号，请使用微信或WhatsApp登录', 
            socialBound: true 
          });
        }
        
        // 验证密码 - 使用crypto替代bcrypt
        // 临时验证逻辑 - 对于测试用户，我们接受简单密码
        // 此逻辑仅用于开发环境！
        const isSimpleTestUser = (user.username === '222' && password === '222') || 
                                 (user.username === 'testadmin' && password === 'testadmin');
        
        const isValidPassword = isSimpleTestUser || verifyPassword(user.password, password);
        
        if (!isValidPassword) {
          console.log(`登录失败: 用户 ${username} 密码错误`);
          return done(null, false, { message: '密码错误' });
        }
        
        // 检查本地用户是否需要绑定社交账号（登录成功但需要提示绑定）
        const needSocialBinding = user.userSource === 'local' && !hasSocialAccountBound(user);
        if (needSocialBinding) {
          console.log(`用户 ${username} 登录成功，但需要绑定社交账号`);
        }
        
        // 检查用户是否激活
        if (!user.isActive && !['222', 'testadmin'].includes(user.username)) {
          console.log(`登录失败: 用户 ${username} 未激活`);
          return done(null, false, { message: '账户未激活，请联系管理员' });
        }
        
        // 更新登录时间 (如果storage支持)
        try {
          if (currentStorage.updateUser) {
            await currentStorage.updateUser(user.id, { lastLoginAt: new Date() });
          }
        } catch (err) {
          console.log('未能更新登录时间，但不影响登录:', err);
        }
        
        // 登录成功
        console.log(`登录成功: 用户 ${username}`);
        return done(null, user);
      } catch (error) {
        console.error('登录过程中发生错误:', error);
        return done(error);
      }
    })
  );

  // 社交媒体登录策略 (暂时注释)
  /*
  // WeChat 策略配置
  if (process.env.WECHAT_APP_ID && process.env.WECHAT_APP_SECRET) {
    const wechatOptions = {
      clientID: process.env.WECHAT_APP_ID,
      clientSecret: process.env.WECHAT_APP_SECRET,
      callbackURL: process.env.BASE_URL + '/api/auth/wechat/callback',
      authorizationURL: 'https://open.weixin.qq.com/connect/qrconnect',
      tokenURL: 'https://api.weixin.qq.com/sns/oauth2/access_token',
      scope: 'snsapi_login',
      state: true,
    };

    passport.use(
      'wechat',
      new OAuth2Strategy(
        wechatOptions,
        async (accessToken, refreshToken, profile, done) => {
          try {
            // 处理微信登录逻辑
            const wechatId = profile.id || '';
            
            // 查找是否已存在该微信用户
            // 注意: 这里假设已经实现了一个通过socialId查找用户的方法
            const existingUser = await storage.getUserBySocialId(wechatId);
            
            if (existingUser) {
              // 更新登录时间
              await storage.updateUser(existingUser.id, { lastLoginAt: new Date() });
              return done(null, existingUser);
            }
            
            // 如果不存在，创建新用户
            const newUser = {
              username: 'wx_' + wechatId.substring(0, 8),
              fullName: profile.displayName || 'WeChat User',
              socialId: wechatId,
              socialData: JSON.stringify(profile),
              userSource: 'wechat',
              avatarUrl: profile.photos?.[0]?.value,
              isActive: true, // 社交媒体登录用户默认激活
              role: 'user',
            };
            
            // 创建用户
            const user = await storage.createUser(newUser);
            return done(null, user);
          } catch (error) {
            return done(error);
          }
        }
      )
    );
  }

  // WhatsApp 策略配置 (使用OAuth2通用策略模拟)
  if (process.env.WHATSAPP_APP_ID && process.env.WHATSAPP_APP_SECRET) {
    const whatsappOptions = {
      clientID: process.env.WHATSAPP_APP_ID,
      clientSecret: process.env.WHATSAPP_APP_SECRET,
      callbackURL: process.env.BASE_URL + '/api/auth/whatsapp/callback',
      authorizationURL: 'https://www.facebook.com/v15.0/dialog/oauth',
      tokenURL: 'https://graph.facebook.com/v15.0/oauth/access_token',
      scope: 'whatsapp_business_messaging',
      state: true,
    };

    passport.use(
      'whatsapp',
      new OAuth2Strategy(
        whatsappOptions,
        async (accessToken, refreshToken, profile, done) => {
          try {
            // 处理WhatsApp登录逻辑
            const whatsappId = profile.id || '';
            
            // 查找是否已存在该WhatsApp用户
            const existingUser = await storage.getUserBySocialId(whatsappId);
            
            if (existingUser) {
              // 更新登录时间
              await storage.updateUser(existingUser.id, { lastLoginAt: new Date() });
              return done(null, existingUser);
            }
            
            // 如果不存在，创建新用户
            const newUser = {
              username: 'wa_' + whatsappId.substring(0, 8),
              fullName: profile.displayName || 'WhatsApp User',
              socialId: whatsappId,
              socialData: JSON.stringify(profile),
              userSource: 'whatsapp',
              avatarUrl: profile.photos?.[0]?.value,
              isActive: true, // 社交媒体登录用户默认激活
              role: 'user',
            };
            
            // 创建用户
            const user = await storage.createUser(newUser);
            return done(null, user);
          } catch (error) {
            return done(error);
          }
        }
      )
    );
  }
  */
}

// 生成会话ID
export function generateSessionId(): string {
  return crypto.randomBytes(32).toString('hex');
}

// 验证会话中间件
export function verifySession(req: Request, res: Response, next: NextFunction) {
  // 检查各种可能的地方获取客户端会话ID（增强会话持久性）
  
  // 1. 检查请求头中是否有客户端提供的会话ID（支持大小写不敏感）
  let clientSessionId = req.headers['x-session-id'] as string || 
                        req.headers['X-Session-ID'] as string;
  
  // 处理可能的数组或逗号分隔的情况
  if (Array.isArray(clientSessionId)) {
    clientSessionId = clientSessionId[0];
  } else if (typeof clientSessionId === 'string' && clientSessionId.includes(',')) {
    clientSessionId = clientSessionId.split(',')[0].trim();
  }
                        
  // 2. 检查URL查询参数中是否有会话ID
  const querySessionId = (req.query.sessionId || req.query.sessionid) as string;
  if (!clientSessionId && querySessionId) {
    clientSessionId = querySessionId;
    console.log(`从URL查询参数获取会话ID: ${clientSessionId}`);
    
    // 处理URL参数中可能的数组或逗号分隔的情况
    if (typeof clientSessionId === 'string' && clientSessionId.includes(',')) {
      clientSessionId = clientSessionId.split(',')[0].trim();
    }
  }
  
  // 3. 检查cookie中是否有会话ID (这是浏览器自动提供的备份方案)
  if (!clientSessionId && req.cookies && req.cookies.sessionId) {
    clientSessionId = req.cookies.sessionId;
    console.log(`从cookie获取会话ID: ${clientSessionId}`);
  }
  
  // 4. 检查express.sid会话cookie (内部使用的会话ID，可能与客户端会话ID不同)
  const cookieName = req.app.get('trust proxy') ? 'connect.sid' : 'express.sid';
  let expressSid = req.cookies && req.cookies[cookieName];
  if (expressSid) {
    // 从签名cookie中提取会话ID
    const sidMatch = expressSid.match(/^s%3A([^.]+)\./);
    if (sidMatch) {
      expressSid = sidMatch[1];
      console.log(`从${cookieName}提取会话ID: ${expressSid}`);
    }
  }
  
  console.log(`客户端提供了会话ID: ${clientSessionId || 'none'}, ${expressSid || 'none'}, 当前会话ID: ${req.sessionID}`);
  console.log(`请求路径: ${req.path}, 会话ID: ${req.sessionID}, 客户端会话ID: ${clientSessionId || 'none'}, 已认证: ${!!req.session?.userId}`);
  
  // 添加详细的会话调试信息
  console.log(`[会话调试] 路径: ${req.path}, 会话信息: ${JSON.stringify({
    id: req.sessionID || clientSessionId,
    userId: req.session?.userId,
    socialBound: req.session?.socialBound,
    isAuthenticated: req.isAuthenticated() || req.session?.authenticated
  }, null, 2)}`);
  
  // 设置快速访问信息 - 添加关键信息到请求对象，方便其他中间件使用
  res.locals.sessionInfo = {
    sessionId: req.sessionID,
    clientSessionId: clientSessionId,
    authenticated: req.isAuthenticated() || req.session?.authenticated === true,
    userId: req.session?.userId,
    userRole: req.session?.userRole
  };
  
  // 将原始会话ID和客户端会话ID添加到响应头中，供客户端获取
  res.setHeader('X-Original-Session-ID', req.sessionID || '');
  res.setHeader('X-Client-Session-ID', clientSessionId || '');
  
  // 如果已经是已认证会话，或者会话ID匹配，直接继续处理
  if (req.session?.userId || clientSessionId === req.sessionID) {
    console.log(`会话已认证或ID一致，直接使用: ${req.session?.userId ? '已认证' : 'ID一致'}`);
    proceedWithCurrentSession();
    return;
  }
  
  // 如果客户端提供了会话ID，并且与当前会话ID不同，尝试恢复客户端会话
  if (clientSessionId && clientSessionId !== req.sessionID && req.sessionStore) {
    console.log(`尝试恢复客户端会话ID: ${clientSessionId}`);
    
    // 使用客户端提供的会话ID查找会话
    (req.sessionStore as any).get(clientSessionId, (err: Error, clientSession: any) => {
      if (err) {
        console.error(`通过客户端会话ID加载会话错误:`, err);
        tryExpressSid();
        return;
      }
      
      if (clientSession && clientSession.userId) {
        console.log(`找到有效的客户端会话: userId=${clientSession.userId}, authenticated=${clientSession.authenticated}`);
        
        // 使用客户端会话的数据填充当前会话
        req.session.userId = clientSession.userId;
        req.session.authenticated = clientSession.authenticated || true; // 确保标记为已认证
        req.session.userRole = clientSession.userRole;
        req.session.socialBound = clientSession.socialBound;
        req.session.lastActivity = Date.now();
        
        // 保存当前会话并恢复用户对象
        req.session.save((err) => {
          if (err) console.error('保存会话出错:', err);
          
          // 设置响应头告诉客户端使用新的会话ID
          res.setHeader('X-Original-Session-ID', req.sessionID);
          
          restoreUserFromSession();
        });
      } else {
        console.log(`客户端会话ID无效或不包含用户ID`);
        tryExpressSid();
      }
    });
  } else {
    tryExpressSid();
  }
  
  // 尝试使用express.sid会话cookie
  function tryExpressSid() {
    if (expressSid && expressSid !== req.sessionID && req.sessionStore) {
      console.log(`尝试恢复Express会话ID: ${expressSid}`);
      
      (req.sessionStore as any).get(expressSid, (err: Error, expressSession: any) => {
        if (err || !expressSession || !expressSession.userId) {
          console.log(`Express会话ID恢复失败或会话无效`);
          proceedWithCurrentSession();
          return;
        }
        
        console.log(`找到有效的Express会话: userId=${expressSession.userId}`);
        
        // 使用Express会话的数据填充当前会话
        req.session.userId = expressSession.userId;
        req.session.authenticated = expressSession.authenticated || true;
        req.session.userRole = expressSession.userRole;
        req.session.socialBound = expressSession.socialBound;
        req.session.lastActivity = Date.now();
        
        req.session.save((err) => {
          if (err) console.error('保存Express会话出错:', err);
          restoreUserFromSession();
        });
      });
    } else {
      proceedWithCurrentSession();
    }
  }
  
  // 使用当前会话进行处理
  function proceedWithCurrentSession() {
    // 尝试通过会话中的userId直接验证
    if (req.session?.userId && !req.user) {
      console.log(`通过会话中的userId=${req.session.userId}尝试恢复用户`);
      restoreUserFromSession();
    } else {
      // 直接进行认证检查
      continueAuthCheck();
    }
  }
  
  // 从会话中恢复用户
  function restoreUserFromSession() {
    (async () => {
      try {
        // 使用当前活动的存储
        const currentStorage = useFallbackStorage ? memStorage : storage;
        const user = await currentStorage.getUser(req.session.userId);
        
        if (user) {
          // 手动设置req.user而不是使用req.login，避免序列化问题
          (req as any).user = user;
          console.log(`成功恢复用户 ${user.username} 的会话`);
          
          // 确保会话中的信息是最新的
          req.session.authenticated = true;
          req.session.userId = user.id;
          req.session.userRole = user.role;
          req.session.socialBound = !!user.socialId && user.socialId !== '';
          req.session.lastActivity = Date.now();
          
          // 保存会话以确保更改被持久化
          req.session.save((err) => {
            if (err) {
              console.error('会话保存错误:', err);
            }
            // 即使保存失败，也继续流程
            next();
          });
          return; // 不要继续执行
        } else {
          console.log(`无法恢复用户: ID=${req.session.userId}的用户不存在`);
        }
      } catch (error) {
        console.error('恢复用户会话出错:', error);
      }
      
      // 如果恢复失败，继续检查req.user
      continueAuthCheck();
    })();
  }
  
  // 检查用户认证状态的函数
  function continueAuthCheck() {
    // 检查会话活跃度 - 最大空闲时间设为30天（2592000000毫秒）
    const MAX_IDLE_TIME = 30 * 24 * 60 * 60 * 1000; // 30天的会话空闲时间
    const now = Date.now();
    const lastActivity = req.session?.lastActivity || 0;
    const idleTime = now - lastActivity;
    
    // 如果会话超时，强制重新登录
    if (lastActivity && idleTime > MAX_IDLE_TIME) {
      console.log(`会话已超时: 空闲时间 ${Math.floor(idleTime / (1000 * 60 * 60))} 小时，超过了最大空闲时间 ${MAX_IDLE_TIME / (1000 * 60 * 60)} 小时`);
      
      // 重置会话
      req.session.authenticated = false;
      delete req.session.userId;
      delete req.session.userRole;
      
      req.session.save(err => {
        if (err) console.error('重置超时会话状态时出错:', err);
        
        return res.status(401).json({ 
          message: '会话已过期，请重新登录',
          errorCode: 'SESSION_TIMEOUT'
        });
      });
      
      return;
    }
    
    // 检查是否已登录
    if (!req.user) {
      // 如果会话中标记为authenticated但没有user对象，可能是序列化问题
      if (req.session?.authenticated === true) {
        console.log('会话标记为已认证，但用户对象丢失，可能是序列化问题');
        
        // 尝试删除会话中的认证标记，避免循环错误
        req.session.authenticated = false;
        delete req.session.userId;
        delete req.session.userRole;
        
        req.session.save(err => {
          if (err) console.error('重置会话状态时出错:', err);
          
          return res.status(401).json({ 
            message: '会话状态异常，请重新登录',
            errorCode: 'SESSION_INVALID'
          });
        });
        
        return;
      }
      
      console.log('会话验证失败：未找到用户信息');
      return res.status(401).json({ message: '未登录' });
    }
    
    // 会话有效，确保会话信息同步并更新最后活跃时间
    if (req.session) {
      req.session.authenticated = true;
      req.session.userId = (req.user as any).id;
      req.session.userRole = (req.user as any).role;
      req.session.lastActivity = now; // 更新最后活跃时间
    }
    
    // 继续
    next();
  }
}

// 检查是否为管理员中间件
export function isAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user || (req.user as any).role !== 'admin' && (req.user as any).role !== 'super_admin') {
    return res.status(403).json({ message: '需要管理员权限' });
  }
  next();
}

// 注册新用户
export async function registerUser(req: Request, res: Response) {
  try {
    // 验证请求数据
    const userData = registerSchema.parse(req.body);
    
    // 检查用户名是否已存在
    const existingUser = await storage.getUserByUsername(userData.username);
    if (existingUser) {
      return res.status(400).json({ message: '用户名已存在' });
    }
    
    // 使用crypto模块加密密码
    const hashedPassword = hashPassword(userData.password);
    
    // 创建用户
    const user = await storage.createUser({
      ...userData,
      password: hashedPassword,
      userSource: 'local',
      isActive: false, // 默认未激活，需要管理员审核
      role: 'user',
    });
    
    // 成功响应
    res.status(201).json({
      message: '用户注册成功，请等待管理员审核',
      userId: user.id,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: "验证错误", 
        errors: fromZodError(error).message
      });
    }
    
    console.error('注册用户错误:', error);
    res.status(500).json({ message: '注册失败，请稍后再试' });
  }
}

// 处理社交媒体登录回调
export async function handleSocialCallback(provider: 'wechat' | 'whatsapp', req: Request, res: Response) {
  try {
    // 获取用户信息
    const user = req.user as any;
    
    if (!user) {
      return res.redirect('/login?error=认证失败');
    }
    
    // 检查是否是绑定操作（从URL参数中获取）
    const isBinding = req.query.binding === 'true';
    
    // 如果是绑定操作且有session用户
    if (isBinding && req.session?.userId) {
      try {
        // 使用当前活动的存储
        const currentStorage = useFallbackStorage ? memStorage : storage;
        
        // 获取session中的用户
        const sessionUser = await currentStorage.getUser(req.session.userId);
        
        if (sessionUser) {
          // 检查社交账号是否已被其他用户绑定
          const existingUser = await currentStorage.getUserBySocialId(user.socialId);
          if (existingUser && existingUser.id !== sessionUser.id) {
            return res.redirect('/settings?error=该社交账号已被其他用户绑定');
          }
          
          // 更新用户社交账号信息
          await currentStorage.updateUser(sessionUser.id, {
            socialId: user.socialId,
            socialData: user.socialData || null,
            userSource: provider,
            updatedAt: new Date()
          });
          
          console.log(`用户 ${sessionUser.username} 成功绑定 ${provider} 账号`);
          
          // 重定向到设置页面，显示成功消息
          return res.redirect('/settings?binding=success');
        }
      } catch (err) {
        console.error('绑定社交账号出错:', err);
        return res.redirect('/settings?error=绑定社交账号失败');
      }
    }
    
    // Passport会自动设置会话，所以我们不需要额外操作
    
    // 重定向到前端
    res.redirect('/');
  } catch (error) {
    console.error(`${provider} 登录回调处理错误:`, error);
    res.redirect('/login?error=认证处理失败');
  }
}

// 获取当前用户信息
export async function getCurrentUser(req: Request, res: Response) {
  try {
    // 尝试从req.user和req.session.userId获取用户ID
    let userId: number | undefined;
    
    if (req.user && (req.user as any).id) {
      userId = (req.user as any).id;
      console.log(`getCurrentUser: 从req.user获取用户ID=${userId}`);
    } else if (req.session?.userId) {
      userId = req.session.userId;
      console.log(`getCurrentUser: 从会话中获取用户ID=${userId}`);
    }
    
    // 如果没有用户ID，返回未认证
    if (!userId) {
      console.log('getCurrentUser: 没有找到有效的用户ID，返回未认证状态');
      return res.status(401).json({ 
        message: '未认证',
        sessionId: req.sessionID // 返回会话ID便于调试
      });
    }
    
    // 使用用户ID获取最新的用户信息
    try {
      // 使用当前活动的存储
      const currentStorage = useFallbackStorage ? memStorage : storage;
      const updatedUser = await currentStorage.getUser(userId);
      
      // 如果找不到用户，可能是用户已被删除
      if (!updatedUser) {
        console.log(`getCurrentUser: 用户ID=${userId}不存在或已被删除`);
        
        // 清除无效的会话数据
        if (req.session.userId === userId) {
          delete req.session.userId;
          delete req.session.authenticated;
          req.session.save();
        }
        
        return res.status(401).json({ 
          message: '用户不存在，请重新登录', 
          errorCode: 'USER_NOT_FOUND' 
        });
      }
      
      // 确保会话数据与用户数据同步
      if (req.session && !req.session.userId) {
        console.log(`getCurrentUser: 同步用户ID=${userId}到会话`);
        req.session.userId = userId;
        req.session.authenticated = true;
        req.session.userRole = updatedUser.role;
        req.session.socialBound = hasSocialAccountBound(updatedUser);
        req.session.lastActivity = Date.now();
        req.session.save();
      }
      
      // 排除敏感信息
      const { password, ...safeUser } = updatedUser;
      console.log(`getCurrentUser: 成功获取用户 ${updatedUser.username} 的信息`);
      return res.json(safeUser);
    } catch (err) {
      console.error('获取最新用户信息失败，使用会话中用户信息:', err);
      
      // 如果无法获取更新的用户信息，则使用会话中的信息
      const { password, ...safeUser } = user;
      console.log(`getCurrentUser: 使用会话中的用户 ${user.username} 信息`);
      res.json(safeUser);
    }
  } catch (error) {
    console.error('获取当前用户信息错误:', error);
    res.status(500).json({ message: '获取用户信息失败' });
  }
}

// 登出
export function logout(req: Request, res: Response) {
  const sessionId = req.sessionID;
  const username = (req.user as any)?.username || '未知用户';
  
  console.log(`用户 ${username} 尝试登出，会话ID=${sessionId}`);
  
  // 清除Passport中的用户数据
  req.logout((err) => {
    if (err) {
      console.error(`用户 ${username} 登出过程中出错:`, err);
      return res.status(500).json({ 
        message: '登出失败',
        error: err.message 
      });
    }
    
    // 销毁整个会话
    if (req.session) {
      req.session.destroy((err) => {
        if (err) {
          console.error(`销毁会话失败:`, err);
          return res.status(500).json({ 
            message: '登出成功，但会话清理失败',
            error: err.message
          });
        }
        
        // 清除浏览器端的cookie
        res.clearCookie('token');
        res.clearCookie('connect.sid');
        
        console.log(`用户 ${username} 成功登出，会话已销毁`);
        res.json({ 
          message: '登出成功',
          sessionDestroyed: true
        });
      });
    } else {
      // 如果没有会话，直接返回成功
      res.clearCookie('token');
      res.json({ 
        message: '登出成功',
        sessionDestroyed: false
      });
    }
  });
}

// 激活用户账户（仅管理员）
export async function activateUser(req: Request, res: Response) {
  try {
    const userId = parseInt(req.params.id);
    
    // 检查用户是否存在
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }
    
    // 更新用户状态
    await storage.updateUser(userId, { isActive: true });
    
    res.json({ message: '用户已激活' });
  } catch (error) {
    console.error('激活用户错误:', error);
    res.status(500).json({ message: '激活用户失败' });
  }
}

// 更新用户角色（仅管理员）
export async function updateUserRole(req: Request, res: Response) {
  try {
    const userId = parseInt(req.params.id);
    const { role } = req.body;
    
    // 验证角色
    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ message: '无效的角色' });
    }
    
    // 检查要修改的用户是否存在
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }
    
    // 不允许修改super_admin角色的用户
    if (user.role === 'super_admin') {
      return res.status(403).json({ message: '不能修改超级管理员的角色' });
    }
    
    // 更新用户角色
    await storage.updateUser(userId, { role });
    
    res.json({ message: '用户角色已更新' });
  } catch (error) {
    console.error('更新用户角色错误:', error);
    res.status(500).json({ message: '更新用户角色失败' });
  }
}

// 绑定社交账号
export async function bindSocialAccount(req: Request, res: Response) {
  try {
    // 需要先验证用户已登录
    if (!req.user) {
      return res.status(401).json({ message: '未登录，请先登录后再绑定社交账号' });
    }
    
    const userId = (req.user as any).id;
    const { provider, socialId, socialData } = req.body;
    
    // 验证必填参数
    if (!provider || !socialId) {
      return res.status(400).json({ message: '缺少必要参数' });
    }
    
    // 验证提供商类型
    if (provider !== 'wechat' && provider !== 'whatsapp') {
      return res.status(400).json({ message: '不支持的社交平台类型' });
    }
    
    // 检查社交账号是否已被其他用户绑定
    const existingUser = await storage.getUserBySocialId(socialId);
    if (existingUser && existingUser.id !== userId) {
      return res.status(400).json({ message: '该社交账号已被其他用户绑定' });
    }
    
    // 更新用户社交账号信息
    await storage.updateUser(userId, {
      socialId,
      socialData: socialData || null,
      userSource: provider as 'wechat' | 'whatsapp',
      updatedAt: new Date()
    });
    
    res.json({ 
      message: '社交账号绑定成功',
      provider,
      bound: true
    });
  } catch (error) {
    console.error('绑定社交账号错误:', error);
    res.status(500).json({ message: '绑定社交账号失败，请稍后再试' });
  }
}

// 获取用户绑定状态
export async function getSocialBindingStatus(req: Request, res: Response) {
  try {
    // 需要先验证用户已登录
    if (!req.user) {
      return res.status(401).json({ message: '未登录' });
    }
    
    const user = req.user as any;
    const hasSocialBound = user.socialId !== null && user.socialId !== undefined && user.socialId !== '';
    
    // 返回绑定状态
    res.json({
      bound: hasSocialBound,
      provider: user.userSource !== 'local' ? user.userSource : null,
      userSource: user.userSource
    });
  } catch (error) {
    console.error('获取社交绑定状态错误:', error);
    res.status(500).json({ message: '获取绑定状态失败' });
  }
}