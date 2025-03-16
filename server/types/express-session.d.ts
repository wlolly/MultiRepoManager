import 'express-session';

declare module 'express-session' {
  interface SessionData {
    userId?: number;
    socialBound?: boolean;
    userRole?: string;
    authenticated?: boolean;
    returnTo?: string;
    lastActivity?: number;
    internalUserId?: string;
    originalSessionID?: string;
    realAuthenticated?: boolean;
    testUser?: boolean;
    fakePositive?: boolean;
    
    // 会话同步中间件新增字段
    clientOrigin?: boolean;
    sessionSource?: string;
    lastSync?: string;
  }
}