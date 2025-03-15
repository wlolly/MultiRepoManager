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
    // 记录详细的调试信息
    const isAuthRequest = req.path.includes('/api/auth/');
    if (isAuthRequest || req.path === '/api/auth/current-user') {
      console.log(`[调试] 请求路径: ${req.path}, 所有标头:`, JSON.stringify(req.headers, null, 2));
      console.log(`[调试] 请求路径: ${req.path}, 所有查询参数:`, JSON.stringify(req.query, null, 2));
      console.log(`[调试] 请求路径: ${req.path}, 所有cookie:`, req.cookies ? JSON.stringify(req.cookies, null, 2) : 'undefined');
    }
    
    // 1. 从HTTP头检查会话ID (优先级最高)
    const headerVariations = [
      'x-session-id',
      'X-Session-ID', 
      'x-client-session-id',
      'X-Client-Session-ID',
      'sessionid',
      'SessionId',
      'session-id',
      'client-session-id'
    ];
    
    let clientSessionId = null;
    let sourceType = '';
    
    // 优先处理常见的会话ID标头
    const headers = req.headers || {};
    
    // 直接检查特定的头，这些是客户端最可能使用的
    if (headers['x-client-session-id']) {
      clientSessionId = extractCleanSessionId(headers['x-client-session-id']);
      if (clientSessionId) {
        sourceType = '头部(x-client-session-id)';
      }
    } 
    
    if (!clientSessionId && headers['x-session-id']) {
      clientSessionId = extractCleanSessionId(headers['x-session-id']);
      if (clientSessionId) {
        sourceType = '头部(x-session-id)';
      }
    }
    
    // 检查所有可能的标准头名称（不区分大小写）
    if (!clientSessionId) {
      for (const header of headerVariations) {
        // 获取实际头名（可能有大小写差异）
        const headerValue = headers[header] || headers[header.toLowerCase()] || headers[header.toUpperCase()];
        
        if (headerValue) {
          clientSessionId = extractCleanSessionId(headerValue);
          if (clientSessionId) {
            sourceType = `头部(${header})`;
            break;
          }
        }
      }
    }
    
    // 如果上面的特定头没有找到，尝试所有可能的头名称
    if (!clientSessionId) {
      for (const headerName of headerVariations) {
        const headerValue = headers[headerName];
        if (headerValue) {
          const id = extractCleanSessionId(headerValue);
          if (id) {
            clientSessionId = id;
            sourceType = `头部(${headerName})`;
            break;
          }
        }
      }
    }
    
    // 辅助函数：提取和清理会话ID，确保格式正确
    function extractCleanSessionId(value: string | string[] | undefined): string | null {
      if (!value) return null;
      
      let id = value;
      // 处理数组
      if (Array.isArray(id)) {
        id = id[0];
      }
      
      // 处理逗号分隔 (可能存在多个ID情况)
      if (typeof id === 'string' && id.includes(',')) {
        id = id.split(',')[0].trim();
      }
      
      // 验证格式 - 必须是16个以上的十六进制字符
      if (typeof id === 'string' && id.length >= 16 && /^[a-f0-9]+$/i.test(id)) {
        return id;
      }
      
      return null;
    }
    
    // 2. 如果头中没有找到，检查查询参数
    if (!clientSessionId) {
      const queryVariations = ['sessionId', 'sessionid', 'session_id', 'sid'];
      
      for (const paramName of queryVariations) {
        const paramValue = req.query[paramName];
        if (paramValue && typeof paramValue === 'string') {
          const id = extractCleanSessionId(paramValue);
          if (id) {
            clientSessionId = id;
            sourceType = `查询参数(${paramName})`;
            break;
          }
        }
      }
    }
    
    // 3. 如果查询参数中没有找到，检查cookies
    if (!clientSessionId && req.cookies) {
      const cookieVariations = ['sessionId', 'warehouse.sid', 'connect.sid', 'sid'];
      
      for (const cookieName of cookieVariations) {
        const cookieValue = req.cookies[cookieName];
        if (cookieValue && typeof cookieValue === 'string') {
          // 处理express-session签名cookie
          let cleanCookieId = cookieValue;
          if (cleanCookieId.includes('.')) {
            cleanCookieId = cleanCookieId.split('.')[0];
          }
          if (cleanCookieId.startsWith('s%3A')) {
            cleanCookieId = cleanCookieId.substring(4);
          }
          
          const id = extractCleanSessionId(cleanCookieId);
          if (id) {
            clientSessionId = id;
            sourceType = `Cookie(${cookieName})`;
            break;
          }
        }
      }
    }
    
    // 如果发现有效的客户端会话ID，使用它
    if (clientSessionId) {
      if (isAuthRequest || req.path === '/api/auth/current-user') {
        console.log(`[会话追踪] 路径: ${req.path}，使用客户端提供的会话ID: ${clientSessionId}，来源: ${sourceType}`);
      }
      
      // 主动覆盖会话ID，确保后续处理都使用这个ID
      if (req) {
        // 直接修改请求对象的会话ID
        (req as any).sessionID = clientSessionId;
        
        // 保存到请求会话选项中，确保是否save操作都使用正确的ID
        if (req.sessionOptions) {
          req.sessionOptions.genid = () => clientSessionId;
        }
        
        // 如果存在响应对象，在响应头中设置会话信息
        if (req.res) {
          req.res.setHeader('X-Original-Session-ID', clientSessionId);
          req.res.setHeader('X-Session-ID', clientSessionId);
          req.res.setHeader('X-Client-Session-ID', clientSessionId);
        }
      }
      
      return clientSessionId;
    }
    
    // 如果请求路径是认证相关API，生成新会话时记录更详细的日志
    if (isAuthRequest || req.path === '/api/auth/current-user') {
      console.log(`请求路径: ${req.path}，未找到客户端会话ID，生成新的会话ID`);
    }
    
    // 否则生成一个新的会话ID
    const newSessionId = crypto.randomBytes(16).toString('hex');
    console.log(`生成新会话ID: ${newSessionId}`);
    
    // 在响应头中添加新生成的会话ID，帮助客户端同步
    if (req.res) {
      req.res.setHeader('X-New-Session-ID', newSessionId);
      req.res.setHeader('X-Original-Session-ID', newSessionId);
      req.res.setHeader('X-Session-ID', newSessionId);
      req.res.setHeader('X-Client-Session-ID', newSessionId);
    }
    
    return newSessionId;
  },
  store: new MemoryStore({
    checkPeriod: 86400000, // 每24小时清理过期会话
    ttl: 30 * 24 * 60 * 60 * 1000, // 30天的会话生命周期 (延长至30天)
    stale: false // 不使用过期会话
  })
}));

// 添加会话活动时间跟踪中间件
// 注意：主要的会话ID恢复逻辑已移至 auth.ts 中的 verifySession 函数
app.use((req, res, next) => {
  // 1. 从HTTP头检查会话ID (优先级最高)
  const headerVariations = [
    'x-session-id',
    'X-Session-ID', 
    'x-client-session-id',
    'X-Client-Session-ID',
    'sessionid',
    'SessionId',
    'session-id',
    'client-session-id'
  ];
  
  let headerSessionId = null;
  
  // 检查所有可能的头名称
  for (const headerName of headerVariations) {
    const headerValue = req.headers[headerName];
    if (headerValue) {
      let id = headerValue;
      // 处理数组
      if (Array.isArray(id)) {
        id = id[0];
      }
      
      // 处理逗号分隔 (可能存在多个ID情况)
      if (typeof id === 'string' && id.includes(',')) {
        id = id.split(',')[0].trim();
      }
      
      if (typeof id === 'string' && id.length >= 16) {
        headerSessionId = id;
        break;
      }
    }
  }
  
  // 2. 如果头中没有找到，检查查询参数
  if (!headerSessionId) {
    const queryVariations = ['sessionId', 'sessionid', 'session_id', 'sid'];
    
    for (const paramName of queryVariations) {
      const paramValue = req.query[paramName];
      if (paramValue && typeof paramValue === 'string' && paramValue.length >= 16) {
        headerSessionId = paramValue;
        break;
      }
    }
  }
  
  // 如果发现有效的客户端会话ID，且与当前会话ID不同，尝试同步它
  if (headerSessionId && typeof headerSessionId === 'string') {
    // 处理可能的重复会话ID (如果包含逗号，取第一个)
    const cleanHeaderId = headerSessionId.includes(',') 
      ? headerSessionId.split(',')[0].trim() 
      : headerSessionId;
      
    if (cleanHeaderId.length >= 16 && req.sessionID !== cleanHeaderId) {
      console.log(`在中间件中发现客户端会话ID: ${cleanHeaderId}，当前会话ID: ${req.sessionID || '无'}`);
      
      // 添加到响应头，让客户端知道我们收到了它的会话ID
      res.setHeader('X-Client-Session-ID', cleanHeaderId);
      
      // 关键修改：设置请求的sessionID为客户端提供的ID
      // 这确保后续的会话处理会使用客户端提供的会话ID
      (req as any).sessionID = cleanHeaderId;
      
      // 尝试从会话存储中获取与客户端会话ID关联的会话
      if (req.sessionStore) {
        (req.sessionStore as any).get(cleanHeaderId, (err: Error, clientSession: any) => {
          if (err) {
            console.error('获取客户端会话时出错:', err);
            return;
          }
          
          // 如果找到了有效的客户端会话，并且包含用户信息
          if (clientSession && clientSession.userId) {
            console.log(`找到有效的客户端会话，包含用户ID ${clientSession.userId}，正在恢复...`);
            
            // 合并会话数据
            if (req.session) {
              Object.assign(req.session, {
                userId: clientSession.userId,
                userRole: clientSession.userRole,
                authenticated: true,
                socialBound: clientSession.socialBound,
                lastActivity: Date.now()
              });
              
              // 保存会话
              req.session.save((saveErr) => {
                if (saveErr) {
                  console.error('保存同步的会话时出错:', saveErr);
                } else {
                  console.log(`成功将客户端会话ID ${cleanHeaderId} 与服务器会话同步`);
                }
              });
            }
          } else {
            console.log(`未找到客户端会话 ${cleanHeaderId} 或会话不包含用户信息`);
          }
        });
      }
    }
  }
    
  // 更新会话活动时间
  if (req.session) {
    req.session.lastActivity = Date.now();
  }
  
  // 始终将当前会话ID添加到响应头，确保客户端能够同步
  res.setHeader('X-Original-Session-ID', req.sessionID || '');
  res.setHeader('X-Session-ID', req.sessionID || '');  // 添加一个常用的响应头名
  
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
