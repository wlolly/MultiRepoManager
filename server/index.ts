import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { scheduleCleanup } from "./utils/file-cleanup";
import session from "express-session";
import { db } from "./db"; // 直接导入db，不使用createConnection
import createMemoryStore from "memorystore";
import crypto from "crypto";

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
    // 当请求头中包含客户端已知的会话ID时，优先使用该ID
    const clientSessionId = req.headers['x-client-session-id'];
    if (clientSessionId && typeof clientSessionId === 'string' && 
        /^[a-zA-Z0-9\-_]{20,}$/.test(clientSessionId)) {
      console.log(`使用客户端提供的会话ID: ${clientSessionId}`);
      
      // 同步到响应头
      if (req.res) {
        req.res.setHeader('X-Session-ID', clientSessionId);
        req.res.setHeader('X-Original-Session-ID', clientSessionId);
      }
      
      return clientSessionId;
    }
    
    // 已经有会话ID的情况下，保持该ID不变
    if (req.sessionID && /^[a-zA-Z0-9\-_]{20,}$/.test(req.sessionID)) {
      if (req.res) {
        req.res.setHeader('X-Session-ID', req.sessionID);
        req.res.setHeader('X-Original-Session-ID', req.sessionID);
      }
      return req.sessionID;
    }
    
    // 从cookie中提取会话ID
    if (req.cookies && req.cookies['warehouse.sid']) {
      let cookieId = req.cookies['warehouse.sid'];
      
      // 处理签名cookie
      if (cookieId.startsWith('s%3A')) {
        cookieId = cookieId.substring(4);
      }
      
      // 如果cookie包含点号(.)，取第一部分(签名前的原始ID)
      if (cookieId.includes('.')) {
        cookieId = cookieId.split('.')[0];
      }
      
      if (/^[a-zA-Z0-9\-_]{20,}$/.test(cookieId)) {
        console.log(`从cookie中恢复会话ID: ${cookieId}`);
        
        // 同步到响应头
        if (req.res) {
          req.res.setHeader('X-Session-ID', cookieId);
          req.res.setHeader('X-Original-Session-ID', cookieId);
        }
        
        return cookieId;
      }
    }
    
    // 从其他请求头中寻找会话ID
    const headerNames = ['x-session-id', 'x-original-session-id'];
    for (const name of headerNames) {
      const headerValue = req.headers[name];
      if (headerValue && typeof headerValue === 'string' && 
          /^[a-zA-Z0-9\-_]{20,}$/.test(headerValue)) {
        console.log(`从请求头(${name})中恢复会话ID: ${headerValue}`);
        
        // 同步到响应头
        if (req.res) {
          req.res.setHeader('X-Session-ID', headerValue);
          req.res.setHeader('X-Original-Session-ID', headerValue);
        }
        
        return headerValue;
      }
    }
    
    // 生成新的会话ID
    const newSessionId = crypto.randomBytes(16).toString('hex');
    
    // 如果是登录或认证相关请求，记录详细信息
    const isAuthRequest = req.path.includes('/api/auth/');
    if (isAuthRequest) {
      console.log(`认证请求创建新会话ID: ${newSessionId}, 路径: ${req.path}`);
    }
    
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

// 添加简化的会话同步中间件
// 减少复杂性，专注于保持会话ID一致性
app.use((req, res, next) => {
  // 更新会话活动时间，如果会话存在
  if (req.session) {
    req.session.lastActivity = Date.now();
  }
  
  // 确保会话cookie与会话ID一致
  if (req.sessionID) {
    // 设置统一的会话cookie，确保客户端和服务器使用相同的会话ID
    res.cookie('warehouse.sid', req.sessionID, {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30天
      httpOnly: true,
      path: '/'
    });
    
    // 同时设置一个sessionId cookie，用于客户端JavaScript读取
    res.cookie('sessionId', req.sessionID, {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30天
      httpOnly: false, // 允许客户端JavaScript访问
      path: '/'
    });
    
    // 在响应头中添加会话ID，用于客户端可能的同步逻辑
    res.setHeader('X-Session-ID', req.sessionID);
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
  
  // 数据库已经通过db.ts初始化
  log('使用预初始化的数据库连接', 'mysql');
  
  // 初始化内部用户ID表（创建并设置定期清理任务）
  try {
    await initializeUserIDTable();
    log('内部用户ID表初始化成功，有效期为2天', 'mysql');
  } catch (error) {
    console.error('初始化内部用户ID表失败:', error);
    // 继续启动服务器，即使ID表初始化失败
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
