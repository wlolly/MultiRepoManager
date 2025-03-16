import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';

export interface AuthStatus {
  userId: number;
  userRole: string;
  realAuthenticated: boolean;
  isGuest: boolean;
  isAdmin: boolean;
  fakePositive: boolean;
  loading: boolean;
  error: Error | null;
}

/**
 * 认证状态钩子
 * 用于获取用户真实的认证状态，区分真实用户和假阳性登录用户
 */
export const useAuthStatus = (): AuthStatus => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // 使用react-query获取身份验证状态
  const { data, isLoading, isError, error: queryError } = useQuery({
    queryKey: ['auth-status'],
    queryFn: async () => {
      const response = await fetch('/api/auth/status');
      if (!response.ok) {
        throw new Error('Failed to fetch authentication status');
      }
      return response.json();
    },
    retry: 1,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5分钟缓存
  });

  // 同步加载状态
  useEffect(() => {
    setLoading(isLoading);
    if (isError && queryError) {
      setError(queryError as Error);
    }
  }, [isLoading, isError, queryError]);

  // 如果请求失败或数据不可用，提供默认的游客状态
  if (!data && !isLoading) {
    return {
      userId: -1,
      userRole: 'anonymous',
      realAuthenticated: false,
      isGuest: true,
      isAdmin: false,
      fakePositive: true,
      loading,
      error
    };
  }

  return {
    userId: data?.userId ?? -1,
    userRole: data?.userRole ?? 'anonymous',
    realAuthenticated: data?.realAuthenticated ?? false,
    isGuest: data?.isGuest ?? true,
    isAdmin: data?.isAdmin ?? false,
    fakePositive: data?.fakePositive ?? true,
    loading,
    error
  };
};