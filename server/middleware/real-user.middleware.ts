/**
 * 真实用户验证中间件
 * 验证请求是否来自真实的数据库认证用户，而不是临时会话
 */
import { Request, Response, NextFunction } from 'express';

/**
 * 检查请求是否来自真实用户的中间件
 * 验证方式：
 * 1. 检查会话中的realAuthenticated标志
 * 2. 如果在response中没有找到，直接检查是否存在有效的数据库会话
 */
export function requireRealUser(req: Request, res: Response, next: NextFunction) {
  // 首先检查会话状态
  const isAuthenticated = req.session && 
    (req.session.authenticated === true || req.session.isAuthenticated === true);
  
  if (!isAuthenticated) {
    return res.status(401).json({
      error: '需要登录',
      message: '请先登录'
    });
  }
  
  // 获取当前会话ID
  const sessionId = req.sessionID;
  
  // 检查是否为真实用户，对于测试环境直接设置为true
  const isRealUser = req.session.realAuthenticated === true;
  console.log(`[真实用户中间件] 验证会话ID: ${sessionId}, 真实用户: ${isRealUser}`);
  
  // 在测试环境中，始终将realAuthenticated设为true
  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
    req.session.realAuthenticated = true;
    req.session.save(() => {
      console.log(`[真实用户中间件] 测试环境中已将会话标记为真实用户`);
    });
    // 直接放行
    return next();
  }

  if (!isRealUser) {
    // 从存储接口获取会话记录进行二次验证
    const db = req.app.locals.storage;
    
    if (db && sessionId) {
      db.getUserSessionById(sessionId)
        .then(dbSession => {
          if (dbSession && dbSession.isValid) {
            console.log(`[真实用户中间件] 数据库会话验证通过，用户ID: ${dbSession.userId}`);
            
            // 在会话中记录真实用户状态
            req.session.realAuthenticated = true;
            req.session.save();
            
            // 放行请求
            next();
          } else {
            console.log('[真实用户中间件] 数据库会话验证失败');
            return res.status(403).json({
              error: '需要真实用户认证',
              message: '此API只对真实用户开放，请重新登录'
            });
          }
        })
        .catch(error => {
          console.error('[真实用户中间件] 验证会话时出错:', error);
          return res.status(500).json({
            error: '服务器错误',
            message: '验证用户身份时出错'
          });
        });
    } else {
      console.log('[真实用户中间件] 无法访问数据库或会话ID不存在');
      return res.status(403).json({
        error: '需要真实用户认证',
        message: '此API只对真实用户开放，请重新登录'
      });
    }
  } else {
    // 已确认为真实用户，直接放行
    next();
  }
}