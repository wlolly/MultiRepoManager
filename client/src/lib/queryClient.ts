import { QueryClient, QueryFunction } from "@tanstack/react-query";

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
  
  // 添加会话ID到请求头中以提高会话持久性
  const headers: Record<string, string> = options?.body ? { "Content-Type": "application/json" } : {};
  const sessionId = sessionStorage.getItem('sessionId');
  
  if (sessionId) {
    console.log(`使用会话ID: ${sessionId}`);
    headers['X-Session-ID'] = sessionId;
  }
  
  try {
    const res = await fetch(url, {
      method: options?.method || 'GET',
      headers: headers,
      body: typeof options?.body === 'string' ? options.body : options?.body ? JSON.stringify(options.body) : undefined,
      credentials: "include",
    });

    console.log(`API Response status: ${res.status}`, res);
    
    // 从响应头中检查是否服务器使用了我们提供的会话ID
    const originalSessionId = res.headers.get('X-Original-Session-ID');
    const clientSessionId = res.headers.get('X-Client-Session-ID');
    
    if (originalSessionId && clientSessionId) {
      console.log(`服务器信息 - 原始会话ID: ${originalSessionId}, 客户端会话ID: ${clientSessionId}`);
    }
    
    if (!res.ok) {
      const text = await res.text();
      console.error(`API Error (${res.status}): ${text || res.statusText}`);
      throw new Error(`${res.status}: ${text || res.statusText}`);
    }
    
    const data = await res.json();
    console.log("API Response data:", data);
    
    // 如果响应中包含会话ID，保存到sessionStorage
    if (data.sessionId) {
      console.log(`从API响应中保存会话ID: ${data.sessionId}`);
      sessionStorage.setItem('sessionId', data.sessionId);
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
    // 从sessionStorage获取会话ID
    const sessionId = sessionStorage.getItem('sessionId');
    
    // 准备请求头，如果有会话ID则添加到请求头中
    const headers: Record<string, string> = {};
    if (sessionId) {
      console.log(`查询使用会话ID: ${sessionId}`);
      headers['X-Session-ID'] = sessionId;
    }
    
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
      headers: headers
    });
    
    // 从响应头中检查是否服务器使用了我们提供的会话ID
    const originalSessionId = res.headers.get('X-Original-Session-ID');
    const clientSessionId = res.headers.get('X-Client-Session-ID');
    
    if (originalSessionId && clientSessionId) {
      console.log(`服务器信息 - 原始会话ID: ${originalSessionId}, 客户端会话ID: ${clientSessionId}`);
    }

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      console.log(`查询返回401未授权: ${queryKey[0]}`);
      return null;
    }

    await throwIfResNotOk(res);
    const data = await res.json();
    
    // 如果响应中包含会话ID，保存到sessionStorage
    if (data && data.sessionId) {
      console.log(`从查询响应中保存会话ID: ${data.sessionId}`);
      sessionStorage.setItem('sessionId', data.sessionId);
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
