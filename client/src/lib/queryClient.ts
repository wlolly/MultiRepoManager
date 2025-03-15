import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { getSessionId, saveSessionId, attachSessionToRequest, processResponseHeaders } from "./sessionManager";

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
  // 1. 首先尝试从响应头获取会话ID (服务器通过X-Original-Session-ID设置)
  const sessionIdFromHeaders = processResponseHeaders(res.headers);
  
  // 2. 如果响应头中没有会话ID，但响应体中有会话ID
  if (!sessionIdFromHeaders && data && data.sessionId) {
    // 检查它是否与当前保存的会话ID不同
    const currentId = getSessionId();
    
    if (!currentId || currentId !== data.sessionId) {
      console.log(`从API响应体中保存新会话ID: ${data.sessionId} (当前ID: ${currentId || '无'})`);
      saveSessionId(data.sessionId);
    }
  }
  
  // 3. 如果是认证响应，始终接受该会话ID
  if (data && data.hasOwnProperty('authenticated')) {
    if (data.sessionId) {
      console.log(`认证响应中包含会话ID: ${data.sessionId}，保存它以确保会话一致性`);
      saveSessionId(data.sessionId);
    }
  }
  
  // 4. 如果发现会话过期错误，清除本地会话状态
  if (res.status === 401 && data && data.errorCode === 'SESSION_TIMEOUT') {
    console.log('会话已过期，清除本地会话状态');
    // 可以在这里触发会话过期的全局事件
    window.dispatchEvent(new Event('session_expired'));
  }
}

export async function apiRequest<T = any>(
  url: string,
  options?: {
    method?: string;
    body?: any;
  },
): Promise<T> {
  console.log(`API Request to ${url}`, {
    method: options?.method || 'GET',
    body: options?.body
  });
  
  // 初始化请求头
  const headers: Record<string, string> = options?.body ? { "Content-Type": "application/json" } : {};
  
  // 使用会话管理器附加会话ID到请求
  const { url: enhancedUrl, headers: enhancedHeaders } = attachSessionToRequest(url, headers);
  
  try {
    const res = await fetch(enhancedUrl, {
      method: options?.method || 'GET',
      headers: enhancedHeaders,
      body: typeof options?.body === 'string' ? options.body : options?.body ? JSON.stringify(options.body) : undefined,
      credentials: "include", // 这确保cookies会随请求发送
    });

    console.log(`API Response status: ${res.status}`);
    
    if (!res.ok) {
      const errorText = await res.text();
      let errorData;
      
      try {
        // 尝试解析错误响应为JSON
        errorData = JSON.parse(errorText);
        // 处理响应中的会话信息（即使是错误响应）
        handleSessionInfo(res, errorData);
      } catch (e) {
        // 如果不是JSON，使用原始文本
        errorData = { message: errorText || res.statusText };
      }
      
      console.error(`API Error (${res.status}):`, errorData);
      throw new Error(errorData.message || `${res.status}: ${res.statusText}`);
    }
    
    // 如果是成功响应
    const data = await res.json();
    
    // 处理响应中的会话信息
    handleSessionInfo(res, data);
    
    return data;
  } catch (error) {
    console.error("API Request failed:", error);
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // 准备请求头和URL
    const headers: Record<string, string> = {};
    let url = queryKey[0] as string;
    
    // 使用会话管理器附加会话ID到请求
    const { url: enhancedUrl, headers: enhancedHeaders } = attachSessionToRequest(url, headers);
    
    const res = await fetch(enhancedUrl, {
      credentials: "include", // 确保cookies会随请求发送
      headers: enhancedHeaders
    });
    
    // 简单处理401错误
    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      console.log(`查询返回401未授权: ${queryKey[0]}`);
      
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
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
