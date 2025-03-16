import React, { useEffect, useState } from "react";
import { useAuthStatus } from "@/hooks/use-auth-status";
import { PublicDashboard } from "./dashboard/public-dashboard";
import { TeamDashboard } from "./dashboard/team-dashboard";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * 主仪表盘组件
 * 根据用户认证状态选择显示公共仪表盘或团队仪表盘
 * 增强处理状态变化的稳定性
 */
export default function Dashboard() {
  // 使用认证状态钩子，获取realAuthenticated标志和用户信息
  const { realAuthenticated, user, loading } = useAuthStatus();
  // 默认值设为public，确保页面在加载状态下也能正确地展示
  const [dashboardType, setDashboardType] = useState<'public' | 'team'>('public');
  // 添加延迟加载状态，防止在认证状态变化时出现闪烁
  const [stableLoading, setStableLoading] = useState(true);
  
  // 添加稳定性延迟，确保状态稳定后再渲染
  useEffect(() => {
    // 设置短暂延迟，确保用户信息和认证状态加载完成
    const timer = setTimeout(() => {
      setStableLoading(false);
    }, 300);
    
    return () => clearTimeout(timer);
  }, []);

  // 每当认证状态或用户信息改变时，决定要显示的仪表盘类型
  useEffect(() => {
    // 记录调试信息
    console.log("Dashboard组件 - 当前用户:", user);
    console.log("Dashboard组件 - 真实认证状态:", realAuthenticated);
    
    if (loading) {
      console.log("Dashboard组件 - 加载中，暂不切换仪表盘类型");
      return; // 在加载状态下不更改仪表盘类型
    }
    
    // 判断是否为真实登录用户 - 必须满足所有条件：
    // 1. 真实认证状态为true
    // 2. 用户对象存在
    // 3. 用户ID不为-1（不是游客）
    // 4. 用户角色为admin
    const isRealUser = realAuthenticated === true && 
                       user !== null && 
                       user !== undefined && 
                       user.id !== -1 && 
                       (user.role === 'admin' || user.role === 'super_admin');
    
    if (isRealUser) {
      console.log("Dashboard组件 - 决定显示团队仪表盘");
      setDashboardType('team');
    } else {
      console.log("Dashboard组件 - 决定显示公共仪表盘");
      setDashboardType('public');
    }
  }, [realAuthenticated, user, loading]);

  // 显示加载状态 - 同时考虑钩子的loading状态和组件自身的stableLoading状态
  if (loading || stableLoading) {
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
  // 提前创建好组件实例，避免在渲染时出现延迟
  const teamDashboard = <TeamDashboard />;
  const publicDashboard = <PublicDashboard />;
  
  return (
    <div>
      {dashboardType === 'team' ? teamDashboard : publicDashboard}
    </div>
  );
}
