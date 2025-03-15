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
  secret: process.env.SESSION_SECRET || 'warehouse-management-secret',
  resave: false, // 只在会话被修改时保存
  saveUninitialized: false, // 只保存已初始化的会话，减少无用会话创建
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
    // 尝试从请求头、查询参数或cookie中获取客户端提供的会话ID
    const clientSessionId = 
      req.headers['x-session-id'] || 
      req.query.sessionId || 
      req.cookies?.token;
    
    // 如果客户端提供了会话ID，验证其有效性并返回
    if (clientSessionId && typeof clientSessionId === 'string' && clientSessionId.length >= 32) {
      console.log(`使用客户端提供的会话ID: ${clientSessionId}`);
      return clientSessionId;
    }
    
    // 否则生成一个新的会话ID
    const newSessionId = crypto.randomBytes(16).toString('hex');
    console.log(`生成新会话ID: ${newSessionId}`);
    return newSessionId;
  },
  store: new MemoryStore({
    checkPeriod: 86400000, // 每24小时清理过期会话
    ttl: 30 * 24 * 60 * 60 * 1000, // 30天的会话生命周期 (延长至30天)
    stale: false // 不使用过期会话
  })
}));

// 添加会话活动时间跟踪中间件
// 注意：会话ID恢复逻辑已移至 auth.ts 中的 verifySession 函数
app.use((req, res, next) => {
  // 只更新会话活动时间，不处理会话ID恢复
  // 这样避免与 auth.ts 中的 verifySession 函数冲突
  if (req.session) {
    req.session.lastActivity = Date.now();
  }
  
  // 将会话ID添加到响应头，方便客户端和服务器调试
  res.setHeader('X-Original-Session-ID', req.sessionID || '');
  
  // 会话调试日志
  if (process.env.DEBUG === 'session' || process.env.NODE_ENV !== 'production') {
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

(async () => {
  // 初始化文件清理调度器，每24小时清理一次过期文件
  scheduleCleanup();
  
  // 数据库已经通过db.ts初始化
  log('使用预初始化的数据库连接', 'mysql');
  
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
