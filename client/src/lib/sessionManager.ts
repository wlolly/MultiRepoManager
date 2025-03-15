/**
 * 会话管理器
 * 统一管理客户端会话相关功能
 * 支持会话持久化和多存储层同步
 * 提供请求防重复、会话一致性、自动恢复等功能
 */

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

// 从各种可能的存储中获取会话ID
export function getSessionId(): string {
  // 1. 如果已经有缓存的会话ID，优先返回（提高性能）
  if (currentSessionId) {
    return currentSessionId;
  }

  // 2. 从所有可能的存储中检索会话ID
  // 优先级：sessionStorage > localStorage > cookie
  const sessionIdFromSession = sessionStorage.getItem('sessionId');
  const sessionIdFromLocal = localStorage.getItem('sessionId');
  const sessionIdFromCookie = getCookie('sessionId');
  
  // 输出调试信息，帮助追踪会话ID来源
  console.log('会话ID来源检查:', {
    sessionStorage: sessionIdFromSession || '无',
    localStorage: sessionIdFromLocal || '无',
    cookie: sessionIdFromCookie || '无'
  });
  
  // 检查是否以前生成的会话ID被存储在不同位置
  let sessionId: string | null = null;
  
  // 跟踪找到的所有会话ID，防止使用不一致的ID
  const foundIds: string[] = [];
  if (sessionIdFromSession) foundIds.push(sessionIdFromSession);
  if (sessionIdFromLocal) foundIds.push(sessionIdFromLocal);
  if (sessionIdFromCookie) foundIds.push(sessionIdFromCookie);
  
  // 3. 检查是否有不一致的会话ID - 如果所有ID相同，则使用该ID
  if (foundIds.length > 0) {
    const allSame = foundIds.every(id => id === foundIds[0]);
    
    if (allSame) {
      // 所有存储位置的ID都一致，直接使用
      sessionId = foundIds[0];
      
      // 记录会话成功加载
      console.log(`从存储中加载会话ID (一致): ${sessionId}`);
    } else {
      // 存在不一致的会话ID情况
      console.log(`从存储中找到不一致的会话ID: ${foundIds.join(', ')}`);
      
      // 使用存在时间最长的会话ID：sessionStorage仅在当前浏览上下文，
      // localStorage和cookie更持久，优先使用localStorage
      sessionId = sessionIdFromLocal || sessionIdFromSession || sessionIdFromCookie;
      
      console.log(`选择最优会话ID: ${sessionId}`);
    }
  }
  
  // 4. 如果没有找到会话ID，生成一个新ID并保存起来
  if (!sessionId) {
    sessionId = generateSessionId();
    console.log(`没有找到现有会话ID，生成新ID: ${sessionId}`);
  }
  
  // 5. 确保会话ID在所有存储层同步一致
  saveSessionId(sessionId);
  currentSessionId = sessionId;
  
  return sessionId;
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
    
    // 设置会话cookie (30天有效期)
    const maxAge = 30 * 24 * 60 * 60; // 30天过期，单位：秒
    
    // 使用我们的统一Cookie设置函数
    setCookie('sessionId', sessionId, {
      path: '/',
      maxAge,
      sameSite: 'Lax',
      secure: window.location.protocol === 'https:'
    });
    
    // 同时设置与服务器匹配的会话cookie名称
    setCookie('warehouse.sid', sessionId, {
      path: '/',
      maxAge,
      sameSite: 'Lax',
      secure: window.location.protocol === 'https:'
    });
    
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
  // 尝试从各种响应头中获取会话ID (注意：服务器可能使用不同的头名称，需要检查多个)
  const originalSessionId = headers.get('X-Original-Session-ID') || headers.get('X-Session-ID');
  const clientSessionId = headers.get('X-Client-Session-ID');
  const responseSessionId = headers.get('X-Response-Session-ID');
  const isAuthenticated = headers.get('X-Session-Authenticated') === 'true';
  const requiresBinding = headers.get('X-Requires-Binding') === 'true';
  const userId = headers.get('X-User-ID');
  const sessionRestored = headers.get('X-Session-Restored') === 'true';
  
  // 记录会话处理的来源URL和方法，帮助调试
  const sourceUrl = headers.get('X-Source-URL') || headers.get('X-Request-Path') || '未知URL';
  const requestMethod = headers.get('X-Request-Method') || '未知方法';
  
  // 追踪所有会话相关响应头
  const headerInfo: Record<string, string> = {};
  headers.forEach((value, key) => {
    if (key.toLowerCase().includes('session') || key.toLowerCase().includes('cookie') || 
        key.toLowerCase().includes('auth') || key.toLowerCase().includes('binding') ||
        key.toLowerCase().includes('user-id')) {
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
  
  // 特殊情况：如果这是一个关于当前用户的响应，我们应该始终使用它的会话ID
  const isCurrentUserApi = sourceUrl.includes('/api/auth/current-user');
  
  // 如果服务器明确恢复了会话，应该优先使用服务器提供的会话ID
  if (sessionRestored) {
    console.log(`${logPrefix} 服务器表示会话已恢复`);
    
    if (originalSessionId && originalSessionId !== 'none' && originalSessionId !== '') {
      console.log(`${logPrefix} 使用服务器恢复的会话ID: ${originalSessionId}`);
      saveSessionId(originalSessionId);
      return originalSessionId;
    }
  }
  
  // 如果服务器明确标记了这是已认证会话，并且提供了用户ID
  if (isAuthenticated && userId) {
    console.log(`${logPrefix} 服务器响应表明这是已认证的会话(用户ID: ${userId})`);
    
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
    
    // 特殊情况: 如果这是current-user API，总是使用服务器的会话ID，因为这是专门用于会话恢复的
    if (isCurrentUserApi) {
      console.log(`${logPrefix} 从current-user API获取会话ID: ${originalSessionId}`);
      saveSessionId(originalSessionId);
      return originalSessionId;
    }
    
    // 如果当前客户端已有会话ID，并且会话中有用户数据，需要评估是否保留
    if (currentId && isCurrentlyAuthenticated) {
      // 检查该响应是否是认证请求的响应或会话被明确恢复
      if (isAuthenticated || sourceUrl.includes('/api/auth/') || userId) {
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
    // 如果当前会话已经登录，保留而不覆盖，除非是当前用户API
    if (currentId && isCurrentlyAuthenticated && !isCurrentUserApi) {
      console.log(`${logPrefix} 保留已验证的会话ID: ${currentId} (忽略响应会话: ${responseSessionId})`);
      return currentId;
    }
    
    console.log(`${logPrefix} 从响应头中提取到响应会话ID: ${responseSessionId}`);
    saveSessionId(responseSessionId);
    return responseSessionId;
  }
  
  // 次优先使用客户端会话ID确认
  if (clientSessionId && clientSessionId !== 'none' && clientSessionId !== '') {
    // 如果当前会话已经登录，保留而不覆盖，除非是当前用户API
    if (currentId && isCurrentlyAuthenticated && !isCurrentUserApi) {
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
    headers['X-Session-ID'] = cleanSessionId;
    headers['x-session-id'] = cleanSessionId;
    headers['sessionid'] = cleanSessionId;
    headers['SessionId'] = cleanSessionId;
    headers['session-id'] = cleanSessionId;
    headers['client-session-id'] = cleanSessionId;
    headers['X-Client-Session-ID'] = cleanSessionId;
    
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
    
    // 同时通过URL参数传递（作为备用方案）
    // 使用与服务器期望匹配的参数名称
    const separator = url.includes('?') ? '&' : '?';
    url = `${url}${separator}sessionId=${cleanSessionId}`;
    
    // 也添加到cookie中，进一步增强会话持久性
    const maxAge = 30 * 24 * 60 * 60; // 30天过期，单位：秒
    
    // 使用我们的统一Cookie设置函数
    setCookie('sessionId', cleanSessionId, {
      path: '/',
      maxAge,
      sameSite: 'Lax',
      secure: window.location.protocol === 'https:'
    });
    
    // 同时设置与服务器匹配的会话cookie名称
    setCookie('warehouse.sid', cleanSessionId, {
      path: '/',
      maxAge,
      sameSite: 'Lax',
      secure: window.location.protocol === 'https:'
    });
    
    // 如果是认证相关请求，特别记录
    if (isImportantRequest) {
      console.log(`${logPrefix} 这是一个认证相关请求，会话ID: ${cleanSessionId}, 认证状态: ${isAuthenticated ? '已认证' : '未认证'}`);
    }
  } else {
    // 对于没有会话ID的情况，生成一个新的
    const newSessionId = generateSessionId();
    console.log(`${logPrefix} 没有找到可用的会话ID，生成新ID: ${newSessionId}`);
    
    // 保存并使用新生成的会话ID
    saveSessionId(newSessionId);
    
    // 使用同样的头设置逻辑
    headers['X-Session-ID'] = newSessionId;
    headers['x-session-id'] = newSessionId;
    headers['sessionid'] = newSessionId;
    headers['SessionId'] = newSessionId;
    headers['session-id'] = newSessionId;
    headers['client-session-id'] = newSessionId;
    headers['X-Client-Session-ID'] = newSessionId;
    
    // 同时通过URL参数传递
    const separator = url.includes('?') ? '&' : '?';
    url = `${url}${separator}sessionId=${newSessionId}`;
    
    // 也添加到cookie中
    const maxAge = 30 * 24 * 60 * 60; // 30天过期，单位：秒
    
    // 使用我们的统一Cookie设置函数
    setCookie('sessionId', newSessionId, {
      path: '/',
      maxAge,
      sameSite: 'Lax',
      secure: window.location.protocol === 'https:'
    });
    
    // 同时设置与服务器匹配的会话cookie名称
    setCookie('warehouse.sid', newSessionId, {
      path: '/',
      maxAge,
      sameSite: 'Lax',
      secure: window.location.protocol === 'https:'
    });
    
    // 如果是认证相关请求，特别记录
    if (path.includes('/api/auth/')) {
      console.log(`${logPrefix} 这是一个认证相关请求，使用新生成的会话ID: ${newSessionId}`);
    }
  }
  
  // 添加请求追踪标识
  headers['X-Request-Time'] = Date.now().toString();
  
  return { url, headers };
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