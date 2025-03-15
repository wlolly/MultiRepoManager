/**
 * 会话管理器
 * 统一管理客户端会话相关功能
 */

// 从各种可能的存储中获取会话ID
export function getSessionId(): string | null {
  // 优先级：sessionStorage > localStorage > cookie
  const sessionIdFromSession = sessionStorage.getItem('sessionId');
  const sessionIdFromLocal = localStorage.getItem('sessionId');
  const sessionIdFromCookie = getCookieValue('sessionId');
  
  console.log('会话ID来源检查:', {
    sessionStorage: sessionIdFromSession || '无',
    localStorage: sessionIdFromLocal || '无',
    cookie: sessionIdFromCookie || '无'
  });
  
  return sessionIdFromSession || sessionIdFromLocal || sessionIdFromCookie || null;
}

// 保存会话ID到所有可用存储中
export function saveSessionId(sessionId: string) {
  if (!sessionId) return;
  
  try {
    console.log(`保存会话ID (${sessionId}) 到多个存储位置`);
    sessionStorage.setItem('sessionId', sessionId);
    localStorage.setItem('sessionId', sessionId);
    
    // 设置为cookie (30天有效期)
    document.cookie = `sessionId=${sessionId}; path=/; max-age=2592000`;
  } catch (error) {
    console.error('保存会话ID时出错:', error);
  }
}

// 从响应头中提取会话ID并保存
export function processResponseHeaders(headers: Headers) {
  const originalSessionId = headers.get('X-Original-Session-ID');
  const clientSessionId = headers.get('X-Client-Session-ID');
  
  // 优先使用服务器原始会话ID，这是服务器最认可的会话ID
  if (originalSessionId && originalSessionId !== 'none') {
    console.log(`从响应头中提取到原始会话ID: ${originalSessionId}`);
    saveSessionId(originalSessionId);
    return originalSessionId;
  }
  
  // 如果服务器没有原始会话ID但确认了我们的客户端会话ID，也保存它
  if (clientSessionId && clientSessionId !== 'none') {
    console.log(`从响应头中提取到客户端会话ID: ${clientSessionId}`);
    saveSessionId(clientSessionId);
    return clientSessionId;
  }
  
  // 尝试从Set-Cookie响应头中提取会话ID
  const setCookieHeader = headers.get('Set-Cookie');
  if (setCookieHeader) {
    // 从Set-Cookie中提取express.sid或connect.sid形式的会话ID
    const sidMatch = setCookieHeader.match(/(?:express|connect)\.sid=([^;]+)/);
    if (sidMatch && sidMatch[1]) {
      const sessionId = decodeURIComponent(sidMatch[1].split('.')[0]);
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
    
    // 添加到请求头 (使用两种格式以提高兼容性)
    headers['X-Session-ID'] = sessionId;
    headers['x-session-id'] = sessionId;
    
    // 同时通过URL参数传递 (备用方法)
    const separator = url.includes('?') ? '&' : '?';
    url = `${url}${separator}sessionId=${sessionId}`;
  } else {
    console.log('没有找到可用的会话ID');
  }
  
  return { url, headers };
}

// 从cookie中获取值
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
  console.log('清除所有会话存储');
  sessionStorage.removeItem('sessionId');
  localStorage.removeItem('sessionId');
  document.cookie = 'sessionId=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  
  // 清除用户相关信息
  sessionStorage.removeItem('currentUser');
  localStorage.removeItem('currentUser');
}