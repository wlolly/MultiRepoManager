import React, { useEffect, useState } from "react";
import { useAuthStatus } from "@/hooks/use-auth-status";
import { PublicDashboard } from "./dashboard/public-dashboard";
import { TeamDashboard } from "./dashboard/team-dashboard";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * 主仪表盘组件
 * 根据用户认证状态选择显示公共仪表盘或团队仪表盘
 */
export default function Dashboard() {
  // 使用认证状态钩子，获取realAuthenticated标志和用户信息
  const { realAuthenticated, user, loading } = useAuthStatus();
  // 默认值设为public，确保页面在加载状态下也能正确地展示
  const [dashboardType, setDashboardType] = useState<'public' | 'team'>('public');

  // 每当认证状态或用户信息改变时，决定要显示的仪表盘类型
  useEffect(() => {
    // 记录调试信息
    console.log("Dashboard组件 - 当前用户:", user);
    console.log("Dashboard组件 - 真实认证状态:", realAuthenticated);
    
    // 判断是否为真实登录用户
    const isRealUser = realAuthenticated && user && user.id !== -1 && user.role === 'admin';
    
    if (isRealUser) {
      console.log("Dashboard组件 - 决定显示团队仪表盘");
      setDashboardType('team');
    } else {
      console.log("Dashboard组件 - 决定显示公共仪表盘");
      setDashboardType('public');
    }
  }, [realAuthenticated, user, loading]);

  // 显示加载状态
  if (loading) {
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

  // 根据决定的仪表盘类型进行渲染
  return (
    <div>
      {dashboardType === 'team' ? (
        // 真实认证用户看到团队仪表盘
        <TeamDashboard />
      ) : (
        // 访客用户或假阳性登录用户看到公共仪表盘
        <PublicDashboard />
      )}
    </div>
  );
}
