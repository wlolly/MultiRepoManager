import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { scheduleCleanup } from "./utils/file-cleanup";
import session from "express-session";
import { db, memStorage, useFallbackStorage } from "./db"; // 导入需要的组件
import createMemoryStore from "memorystore";
import crypto from "crypto";
import { sessionSyncMiddleware } from './middleware/session-sync';

const MemoryStore = createMemoryStore(session);
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// 添加标准中间件
console.log("初始化Express应用中间件...");

// 配置 express-session
app.use(session({
  secret: process.env.SESSION_SECRET || 'warehouse-management-secret-2025-03-15',
  resave: false, // 只在会话被修改时保存
  saveUninitialized: true, // 修改为true，确保即使未初始化的会话也被保存，解决会话持久性问题
  name: 'warehouse.sid', // 自定义会话ID cookie名称 (更简单的名称避免解析问题)
  rolling: true, // 每次响应都重设cookie过期时间
  proxy: true, // 信任反向代理，解决在Replit环境下cookie问题
  cookie: { 
    secure: false, // 开发环境不使用secure，避免cookie丢失
    maxAge: 30 * 24 * 60 * 60 * 1000, // 延长到30天，确保测试期间不会过期
    httpOnly: true, // 阻止客户端JS访问cookie
    path: '/',
    sameSite: 'lax', // 防止CSRF攻击的同时允许从外部链接访问
    domain: undefined // 不指定域名，使用当前域名
  },
  genid: function(req) {
    // 检查所有可能的会话ID来源，按优先级排序
    const possibleSources: Array<{name: string, value: string | null, priority: number}> = [];
    
    // 1. 从请求Cookie中获取会话ID (优先级最高，因为这是express-session默认的传递方式)
    const getCookieValue = (cookieString: string | undefined, name: string): string | null => {
      if (!cookieString) return null;
      
      const nameEQ = name + "=";
      const cookies = cookieString.split(';');
      
      for (let cookie of cookies) {
        cookie = cookie.trim();
        if (cookie.indexOf(nameEQ) === 0) {
          let value = cookie.substring(nameEQ.length);
          
          // 处理签名cookie
          if (value.startsWith('s%3A')) {
            value = value.substring(4);
          }
          
          // 如果包含点号(.)，取第一部分(签名前的原始ID)
          if (value.includes('.')) {
            value = value.split('.')[0];
          }
          
          return value;
        }
      }
      return null;
    };
    
    // 直接从请求的cookies字符串中解析，避免依赖中间件
    const cookieHeader = req.headers.cookie;
    
    // 检查已知的cookie名称
    const sessionIdCookie = getCookieValue(cookieHeader, 'sessionId');
    const connectSidCookie = getCookieValue(cookieHeader, 'connect.sid');
    const warehouseSidCookie = getCookieValue(cookieHeader, 'warehouse.sid');
    
    if (sessionIdCookie && sessionIdCookie.length >= 10) {
      possibleSources.push({name: 'Cookie(sessionId)', value: sessionIdCookie, priority: 1});
    }
    
    if (warehouseSidCookie && warehouseSidCookie.length >= 10) {
      possibleSources.push({name: 'Cookie(warehouse.sid)', value: warehouseSidCookie, priority: 2});
    }
    
    if (connectSidCookie && connectSidCookie.length >= 10) {
      possibleSources.push({name: 'Cookie(connect.sid)', value: connectSidCookie, priority: 3});
    }
    
    // 2. 从各种请求头中获取会话ID (次优先级)
    const headersToCheck = [
      'x-client-session-id', 'x-session-id', 'x-original-session-id',
      'sessionid', 'session-id', 'client-session-id'
    ];
    
    for (const headerName of headersToCheck) {
      const headerValue = req.headers[headerName];
      if (headerValue && typeof headerValue === 'string' && headerValue.length >= 10) {
        possibleSources.push({
          name: `请求头(${headerName})`, 
          value: headerValue, 
          priority: 10 + headersToCheck.indexOf(headerName)
        });
      }
    }
    
    // 3. 从查询参数中获取会话ID (低优先级)
    if (req.query.sessionId && typeof req.query.sessionId === 'string' && req.query.sessionId.length >= 10) {
      possibleSources.push({name: '查询参数(sessionId)', value: req.query.sessionId as string, priority: 20});
    }
    
    if (req.query.sid && typeof req.query.sid === 'string' && req.query.sid.length >= 10) {
      possibleSources.push({name: '查询参数(sid)', value: req.query.sid as string, priority: 21});
    }
    
    // 4. 如果已经有会话ID，也加入考虑 (最低优先级，因为这通常是服务器分配的)
    if (req.sessionID && req.sessionID.length >= 10) {
      possibleSources.push({name: '现有会话ID', value: req.sessionID, priority: 30});
    }
    
    // 按优先级排序
    possibleSources.sort((a, b) => a.priority - b.priority);
    
    // 记录调试信息
    const isImportantRequest = req.path.includes('/api/auth/') || 
                              req.path.includes('current-user') || 
                              req.path.includes('/permissions/');
    
    // 记录所有会话ID来源（仅在重要请求中）
    if (possibleSources.length > 0 && isImportantRequest) {
      console.log(`会话ID来源 (${req.path}):`, possibleSources.map(s => `${s.name}: ${s.value}`).join(', '));
    }
    
    // 检查是否有现有会话ID
    const existingSessionID = req.sessionID;
    if (existingSessionID && existingSessionID.length >= 10) {
      // 如果已经有会话ID且符合格式要求，优先使用它
      if (isImportantRequest) {
        console.log(`维持现有会话ID: ${existingSessionID}`);
      }
      return existingSessionID;
    }
    
    // 使用优先级最高的有效会话ID
    for (const source of possibleSources) {
      const sessionId = source.value;
      if (sessionId && /^[a-zA-Z0-9\-_]{10,}$/.test(sessionId)) {
        // 只在重要请求中打印详细日志
        if (isImportantRequest) {
          console.log(`使用${source.name}提供的会话ID: ${sessionId}`);
        }
        
        // 同步到响应头，确保客户端能识别服务器使用的会话ID
        if (req.res) {
          req.res.setHeader('X-Session-ID', sessionId);
          req.res.setHeader('X-Original-Session-ID', sessionId);
          req.res.setHeader('X-Session-Source', source.name);
          
          // 设置会话cookie，确保客户端端浏览器保留它
          req.res.cookie('sessionId', sessionId, { 
            path: '/',
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30天
            httpOnly: false // 允许客户端JS读取
          });
          
          req.res.cookie('warehouse.sid', sessionId, {
            path: '/',
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30天
            httpOnly: true
          });
        }
        
        return sessionId;
      }
    }
    
    // 如果没有找到有效会话ID，返回会话中间件分配的ID（如果有）
    // 这样可以避免每次都生成新ID
    if (req.sessionID && req.sessionID.length >= 10) {
      if (isImportantRequest) {
        console.log(`使用会话中间件分配的ID: ${req.sessionID}`);
      }
      
      if (req.res) {
        req.res.setHeader('X-Session-ID', req.sessionID);
        req.res.setHeader('X-Original-Session-ID', req.sessionID);
      }
      
      return req.sessionID;
    }
    
    // 尝试从SessionStorage获取会话ID (存储在内存中，避免频繁生成)
    // 通过这种方式为每个"已知"的请求重用会话ID
    const sessionStorageKey = `req-session-${req.path}`;
    const prevSessionId = global.sessionStorage?.[sessionStorageKey];
    
    if (prevSessionId && prevSessionId.length >= 10) {
      if (isImportantRequest) {
        console.log(`为路径 ${req.path} 重用之前的会话ID: ${prevSessionId}`);
      }
      
      // 同步到响应头
      if (req.res) {
        req.res.setHeader('X-Session-ID', prevSessionId);
        req.res.setHeader('X-Original-Session-ID', prevSessionId);
      }
      
      return prevSessionId;
    }
    
    // 最后才生成新的会话ID（通常应该不会走到这一步）
    const newSessionId = crypto.randomBytes(16).toString('hex');
    
    // 如果是重要请求，记录详细信息
    if (isImportantRequest) {
      console.log(`为路径 ${req.path} 创建新会话ID: ${newSessionId}，未找到任何有效会话ID`);
    }
    
    // 将新的会话ID存储在SessionStorage中，避免频繁生成
    if (!global.sessionStorage) {
      global.sessionStorage = {};
    }
    global.sessionStorage[sessionStorageKey] = newSessionId;
    
    // 同步到响应头
    if (req.res) {
      req.res.setHeader('X-Session-ID', newSessionId);
      req.res.setHeader('X-Original-Session-ID', newSessionId);
      req.res.setHeader('X-New-Session-ID', newSessionId);  // 标记这是新创建的会话ID
    }
    
    return newSessionId;
  },
  store: new MemoryStore({
    checkPeriod: 86400000, // 每24小时清理过期会话
    ttl: 30 * 24 * 60 * 60 * 1000, // 30天的会话生命周期 (延长至30天)
    stale: false // 不使用过期会话
  })
}));

// 使用专用的会话同步中间件替代简化版本
// 提供更完整的跨域支持和会话管理功能
app.use(sessionSyncMiddleware);

// 保留会话活动监控和调试日志
app.use((req, res, next) => {
  // 更新会话活动时间，如果会话存在
  if (req.session) {
    req.session.lastActivity = Date.now();
  }
  
  // 记录请求路径和会话ID，便于调试
  if (req.path.includes('/api/auth/')) {
    console.log(`请求路径: ${req.path}, 会话ID: ${req.sessionID}, 已认证: ${!!req.session?.userId}`);
  }
  
  // 会话调试日志（保留但简化）
  if (process.env.NODE_ENV !== 'production') {
    const sessionInfo = {
      id: req.sessionID,
      userId: req.session?.userId,
      socialBound: req.session?.socialBound,
      isAuthenticated: !!req.session?.userId
    };
    console.log(`[会话调试] 路径: ${req.path}, 会话信息:`, JSON.stringify(sessionInfo, null, 2));
  }
  
  next();
});

// API响应捕获和日志记录中间件
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// 导入用户ID管理模块
import { initializeUserIDTable } from './database/userID';

(async () => {
  // 初始化文件清理调度器，每24小时清理一次过期文件
  scheduleCleanup();
  
  // 首先确保已经初始化了内存存储
  // 使用已导入的memStorage，不能在异步函数中使用import语句
  memStorage.initializeDemoData();
  
  // 数据库已经通过db.ts初始化 - 但这个过程是异步的，需要进行检查
  log('验证数据库连接状态', 'mysql');
  
  // 给db.ts中的连接测试留出足够时间，等待更长时间
  await new Promise(resolve => setTimeout(resolve, 5000)); // 增加到5秒
  
  // 验证数据库连接池状态
  let dbConnectionStatus = false;
  try {
    log('尝试数据库测试连接...', 'mysql');
    const testConn = await db.execute('SELECT 1 AS test');
    
    // 安全地访问可能的嵌套结构
    const hasValidResponse = testConn && 
      Array.isArray(testConn) && 
      testConn.length > 0 && 
      Array.isArray(testConn[0]) && 
      testConn[0].length > 0 && 
      typeof testConn[0][0] === 'object' && 
      testConn[0][0] !== null && 
      'test' in testConn[0][0] && 
      testConn[0][0].test === 1;
      
    if (hasValidResponse) {
      log('数据库连接测试成功', 'mysql');
      dbConnectionStatus = true;
    } else {
      log('数据库连接测试失败: 无法获取有效响应，将使用内存存储模式', 'mysql-error');
    }
  } catch (e) {
    log(`数据库连接测试失败: ${e}`, 'mysql-error');
  }
  
  // 初始化内部用户ID表（创建并设置定期清理任务）
  if (dbConnectionStatus) {
    try {
      await initializeUserIDTable();
      log('内部用户ID表初始化成功，有效期为2天', 'mysql');
    } catch (error) {
      console.error('初始化内部用户ID表失败:', error);
      // 继续启动服务器，即使ID表初始化失败
    }
  } else {
    log('跳过用户ID表初始化，因为数据库连接不可用', 'mysql-warning');
  }
  
  // 即使没有数据库连接，也继续启动服务器 - 确保应用的高可用性
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    // 不再抛出错误，只记录错误信息
    console.error('[Error]', err.stack || err);
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0", 
    reusePort: true,
    cors: true
  }, () => {
    log(`serving on port ${port}`);
  });
})();
