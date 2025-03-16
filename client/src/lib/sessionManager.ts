/**
 * 会话管理器
 * 统一管理客户端会话相关功能
 * 支持会话持久化和多存储层同步
 * 提供请求防重复、会话一致性、自动恢复等功能
 */

// 会话来源枚举
export type SessionSource = 'server_generated' | 'client_generated' | 'recovered' | 'restored' | 'unknown';

// 会话信息结构
export type SessionInfo = {
  sessionId: string;
  isNewSession: boolean;
  originalSessionId?: string;
  source: SessionSource;
  isAuthenticated?: boolean;
  userId?: number;
};

// 存储当前使用的会话ID以便快速访问
let currentSessionId: string | null = null;

// 存储最近的请求时间戳，用于实现请求去抖动
const requestTimestamps: Record<string, number> = {};

// 存储请求锁，防止同一URI的请求在短时间内并发执行
const requestLocks: Record<string, boolean> = {};

// 存储请求计数器，记录每个路径的请求频率
const requestCounters: Record<string, { count: number, firstRequest: number }> = {};

/**
 * 设置cookie
 * @param name cookie名称
 * @param value cookie值
 * @param options 选项：过期时间（天）、路径、安全性等
 */
export function setCookie(name: string, value: string, options: {
  maxAgeDays?: number, 
  path?: string,
  sameSite?: 'Strict' | 'Lax' | 'None',
  secure?: boolean
} = {}) {
  const {
    maxAgeDays = 30,
    path = '/',
    sameSite = 'Lax',
    secure = window.location.protocol === 'https:'
  } = options;
  
  const maxAge = maxAgeDays * 24 * 60 * 60; // 转换为秒
  document.cookie = `${name}=${encodeURIComponent(value)}; path=${path}; max-age=${maxAge}; SameSite=${sameSite}${secure ? '; secure' : ''}`;
}

/**
 * 删除cookie
 * @param name cookie名称
 * @param path cookie路径
 */
export function deleteCookie(name: string, path: string = '/') {
  document.cookie = `${name}=; path=${path}; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
}

/**
 * 获取cookie值
 * @param name cookie名称
 * @returns cookie值，未找到返回null
 */
export function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
  return match ? decodeURIComponent(match[2]) : null;
}

// 设置防抖动阈值
const DEBOUNCE_THRESHOLD_MS = 300; // 300毫秒内的重复请求会被去抖
const MAX_REQUESTS_PER_MINUTE = 5; // 每分钟最多允许的相同请求数

// 从服务器响应中提取会话ID信息
export function extractSessionInfoFromResponse(response: Response): SessionInfo | null {
  try {
    // 检查响应是否包含必要的会话ID头部
    const sessionId = response.headers.get('x-session-id');
    const newSessionId = response.headers.get('x-new-session-id');
    const originalSessionId = response.headers.get('x-original-session-id');
    const sessionSource = response.headers.get('x-session-source');
    const isAuthenticated = response.headers.get('x-real-authenticated') === 'true';
    const userId = response.headers.get('x-user-id');
    
    // 记录头部信息用于调试
    console.log("响应头中的会话相关信息:", {
      'x-new-session-id': newSessionId,
      'x-original-session-id': originalSessionId,
      'x-session-id': sessionId,
      'x-session-source': sessionSource,
      'x-real-authenticated': isAuthenticated ? 'true' : 'false',
      'x-user-id': userId || 'none'
    });
    
    // 如果没有会话ID，返回null
    if (!sessionId) {
      return null;
    }
    
    // 构建会话信息对象
    const sessionInfo: SessionInfo = {
      sessionId,
      isNewSession: !!newSessionId && newSessionId === sessionId,
      originalSessionId: originalSessionId || undefined,
      source: sessionSource as SessionSource || 'unknown',
      isAuthenticated: isAuthenticated,
      userId: userId ? parseInt(userId) : undefined
    };
    
    // 如果认证状态为真，自动设置Cookie确保前后端一致
    if (isAuthenticated && sessionId) {
      // 使用我们已有的Cookie设置函数
      setCookie('sessionId', sessionId, {
        path: '/',
        maxAgeDays: 30, // 过期时间30天
        sameSite: 'Lax',
        secure: window.location.protocol === 'https:'
      });
      
      // 存储到localStorage作为备份 (确保不同标签页共享会话状态)
      try {
        localStorage.setItem('sessionId', sessionId);
        localStorage.setItem('authenticated', 'true');
        if (userId) localStorage.setItem('userId', userId);
      } catch (e) {
        console.warn('无法存储会话信息到localStorage:', e);
      }
    }
    
    return sessionInfo;
  } catch (error) {
    console.error('提取会话信息时出错:', error);
    return null;
  }
}

/**
 * 生成随机会话ID
 * 创建一个足够复杂的会话ID，与服务器生成的格式相匹配
 */
function generateSessionId(): string {
  // 创建16字节随机值并转为十六进制字符串
  // 这与服务器端生成的会话ID格式匹配
  let result = '';
  const characters = 'abcdef0123456789'; // 十六进制字符
  for (let i = 0; i < 32; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

// 检查cookie中是否有express-session或标准会话ID
function getExpressSessionId(): string | null {
  // 按优先级检查各种可能的cookie名称
  const warehouseSid = getCookie('warehouse.sid');
  const connectSid = getCookie('connect.sid');
  const expressSid = getCookie('express.sid');
  
  // 如果找到任何一个，尝试提取会话ID
  if (warehouseSid || connectSid || expressSid) {
    const rawSid = warehouseSid || connectSid || expressSid;
    
    // 确保rawSid不为null
    if (rawSid) {
      // 尝试解析会话ID - express session将ID存为s%3A[id].[signature]格式
      if (rawSid.includes('.')) {
        // 移除签名部分
        const idPart = rawSid.split('.')[0];
        
        // 移除s%3A前缀(如果有)
        if (idPart.startsWith('s%3A')) {
          return decodeURIComponent(idPart.substring(4));
        }
        return idPart;
      }
      
      return rawSid; // 可能没有签名，直接返回
    }
  }
  
  return null;
}

// 从各种可能的存储中获取会话ID
export function getSessionId(): string {
  // 1. If there's already a cached session ID, return it first (performance optimization)
  if (currentSessionId) {
    return currentSessionId;
  }

  // 2. Retrieve session ID from all possible storages
  // Priority: sessionStorage > localStorage > cookie
  const sessionIdFromSession = sessionStorage.getItem('sessionId');
  const sessionIdFromLocal = localStorage.getItem('sessionId');
  const sessionIdFromCookie = getCookie('sessionId');
  const expressSessionId = getExpressSessionId(); // Check express session cookie
  
  // Output debug information to help trace session ID source
  console.log('Session ID source check:', {
    sessionStorage: sessionIdFromSession || 'none',
    localStorage: sessionIdFromLocal || 'none',
    sessionCookie: sessionIdFromCookie || 'none',
    expressCookie: expressSessionId || 'none',
  });
  
  // Check if previously generated session ID is stored in different locations
  let sessionId: string | null = null;
  
  // Track all found session IDs to prevent using inconsistent IDs
  const foundIds: string[] = [];
  if (sessionIdFromSession) foundIds.push(sessionIdFromSession);
  if (sessionIdFromLocal) foundIds.push(sessionIdFromLocal);
  if (sessionIdFromCookie) foundIds.push(sessionIdFromCookie);
  if (expressSessionId) foundIds.push(expressSessionId);
  
  // 3. Check if there are inconsistent session IDs
  if (foundIds.length > 0) {
    // First, check if there is an express session ID, which should have the highest priority
    if (expressSessionId) {
      // Express session cookie takes priority, may be recently created by the server
      sessionId = expressSessionId;
      console.log(`Using Express session ID with priority: ${sessionId}`);
    } 
    // Next, if all IDs are consistent, use that ID
    else {
      const allSame = foundIds.every(id => id === foundIds[0]);
      
      if (allSame) {
        // All storage locations have consistent IDs, use directly
        sessionId = foundIds[0];
        console.log(`Loaded session ID from storage (consistent): ${sessionId}`);
      } else {
        // Inconsistent session IDs found
        console.log(`Found inconsistent session IDs in storage: ${foundIds.join(', ')}`);
        
        // Use the longest-lived session ID: sessionStorage is only in the current browsing context,
        // localStorage and cookie are more persistent, prioritize localStorage
        sessionId = sessionIdFromLocal || sessionIdFromSession || sessionIdFromCookie;
        
        console.log(`Selected optimal session ID: ${sessionId}`);
      }
    }
  }
  
  // 4. If no session ID is found, generate a new one and save it
  if (!sessionId) {
    sessionId = generateSessionId();
    console.log(`No existing session ID found, generating new ID: ${sessionId}`);
  }
  
  // 5. Ensure session ID is synchronized consistently across all storage layers
  saveSessionId(sessionId);
  currentSessionId = sessionId;
  
  return sessionId;
}

// Save session ID to all available storages
export function saveSessionId(sessionId: string) {
  if (!sessionId) return;
  
  try {
    // Compare if it's the same as the current session ID, avoid unnecessary storage operations
    if (currentSessionId === sessionId) {
      console.log(`Session ID unchanged, no update needed: ${sessionId}`);
      return;
    }
    
    // Check all stored session IDs, record session ID change history
    const oldSessionId = currentSessionId;
    console.log(`Session ID changed: ${oldSessionId || 'none'} -> ${sessionId}`);
    
    // Update cache
    currentSessionId = sessionId;
    
    // Save old session ID to history for possible recovery
    const sessionHistory = JSON.parse(localStorage.getItem('sessionIdHistory') || '[]');
    if (oldSessionId && !sessionHistory.includes(oldSessionId)) {
      sessionHistory.push(oldSessionId);
      // Keep at most 5 historical session IDs
      if (sessionHistory.length > 5) {
        sessionHistory.shift();
      }
      localStorage.setItem('sessionIdHistory', JSON.stringify(sessionHistory));
    }
    
    // Update storage
    sessionStorage.setItem('sessionId', sessionId);
    localStorage.setItem('sessionId', sessionId);
    
    // Use our unified Cookie setting function
    setCookie('sessionId', sessionId, {
      path: '/',
      maxAgeDays: 30, // Expires in 30 days
      sameSite: 'Lax',
      secure: window.location.protocol === 'https:'
    });
    
    // Also set cookie names that match the server
    // Note: Server uses connect.sid or warehouse.sid as cookie name
    setCookie('warehouse.sid', sessionId, {
      path: '/',
      maxAgeDays: 30, // Expires in 30 days
      sameSite: 'Lax',
      secure: window.location.protocol === 'https:'
    });
    
    // Ensure connect.sid is also set for compatibility with older express sessions
    setCookie('connect.sid', sessionId, {
      path: '/',
      maxAgeDays: 30,
      sameSite: 'Lax',
      secure: window.location.protocol === 'https:'
    });
    
    // Trigger session ID update event, so other components can respond to session changes
    window.dispatchEvent(new CustomEvent('sessionIdChanged', { detail: { sessionId } }));
    
    // Record session state for debugging
    const sessionState = {
      current: sessionId,
      previous: oldSessionId || 'none',
      timestamp: new Date().toISOString(),
      authStatus: localStorage.getItem('currentUser') ? 'logged_in' : 'anonymous'
    };
    console.log('Session state updated:', sessionState);
    localStorage.setItem('sessionState', JSON.stringify(sessionState));
  } catch (error) {
    console.error('Error saving session ID:', error);
  }
}

// 从响应头中提取会话ID并保存
export function processResponseHeaders(headers: Headers): string | null {
  // 尝试从各种响应头中获取会话ID (注意：服务器可能使用不同的头名称)
  // 首先检查X-New-Session-ID，这是服务器新创建的会话ID
  const newSessionId = headers.get('X-New-Session-ID');
  // 然后检查原始会话ID和备用头名称
  const originalSessionId = headers.get('X-Original-Session-ID') || headers.get('X-Session-ID');
  const clientSessionId = headers.get('X-Client-Session-ID');
  // 服务器会通过X-Session-Authenticated表明会话是否已认证
  const isAuthenticated = headers.get('X-Session-Authenticated') === 'true';
  const userId = headers.get('X-User-ID');
  const sessionRestored = headers.get('X-Session-Restored') === 'true';
  const sessionSource = headers.get('X-Session-Source');
  
  // 记录请求来源以帮助调试
  const sourceUrl = headers.get('X-Source-URL') || headers.get('X-Request-Path') || '未知URL';
  const requestMethod = headers.get('X-Request-Method') || '未知方法';
  
  // 收集所有会话相关的头信息，用于调试
  const headerInfo: Record<string, string> = {};
  headers.forEach((value, key) => {
    if (key.toLowerCase().includes('session') || 
        key.toLowerCase().includes('cookie') || 
        key.toLowerCase().includes('auth') || 
        key.toLowerCase().includes('user-id')) {
      headerInfo[key] = value;
    }
  });
  
  if (Object.keys(headerInfo).length > 0) {
    console.log(`响应头中的会话相关信息(${sourceUrl}|${requestMethod}):`, headerInfo);
  }

  // 获取当前保存的会话ID
  const currentId = getSessionId();
  
  // 日志前缀，统一标记日志来源
  const logPrefix = `[SessionManager] ${requestMethod} ${sourceUrl} |`;
  
  // 检查是否已经登录
  const currentUserJson = sessionStorage.getItem('currentUser');
  const isCurrentlyAuthenticated = !!currentUserJson;
  
  // 检查是否是关键的认证API
  const isAuthApi = sourceUrl.includes('/api/auth/');
  const isCurrentUserApi = sourceUrl.includes('/api/auth/current-user');
  
  // 决策逻辑优先级：
  // 1. 对于新创建的会话ID (X-New-Session-ID)，我们应该采用它，因为这表明服务器选择创建新会话
  if (newSessionId && newSessionId !== 'none' && newSessionId.length >= 10) {
    // 但如果我们已经有认证的会话，我们需要考虑是否要替换它
    // 只有在认证相关API中，才会替换已认证的会话
    if (isCurrentlyAuthenticated && !isAuthApi && !isCurrentUserApi) {
      console.log(`${logPrefix} 保留已认证的会话ID: ${currentId} (忽略服务器新会话: ${newSessionId})`);
      return currentId;
    }
    
    console.log(`${logPrefix} 使用服务器新创建的会话ID: ${newSessionId}`);
    saveSessionId(newSessionId);
    return newSessionId;
  }
  
  // 2. 如果服务器恢复了会话，使用服务器提供的会话ID
  if (sessionRestored && originalSessionId && originalSessionId !== 'none' && originalSessionId.length >= 10) {
    console.log(`${logPrefix} 服务器恢复了会话，使用原始会话ID: ${originalSessionId}`);
    saveSessionId(originalSessionId);
    return originalSessionId;
  }
  
  // 3. 如果这是一个已认证的会话，并且提供了用户ID
  if (isAuthenticated && userId && originalSessionId && originalSessionId !== 'none' && originalSessionId.length >= 10) {
    console.log(`${logPrefix} 使用已认证会话的会话ID: ${originalSessionId} (用户ID: ${userId})`);
    saveSessionId(originalSessionId);
    return originalSessionId;
  }
  
  // 4. 对于普通会话ID，检查是否与当前会话一致
  if (originalSessionId && originalSessionId !== 'none' && originalSessionId.length >= 10) {
    // 如果与当前ID一致，无需更新
    if (currentId === originalSessionId) {
      console.log(`${logPrefix} 会话ID保持一致: ${originalSessionId}`);
      return currentId;
    }
    
    // 特殊情况：Current-User API应该始终使用服务器返回的会话ID
    if (isCurrentUserApi) {
      console.log(`${logPrefix} 使用current-user API返回的会话ID: ${originalSessionId}`);
      saveSessionId(originalSessionId);
      return originalSessionId;
    }
    
    // 如果是认证API，优先使用服务器会话
    if (isAuthApi) {
      console.log(`${logPrefix} 使用认证API返回的会话ID: ${originalSessionId}`);
      saveSessionId(originalSessionId);
      return originalSessionId;
    }
    
    // 如果已登录且不是认证相关请求，保留现有会话ID
    if (isCurrentlyAuthenticated && !isAuthApi && !isCurrentUserApi) {
      console.log(`${logPrefix} 保留已认证的会话ID: ${currentId || 'none'} (忽略服务器会话: ${originalSessionId})`);
      return currentId;
    }
    
    // 其他情况使用服务器提供的会话ID
    console.log(`${logPrefix} 使用服务器提供的会话ID: ${originalSessionId}`);
    saveSessionId(originalSessionId);
    return originalSessionId;
  }
  
  // 5. 尝试客户端会话ID确认
  if (clientSessionId && clientSessionId !== 'none' && clientSessionId.length >= 10) {
    if (isCurrentlyAuthenticated && !isAuthApi && !isCurrentUserApi) {
      console.log(`${logPrefix} 保留已认证的会话ID: ${currentId || 'none'} (忽略客户端会话: ${clientSessionId})`);
      return currentId;
    }
    
    console.log(`${logPrefix} 使用客户端确认的会话ID: ${clientSessionId}`);
    saveSessionId(clientSessionId);
    return clientSessionId;
  }
  
  // 6. 尝试从Set-Cookie响应头中提取会话ID
  const setCookieHeader = headers.get('Set-Cookie');
  if (setCookieHeader) {
    // 尝试提取会话cookie
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
      
      // 如果已登录且不是认证相关请求，保留现有会话ID
      if (isCurrentlyAuthenticated && !isAuthApi && !isCurrentUserApi) {
        console.log(`${logPrefix} 保留已认证的会话ID: ${currentId || 'none'} (忽略cookie会话: ${sessionId})`);
        return currentId;
      }
      
      console.log(`${logPrefix} 使用Set-Cookie中的会话ID: ${sessionId}`);
      saveSessionId(sessionId);
      return sessionId;
    }
  }
  
  // 7. 如果都没有找到新会话ID，保留现有会话ID
  if (currentId && currentId.length >= 10) {
    console.log(`${logPrefix} 保留现有会话ID: ${currentId}`);
    return currentId;
  }
  
  // 对于登录相关API，记录警告信息
  if (isAuthApi) {
    console.warn(`${logPrefix} 警告: 认证相关请求没有返回有效的会话ID`);
  }
  
  console.log(`${logPrefix} 没有找到任何可用的会话ID`);
  return null;
}

/**
 * 去抖动HTTP请求
 * 防止短时间内重复触发同样的请求
 * @param url 原始请求URL
 * @param headers 原始请求头
 * @returns 是否应该继续处理请求 (true=继续, false=请求正在进行中)
 */
export function debounceHttpRequests(url: string, headers: Record<string, string> = {}): boolean {
  // 提取路径信息
  const urlObj = new URL(url, window.location.origin);
  const path = urlObj.pathname;
  const method = headers['X-HTTP-Method'] || 'GET';
  
  // 关键请求标识
  const requestKey = `${method}-${path}`;
  const now = Date.now();
  
  // 日志前缀
  const logPrefix = `[RequestDebounce] ${method} ${path} |`;
  
  // 1. 处理请求锁 - 防止并发请求
  if (requestLocks[requestKey]) {
    console.log(`${logPrefix} 请求被锁定，正在处理中，跳过重复请求`);
    return false;
  }
  
  // 2. 处理请求去抖动
  const lastRequestTime = requestTimestamps[requestKey] || 0;
  const timeSinceLastRequest = now - lastRequestTime;
  
  // 针对特定URL设置不同的去抖时间阈值
  let debounceThreshold = DEBOUNCE_THRESHOLD_MS;
  
  // 身份验证请求使用较长的去抖时间，降低认证请求频率
  if (path.includes('/api/auth/') || path.includes('/current-user')) {
    debounceThreshold = 500; // 500毫秒
  }
  
  // 如果请求频率太高，跳过这次请求
  if (timeSinceLastRequest < debounceThreshold) {
    console.log(`${logPrefix} 请求频率过高(${timeSinceLastRequest}ms < ${debounceThreshold}ms)，跳过此次请求`);
    return false;
  }
  
  // 3. 处理请求计数（防止短时间内大量相同请求）
  // 记录请求计数
  if (!requestCounters[requestKey]) {
    requestCounters[requestKey] = { count: 0, firstRequest: now };
  }
  
  const counter = requestCounters[requestKey];
  counter.count++;
  
  // 检查是否已经一分钟了，如果是则重置计数器
  if (now - counter.firstRequest > 60000) {
    counter.count = 1;
    counter.firstRequest = now;
  }
  
  // 如果一分钟内请求次数过多，启用更严格的频率限制
  if (counter.count > MAX_REQUESTS_PER_MINUTE) {
    console.log(`${logPrefix} 一分钟内请求次数过多(${counter.count}次)，启用更严格的频率限制`);
    
    // 上次请求与当前请求的时间间隔必须超过指数级增长的时间
    const requiredDelay = Math.min(1000 * Math.pow(1.5, counter.count - MAX_REQUESTS_PER_MINUTE), 10000);
    if (timeSinceLastRequest < requiredDelay) {
      console.log(`${logPrefix} 请求被限制(${timeSinceLastRequest}ms < ${requiredDelay}ms)，跳过此次请求`);
      return false;
    }
  }
  
  // 更新请求时间戳
  requestTimestamps[requestKey] = now;
  
  // 设置请求锁（由调用方解锁）
  requestLocks[requestKey] = true;
  
  // 记录重要请求
  const isImportantRequest = path.includes('/api/auth/') || path.includes('/current-user');
  if (isImportantRequest) {
    console.log(`${logPrefix} 允许处理此认证请求`);
  }
  
  return true;
}

/**
 * 解锁请求
 * 在请求完成后调用这个方法解锁请求锁定
 * @param url 请求URL
 * @param headers 请求头
 */
export function unlockRequest(url: string, headers: Record<string, string> = {}): void {
  const urlObj = new URL(url, window.location.origin);
  const path = urlObj.pathname;
  const method = headers['X-HTTP-Method'] || 'GET';
  
  // 请求标识
  const requestKey = `${method}-${path}`;
  
  // 解锁请求
  if (requestLocks[requestKey]) {
    requestLocks[requestKey] = false;
  }
}

// 附加会话ID到API请求
export function attachSessionToRequest(url: string, headers: Record<string, string> = {}): {
  url: string;
  headers: Record<string, string>;
} {
  // 提取更多路径信息，方便调试
  const urlObj = new URL(url, window.location.origin);
  const path = urlObj.pathname;
  const method = headers['X-HTTP-Method'] || 'GET'; // 尝试从header中获取方法，否则默认为GET
  
  // 日志前缀
  const logPrefix = `[SessionManager] ${method} ${path} |`;
  
  // 是否是重要请求（认证相关）
  const isImportantRequest = url.includes('/api/auth/') || url.includes('/current-user');
  
  // 应用去抖动逻辑 - 除非是内部路径
  if (!path.startsWith('/src/') && !path.startsWith('/node_modules/') && !path.includes('.')) {
    // 进行请求去抖动检查
    if (!debounceHttpRequests(url, headers)) {
      // 如果请求被去抖动逻辑阻止，返回原始URL和头（上层代码负责处理）
      console.log(`${logPrefix} 请求被去抖动逻辑阻止，不附加会话信息`);
      return { url, headers: { ...headers, 'X-Request-Debounced': 'true' } };
    }
  }
  
  // 获取会话ID
  const sessionId = getSessionId();
  
  if (sessionId) {
    // 确保只传递一个干净的会话ID，避免逗号分隔问题
    const cleanSessionId = (sessionId.includes(',')) 
      ? sessionId.split(',')[0].trim() 
      : sessionId;
    
    // 检查会话ID长度是否合理
    if (cleanSessionId.length < 10) {
      console.warn(`${logPrefix} 警告: 会话ID(${cleanSessionId})长度异常短，可能无效`);
    }
    
    // 去除日志噪音 - 只在关键API或调试时打印详细日志
    if (isImportantRequest) {
      console.log(`${logPrefix} 附加会话ID ${cleanSessionId} 到请求`);
    }
    
    // 添加到请求头 - 使用多种格式，提高与服务器匹配的成功率
    // ===== 重要：匹配服务器端genid函数中检查的所有可能标头名称 =====
    // 使用所有服务器端可能检查的头名称，确保会话ID能被正确识别
    headers['X-Client-Session-ID'] = cleanSessionId;
    headers['X-Session-ID'] = cleanSessionId;
    headers['sessionid'] = cleanSessionId;
    headers['session-id'] = cleanSessionId;
    headers['client-session-id'] = cleanSessionId;
    
    // 添加内部用户ID头部，用于简化的ID验证
    // 这个头部会被服务器的verifySession中间件识别和使用
    headers['X-Internal-User-ID'] = cleanSessionId;
    
    // 设置Cookie方式的会话ID，增加一种传递机制
    try {
      setCookie('sessionId', cleanSessionId, {
        path: '/',
        maxAgeDays: 30,
        sameSite: 'Lax'
      });
    } catch (e) {
      console.error(`${logPrefix} 设置会话Cookie失败:`, e);
    }
    
    // 不仅设置会话ID头，也同时添加到查询参数中，提高传递成功率
    const urlObj = new URL(url, window.location.origin);
    urlObj.searchParams.set('sessionId', cleanSessionId);
    urlObj.searchParams.set('sid', cleanSessionId); // 添加另一种常见的查询参数名
    
    // 如果是关键API路径，输出更详细的调试信息
    if (isImportantRequest) {
      console.log(`${logPrefix} 会话ID ${cleanSessionId} 已添加到请求头和查询参数`);
    }
    
    // 添加更详细的会话信息到请求头，帮助服务器侧调试
    const currentUserJson = sessionStorage.getItem('currentUser');
    const isAuthenticated = !!currentUserJson;
    headers['X-Client-Auth-Status'] = isAuthenticated ? 'authenticated' : 'anonymous';
    
    // 添加当前用户ID，如果有的话
    if (currentUserJson) {
      try {
        const userData = JSON.parse(currentUserJson);
        if (userData && userData.id) {
          headers['X-User-ID'] = userData.id.toString();
        }
      } catch (e) {
        // 忽略解析错误
      }
    }
    
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
    
    // 也添加到cookie中，进一步增强会话持久性
    // 使用我们的统一Cookie设置函数
    setCookie('sessionId', cleanSessionId, {
      path: '/',
      maxAgeDays: 30, // 30天过期
      sameSite: 'Lax',
      secure: window.location.protocol === 'https:'
    });
    
    // 同时设置与服务器匹配的会话cookie名称
    setCookie('warehouse.sid', cleanSessionId, {
      path: '/',
      maxAgeDays: 30, // 30天过期
      sameSite: 'Lax',
      secure: window.location.protocol === 'https:'
    });
    
    // 如果是认证相关请求，特别记录
    if (isImportantRequest) {
      console.log(`${logPrefix} 这是一个认证相关请求，会话ID: ${cleanSessionId}, 认证状态: ${isAuthenticated ? '已认证' : '未认证'}`);
    }
    
    // 返回修改后的URL和增强的请求头
    return { url: urlObj.toString(), headers };
  } else {
    // 对于没有会话ID的情况，生成一个新的
    const newSessionId = generateSessionId();
    console.log(`${logPrefix} 没有找到可用的会话ID，生成新ID: ${newSessionId}`);
    
    // 保存并使用新生成的会话ID
    saveSessionId(newSessionId);
    
    // 使用同样的头设置逻辑 - 简化为核心头，减少混乱
    headers['X-Session-ID'] = newSessionId;
    headers['X-Client-Session-ID'] = newSessionId;
    
    // 添加内部用户ID头部，用于简化的ID验证
    headers['X-Internal-User-ID'] = newSessionId;
    
    // 同时通过URL参数传递
    const separator = url.includes('?') ? '&' : '?';
    url = `${url}${separator}sessionId=${newSessionId}`;
    
    // 也添加到cookie中
    // 使用我们的统一Cookie设置函数
    setCookie('sessionId', newSessionId, {
      path: '/',
      maxAgeDays: 30, // 30天过期
      sameSite: 'Lax',
      secure: window.location.protocol === 'https:'
    });
    
    // 同时设置与服务器匹配的会话cookie名称
    setCookie('warehouse.sid', newSessionId, {
      path: '/',
      maxAgeDays: 30, // 30天过期
      sameSite: 'Lax',
      secure: window.location.protocol === 'https:'
    });
    
    // 如果是认证相关请求，特别记录
    if (path.includes('/api/auth/')) {
      console.log(`${logPrefix} 这是一个认证相关请求，使用新生成的会话ID: ${newSessionId}`);
    }
    
    // 添加请求追踪标识
    headers['X-Request-Time'] = Date.now().toString();
    
    // 返回修改后的URL和增强的请求头
    return { url, headers };
  }
}

// 从cookie中获取值的辅助函数（增强版）
// 以前的getCookieValue已被替换为上面定义的getCookie函数

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
  
  // 清除多种可能的会话cookie
  deleteCookie('sessionId');
  deleteCookie('warehouse.sid');
  deleteCookie('connect.sid');
  deleteCookie('express.sid');
  
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