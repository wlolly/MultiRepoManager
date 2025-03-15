import 'express-session';

declare module 'express-session' {
  interface SessionData {
    userId?: number;
    socialBound?: boolean;
    returnTo?: string;
    lastActivity?: number;
  }
}