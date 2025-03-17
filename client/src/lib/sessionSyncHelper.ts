/**
 * 会话同步辅助工具
 * 提供统一的会话ID获取和设置方法，确保前后端会话一致性
 */

import { 
  loadSessionId, 
  saveSessionId as saveSessionToStorage
} from './sessionManager';

// 客户端会话存储键
const SESSION_ID_KEY = 'sessionId';
// 附加到所有请求头部的会话头部
const SESSION_HEADER = 'X-Session-ID';
// 附加到所有请求头部的会话来源标记
const SESSION_SOURCE_HEADER = 'X-Session-Source';
// 会话来源标记 - 客户端
const CLIENT_SOURCE = 'client_session';

/**
 * 生成随机会话ID
 * @returns 新生成的会话ID
 */
export function generateSessionId(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * 保存会话ID
 * @param sessionId 要保存的会话ID
 */
export function saveSessionId(sessionId: string): void {
  if (!sessionId) return;
  
  try {
    saveSessionToStorage(sessionId);
    
    // 触发会话状态更新事件
    const timestamp = new Date().toISOString();
    
    // 发布会话状态更新事件
    window.dispatchEvent(new CustomEvent('session-state-update', {
      detail: {
        current: sessionId,
        previous: 'unknown',
        timestamp,
        authStatus: 'logged_in'
      }
    }));
  } catch (e) {
    console.error('保存会话ID时出错:', e);
  }
}

/**
 * 获取会话ID函数
 */
export function getSessionId(): string {
  let sessionId = loadSessionId();
  if (!sessionId) {
    sessionId = generateSessionId();
    saveSessionId(sessionId);
  }
  return sessionId;
}

/**
 * 从document.cookie中获取会话ID
 * @returns 从cookie中获取的会话ID，如果不存在则返回null
 */
export function getSessionIdFromCookie(): string | null {
  const cookies = document.cookie.split('; ');
  for (const cookie of cookies) {
    const [name, value] = cookie.split('=');
    if (name === SESSION_ID_KEY) {
      return value;
    }
  }
  return null;
}

/**
 * 添加会话ID到Fetch请求头
 * @param headers 原始请求头对象
 * @returns 添加会话ID后的请求头对象
 */
export function addSessionHeaders(headers: Record<string, string> = {}): Record<string, string> {
  const headersObj = typeof headers === 'object' ? {...headers} : {};
  
  const sessionId = getSessionId();
  
  return {
    ...headersObj,
    [SESSION_HEADER]: sessionId,
    [SESSION_SOURCE_HEADER]: CLIENT_SOURCE,
  };
}

/**
 * 封装原生fetch方法，确保所有请求包含会话ID
 * @param url 请求URL
 * @param options 请求选项
 * @returns fetch响应
 */
export function fetchWithSession(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = addSessionHeaders(options.headers as Record<string, string> || {});
  return fetch(url, {
    ...options,
    headers,
    credentials: 'include', // 确保包含cookie
  });
}

/**
 * 检查服务器返回的响应中是否包含新的会话ID，如果有则更新本地存储
 * @param response fetch响应对象
 * @returns 原始响应对象
 */
export async function checkAndUpdateSessionFromResponse(response: Response): Promise<Response> {
  const newSessionId = response.headers.get('X-New-Session-ID');
  if (newSessionId) {
    console.log(`服务器返回新会话ID: ${newSessionId}，更新本地存储`);
    saveSessionId(newSessionId);
  }
  return response;
}

/**
 * 初始化会话同步
 * 如果localStorage中存在会话ID但cookie中不存在，则向服务器发送请求以同步会话
 */
export async function initializeSessionSync(): Promise<void> {
  const localSessionId = getSessionId();
  const cookieSessionId = getSessionIdFromCookie();
  
  // 始终尝试同步会话，确保前后端会话一致
  console.log(`会话同步：本地会话ID (${localSessionId}), Cookie会话ID (${cookieSessionId || 'null'})`);
  
  try {
    // 发送请求同步会话，使用会话ID作为URL参数，确保服务器能接收到
    const response = await fetch(`/api/sync-session?sessionId=${localSessionId}`, {
      method: 'GET',
      headers: {
        ...addSessionHeaders(),
        'Content-Type': 'application/json',
        'X-Requested-With': 'SessionSync'
      },
      credentials: 'include',
    });
    
    if (response.ok) {
      // 检查响应头中是否有新的会话ID
      const newSessionId = response.headers.get('X-New-Session-ID');
      const syncStatus = response.headers.get('X-Session-Synchronized');
      
      console.log('会话同步响应:', {
        status: response.status,
        newSessionId: newSessionId || '未返回新ID',
        synchronized: syncStatus || '未返回同步状态'
      });
      
      if (newSessionId && newSessionId !== localSessionId) {
        // 如果服务器返回了不同的会话ID，更新本地存储
        console.log(`服务器返回新会话ID: ${newSessionId}，更新本地存储`);
        saveSessionId(newSessionId);
      }
      
      // 从响应中获取会话状态
      try {
        const responseData = await response.json();
        console.log('会话同步成功:', responseData);
        
        // 在会话状态有变化时触发事件
        window.dispatchEvent(new CustomEvent('session-sync-complete', {
          detail: {
            success: true,
            sessionId: newSessionId || localSessionId,
            message: responseData.message
          }
        }));
      } catch (jsonError) {
        console.warn('解析会话同步响应失败:', jsonError);
      }
    } else {
      console.warn('会话同步失败:', response.status, response.statusText);
      
      // 触发同步失败事件
      window.dispatchEvent(new CustomEvent('session-sync-complete', {
        detail: {
          success: false,
          sessionId: localSessionId,
          error: `${response.status}: ${response.statusText}`
        }
      }));
    }
  } catch (error) {
    console.error('会话同步请求出错:', error);
    
    // 触发同步失败事件
    window.dispatchEvent(new CustomEvent('session-sync-complete', {
      detail: {
        success: false,
        sessionId: localSessionId,
        error: error instanceof Error ? error.message : '未知错误'
      }
    }));
  }
}

/**
 * 监听导航事件，确保SPA路由切换也会保持会话一致性
 */
export function setupSessionSyncListeners(): void {
  // 监听页面加载完成事件
  window.addEventListener('load', () => {
    initializeSessionSync();
  });
  
  // 监听会话状态变化事件
  window.addEventListener('session-state-update', (event: any) => {
    console.log('会话状态已更新:', event.detail);
  });
}

// 自动设置会话同步监听器
setupSessionSyncListeners();

/**
 * 附加会话信息到请求URL和头部
 * 用于替代原有的attachSessionToRequest函数，保持与旧代码兼容性
 * @param url 原始请求URL
 * @param headers 原始请求头
 * @returns 包含处理后URL和头部的对象
 */
export function attachSessionToRequest(url: string, headers: Record<string, string> = {}): {
  url: string;
  headers: Record<string, string>;
} {
  // 获取当前会话ID
  const sessionId = getSessionId();
  
  // 创建URL对象
  const urlObj = new URL(url, window.location.origin);
  
  // 添加会话ID到请求头
  const enhancedHeaders = addSessionHeaders(headers);
  
  return {
    url: urlObj.toString(),
    headers: enhancedHeaders
  };
}

// 导出默认对象
export default {
  getSessionId,
  saveSessionId,
  addSessionHeaders,
  fetchWithSession,
  checkAndUpdateSessionFromResponse,
  initializeSessionSync,
  attachSessionToRequest,
};