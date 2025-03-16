import { Request, Response, NextFunction } from 'express';
import { isAuthenticated } from '../auth';
import session from 'express-session';
import { MemoryStore } from 'express-session';


export async function sessionMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    // 添加会话ID到响应头
    res.setHeader('X-Session-ID', req.sessionID);

    // 验证会话
    const authenticated = await isAuthenticated(req);
    if (authenticated) {
      res.setHeader('X-Authenticated', 'true');
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

//This function needs to be added to the app.js or equivalent file where the app is initialized.
export function configureSession(app:any){
    app.use(session({
        name: 'warehouse.sid',
        secret: process.env.SESSION_SECRET || 'warehouse-session-secret-2024',
        resave: true,
        rolling: true,
        saveUninitialized: false,
        cookie: {
          secure: process.env.NODE_ENV === 'production',
          httpOnly: true,
          maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
          sameSite: 'lax'
        },
        store: new MemoryStore({
          checkPeriod: 86400000 // 24 hours
        })
      }));

      // 添加调试中间件
      app.use((req, res, next) => {
        const oldSetHeader = res.setHeader;
        res.setHeader = function(name, value) {
          if(name.toLowerCase() === 'set-cookie') {
            console.log('[会话] 设置Cookie:', value);
          }
          return oldSetHeader.apply(this, arguments);
        };
        next();
      });
}