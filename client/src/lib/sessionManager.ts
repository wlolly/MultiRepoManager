/**
 * 会话管理器
 * 统一管理客户端会话相关功能
 * 支持会话持久化和多存储层同步
 */

// 存储当前使用的会话ID以便快速访问
let currentSessionId: string | null = null;

// 从各种可能的存储中获取会话ID
export function getSessionId(): string | null {
  // 如果已经有缓存的会话ID，直接返回
  if (currentSessionId) {
    return currentSessionId;
  }

  // 优先级：sessionStorage > localStorage > cookie
  const sessionIdFromSession = sessionStorage.getItem('sessionId');
  const sessionIdFromLocal = localStorage.getItem('sessionId');
  const sessionIdFromCookie = getCookieValue('sessionId');
  
  // 输出调试信息，帮助追踪会话ID来源
  console.log('会话ID来源检查:', {
    sessionStorage: sessionIdFromSession || '无',
    localStorage: sessionIdFromLocal || '无',
    cookie: sessionIdFromCookie || '无'
  });
  
  // 确定最终使用的会话ID
  currentSessionId = sessionIdFromSession || sessionIdFromLocal || sessionIdFromCookie || null;
  
  return currentSessionId;
}

// 保存会话ID到所有可用存储中
export function saveSessionId(sessionId: string) {
  if (!sessionId) return;
  
  try {
    // 比较是否与当前会话ID相同，避免不必要的存储操作
    if (currentSessionId === sessionId) {
      console.log(`会话ID未变化，无需更新: ${sessionId}`);
      return;
    }
    
    console.log(`保存新会话ID (${sessionId}) 到多个存储位置`);
    
    // 更新缓存
    currentSessionId = sessionId;
    
    // 更新存储
    sessionStorage.setItem('sessionId', sessionId);
    localStorage.setItem('sessionId', sessionId);
    
    // 设置为cookie (30天有效期)
    document.cookie = `sessionId=${sessionId}; path=/; max-age=2592000; SameSite=Lax`;
    
    // 触发会话ID更新事件，使其他组件可以响应会话变化
    window.dispatchEvent(new CustomEvent('sessionIdChanged', { detail: { sessionId } }));
  } catch (error) {
    console.error('保存会话ID时出错:', error);
  }
}

// 从响应头中提取会话ID并保存
export function processResponseHeaders(headers: Headers): string | null {
  // 尝试从各种响应头中获取会话ID
  const originalSessionId = headers.get('X-Original-Session-ID');
  const clientSessionId = headers.get('X-Client-Session-ID');
  
  // 追踪所有会话相关响应头
  const headerInfo: Record<string, string> = {};
  headers.forEach((value, key) => {
    if (key.toLowerCase().includes('session') || key.toLowerCase().includes('cookie')) {
      headerInfo[key] = value;
    }
  });
  
  if (Object.keys(headerInfo).length > 0) {
    console.log('响应头中的会话相关信息:', headerInfo);
  }
  
  // 优先使用服务器原始会话ID，这是服务器最认可的会话ID
  if (originalSessionId && originalSessionId !== 'none' && originalSessionId !== '') {
    console.log(`从响应头中提取到原始会话ID: ${originalSessionId}`);
    saveSessionId(originalSessionId);
    return originalSessionId;
  }
  
  // 次优先使用客户端会话ID确认
  if (clientSessionId && clientSessionId !== 'none' && clientSessionId !== '') {
    console.log(`从响应头中提取到客户端会话ID: ${clientSessionId}`);
    saveSessionId(clientSessionId);
    return clientSessionId;
  }
  
  // 尝试从Set-Cookie响应头中提取会话ID
  const setCookieHeader = headers.get('Set-Cookie');
  if (setCookieHeader) {
    // 从Set-Cookie中提取express.sid或connect.sid或warehouse.sid形式的会话ID
    const sidMatch = setCookieHeader.match(/(?:express|connect|warehouse)\.sid=([^;]+)/);
    if (sidMatch && sidMatch[1]) {
      let sessionId = decodeURIComponent(sidMatch[1]);
      // 如果包含.符号，说明是签名cookie，只需第一部分
      if (sessionId.includes('.')) {
        sessionId = sessionId.split('.')[0];
      }
      // 去除s%3A前缀（express签名cookie的特征）
      if (sessionId.startsWith('s%3A')) {
        sessionId = sessionId.substring(4);
      }
      
      console.log(`从Set-Cookie中提取到会话ID: ${sessionId}`);
      saveSessionId(sessionId);
      return sessionId;
    }
  }
  
  return null;
}

// 附加会话ID到API请求
export function attachSessionToRequest(url: string, headers: Record<string, string> = {}): {
  url: string;
  headers: Record<string, string>;
} {
  const sessionId = getSessionId();
  
  if (sessionId) {
    console.log(`附加会话ID ${sessionId} 到请求`);
    
    // 添加到请求头（常用两种格式，增加兼容性）
    headers['X-Session-ID'] = sessionId;
    headers['x-session-id'] = sessionId;
    
    // 同时通过URL参数传递（作为备用方案）
    const separator = url.includes('?') ? '&' : '?';
    url = `${url}${separator}sessionId=${sessionId}`;
  } else {
    console.log('没有找到可用的会话ID，请求将使用新会话');
  }
  
  return { url, headers };
}

// 从cookie中获取值的辅助函数
function getCookieValue(name: string): string | null {
  const cookies = document.cookie.split(';');
  for (let cookie of cookies) {
    const [cookieName, cookieValue] = cookie.trim().split('=');
    if (cookieName === name) {
      return cookieValue;
    }
  }
  return null;
}

// 清除所有会话相关存储
export function clearSession() {
  console.log('清除所有会话存储和用户数据');
  
  // 清除会话ID
  currentSessionId = null;
  sessionStorage.removeItem('sessionId');
  localStorage.removeItem('sessionId');
  document.cookie = 'sessionId=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  
  // 清除用户相关信息
  sessionStorage.removeItem('currentUser');
  localStorage.removeItem('currentUser');
  
  // 清除其他可能的认证相关cookie
  document.cookie = 'warehouse.sid=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  document.cookie = 'connect.sid=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  document.cookie = 'express.sid=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  
  // 触发会话清除事件
  window.dispatchEvent(new Event('sessionCleared'));
}

// 检查会话状态是否有效
export function isSessionActive(): boolean {
  return !!getSessionId();
}

// 创建会话变化监听器
export function addSessionChangeListener(callback: (sessionId: string | null) => void): () => void {
  const handleSessionChange = (event: CustomEvent) => {
    callback(event.detail?.sessionId || null);
  };
  
  const handleSessionCleared = () => {
    callback(null);
  };
  
  // 需要 as any 因为 CustomEvent 类型约束
  window.addEventListener('sessionIdChanged', handleSessionChange as any);
  window.addEventListener('sessionCleared', handleSessionCleared);
  
  // 返回清理函数
  return () => {
    window.removeEventListener('sessionIdChanged', handleSessionChange as any);
    window.removeEventListener('sessionCleared', handleSessionCleared);
  };
}