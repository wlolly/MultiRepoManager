/**
 * 会话同步路由
 * 处理前后端会话同步，确保会话ID一致性
 */
import { Request, Response, Router } from 'express';

export function createSessionSyncRoutes() {
  const router = Router();

  /**
   * 会话同步接口
   * 允许前端传递会话ID以便后端采用相同的会话标识
   */
  router.get('/sync-session', (req: Request, res: Response) => {
    try {
      // 从查询参数或请求头中获取客户端会话ID
      const clientSessionId = req.query.sessionId as string || 
                              req.headers['x-session-id'] as string;
      
      // 保存会话来源信息
      const sessionSource = req.headers['x-session-source'] || 'query_param';
      
      // 如果提供了客户端会话ID，则同步到服务器会话
      if (clientSessionId) {
        console.log(`[会话同步] 收到客户端会话ID: ${clientSessionId}, 来源: ${sessionSource}`);
        
        // 确保会话对象已初始化
        if (!req.session) {
          req.session = {} as any;
        }
        
        // 保存客户端会话ID到全局存储
        if (global.customSessionStorage && req.ip) {
          global.customSessionStorage[req.ip] = clientSessionId;
        }
        
        // 设置会话ID，并确保会话存储使用此ID
        if (req.sessionID !== clientSessionId) {
          console.log(`[会话同步] 服务器会话ID (${req.sessionID}) 与客户端ID (${clientSessionId}) 不同，进行同步`);
          
          // 记录原始会话ID (如果会话存储支持)
          if (req.session) {
            req.session.originalSessionID = req.sessionID;
          }
          
          // 注意: 这里我们通过设置cookie来同步会话ID
          // 实际的会话ID替换需要在sessionMiddleware中处理
          
          // 设置会话Cookie
          res.cookie('sessionId', clientSessionId, {
            path: '/',
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30天
            httpOnly: false, // 允许客户端JavaScript访问
            sameSite: 'lax'
          });
          
          // 设置会话标记
          req.session.clientOrigin = true;
          req.session.sessionSource = sessionSource as string;
          req.session.lastSync = new Date().toISOString();
        } else {
          console.log(`[会话同步] 会话ID已匹配: ${clientSessionId}`);
        }
        
        // 在响应头中返回会话信息，帮助客户端验证
        res.setHeader('X-Original-Session-ID', req.sessionID);
        res.setHeader('X-New-Session-ID', clientSessionId);
        res.setHeader('X-Session-Synchronized', 'true');
        
        return res.status(200).json({
          success: true,
          message: '会话同步成功',
          sessionId: clientSessionId
        });
      } else {
        console.log('[会话同步] 未提供客户端会话ID，返回当前服务器会话ID');
        
        // 返回当前会话ID
        res.setHeader('X-Session-ID', req.sessionID);
        
        return res.status(200).json({
          success: true,
          message: '返回当前会话ID',
          sessionId: req.sessionID
        });
      }
    } catch (error) {
      console.error('[会话同步] 处理出错:', error);
      return res.status(500).json({
        success: false,
        message: '会话同步失败',
        error: (error as Error).message
      });
    }
  });

  /**
   * 会话状态检查接口
   * 用于诊断会话状态问题
   */
  router.get('/session-status', (req: Request, res: Response) => {
    try {
      const sessionInfo = {
        sessionID: req.sessionID,
        sessionExists: !!req.session,
        isAuthenticated: req.session?.isAuthenticated || req.session?.authenticated,
        userId: req.session?.userId,
        cookies: req.headers.cookie,
        headers: {
          'x-session-id': req.headers['x-session-id'],
          'x-session-source': req.headers['x-session-source']
        },
        ip: req.ip,
        persistentSessionId: global.customSessionStorage?.[req.ip as string]
      };
      
      res.setHeader('X-Session-ID', req.sessionID);
      
      return res.status(200).json({
        success: true,
        sessionInfo
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: '获取会话状态失败',
        error: (error as Error).message
      });
    }
  });

  return router;
}