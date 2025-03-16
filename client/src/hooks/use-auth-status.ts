import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

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
  const { data: userData, isLoading } = useQuery({
    queryKey: ["/api/auth/current-user"],
    retry: false,
    // 失败时不要报错，因为未登录用户会返回401
    onError: () => {
      setIsAuthenticated(false);
      setRealAuthenticated(false);
    }
  });
  
  // 当用户数据加载完成时，更新认证状态
  useEffect(() => {
    if (userData) {
      setIsAuthenticated(true);
      setRealAuthenticated(userData.realAuthenticated || false);
      setUserId(userData.id || null);
      setUserRole(userData.role || null);
    }
  }, [userData]);
  
  return {
    isAuthenticated,
    realAuthenticated,
    userId,
    userRole,
    isLoading: isLoading && isAuthenticated === null // 只有在首次加载且状态未确定时才视为加载中
  };
}