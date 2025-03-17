import { Request, Response, NextFunction } from 'express';
import session from 'express-session';
import { MemoryStore } from 'express-session';
import connect_pg_simple from 'connect-pg-simple';
import postgres from 'postgres';
import crypto from 'crypto';

interface ISessionStorage {
  [key: string]: string;
}

declare global {
  var customSessionStorage: ISessionStorage;
  var sessionMap: Record<string, string>;
}

if (!global.customSessionStorage) {
  global.customSessionStorage = {};
}

const sessionMapListener = {
  set(target: any, key: string, value: any) {
    console.log(`[会话] 更新会话映射: ${key} -> ${value}`);
    target[key] = value;
    return true;
  }
};

if (!global.sessionMap) {
  global.sessionMap = {};
}

global.sessionMap = new Proxy(global.sessionMap, sessionMapListener);


export async function sessionMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    res.setHeader('X-Session-ID', req.sessionID);
    const incomingSessionId = req.query.sessionId as string || req.headers['x-session-id'] as string;

    if (incomingSessionId && req.path.includes('/sync-session')) {
      console.log(`[会话中间件] 接收到会话同步请求，使用传入会话ID: ${incomingSessionId}`);
      req.sessionID = incomingSessionId;

      if (global.customSessionStorage && req.ip && typeof req.ip === 'string') {
        global.customSessionStorage[req.ip] = incomingSessionId;
      }

      res.setHeader('X-Incoming-Session-ID', incomingSessionId);
    }
    else if (global.customSessionStorage && req.ip && typeof req.ip === 'string' && global.customSessionStorage[req.ip]) {
      console.log(`[会话中间件] 发现持久化会话ID: ${global.customSessionStorage[req.ip]}`);
      req.sessionID = global.customSessionStorage[req.ip];
      res.setHeader('X-Persistent-Session-ID', req.sessionID);
    } else {
      console.log(`[会话中间件] 未找到持久化会话ID, 当前会话ID: ${req.sessionID}`);
      if (global.customSessionStorage && req.ip && typeof req.ip === 'string') {
        global.customSessionStorage[req.ip] = req.sessionID;
      }
    }

    if (req.app.locals.storage && req.sessionID) {
      try {
        const dbSession = await req.app.locals.storage.getUserSessionById(req.sessionID);
        if (dbSession) {
          console.log(`[会话中间件] 数据库中存在会话记录，用户ID: ${dbSession.userId || '未关联'}`);

          if (dbSession.userId && dbSession.isValid && 
              (!req.session.userId || !req.session.authenticated)) {
            console.log(`[会话中间件] 从数据库同步会话状态`);
            req.session.userId = dbSession.userId;
            req.session.authenticated = true;
            req.session.isAuthenticated = true;

            await new Promise<void>((resolve) => {
              req.session.save((err) => {
                if (err) {
                  console.error('[会话中间件] 保存会话状态失败:', err);
                } else {
                  console.log('[会话中间件] 会话状态已从数据库同步并保存');
                }
                resolve();
              });
            });
          }

          req.app.locals.storage.updateUserSession(req.sessionID, {
            lastActivity: new Date()
          }).catch(err => {
            console.warn('[会话中间件] 更新会话活动时间失败:', err);
          });
        } else {
          console.log(`[会话中间件] 数据库中不存在会话记录: ${req.sessionID}`);

          if (req.session && (req.session.userId || req.session.authenticated)) {
            console.log(`[会话中间件] 创建会话数据库记录`);
            req.app.locals.storage.createUserSession({
              sessionId: req.sessionID,
              userId: req.session.userId || null,
              ipAddress: req.ip || '',
              userAgent: req.get('user-agent') || '',
              isValid: true,
              lastActivity: new Date(),
              expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            }).catch(err => {
              console.error('[会话中间件] 创建会话记录失败:', err);
            });
          }
        }
      } catch (dbError) {
        console.error('[会话中间件] 会话数据库操作错误:', dbError);
      }
    }

    const authenticated = req.session && (
      req.session.authenticated === true || 
      req.session.isAuthenticated === true || 
      (req.session.userId && req.session.userId > 0)
    );

    if (authenticated && req.session.userId) {
      try {
        const dbSession = await db.getUserSessionById(req.sessionID);
        if (!dbSession || !dbSession.isValid || dbSession.userId !== req.session.userId) {
          req.session.authenticated = false;
          req.session.isAuthenticated = false;
          req.session.userId = null;
          req.session.role = null;
        } else {
          await db.updateUserSession(req.sessionID, {
            lastActivity: new Date()
          });
        }
      } catch (err) {
        console.error('[会话] 验证数据库会话失败:', err);
      }
    }

    if (authenticated) {
      res.setHeader('X-Authenticated', 'true');
      res.setHeader('X-User-ID', req.session?.userId?.toString() || '');
    }

    console.log(`请求路径: ${req.path}, 会话ID: ${req.sessionID}, 已认证: ${authenticated}`);
    console.log(`[会话调试] 路径: ${req.path}, 会话信息:`, {
      id: req.sessionID,
      userId: req.session?.userId,
      socialBound: req.session?.socialBound,
      isAuthenticated: authenticated
    });

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

export function configureSession(app: any) {
  const usePostgresSession = true;

  let sessionOptions: any = {
    name: 'warehouse.sid',
    secret: process.env.SESSION_SECRET || 'warehouse-session-secret-2024',
    resave: false,
    rolling: true,
    saveUninitialized: false,
    genid: (req: any) => {
      if (global.customSessionStorage && req.ip && typeof req.ip === 'string' && global.customSessionStorage[req.ip]) {
        console.log(`[会话] 使用持久化会话ID: ${global.customSessionStorage[req.ip]}`);
        return global.customSessionStorage[req.ip];
      }

      const sessionId = crypto.randomBytes(16).toString('hex');
      console.log(`[会话] 生成新会话ID: ${sessionId}`);
      if (global.customSessionStorage && req.ip && typeof req.ip === 'string') {
        global.customSessionStorage[req.ip] = sessionId;
      }
      return sessionId;
    },
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000,
      sameSite: 'lax'
    }
  };

  if (usePostgresSession && process.env.DATABASE_URL) {
    try {
      console.log('[会话] 使用PostgreSQL存储会话 - 数据库URL存在:', !!process.env.DATABASE_URL);
      const PgSession = connect_pg_simple(session);
      sessionOptions.store = new PgSession({
        conString: process.env.DATABASE_URL,
        tableName: 'session',
        createTableIfMissing: true,
        pruneSessionInterval: 86400,
        ttl: 2592000
      });

      sessionOptions.store.on('error', (err: Error) => {
        console.error('[会话存储] PostgreSQL错误:', err);
        console.log('[会话存储] 由于PostgreSQL错误，将回退到内存存储');
        sessionOptions.store = new MemoryStore({
          checkPeriod: 86400000,
          ttl: 2592000
        } as any);
      });

      console.log('[会话] 成功配置PostgreSQL会话存储');
    } catch (pgError) {
      console.error('[会话] PostgreSQL会话存储配置失败:', pgError);
      console.log('[会话] 改用内存存储会话');
      sessionOptions.store = new MemoryStore({
        checkPeriod: 86400000,
        ttl: 2592000
      } as any);
    }
  } else {
    console.log('[会话] ⚠️警告: 未找到DATABASE_URL环境变量，回退到内存存储会话');
    sessionOptions.store = new MemoryStore({
      checkPeriod: 86400000,
      ttl: 2592000
    } as any);
  }

  app.use(session(sessionOptions));

  app.use((req: Request, res: Response, next: NextFunction) => {
    const oldSetHeader = res.setHeader;
    res.setHeader = function(name: string, value: any) {
      if (name.toLowerCase() === 'set-cookie') {
        console.log('[会话] 设置Cookie:', value);
      }
      return oldSetHeader.apply(this, arguments as any);
    };

    if (global.customSessionStorage && req.ip && typeof req.ip === 'string') {
      global.customSessionStorage[req.ip] = req.sessionID;
    }

    next();
  });
}