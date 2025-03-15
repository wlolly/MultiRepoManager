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
  // 尝试从多个地方获取会话ID，提高获取成功率
  const sessionId = sessionStorage.getItem('sessionId') || localStorage.getItem('sessionId');
  
  if (sessionId) {
    console.log(`API请求使用会话ID: ${sessionId}`);
    headers['X-Session-ID'] = sessionId;
    // 同时通过查询参数传递，确保所有情况都能接收到会话ID
    if (!url.includes('?')) {
      url = `${url}?sessionId=${sessionId}`;
    } else {
      url = `${url}&sessionId=${sessionId}`;
    }
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
    
    // 如果响应中包含会话ID，保存到sessionStorage和localStorage
    if (data.sessionId) {
      console.log(`从API响应中保存会话ID: ${data.sessionId}`);
      sessionStorage.setItem('sessionId', data.sessionId);
      localStorage.setItem('sessionId', data.sessionId);
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
    // 尝试从多个地方获取会话ID，提高获取成功率
    const sessionId = sessionStorage.getItem('sessionId') || localStorage.getItem('sessionId');
    
    // 准备请求头和URL
    const headers: Record<string, string> = {};
    let url = queryKey[0] as string;
    
    if (sessionId) {
      console.log(`查询使用会话ID: ${sessionId}`);
      headers['X-Session-ID'] = sessionId;
      
      // 同时通过查询参数传递，确保所有情况都能接收到会话ID
      if (!url.includes('?')) {
        url = `${url}?sessionId=${sessionId}`;
      } else {
        url = `${url}&sessionId=${sessionId}`;
      }
    }
    
    const res = await fetch(url, {
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
    
    // 如果响应中包含会话ID，保存到sessionStorage和localStorage
    if (data && data.sessionId) {
      console.log(`从查询响应中保存会话ID: ${data.sessionId}`);
      sessionStorage.setItem('sessionId', data.sessionId);
      localStorage.setItem('sessionId', data.sessionId);
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
