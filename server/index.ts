import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { scheduleCleanup } from "./utils/file-cleanup";
import session from "express-session";
import { db, memStorage, useFallbackStorage } from "./db";
import createMemoryStore from "memorystore";
import crypto from "crypto";
import passport from 'passport';
import { configurePassport } from './passport-local';
import { sql } from 'drizzle-orm';
import { configureSession } from './middleware/session';
import { cleanupAuthRecords } from './auth';
import { permissionRefreshMiddleware, setupPermissionCacheCleanup } from './middleware/permission-refresh-middleware';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// 添加标准中间件
console.log("[系统] 初始化Express应用中间件...");

// 配置会话 - 使用PostgreSQL保存会话数据
configureSession(app);

// 添加权限刷新中间件 - 在每个请求上自动检查并刷新权限
app.use(permissionRefreshMiddleware);

// 初始化权限缓存清理任务
setupPermissionCacheCleanup();

// 简单的请求日志中间件
app.use((req, res, next) => {
  // 仅记录关键API路径
  if (req.path.includes('/api/auth/')) {
    console.log(`[请求] ${req.path}, 会话ID: ${req.sessionID}`);
  }
  
  // 简化的会话信息记录
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[会话] 路径: ${req.path}, ID: ${req.sessionID}`);
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
  
  // 设置定期清理过期验证记录和会话的调度器
  // 每4小时运行一次
  const AUTH_CLEANUP_INTERVAL = 4 * 60 * 60 * 1000; // 4小时，单位毫秒
  setInterval(async () => {
    console.log('[系统] 开始定期清理过期的验证记录和会话');
    try {
      const result = await cleanupAuthRecords(app);
      console.log(`[系统] 清理完成：移除了 ${result.verificationsRemoved} 条验证记录和 ${result.sessionsRemoved} 条会话`);
    } catch (error) {
      console.error('[系统] 清理过程中出错:', error);
    }
  }, AUTH_CLEANUP_INTERVAL);
  
  // 不再需要初始化内存存储的演示数据
  // 系统现在使用PostgreSQL数据库，不使用内存存储
  console.log('[系统] 跳过内存存储初始化，使用PostgreSQL数据库');
  
  // 数据库已经通过db.ts初始化 - 但这个过程是异步的，需要进行检查
  log('验证数据库连接状态', 'postgres');
  
  // 给db.ts中的连接测试留出足够时间，等待更长时间
  await new Promise(resolve => setTimeout(resolve, 5000)); // 增加到5秒
  
  // 验证数据库连接池状态
  let dbConnectionStatus = false;
  try {
    log('尝试数据库测试连接...', 'postgres');
    
    // 使用正确的SQL查询方式 - 使用sql模板字符串
    // 这个sql对象是从最上面导入的，不需要使用require
    const testConn = await db.execute(sql`SELECT 1 AS test`);
    
    console.log('数据库测试响应:', JSON.stringify(testConn));
    
    // 安全地访问可能的嵌套结构 - 适配drizzle返回结果格式
    const hasValidResponse = testConn && 
      Array.isArray(testConn) && 
      testConn.length > 0;
      
    if (hasValidResponse) {
      log('数据库连接测试成功', 'postgres');
      dbConnectionStatus = true;
    } else {
      log('数据库连接测试失败: 无法获取有效响应，将使用内存存储模式', 'postgres-error');
    }
  } catch (e) {
    log(`数据库连接测试失败: ${e}`, 'postgres-error');
  }
  
  // 初始化内部用户ID表（创建并设置定期清理任务）
  if (dbConnectionStatus) {
    try {
      await initializeUserIDTable();
      log('内部用户ID表初始化成功，有效期为2天', 'postgres');
    } catch (error) {
      console.error('初始化内部用户ID表失败:', error);
      // 继续启动服务器，即使ID表初始化失败
    }
  } else {
    log('跳过用户ID表初始化，因为数据库连接不可用', 'postgres-warning');
  }
  
  // 即使没有数据库连接，也继续启动服务器 - 确保应用的高可用性
  const server = await registerRoutes(app);
  
  // 在路由注册完成后，进行初始清理
  // 此时app.locals.storage已经被正确初始化
  if (dbConnectionStatus) {
    // 在服务器启动时执行一次过期验证记录和会话的清理
    log('正在执行初始清理过期验证记录和会话', 'postgres');
    try {
      const result = await cleanupAuthRecords(app);
      log(`初始清理完成：移除了 ${result.verificationsRemoved} 条验证记录和 ${result.sessionsRemoved} 条会话`, 'postgres');
    } catch (cleanupError) {
      console.error('初始验证记录清理失败:', cleanupError);
    }
  }

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
