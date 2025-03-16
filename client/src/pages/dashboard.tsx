import React from "react";
import { useAuthStatus } from "@/hooks/use-auth-status";
import { PublicDashboard } from "./dashboard/public-dashboard";
import { TeamDashboard } from "./dashboard/team-dashboard";

/**
 * 主仪表盘组件
 * 根据用户认证状态选择显示公共仪表盘或团队仪表盘
 */
export default function Dashboard() {
  // 使用新的认证状态钩子，获取realAuthenticated标志
  const { realAuthenticated, loading } = useAuthStatus();

  // 根据真实认证状态选择仪表盘
  if (loading) {
    return <div className="p-8 text-center">正在加载仪表盘...</div>;
  }

  return (
    <div>
      {realAuthenticated ? (
        // 真实认证用户看到团队仪表盘
        <TeamDashboard />
      ) : (
        // 访客用户或假阳性登录用户看到公共仪表盘
        <PublicDashboard />
      )}
    </div>
  );
}
