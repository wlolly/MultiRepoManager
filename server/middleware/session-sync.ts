import { Request, Response, NextFunction } from 'express';

export function sessionSyncMiddleware(req: Request, res: Response, next: NextFunction) {
  // 始终在响应头中包含当前会话ID
  res.setHeader('X-Session-ID', req.sessionID);

  // 如果请求带有会话ID,确保使用相同的会话ID
  const clientSessionId = req.headers['x-session-id'] || 
                         req.cookies?.sessionId ||
                         req.cookies?.['warehouse.sid'];

  if (clientSessionId && clientSessionId !== req.sessionID) {
    req.sessionID = clientSessionId;
    console.log(`[会话同步] 使用客户端会话ID: ${clientSessionId}`);
  }

  // 确保cookie中包含正确的会话ID  
  res.cookie('sessionId', req.sessionID, {
    maxAge: 30 * 24 * 60 * 60 * 1000,
    httpOnly: false
  });

  res.cookie('warehouse.sid', req.sessionID, {
    maxAge: 30 * 24 * 60 * 60 * 1000,
    httpOnly: true
  });

  next();
}