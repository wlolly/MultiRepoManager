import React from "react";
import { useAuthStatus } from "@/hooks/use-auth-status";
import { PublicDashboard } from "./dashboard/public-dashboard";
import { TeamDashboard } from "./dashboard/team-dashboard";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * 主仪表盘组件
 * 根据用户认证状态选择显示公共仪表盘或团队仪表盘
 */
export default function Dashboard() {
  // 使用新的认证状态钩子，获取realAuthenticated标志
  const { realAuthenticated, isLoading } = useAuthStatus();

  // 根据真实认证状态选择仪表盘
  if (isLoading) {
    return (
      <div className="container mx-auto p-8">
        <Skeleton className="h-12 w-3/4 mb-6" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
        <div className="grid gap-6 md:grid-cols-2 mt-6">
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
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
