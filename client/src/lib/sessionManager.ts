/**
 * 会话管理器
 * 负责客户端会话状态的管理
 */

// 会话ID存储键
const SESSION_ID_KEY = 'sessionId';

// 加载会话ID
export function loadSessionId(): string | null {
  try {
    // 先检查localStorage（持久存储）
    const localStorageId = localStorage.getItem(SESSION_ID_KEY);
    
    // 再检查sessionStorage（会话存储）
    const sessionStorageId = sessionStorage.getItem(SESSION_ID_KEY);
    
    // 获取Cookie中的会话ID
    const cookieSessionId = document.cookie.split('; ')
      .find(row => row.startsWith(SESSION_ID_KEY + '='))
      ?.split('=')[1];
    
    // 记录各个来源的会话ID以便调试
    console.log('Session ID source check:', {
      'localStorage': localStorageId,
      'sessionStorage': sessionStorageId,
      'sessionCookie': cookieSessionId
    });
    
    // 优先使用localStorage中的ID
    if (localStorageId && sessionStorageId && localStorageId === sessionStorageId) {
      console.log('Loaded session ID from storage (consistent):', localStorageId);
      return localStorageId;
    }
    
    // 如果不一致，以localStorage为准
    if (localStorageId) {
      console.log('Using localStorage session ID:', localStorageId);
      sessionStorage.setItem(SESSION_ID_KEY, localStorageId);
      return localStorageId;
    }
    
    // 如果localStorage没有但sessionStorage有
    if (sessionStorageId) {
      console.log('Using sessionStorage session ID:', sessionStorageId);
      localStorage.setItem(SESSION_ID_KEY, sessionStorageId);
      return sessionStorageId;
    }
    
    // 如果都没有但Cookie有
    if (cookieSessionId) {
      console.log('Using cookie session ID:', cookieSessionId);
      localStorage.setItem(SESSION_ID_KEY, cookieSessionId);
      sessionStorage.setItem(SESSION_ID_KEY, cookieSessionId);
      return cookieSessionId;
    }
    
    // 都没有，返回null
    return null;
  } catch (error) {
    console.error('加载会话ID出错:', error);
    return null;
  }
}

// 保存会话ID
export function saveSessionId(sessionId: string): void {
  try {
    if (!sessionId) return;
    
    localStorage.setItem(SESSION_ID_KEY, sessionId);
    sessionStorage.setItem(SESSION_ID_KEY, sessionId);
    
    // 设置Cookie（用于与服务器会话兼容）
    document.cookie = `${SESSION_ID_KEY}=${sessionId}; max-age=${30 * 24 * 60 * 60}; path=/; samesite=Lax`;
    console.log(`设置Cookie: ${SESSION_ID_KEY}=${sessionId.substring(0, 8)}..., 过期时间: 30天, SameSite=Lax`);
  } catch (error) {
    console.error('保存会话ID出错:', error);
  }
}

// 清除会话ID
export function clearSessionId(): void {
  try {
    localStorage.removeItem(SESSION_ID_KEY);
    sessionStorage.removeItem(SESSION_ID_KEY);
    document.cookie = `${SESSION_ID_KEY}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    console.log('已清除会话ID');
  } catch (error) {
    console.error('清除会话ID出错:', error);
  }
}

// 获取会话存活时长（分钟）
export function getSessionLifetime(sessionId: string): number {
  // 简化版本
  return 0;
}

// 根据响应头更新会话信息
export function updateSessionFromHeaders(headers: Headers, url: string, method: string): string | null {
  // 简化版本
  return null;
}

// 检查请求是否已在处理中
export function isRequestInProgress(url: string): boolean {
  // 简化版本
  return false;
}

// 标记请求开始处理
export function markRequestInProgress(url: string): void {
  // 简化版本
}

// 标记请求处理完成
export function markRequestCompleted(url: string): void {
  // 简化版本
}