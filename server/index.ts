import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { scheduleCleanup } from "./utils/file-cleanup";
import session from "express-session";
import { db, memStorage, useFallbackStorage } from "./db"; // 导入需要的组件
import createMemoryStore from "memorystore";
import crypto from "crypto";
import { sessionSyncMiddleware } from './middleware/session-sync';
import passport from 'passport';
import { configurePassport } from './passport-local';
import { sql } from 'drizzle-orm';
import { configureSession } from './middleware/session';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// 添加标准中间件
console.log("初始化Express应用中间件...");

// 配置会话 - 使用从middleware/session导入的专业配置
// 这将使用PostgreSQL保存会话数据，确保持久性
configureSession(app);

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
    
    // 使用正确的SQL查询方式 - 使用sql模板字符串
    // 这个sql对象是从最上面导入的，不需要使用require
    const testConn = await db.execute(sql`SELECT 1 AS test`);
    
    console.log('数据库测试响应:', JSON.stringify(testConn));
    
    // 安全地访问可能的嵌套结构 - 适配drizzle返回结果格式
    const hasValidResponse = testConn && 
      Array.isArray(testConn) && 
      testConn.length > 0;
      
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

  // 检查是否是仅 API 模式，或者是正常模式
  const apiOnlyMode = process.env.API_ONLY_MODE === 'true';
  
  if (apiOnlyMode) {
    // 在仅 API 模式下，不启动 Vite 前端开发服务器
    log('运行在仅 API 模式，不启动前端开发服务器', 'server');
  } 
  // 在非 API 模式下，正常设置 Vite
  else if (app.get("env") === "development") {
    // 在开发环境下设置 Vite
    log('运行在开发模式，启动前端开发服务器', 'server');
    await setupVite(app, server);
  } else {
    // 在生产环境下提供静态文件
    log('运行在生产模式，提供静态文件', 'server');
    serveStatic(app);
  }

  // 从环境变量读取端口，如果未设置，则默认使用 5000
  // 这样前端和后端开发服务器可以使用不同的端口
  const port = process.env.PORT ? parseInt(process.env.PORT) : 5000;
  
  // 使用简化的监听方式，避免 ENOTSUP 错误
  try {
    server.listen(port, () => {
      log(`服务器启动成功，监听端口 ${port}`);
    });
  } catch (error) {
    console.error('服务器启动失败:', error);
    
    // 尝试备用启动方式
    try {
      server.listen(port, '127.0.0.1', () => {
        log(`服务器启动成功 (备用模式)，监听端口 ${port}`);
      });
    } catch (fallbackError) {
      console.error('备用服务器启动也失败:', fallbackError);
    }
  }
})();
