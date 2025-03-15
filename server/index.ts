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

// 配置 express-session
app.use(session({
  secret: process.env.SESSION_SECRET || 'warehouse-management-secret',
  resave: true, // 确保会话在服务器端保存，解决会话丢失问题
  saveUninitialized: true, // 修改为true，确保所有会话都被保存
  name: 'warehouse.sid', // 自定义会话ID cookie名称 (更简单的名称避免解析问题)
  rolling: true, // 每次响应都重设cookie过期时间
  proxy: true, // 信任反向代理，解决在Replit环境下cookie问题
  genid: function(req) {
    // 使用更短的会话ID，避免cookie溢出
    return crypto.randomBytes(16).toString('hex');
  },
  cookie: { 
    secure: false, // 开发环境不使用secure，避免cookie丢失
    maxAge: 7 * 24 * 60 * 60 * 1000, // 延长到7天，确保测试期间不会过期
    httpOnly: true, // 阻止客户端JS访问cookie
    path: '/',
    sameSite: 'lax', // 防止CSRF攻击的同时允许从外部链接访问
    domain: process.env.DOMAIN || undefined // 自动适应当前域名
  },
  store: new MemoryStore({
    checkPeriod: 86400000, // 每24小时清理过期会话
    ttl: 7 * 24 * 60 * 60 * 1000 // 7天的会话生命周期
  })
}));

// 添加会话活动时间跟踪
app.use((req, res, next) => {
  if (req.session) {
    req.session.lastActivity = Date.now();
    
    // 会话调试日志
    if (process.env.DEBUG === 'session' || process.env.NODE_ENV !== 'production') {
      const sessionInfo = {
        id: req.sessionID,
        userId: req.session.userId,
        socialBound: req.session.socialBound,
        isAuthenticated: !!req.session.userId
      };
      console.log(`[会话调试] 路径: ${req.path}, 会话信息:`, sessionInfo);
    }
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
