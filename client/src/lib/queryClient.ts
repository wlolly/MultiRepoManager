import { QueryClient, QueryFunction, QueryCache } from "@tanstack/react-query";
import { 
  getSessionId,
  saveSessionId,
  attachSessionToRequest,
  getSessionIdFromCookie,
  addSessionHeaders
} from "./sessionSyncHelper";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

/**
 * 处理API响应的会话信息
 * 优先处理响应头中的会话ID信息
 */
function handleSessionInfo(res: Response, data?: any): void {
  // 获取当前URL路径用于日志
  const url = res.url || '未知URL';
  const logPrefix = `[QueryClient] ${url} |`;

  // 优先处理认证相关响应
  if (data && data.hasOwnProperty('authenticated')) {
    // 先检查响应中的会话ID
    if (data.sessionId) {
      console.log(`${logPrefix} 认证响应中包含会话ID: ${data.sessionId}，保存它以确保会话一致性`);
      saveSessionId(data.sessionId);
      return; // 认证请求已经处理了会话ID，不需要继续处理
    }
  }

  // 1. 尝试从响应头获取会话ID (服务器通过X-Original-Session-ID设置)
  const sessionIdFromHeaders = res.headers.get('X-New-Session-ID') || 
                              res.headers.get('X-Original-Session-ID') || 
                              res.headers.get('X-Session-ID');
  
  // 2. 如果响应头中没有会话ID，但响应体中有会话ID
  if (!sessionIdFromHeaders && data && data.sessionId) {
    // 检查它是否与当前保存的会话ID不同
    const currentId = getSessionId();
    
    // 如果当前没有会话ID或者服务器返回了不同的会话ID
    if (!currentId || currentId !== data.sessionId) {
      console.log(`${logPrefix} 从API响应体中保存新会话ID: ${data.sessionId} (当前ID: ${currentId || '无'})`);
      saveSessionId(data.sessionId);
    } else {
      console.log(`${logPrefix} 确认会话ID: ${currentId}`);
    }
  }
  
  // 3. 处理401错误，但不是会话过期
  if (res.status === 401) {
    const isTimeout = data && data.errorCode === 'SESSION_TIMEOUT';
    
    if (isTimeout) {
      console.log(`${logPrefix} 会话已过期，清除本地会话状态`);
      // 触发会话过期的全局事件
      window.dispatchEvent(new Event('session_expired'));
    } else if (data && data.sessionId) {
      // 401但有新会话ID - 可能是需要重新登录，保存新会话ID
      console.log(`${logPrefix} 未认证响应，但包含新会话ID: ${data.sessionId}`);
      saveSessionId(data.sessionId);
    }
  }
}

export async function apiRequest<T = any>(
  url: string,
  options?: {
    method?: string;
    body?: any;
    preferExistingSession?: boolean; // 新增参数：是否优先使用现有会话
  },
): Promise<T> {
  const method = options?.method || 'GET';
  const preferExistingSession = options?.preferExistingSession ?? true; // 默认优先使用现有会话
  
  // 获取简短URL用于日志
  const urlObj = new URL(url, window.location.origin);
  const shortUrl = urlObj.pathname;
  
  console.log(`[API] ${method} ${shortUrl}`, {
    bodySize: options?.body ? JSON.stringify(options.body).length : 0,
    preferExistingSession
  });
  
  // 初始化请求头
  const headers: Record<string, string> = options?.body ? { "Content-Type": "application/json" } : {};
  
  // 添加特定请求头，记录请求来源和方法
  headers['X-HTTP-Method'] = method;
  headers['X-Source-URL'] = shortUrl;
  headers['X-Request-Time'] = new Date().toISOString();
  
  // 添加是否优先使用现有会话的标志
  headers['X-Prefer-Existing-Session'] = preferExistingSession ? 'true' : 'false';
  
  // 使用会话管理器附加会话ID到请求
  const { url: enhancedUrl, headers: enhancedHeaders } = attachSessionToRequest(url, headers);
  
  // 记录当前使用的会话ID
  const sessionId = enhancedHeaders['X-Session-ID'] || '未知';
  console.log(`[API] 使用会话ID: ${sessionId.substring(0, 8)}...`);
  
  try {
    // 增加请求超时设置
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒超时
    
    const res = await fetch(enhancedUrl, {
      method,
      headers: enhancedHeaders,
      body: typeof options?.body === 'string' ? options.body : options?.body ? JSON.stringify(options.body) : undefined,
      credentials: "include", // 确保cookies会随请求发送
      signal: controller.signal
    });
    
    // 清除超时
    clearTimeout(timeoutId);

    // 记录关键HTTP头信息
    const logHeaders: Record<string, string> = {};
    res.headers.forEach((value, key) => {
      if (key.toLowerCase().includes('session') || 
          key.toLowerCase().includes('cookie') || 
          key.toLowerCase().includes('auth')) {
        logHeaders[key] = value;
      }
    });
    
    console.log(`[API] ${method} ${shortUrl} 响应: ${res.status}`, { 
      headers: Object.keys(logHeaders).length > 0 ? logHeaders : '无关键头信息' 
    });
    
    // 检查响应是否包含新的会话ID
    const resSessionId = res.headers.get('X-Original-Session-ID') || res.headers.get('X-Session-ID');
    if (resSessionId && resSessionId !== sessionId && resSessionId !== 'none') {
      console.log(`[API] 服务器返回了新的会话ID: ${resSessionId.substring(0, 8)}...`);
    }
    
    if (!res.ok) {
      const errorText = await res.text();
      let errorData;
      
      try {
        // 尝试解析错误响应为JSON
        errorData = JSON.parse(errorText);
        // 处理响应中的会话信息（即使是错误响应）
        handleSessionInfo(res, errorData);
        
        // 更详细的错误日志
        console.error(`[API] ${method} ${shortUrl} 错误 (${res.status}):`, {
          message: errorData.message || res.statusText,
          errorCode: errorData.errorCode || 'UNKNOWN',
          sessionId: errorData.sessionId || '无',
          details: errorData.errors || errorData.details || '无详细信息'
        });
      } catch (e) {
        // 如果不是JSON，使用原始文本
        errorData = { message: errorText || res.statusText };
        console.error(`[API] ${method} ${shortUrl} 错误 (${res.status}): ${errorText || res.statusText}`);
      }
      
      const error = new Error(errorData.message || `${res.status}: ${res.statusText}`);
      (error as any).status = res.status;
      (error as any).errorCode = errorData.errorCode;
      (error as any).sessionId = errorData.sessionId;
      throw error;
    }
    
    // 先处理响应头中的会话信息，确保会话ID得到更新
    const newSessionId = res.headers.get('X-New-Session-ID') || 
                         res.headers.get('X-Original-Session-ID') || 
                         res.headers.get('X-Session-ID');
    if (newSessionId) {
      saveSessionId(newSessionId);
    }
    
    // 解析响应体
    let data: T;
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await res.json();
      
      // 处理响应中的会话信息
      handleSessionInfo(res, data);
      
      // 记录成功响应
      if (url.includes('/auth/')) {
        console.log(`[API] ${method} ${shortUrl} 成功响应:`, {
          authenticated: (data as any).authenticated || false,
          sessionId: (data as any).sessionId ? ((data as any).sessionId as string).substring(0, 8) + '...' : '无',
          requiresBinding: (data as any).requiresBinding || false
        });
      }
    } else {
      // 非JSON响应
      const text = await res.text();
      console.log(`[API] ${method} ${shortUrl} 非JSON响应: ${text.substring(0, 100)}...`);
      data = text as unknown as T;
    }
    
    return data;
  } catch (error) {
    // 区分网络错误和业务逻辑错误
    if ((error as any).name === 'AbortError') {
      console.error(`[API] ${method} ${shortUrl} 请求超时`);
      throw new Error(`请求超时: ${shortUrl}`);
    }
    
    if (!(error as any).status) {
      // 网络错误，而不是服务器返回的错误状态
      console.error(`[API] ${method} ${shortUrl} 网络错误:`, error);
      throw new Error(`网络连接错误: ${(error as Error).message}`);
    }
    
    // 继续抛出原始错误
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";

// 对于特定的API路径，控制缓存和重试行为
const API_PATH_CONFIG: Record<string, { 
  cacheTime?: number; // 缓存时间(毫秒)
  maxRetries?: number; // 最大重试次数
  staleTime?: number; // 过期时间(毫秒)
  retryDelay?: number; // 重试延迟(毫秒)
}> = {
  '/api/auth/current-user': {
    cacheTime: 10 * 60 * 1000, // 缓存10分钟
    maxRetries: 1, // 最多重试1次
    staleTime: 60 * 1000, // 1分钟后标记为过期
    retryDelay: 3000 // 3秒重试延迟
  },
  '/api/repositories': {
    cacheTime: 5 * 60 * 1000, // 缓存5分钟
    staleTime: 2 * 60 * 1000 // 2分钟后标记为过期
  }
};

// 查询函数缓存，防止会话ID请求泛滥
const queryCache = new Map<string, {
  timestamp: number,
  promise: Promise<any>,
  data: any
}>();

// 查询防抖计时器
const debounceTimers = new Map<string, NodeJS.Timeout>();

export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // 准备请求头和URL
    const headers: Record<string, string> = {};
    let url = queryKey[0] as string;
    
    // 获取URL路径
    const urlObj = new URL(url, window.location.origin);
    const path = urlObj.pathname;
    
    // 获取此API路径的特定配置
    const pathConfig = API_PATH_CONFIG[path] || {};
    
    // 为特定API路径实现防抖
    if (path === '/api/auth/current-user') {
      // 生成一个唯一的查询键
      const cacheKey = JSON.stringify(queryKey);
      
      // 如果已有未过期的缓存，直接返回缓存的数据
      const cached = queryCache.get(cacheKey);
      const now = Date.now();
      
      if (cached && (now - cached.timestamp < (pathConfig.cacheTime || 30000))) {
        console.log(`[QueryClient] 使用缓存响应: ${path}`);
        
        // 如果有正在进行的请求，等待它完成
        if (!cached.data && cached.promise) {
          console.log(`[QueryClient] 等待进行中的请求: ${path}`);
          return cached.promise;
        }
        
        return cached.data;
      }
      
      // 如果有防抖计时器，清除它
      if (debounceTimers.has(cacheKey)) {
        clearTimeout(debounceTimers.get(cacheKey)!);
      }
      
      // 创建新的请求并设置防抖
      const promise = new Promise<any>((resolve, reject) => {
        // 添加300毫秒防抖
        debounceTimers.set(cacheKey, setTimeout(async () => {
          try {
            // 使用会话管理器附加会话ID到请求
            const { url: enhancedUrl, headers: enhancedHeaders } = attachSessionToRequest(url, headers);
            
            // 发送请求
            console.log(`[QueryClient] 发送请求: ${path}`);
            const res = await fetch(enhancedUrl, {
              credentials: "include",
              headers: enhancedHeaders
            });
            
            // 处理401错误
            if (unauthorizedBehavior === "returnNull" && res.status === 401) {
              console.log(`[QueryClient] 查询返回401未授权: ${path}`);
              
              try {
                const errorText = await res.text();
                const errorData = JSON.parse(errorText);
                handleSessionInfo(res, errorData);
                
                // 更新缓存
                queryCache.set(cacheKey, {
                  timestamp: Date.now(),
                  promise: null as any,
                  data: null
                });
                
                resolve(null);
              } catch (e) {
                handleSessionInfo(res);
                resolve(null);
              }
              return;
            }
            
            // 处理其他错误
            if (!res.ok) {
              const errorText = await res.text();
              let errorData;
              try {
                errorData = JSON.parse(errorText);
              } catch (e) {
                errorData = { message: errorText || res.statusText };
              }
              throw new Error(errorData.message || `${res.status}: ${res.statusText}`);
            }
            
            // 处理成功响应
            const data = await res.json();
            handleSessionInfo(res, data);
            
            // 更新缓存
            queryCache.set(cacheKey, {
              timestamp: Date.now(),
              promise: null as any,
              data
            });
            
            resolve(data);
          } catch (error) {
            console.error(`[QueryClient] 请求失败: ${path}`, error);
            queryCache.delete(cacheKey); // 从缓存中移除失败的请求
            reject(error);
          } finally {
            debounceTimers.delete(cacheKey);
          }
        }, 300));
      });
      
      // 添加到缓存
      queryCache.set(cacheKey, {
        timestamp: Date.now(),
        promise,
        data: null
      });
      
      return promise;
    }
    
    // 对于非特殊处理的路径，使用普通逻辑
    // 使用会话管理器附加会话ID到请求
    const { url: enhancedUrl, headers: enhancedHeaders } = attachSessionToRequest(url, headers);
    
    // 增加请求超时设置
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒超时
    
    try {
      const res = await fetch(enhancedUrl, {
        credentials: "include", // 确保cookies会随请求发送
        headers: enhancedHeaders,
        signal: controller.signal
      });
      
      // 清除超时
      clearTimeout(timeoutId);
      
      // 简单处理401错误
      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        console.log(`[QueryClient] 查询返回401未授权: ${path}`);
        
        // 尝试解析错误响应
        let errorData;
        try {
          const errorText = await res.text();
          errorData = JSON.parse(errorText);
          // 处理会话信息
          handleSessionInfo(res, errorData);
        } catch (e) {
          // 如果解析失败，至少处理响应头
          handleSessionInfo(res);
        }
        
        return null;
      }
  
      // 处理其他错误
      await throwIfResNotOk(res);
      
      // 处理成功响应
      const data = await res.json();
      
      // 处理响应中的会话信息
      handleSessionInfo(res, data);
      
      return data;
    } catch (error) {
      // 如果超时了，抛出明确的错误
      if ((error as any).name === 'AbortError') {
        throw new Error(`请求超时: ${path}`);
      }
      throw error;
    }
  };

/**
 * 基于路径决定查询配置
 * @param queryKey 查询键
 */
function getQueryConfigForPath(queryKey: unknown[]): {
  retry: boolean | number;
  retryDelay?: (attemptIndex: number) => number;
  staleTime?: number;
  cacheTime?: number;
} {
  if (!queryKey || !queryKey.length || typeof queryKey[0] !== 'string') {
    return { retry: false, staleTime: Infinity };
  }

  const path = queryKey[0] as string;
  
  // 身份验证请求特殊处理
  if (path.includes('/api/auth/')) {
    return {
      retry: 1, // 最多重试1次
      retryDelay: (attemptIndex) => Math.min(1000 * Math.pow(2, attemptIndex), 10000), // 指数退避
      staleTime: 60 * 1000, // 1分钟过期
      cacheTime: 5 * 60 * 1000 // 5分钟缓存
    };
  }
  
  // 仓库管理相关的API请求
  if (path.includes('/api/warehouses') || path.includes('/api/products')) {
    return {
      retry: 1,
      retryDelay: (attemptIndex) => 1000 * Math.pow(1.5, attemptIndex),
      staleTime: 2 * 60 * 1000, // 2分钟过期
      cacheTime: 5 * 60 * 1000 // 5分钟缓存
    };
  }
  
  // 默认配置
  return {
    retry: false,
    staleTime: Infinity
  };
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
      retryDelay: (attemptIndex) => Math.min(1000 * Math.pow(2, attemptIndex), 30000),
    },
    mutations: {
      retry: false,
    },
  },
  // 实现自定义查询/缓存策略
  queryCache: new QueryCache({
    onError: (error, query) => {
      // 如果error是401错误且是认证相关请求，可以触发重新登录流程
      if ((error as any)?.status === 401 && (query.queryKey[0] as string)?.includes('/api/auth/')) {
        console.log('[QueryCache] 认证请求返回401，可能需要重新登录');
        // 延迟后尝试清除认证状态
        setTimeout(() => {
          window.dispatchEvent(new Event('session_expired'));
        }, 500);
      }
    }
  }),
  // 自定义每个查询的配置
  queryDefaults: (queryKey) => getQueryConfigForPath(queryKey)
});
