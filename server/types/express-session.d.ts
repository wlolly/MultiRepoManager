import 'express-session';

declare module 'express-session' {
  interface SessionData {
    userId?: number;
    socialBound?: boolean;
    userRole?: string;
    authenticated?: boolean;
    isAuthenticated?: boolean; // 兼容性字段，与authenticated含义相同
    returnTo?: string;
    lastActivity?: number;
    internalUserId?: string;
    originalSessionID?: string;
    realAuthenticated?: boolean;
    testUser?: boolean;
    fakePositive?: boolean;
    
    // 用户信息字段
    role?: string;
    username?: string;
    language?: string;
    
    // 用户权限标记
    isAdmin?: boolean;           // 用户是否具有管理员权限 (admin/super_admin)
    hasSuperAccess?: boolean;    // 用户是否具有超级管理员权限
    
    // 会话同步中间件新增字段 - 明确类型提高类型安全性
    clientOrigin?: boolean;
    sessionSource?: string;
    lastSync?: string;
    
    // 会话安全信息
    securityLevel?: 'low' | 'medium' | 'high';
    sessionCreatedAt?: number; // 毫秒时间戳
    sessionExpiration?: number; // 毫秒时间戳
    sessionIPAddress?: string;
    sessionUserAgent?: string;
    
    // 用于验证和同步
    validatedAt?: number; // 上次验证时间
    validatedSource?: string; // 验证来源
    
    // 权限相关字段
    pagePermissions?: string[];
    actionPermissions?: string[];
    warehousePermissions?: Record<string, { view: boolean, manage: boolean }>;
    
    // 新版权限结构
    permissions?: {
      pages: string[];
      actions: string[];
      warehouses?: Record<string, { view: boolean, manage: boolean } | { canView: boolean, canManage: boolean }>;
      isAdmin?: boolean;
      isSuperAdmin?: boolean;
    };
  }
}