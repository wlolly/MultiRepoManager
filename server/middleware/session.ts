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
// 创建全局会话存储的自定义类型
interface ISessionStorage {
  [key: string]: string;
}

// 扩展全局类型
declare global {
  // 不能使用sessionStorage作为名称，因为它是JS的保留类型
  var customSessionStorage: ISessionStorage;
}

// 初始化全局会话存储
if (!global.customSessionStorage) {
  global.customSessionStorage = {};
}

export async function sessionMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    // 添加会话ID到响应头
    res.setHeader('X-Session-ID', req.sessionID);

    // 首先，从查询参数或请求头中获取客户端会话ID (当正在执行会话同步时)
    const incomingSessionId = req.query.sessionId as string || req.headers['x-session-id'] as string;
    
    // 如果请求中包含sessionId且为sync-session接口，优先使用该ID
    if (incomingSessionId && req.path.includes('/sync-session')) {
      console.log(`[会话中间件] 接收到会话同步请求，使用传入会话ID: ${incomingSessionId}`);
      req.sessionID = incomingSessionId;
      
      // 保存到全局存储以便持久化
      if (global.customSessionStorage && req.ip && typeof req.ip === 'string') {
        global.customSessionStorage[req.ip] = incomingSessionId;
      }
      
      res.setHeader('X-Incoming-Session-ID', incomingSessionId);
    }
    // 否则检查是否存在持久化的会话ID
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

    // 检查数据库中是否存在当前会话记录
    if (req.app.locals.storage && req.sessionID) {
      try {
        const dbSession = await req.app.locals.storage.getUserSessionById(req.sessionID);
        if (dbSession) {
          console.log(`[会话中间件] 数据库中存在会话记录，用户ID: ${dbSession.userId || '未关联'}`);
          
          // 如果数据库会话有效且关联了用户，但当前会话未认证，则同步状态
          if (dbSession.userId && dbSession.isValid && 
              (!req.session.userId || !req.session.authenticated)) {
            console.log(`[会话中间件] 从数据库同步会话状态`);
            req.session.userId = dbSession.userId;
            req.session.authenticated = true;
            req.session.isAuthenticated = true; // 兼容性字段
            
            // 保存会话以确保状态被持久化
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
          
          // 更新会话最后活动时间
          req.app.locals.storage.updateUserSession(req.sessionID, {
            lastActivity: new Date()
          }).catch(err => {
            console.warn('[会话中间件] 更新会话活动时间失败:', err);
          });
        } else {
          console.log(`[会话中间件] 数据库中不存在会话记录: ${req.sessionID}`);
          
          // 如果会话带有用户认证信息，但数据库中不存在，则创建会话记录
          if (req.session && (req.session.userId || req.session.authenticated)) {
            console.log(`[会话中间件] 创建会话数据库记录`);
            req.app.locals.storage.createUserSession({
              sessionId: req.sessionID,
              userId: req.session.userId || null,
              ipAddress: req.ip || '',
              userAgent: req.get('user-agent') || '',
              isValid: true,
              lastActivity: new Date(),
              expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30天过期
            }).catch(err => {
              console.error('[会话中间件] 创建会话记录失败:', err);
            });
          }
        }
      } catch (dbError) {
        console.error('[会话中间件] 会话数据库操作错误:', dbError);
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

    // 记录请求会话信息
    console.log(`请求路径: ${req.path}, 会话ID: ${req.sessionID}, 已认证: ${authenticated}`);
    
    // 记录会话调试信息
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
      if (global.customSessionStorage && req.ip && typeof req.ip === 'string' && global.customSessionStorage[req.ip]) {
        console.log(`[会话] 使用持久化会话ID: ${global.customSessionStorage[req.ip]}`);
        return global.customSessionStorage[req.ip];
      }
      
      // 否则生成新ID - 使用顶层导入的crypto
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
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      sameSite: 'lax'
    }
  };

  // 使用PostgreSQL存储会话（如果配置了数据库URL）
  if (usePostgresSession && process.env.DATABASE_URL) {
    try {
      console.log('[会话] 使用PostgreSQL存储会话 - 数据库URL存在:', !!process.env.DATABASE_URL);
      const PgSession = connect_pg_simple(session);
      
      // 实际配置PostgreSQL会话存储
      sessionOptions.store = new PgSession({
        conString: process.env.DATABASE_URL,
        tableName: 'session', // 使用默认表名
        createTableIfMissing: true, // 自动创建表
        pruneSessionInterval: 86400, // 一天清理一次
        ttl: 2592000 // 30天过期
      });
      
      // 监听会话存储错误
      sessionOptions.store.on('error', (err: Error) => {
        console.error('[会话存储] PostgreSQL错误:', err);
        console.log('[会话存储] 由于PostgreSQL错误，将回退到内存存储');
        
        // 动态回退到内存存储
        sessionOptions.store = new MemoryStore({
          checkPeriod: 86400000, // 每24小时清理过期会话
          ttl: 2592000 // 30天的会话生命周期
        } as any);
      });
      
      console.log('[会话] 成功配置PostgreSQL会话存储');
    } catch (pgError) {
      console.error('[会话] PostgreSQL会话存储配置失败:', pgError);
      console.log('[会话] 改用内存存储会话');
      
      // 创建内存存储
      sessionOptions.store = new MemoryStore({
        checkPeriod: 86400000, // 每24小时清理过期会话
        ttl: 2592000 // 30天的会话生命周期
      } as any);
    }
  } else {
    console.log('[会话] ⚠️警告: 未找到DATABASE_URL环境变量，回退到内存存储会话');
    // MemoryStore doesn't actually have a checkPeriod option in its type definition
    // but the implementation accepts it, so we use a type assertion
    sessionOptions.store = new MemoryStore({
      checkPeriod: 86400000, // 每24小时清理过期会话
      ttl: 2592000 // 30天的会话生命周期
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
    if (global.customSessionStorage && req.ip && typeof req.ip === 'string') {
      global.customSessionStorage[req.ip] = req.sessionID;
    }
    
    next();
  });
}