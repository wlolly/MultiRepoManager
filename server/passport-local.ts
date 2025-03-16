/**
 * Passport.js本地认证策略配置
 * 用于处理用户名/密码登录验证
 */
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { db } from './db';
import { eq, sql } from 'drizzle-orm';
import crypto from 'crypto';
import { users } from '../shared/schema';

// 密码验证函数 - 用于PBKDF2格式的密码或简单测试账号
function verifyPassword(storedPassword: string, suppliedPassword: string): boolean {
  // 特殊处理测试账号"222"，直接相等比较
  if (suppliedPassword === "222" && storedPassword === "222") {
    console.log('[Passport] 测试账号密码验证成功');
    return true;
  }
  
  console.log('[Passport] 存储密码格式:', storedPassword);
  
  // 格式应为: salt:hash
  const parts = storedPassword.split(':');
  if (parts.length !== 2) {
    console.log('[Passport] 密码格式不符合要求：', storedPassword);
    // 尝试直接比较密码
    const directMatch = storedPassword === suppliedPassword;
    console.log('[Passport] 直接比较密码结果:', directMatch);
    return directMatch;
  }
  
  const salt = parts[0];
  const storedHash = parts[1];
  
  // 使用相同的加密参数计算提供的密码的哈希值
  const hash = crypto.pbkdf2Sync(suppliedPassword, salt, 1000, 64, 'sha512').toString('hex');
  
  // 比较计算得到的哈希值和存储的哈希值
  const result = storedHash === hash;
  console.log('[Passport] PBKDF2密码验证结果:', result);
  return result;
}

// 配置本地验证策略
passport.use(new LocalStrategy(
  {
    usernameField: 'username',
    passwordField: 'password'
  },
  async (username, suppliedPassword, done) => {
    try {
      console.log('[Passport] 尝试验证用户:', username);
      
      // 从数据库查询用户
      const result = await db.select().from(users).where(eq(users.username, username));
      
      // 处理查询结果
      if (!result || result.length === 0) {
        console.log('[Passport] 用户不存在:', username);
        return done(null, false, { message: '用户名或密码错误' });
      }
      
      const user = result[0];
      
      // 验证密码
      if (!user.password || !verifyPassword(user.password, suppliedPassword)) {
        console.log('[Passport] 密码验证失败:', username);
        return done(null, false, { message: '用户名或密码错误' });
      }
      
      // 检查用户是否激活
      if (user.isactive !== true) {
        console.log('[Passport] 用户未激活:', username);
        return done(null, false, { message: '用户账户未激活' });
      }
      
      console.log('[Passport] 用户验证成功:', username);
      
      // 返回用户对象，但不包含密码
      const userWithoutPassword = { ...user };
      delete userWithoutPassword.password;
      
      return done(null, userWithoutPassword);
    } catch (error) {
      console.error('[Passport] 验证过程出错:', error);
      return done(error);
    }
  }
));

// 序列化用户 - 只在会话中存储用户ID
passport.serializeUser((user: any, done) => {
  console.log('[Passport] 序列化用户:', user.id);
  done(null, user.id);
});

// 反序列化用户 - 根据ID恢复用户对象
passport.deserializeUser(async (id: number, done) => {
  try {
    console.log('[Passport] 反序列化用户ID:', id);
    
    // 从数据库获取用户信息 (使用数据库实际的字段名)
    const result = await db.select({
      id: users.id,
      username: users.username,
      fullname: users.fullname,
      role: users.role,
      isactive: users.isactive // 使用数据库中实际的字段名，全小写
    }).from(users).where(eq(users.id, id));
    
    if (!result || result.length === 0) {
      console.log('[Passport] 用户ID无效:', id);
      return done(null, false);
    }
    
    const user = result[0];
    console.log('[Passport] 用户反序列化成功:', user.username);
    done(null, user);
  } catch (error) {
    console.error('[Passport] 反序列化出错:', error);
    done(error, null);
  }
});

// 导出认证中间件
export function configurePassport() {
  console.log('[Passport] 本地认证策略已配置');
  return passport;
}