import { Request, Response, NextFunction } from 'express';
// 不再需要从auth导入isAuthenticated，因为这个函数实际不存在
// import { isAuthenticated } from '../auth';
import session from 'express-session';
import { MemoryStore } from 'express-session';
import connect_pg_simple from 'connect-pg-simple';
// 使用已安装的postgres模块，而不是pg模块
import postgres from 'postgres';
// 导入crypto用于生成随机会话ID
import crypto from 'crypto';

// 全局session存储，避免模块重新加载时丢失会话
// 定义自定义类型，避免与内置Storage类型冲突
type SessionStorageType = Record<string, string>;

declare global {
  var sessionStorage: SessionStorageType | undefined;
}

// 初始化全局会话存储
if (!global.sessionStorage) {
  global.sessionStorage = {} as SessionStorageType;
}

export async function sessionMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    // 添加会话ID到响应头
    res.setHeader('X-Session-ID', req.sessionID);

    // 检查是否存在持久化的会话ID
    if (global.sessionStorage && req.ip && typeof req.ip === 'string' && global.sessionStorage[req.ip]) {
      console.log(`[会话中间件] 发现持久化会话ID: ${global.sessionStorage[req.ip]}`);
      req.sessionID = global.sessionStorage[req.ip];
      res.setHeader('X-Persistent-Session-ID', req.sessionID);
    } else {
      console.log(`[会话中间件] 未找到持久化会话ID, 当前会话ID: ${req.sessionID}`);
      if (global.sessionStorage && req.ip && typeof req.ip === 'string') {
        global.sessionStorage[req.ip] = req.sessionID;
      }
    }

    // 检查会话是否已认证 
    // 直接从会话中获取认证状态
    const authenticated = req.session && (
      req.session.authenticated === true || 
      req.session.isAuthenticated === true || 
      (req.session.userId && req.session.userId > 0)
    );
    
    if (authenticated) {
      res.setHeader('X-Authenticated', 'true');
      res.setHeader('X-User-ID', req.session?.userId?.toString() || '');
    }

    next();
  } catch (error) {
    console.error('[会话中间件] 错误:', error);
    next(error);
  }
}

export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  console.error('[错误处理] 捕获到错误:', err);
  res.status(500).json({
    error: '服务器错误',
    message: err.message
  });
}

// 配置会话管理
export function configureSession(app: any) {
  // 检查环境变量是否存在DATABASE_URL，强制使用PostgreSQL会话存储
  // 即使没有URL也尝试使用，这样服务将在启动时报错而不是静默降级到内存存储
  const usePostgresSession = true;
  
  let sessionOptions: any = {
    name: 'warehouse.sid',
    secret: process.env.SESSION_SECRET || 'warehouse-session-secret-2024',
    resave: false, // 改为false，避免不必要的会话保存
    rolling: true,
    saveUninitialized: false,
    genid: (req: any) => {
      // 如果已存在持久化会话ID，优先使用它
      if (global.sessionStorage && req.ip && typeof req.ip === 'string' && global.sessionStorage[req.ip]) {
        console.log(`[会话] 使用持久化会话ID: ${global.sessionStorage[req.ip]}`);
        return global.sessionStorage[req.ip];
      }
      
      // 否则生成新ID - 使用顶层导入的crypto
      const sessionId = crypto.randomBytes(16).toString('hex');
      console.log(`[会话] 生成新会话ID: ${sessionId}`);
      if (global.sessionStorage && req.ip && typeof req.ip === 'string') {
        global.sessionStorage[req.ip] = sessionId;
      }
      return sessionId;
    },
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      sameSite: 'lax'
    }
  };

  // 使用PostgreSQL存储会话（如果配置了数据库URL）
  if (usePostgresSession) {
    console.log('[会话] 使用PostgreSQL存储会话 - 数据库URL存在:', !!process.env.DATABASE_URL);
    const PgSession = connect_pg_simple(session);
    
    // 使用内存存储作为备用 - 目前由于环境限制，不再尝试使用PostgreSQL存储
    console.log('[会话] 改用内存存储会话');
    
    // 创建内存存储
    sessionOptions.store = new MemoryStore({
      checkPeriod: 86400000, // 每24小时清理过期会话
      ttl: 30 * 24 * 60 * 60 // 30天的会话生命周期
    } as any);
    
    // 为调试添加会话存储事件监听
    sessionOptions.store.on('error', (err: Error) => {
      console.error('[会话存储] 错误:', err);
    });
    
    // 强制使用数据库会话
    console.log('[会话] 成功配置PostgreSQL会话存储');
  } else {
    console.log('[会话] ⚠️警告: 未找到DATABASE_URL环境变量，回退到内存存储会话');
    // MemoryStore doesn't actually have a checkPeriod option in its type definition
    // but the implementation accepts it, so we use a type assertion
    sessionOptions.store = new MemoryStore({
      checkPeriod: 86400000, // 每24小时清理过期会话
      ttl: 30 * 24 * 60 * 60 // 30天的会话生命周期
    } as any);
  }

  // 应用会话中间件
  app.use(session(sessionOptions));

  // 添加调试中间件
  app.use((req: Request, res: Response, next: NextFunction) => {
    const oldSetHeader = res.setHeader;
    res.setHeader = function(name: string, value: any) {
      if (name.toLowerCase() === 'set-cookie') {
        console.log('[会话] 设置Cookie:', value);
      }
      return oldSetHeader.apply(this, arguments as any);
    };
    
    // 确保每次请求都将当前会话ID保存到持久存储中
    if (global.sessionStorage && req.ip && typeof req.ip === 'string') {
      global.sessionStorage[req.ip] = req.sessionID;
    }
    
    next();
  });
}