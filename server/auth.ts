import { Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as OAuth2Strategy } from 'passport-oauth2';
import { storage } from './storage';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { fromZodError } from 'zod-validation-error';
import { userSourceEnum } from '@shared/schema';

// 密钥配置（生产环境应从环境变量获取或安全存储中获取）
const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-key';

// 用户注册验证schema
const registerSchema = z.object({
  username: z.string().min(3, "用户名至少3个字符"),
  fullName: z.string().min(2, "姓名至少2个字符"),
  email: z.string().email("请输入有效的邮箱地址"),
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
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });

  // 本地策略 - 用户名密码登录
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        // 查找用户
        const user = await storage.getUserByUsername(username);
        
        if (!user) {
          return done(null, false, { message: '用户不存在' });
        }
        
        // 验证密码
        const isValidPassword = await bcrypt.compare(password, user.password || '');
        
        if (!isValidPassword) {
          return done(null, false, { message: '密码错误' });
        }
        
        // 检查用户是否激活
        if (!user.isActive) {
          return done(null, false, { message: '账户未激活，请联系管理员' });
        }
        
        // 更新登录时间
        await storage.updateUser(user.id, { lastLoginAt: new Date() });
        
        // 登录成功
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    })
  );

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
}

// 生成JWT令牌
export function generateToken(user: any) {
  // 排除敏感信息
  const { password, ...userInfo } = user;
  
  // 创建令牌
  return jwt.sign(userInfo, JWT_SECRET, { expiresIn: '1d' });
}

// 验证JWT令牌中间件
export function verifyToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: '未提供令牌' });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ message: '无效或过期的令牌' });
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
    
    // 加密密码
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(userData.password, salt);
    
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
    
    // 生成JWT令牌
    const token = generateToken(user);
    
    // 设置session和cookie
    req.session.token = token;
    
    // 重定向到前端，带上token
    res.redirect(`/?token=${token}`);
  } catch (error) {
    console.error(`${provider} 登录回调处理错误:`, error);
    res.redirect('/login?error=认证处理失败');
  }
}

// 获取当前用户信息
export async function getCurrentUser(req: Request, res: Response) {
  try {
    const user = req.user as any;
    
    if (!user) {
      return res.status(401).json({ message: '未认证' });
    }
    
    // 排除敏感信息
    const { password, ...safeUser } = user;
    
    res.json(safeUser);
  } catch (error) {
    console.error('获取当前用户信息错误:', error);
    res.status(500).json({ message: '获取用户信息失败' });
  }
}

// 登出
export function logout(req: Request, res: Response) {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ message: '登出失败' });
    }
    
    res.clearCookie('token');
    res.json({ message: '登出成功' });
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