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
    
    // 查看所有已存储的会话ID, 记录会话ID变化历史
    const oldSessionId = currentSessionId;
    console.log(`会话ID变更: ${oldSessionId || '无'} -> ${sessionId}`);
    
    // 更新缓存
    currentSessionId = sessionId;
    
    // 将旧会话ID保存到历史中，以便可能的恢复
    const sessionHistory = JSON.parse(localStorage.getItem('sessionIdHistory') || '[]');
    if (oldSessionId && !sessionHistory.includes(oldSessionId)) {
      sessionHistory.push(oldSessionId);
      // 最多保留5个历史会话ID
      if (sessionHistory.length > 5) {
        sessionHistory.shift();
      }
      localStorage.setItem('sessionIdHistory', JSON.stringify(sessionHistory));
    }
    
    // 更新存储
    sessionStorage.setItem('sessionId', sessionId);
    localStorage.setItem('sessionId', sessionId);
    
    // 设置为cookie (30天有效期)
    document.cookie = `sessionId=${sessionId}; path=/; max-age=2592000; SameSite=Lax`;
    
    // 触发会话ID更新事件，使其他组件可以响应会话变化
    window.dispatchEvent(new CustomEvent('sessionIdChanged', { detail: { sessionId } }));
    
    // 记录会话状态，方便调试
    const sessionState = {
      current: sessionId,
      previous: oldSessionId || 'none',
      timestamp: new Date().toISOString(),
      authStatus: localStorage.getItem('currentUser') ? 'logged_in' : 'anonymous'
    };
    console.log('会话状态更新:', sessionState);
    localStorage.setItem('sessionState', JSON.stringify(sessionState));
  } catch (error) {
    console.error('保存会话ID时出错:', error);
  }
}

// 从响应头中提取会话ID并保存
export function processResponseHeaders(headers: Headers): string | null {
  // 尝试从各种响应头中获取会话ID
  const originalSessionId = headers.get('X-Original-Session-ID');
  const clientSessionId = headers.get('X-Client-Session-ID');
  const responseSessionId = headers.get('X-Response-Session-ID');
  const isAuthenticated = headers.get('X-Session-Authenticated') === 'true';
  const requiresBinding = headers.get('X-Requires-Binding') === 'true';
  
  // 记录会话处理的来源URL和方法，帮助调试
  const sourceUrl = headers.get('X-Source-URL') || '未知URL';
  const requestMethod = headers.get('X-Request-Method') || '未知方法';
  
  // 追踪所有会话相关响应头
  const headerInfo: Record<string, string> = {};
  headers.forEach((value, key) => {
    if (key.toLowerCase().includes('session') || key.toLowerCase().includes('cookie') || 
        key.toLowerCase().includes('auth') || key.toLowerCase().includes('binding')) {
      headerInfo[key] = value;
    }
  });
  
  if (Object.keys(headerInfo).length > 0) {
    console.log(`响应头中的会话相关信息(${sourceUrl}|${requestMethod}):`, headerInfo);
  }

  // 检查当前会话ID，确保我们不覆盖已验证的会话
  const currentId = getSessionId();
  
  // 构建日志前缀，使调试更清晰
  const logPrefix = `[SessionManager] ${requestMethod} ${sourceUrl} |`;
  
  // 获取当前认证状态
  const currentUserJson = sessionStorage.getItem('currentUser');
  const isCurrentlyAuthenticated = !!currentUserJson;
  
  // 如果服务器明确标记了这是已验证会话
  if (isAuthenticated) {
    console.log(`${logPrefix} 服务器响应表明这是已认证的会话`);
    
    // 如果响应中包含会话ID，我们应该使用它
    if (originalSessionId && originalSessionId !== 'none' && originalSessionId !== '') {
      console.log(`${logPrefix} 使用服务器提供的已认证会话ID: ${originalSessionId}`);
      saveSessionId(originalSessionId);
      return originalSessionId;
    }
    
    if (responseSessionId && responseSessionId !== 'none' && responseSessionId !== '') {
      console.log(`${logPrefix} 使用响应会话ID: ${responseSessionId}`);
      saveSessionId(responseSessionId);
      return responseSessionId;
    }
  }
  
  // 优先使用服务器原始会话ID，这是服务器最认可的会话ID
  if (originalSessionId && originalSessionId !== 'none' && originalSessionId !== '') {
    // 比较服务器会话ID和当前客户端会话ID
    if (currentId && originalSessionId === currentId) {
      // 会话ID已同步，无需更新
      console.log(`${logPrefix} 会话ID已同步: ${originalSessionId}`);
      return currentId;
    }
    
    // 如果当前客户端已有会话ID，并且会话中有用户数据，需要评估是否保留
    if (currentId && isCurrentlyAuthenticated) {
      // 检查该响应是否是认证请求的响应
      if (isAuthenticated) {
        // 这是一个已认证响应，应该采用服务器的会话ID
        console.log(`${logPrefix} 使用服务器提供的已认证会话ID: ${originalSessionId} (替换现有会话ID: ${currentId})`);
        saveSessionId(originalSessionId);
        return originalSessionId;
      } else {
        console.log(`${logPrefix} 保留已验证的会话ID: ${currentId} (忽略服务器新会话: ${originalSessionId})`);
        return currentId;
      }
    }
    
    console.log(`${logPrefix} 从响应头中提取到原始会话ID: ${originalSessionId}`);
    saveSessionId(originalSessionId);
    return originalSessionId;
  }
  
  // 使用响应会话ID
  if (responseSessionId && responseSessionId !== 'none' && responseSessionId !== '') {
    // 如果当前会话已经登录，保留而不覆盖
    if (currentId && isCurrentlyAuthenticated) {
      console.log(`${logPrefix} 保留已验证的会话ID: ${currentId} (忽略响应会话: ${responseSessionId})`);
      return currentId;
    }
    
    console.log(`${logPrefix} 从响应头中提取到响应会话ID: ${responseSessionId}`);
    saveSessionId(responseSessionId);
    return responseSessionId;
  }
  
  // 次优先使用客户端会话ID确认
  if (clientSessionId && clientSessionId !== 'none' && clientSessionId !== '') {
    // 如果当前会话已经登录，保留而不覆盖
    if (currentId && isCurrentlyAuthenticated) {
      console.log(`${logPrefix} 保留已验证的会话ID: ${currentId} (忽略客户端会话: ${clientSessionId})`);
      return currentId;
    }
    
    console.log(`${logPrefix} 从响应头中提取到客户端会话ID: ${clientSessionId}`);
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
      
      // 如果当前会话已经登录，保留而不覆盖
      if (currentId && isCurrentlyAuthenticated) {
        console.log(`${logPrefix} 保留已验证的会话ID: ${currentId} (忽略cookie会话: ${sessionId})`);
        return currentId;
      }
      
      console.log(`${logPrefix} 从Set-Cookie中提取到会话ID: ${sessionId}`);
      saveSessionId(sessionId);
      return sessionId;
    }
  }
  
  // 如果已有会话，优先保留它
  if (currentId) {
    console.log(`${logPrefix} 保留现有会话ID: ${currentId}`);
    return currentId;
  }
  
  // 如果来源是登录API但没有会话ID，记录警告
  if (sourceUrl.includes('/api/auth/login') || sourceUrl.includes('/api/auth/current-user')) {
    console.warn(`${logPrefix} 警告: 认证相关请求没有返回会话ID`);
  }
  
  console.log(`${logPrefix} 没有找到任何可用的会话ID`);
  return null;
}

// 附加会话ID到API请求
export function attachSessionToRequest(url: string, headers: Record<string, string> = {}): {
  url: string;
  headers: Record<string, string>;
} {
  const sessionId = getSessionId();
  
  // 提取更多路径信息，方便调试
  const urlObj = new URL(url, window.location.origin);
  const path = urlObj.pathname;
  const method = 'GET'; // 默认为GET，实际方法无法在这里获取
  
  // 日志前缀
  const logPrefix = `[SessionManager] ${method} ${path} |`;
  
  if (sessionId) {
    // 确保只传递一个干净的会话ID，避免逗号分隔问题
    const cleanSessionId = (sessionId.includes(',')) 
      ? sessionId.split(',')[0].trim() 
      : sessionId;
    
    // 检查会话ID长度是否合理
    if (cleanSessionId.length < 10) {
      console.warn(`${logPrefix} 警告: 会话ID(${cleanSessionId})长度异常短，可能无效`);
    }
    
    console.log(`${logPrefix} 附加会话ID ${cleanSessionId} 到请求`);
    
    // 添加到请求头（常用两种格式，增加兼容性）
    headers['X-Session-ID'] = cleanSessionId;
    headers['x-session-id'] = cleanSessionId;
    
    // 添加更详细的会话信息到请求头，帮助服务器侧调试
    const currentUserJson = sessionStorage.getItem('currentUser');
    const isAuthenticated = !!currentUserJson;
    headers['X-Client-Auth-Status'] = isAuthenticated ? 'authenticated' : 'anonymous';
    
    // 记录当前会话状态信息
    const sessionState = localStorage.getItem('sessionState');
    if (sessionState) {
      try {
        const state = JSON.parse(sessionState);
        if (state.previous && state.previous !== 'none' && state.previous !== state.current) {
          headers['X-Previous-Session-ID'] = state.previous;
        }
      } catch (e) {
        console.error(`${logPrefix} 解析会话状态出错:`, e);
      }
    }
    
    // 同时通过URL参数传递（作为备用方案）
    const separator = url.includes('?') ? '&' : '?';
    url = `${url}${separator}sessionId=${cleanSessionId}`;
    
    // 如果是认证相关请求，特别记录
    if (url.includes('/api/auth/')) {
      console.log(`${logPrefix} 这是一个认证相关请求，会话ID: ${cleanSessionId}, 认证状态: ${isAuthenticated ? '已认证' : '未认证'}`);
    }
  } else {
    console.log(`${logPrefix} 没有找到可用的会话ID，请求将使用新会话`);
    
    // 如果是认证相关请求但没有会话ID，记录特别警告
    if (url.includes('/api/auth/')) {
      console.warn(`${logPrefix} 警告: 这是一个认证相关请求，但没有会话ID`);
    }
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
  
  // 保存当前会话ID到日志，用于调试
  const oldSessionId = currentSessionId;
  const oldUserData = sessionStorage.getItem('currentUser');
  
  // 记录清理前状态
  console.log('清理前会话状态:', {
    sessionId: oldSessionId,
    hasUserData: !!oldUserData,
    sessionStorage: Object.keys(sessionStorage).length,
    localStorage: Object.keys(localStorage).length,
    timestamp: new Date().toISOString()
  });
  
  // 清除会话ID
  currentSessionId = null;
  sessionStorage.removeItem('sessionId');
  localStorage.removeItem('sessionId');
  document.cookie = 'sessionId=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  
  // 保留会话历史，便于可能的调试
  const sessionHistory = JSON.parse(localStorage.getItem('sessionIdHistory') || '[]');
  if (oldSessionId && !sessionHistory.includes(oldSessionId)) {
    sessionHistory.push(oldSessionId);
    // 最多保留10个历史会话ID
    if (sessionHistory.length > 10) {
      sessionHistory.shift();
    }
    localStorage.setItem('sessionIdHistory', JSON.stringify(sessionHistory));
  }
  
  // 清除用户相关信息
  sessionStorage.removeItem('currentUser');
  localStorage.removeItem('currentUser');
  
  // 清除会话状态信息
  localStorage.removeItem('sessionState');
  
  // 清除其他可能的认证相关cookie
  document.cookie = 'warehouse.sid=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  document.cookie = 'connect.sid=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  document.cookie = 'express.sid=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  
  // 更新会话状态记录（仅用于历史记录）
  const sessionState = {
    cleared: true,
    previous: oldSessionId || 'none',
    timestamp: new Date().toISOString(),
    clearReason: 'user_logout' // 默认原因
  };
  localStorage.setItem('sessionClearHistory', JSON.stringify(
    JSON.parse(localStorage.getItem('sessionClearHistory') || '[]').concat([sessionState])
  ));
  
  // 记录清理后状态
  console.log('会话已成功清理');
  
  // 触发会话清除事件
  window.dispatchEvent(new Event('sessionCleared'));
  
  // 返回清理结果信息
  return {
    success: true,
    previousSession: oldSessionId,
    hadUserData: !!oldUserData,
    timestamp: new Date().toISOString()
  };
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