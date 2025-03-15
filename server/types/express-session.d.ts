import 'express-session';

declare module 'express-session' {
  interface SessionData {
    userId?: number;
    socialBound?: boolean;
    userRole?: string;
    authenticated?: boolean;
    returnTo?: string;
    lastActivity?: number;
  }
}