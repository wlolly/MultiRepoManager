import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

interface UserData {
  id: number;
  username: string;
  role: string;
  realAuthenticated: boolean;
  authenticated: boolean;
  [key: string]: any;
}

/**
 * 认证状态hook
 * 用于检查用户的认证状态，确定是否为真实登录用户
 * 根据认证状态选择正确的仪表盘（团队或公共）
 */
export function useAuthStatus() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [realAuthenticated, setRealAuthenticated] = useState<boolean | null>(null);
  const [userId, setUserId] = useState<number | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  
  // 获取当前用户数据
  const { data, isLoading, error } = useQuery<UserData>({
    queryKey: ["/api/auth/current-user"],
    retry: false,
    staleTime: 60000, // 1分钟内不重新加载
    gcTime: 300000, // 5分钟后删除缓存
  });
  
  // 当用户数据加载完成或有错误时，更新认证状态
  useEffect(() => {
    if (data) {
      setIsAuthenticated(data.authenticated || false);
      setRealAuthenticated(data.realAuthenticated || false);
      setUserId(data.id || null);
      setUserRole(data.role || null);
    } else if (error) {
      setIsAuthenticated(false);
      setRealAuthenticated(false);
      setUserId(null);
      setUserRole(null);
    }
  }, [data, error]);
  
  return {
    isAuthenticated,
    realAuthenticated,
    userId,
    userRole,
    isLoading: isLoading && isAuthenticated === null // 只有在首次加载且状态未确定时才视为加载中
  };
}