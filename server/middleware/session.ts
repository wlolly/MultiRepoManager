import { Request, Response, NextFunction } from 'express';
import { isAuthenticated } from '../auth';
import session from 'express-session';
import { MemoryStore } from 'express-session';
import connect_pg_simple from 'connect-pg-simple';
import { Pool } from 'pg';

// 全局session存储，避免模块重新加载时丢失会话
declare global {
  var sessionStorage: any;
}

// 初始化全局会话存储
if (!global.sessionStorage) {
  global.sessionStorage = {};
}

export async function sessionMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    // 添加会话ID到响应头
    res.setHeader('X-Session-ID', req.sessionID);

    // 检查是否存在持久化的会话ID
    if (global.sessionStorage[req.ip]) {
      console.log(`[会话中间件] 发现持久化会话ID: ${global.sessionStorage[req.ip]}`);
      req.sessionID = global.sessionStorage[req.ip];
      res.setHeader('X-Persistent-Session-ID', req.sessionID);
    } else {
      console.log(`[会话中间件] 未找到持久化会话ID, 当前会话ID: ${req.sessionID}`);
      global.sessionStorage[req.ip] = req.sessionID;
    }

    // 检查会话是否已认证
    const authenticated = await isAuthenticated(req);
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
  // 检查环境变量是否存在DATABASE_URL
  const usePostgresSession = process.env.DATABASE_URL && process.env.DATABASE_URL.length > 0;
  
  let sessionOptions: any = {
    name: 'warehouse.sid',
    secret: process.env.SESSION_SECRET || 'warehouse-session-secret-2024',
    resave: false, // 改为false，避免不必要的会话保存
    rolling: true,
    saveUninitialized: false,
    genid: (req: any) => {
      // 如果已存在持久化会话ID，优先使用它
      if (global.sessionStorage[req.ip]) {
        console.log(`[会话] 使用持久化会话ID: ${global.sessionStorage[req.ip]}`);
        return global.sessionStorage[req.ip];
      }
      
      // 否则生成新ID
      const sessionId = require('crypto').randomBytes(16).toString('hex');
      console.log(`[会话] 生成新会话ID: ${sessionId}`);
      global.sessionStorage[req.ip] = sessionId;
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
    console.log('[会话] 使用PostgreSQL存储会话');
    const PgSession = connect_pg_simple(session);
    
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL
    });

    // 确保会话表存在
    pool.query(`
      CREATE TABLE IF NOT EXISTS "session" (
        "sid" varchar NOT NULL COLLATE "default",
        "sess" json NOT NULL,
        "expire" timestamp(6) NOT NULL,
        CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
      )
    `).catch(err => {
      console.error('[会话] 创建会话表失败:', err);
    });

    sessionOptions.store = new PgSession({
      pool,
      tableName: 'session'
    });
  } else {
    console.log('[会话] 使用内存存储会话');
    sessionOptions.store = new MemoryStore({
      checkPeriod: 86400000 // 24 hours
    });
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
    global.sessionStorage[req.ip] = req.sessionID;
    
    next();
  });
}