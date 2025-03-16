
import { Request, Response, NextFunction } from 'express';
import { isAuthenticated } from '../auth';

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
