import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { getSessionId, saveSessionId, attachSessionToRequest, processResponseHeaders } from "./sessionManager";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
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
      credentials: "include",
    });

    console.log(`API Response status: ${res.status}`, res);
    
    // 处理响应头中的会话信息
    processResponseHeaders(res.headers);
    
    if (!res.ok) {
      const text = await res.text();
      console.error(`API Error (${res.status}): ${text || res.statusText}`);
      throw new Error(`${res.status}: ${text || res.statusText}`);
    }
    
    const data = await res.json();
    console.log("API Response data:", data);
    
    // 如果响应中包含会话ID，使用会话管理器保存
    if (data.sessionId) {
      console.log(`从API响应中保存会话ID: ${data.sessionId}`);
      saveSessionId(data.sessionId);
    }
    
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
      credentials: "include",
      headers: enhancedHeaders
    });
    
    // 处理响应头中的会话信息
    processResponseHeaders(res.headers);

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      console.log(`查询返回401未授权: ${queryKey[0]}`);
      return null;
    }

    await throwIfResNotOk(res);
    const data = await res.json();
    
    // 如果响应中包含会话ID，使用会话管理器保存
    if (data && data.sessionId) {
      console.log(`从查询响应中保存会话ID: ${data.sessionId}`);
      saveSessionId(data.sessionId);
    }
    
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
