import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LanguageDistribution } from "@/components/dashboard/language-distribution";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { useAuthStatus } from "@/hooks/use-auth-status";
import { PublicDashboard } from "./public-dashboard";

// Team dashboard stats interface
interface TeamDashboardStats {
  totalProducts: number;
  totalWarehouses: number;
  categoriesCount: number;
  recentOperations: number;
  totalPackages?: number;
  totalWeight?: number;
  totalVolume?: number;
  totalValue?: number;
  avgPrice?: number;
  warehousePermissions: {
    [warehouseId: string]: {
      canView: boolean;
      canManage: boolean;
    }
  };
}

// Accessible warehouse interface
interface AccessibleWarehouse {
  id: number;
  name: string;
  location: string;
  isManageable: boolean;
}

export function TeamDashboard() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("overview");
  const { realAuthenticated, user, loading } = useAuthStatus();
  const [shouldTryFetchingData, setShouldTryFetchingData] = useState(false);
  
  // 监听认证状态和用户变化
  useEffect(() => {
    console.log("TeamDashboard - 认证状态:", realAuthenticated);
    console.log("TeamDashboard - 用户:", user);
    
    // 在用户加载完成且认证状态为真实登录时，尝试获取数据
    if (!loading) {
      // 验证用户是真实认证用户并且具有admin角色
      const isRealAdmin = realAuthenticated && user && user.id !== -1 && user.role === 'admin';
      console.log("TeamDashboard - 是真实管理员:", isRealAdmin);
      setShouldTryFetchingData(isRealAdmin);
      
      // 如果不是真实管理员但试图访问团队仪表盘，记录警告
      if (!isRealAdmin) {
        console.warn("TeamDashboard - 用户没有访问权限，应显示公共仪表盘");
      }
    }
  }, [realAuthenticated, user, loading]);
  
  // 执行团队数据查询，仅在真实用户认证状态下
  const { data: teamStats, isLoading: isStatsLoading, error: statsError } = useQuery<TeamDashboardStats>({
    queryKey: ["/api/stats/team"],
    retry: 3, // 增加重试次数，确保请求成功
    retryDelay: 1000, // 设置1秒的重试延迟 
    enabled: shouldTryFetchingData, // 只在认证用户时启用查询
    staleTime: 1000 * 60 * 5, // 5分钟内不重新获取数据
    refetchOnWindowFocus: false, // 避免窗口聚焦时重新查询
  });
  
  // Fetch warehouses for warehouse permission display
  const { data: allWarehouses, isLoading: isWarehousesLoading } = useQuery({
    queryKey: ["/api/warehouses"],
    enabled: shouldTryFetchingData, // 同样，只有在应该获取数据时才启用查询
  });
  
  // Process accessible warehouses based on permissions
  const accessibleWarehouses: AccessibleWarehouse[] = React.useMemo(() => {
    if (!teamStats?.warehousePermissions || !allWarehouses) return [];
    
    return (Array.isArray(allWarehouses) ? allWarehouses : [])
      .filter((warehouse: any) => {
        if (!warehouse || typeof warehouse !== 'object' || !warehouse.id) return false;
        const permission = teamStats.warehousePermissions[warehouse.id];
        return permission && permission.canView;
      })
      .map((warehouse: any) => ({
        ...warehouse,
        isManageable: teamStats.warehousePermissions[warehouse.id]?.canManage || false
      }));
  }, [teamStats, allWarehouses]);
  
  // 数据获取逻辑已经修改，我们直接尝试获取数据
  // 不再需要这部分条件判断
  
  // 不要在这里执行权限验证，让Dashboard组件完成这个判断
  // 只在有API错误时才显示错误信息
  if (statsError) {
    console.error("TeamDashboard - API错误:", statsError);
    return (
      <div className="container mx-auto py-8">
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                {t("team_stats_access_denied")}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">{t("api_error_title")}</h2>
          <p className="mb-4">{t("api_error_description")}</p>
          <PublicDashboard />
        </div>
      </div>
    );
  }

  // 显示加载状态
  if (isStatsLoading || isWarehousesLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  <Skeleton className="h-4 w-24" />
                </CardTitle>
                <Skeleton className="h-4 w-4 rounded-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-1" />
                <Skeleton className="h-4 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-6 md:grid-cols-2 mt-6">
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  // Check if user has any warehouse permissions
  const hasPermissions = accessibleWarehouses.length > 0;
  
  if (!hasPermissions) {
    return (
      <div className="container mx-auto py-8">
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                {t("no_warehouse_permissions")}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">{t("team_dashboard_no_access_title")}</h2>
          <p className="mb-4">{t("team_dashboard_no_access_description")}</p>
          <Link href="/settings" className="text-blue-500 hover:underline">
            {t("go_to_settings")}
          </Link>
        </div>
      </div>
    );
  }

  // Define statistics cards data
  const stats = [
    {
      title: t("total_products"),
      value: teamStats?.totalProducts.toLocaleString() || "0",
      description: t("team_products_description"),
      icon: "package",
      color: "bg-indigo-500"
    },
    {
      title: t("accessible_warehouses"),
      value: teamStats?.totalWarehouses.toLocaleString() || "0",
      description: t("team_warehouses_description"),
      icon: "home",
      color: "bg-red-500"
    },
    {
      title: t("total_value"),
      value: teamStats?.totalValue ? `$${teamStats.totalValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : "$0",
      description: t("team_value_description"),
      icon: "dollar-sign",
      color: "bg-orange-500"
    },
    {
      title: t("total_weight"),
      value: teamStats?.totalWeight ? `${teamStats.totalWeight.toLocaleString(undefined, { maximumFractionDigits: 2 })} kg` : "0 kg",
      description: t("team_weight_description"),
      icon: "weight",
      color: "bg-emerald-500"
    },
    {
      title: t("total_volume"),
      value: teamStats?.totalVolume ? `${teamStats.totalVolume.toLocaleString(undefined, { maximumFractionDigits: 2 })} m³` : "0 m³",
      description: t("team_volume_description"),
      icon: "box",
      color: "bg-pink-500"
    },
    {
      title: t("categories_count"),
      value: teamStats?.categoriesCount.toLocaleString() || "0",
      description: t("team_categories_description"),
      icon: "tag",
      color: "bg-purple-500"
    }
  ];

  // Render icon based on name
  const renderIcon = (iconName: string) => {
    switch (iconName) {
      case "package":
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16.5 9.4l-9-5.19"></path><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line>
          </svg>
        );
      case "home":
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline>
          </svg>
        );
      case "dollar-sign":
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
          </svg>
        );
      case "weight":
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="5" r="3"></circle><path d="M6.5 8a2 2 0 0 0-1.905 1.46L2.1 18.5A2 2 0 0 0 4 21h16a2 2 0 0 0 1.925-2.54L19.4 9.5A2 2 0 0 0 17.48 8Z"></path><path d="M12 10v7"></path><path d="m9 13 3-3 3 3"></path>
          </svg>
        );
      case "box":
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"></path><path d="m3.3 7 8.7 5 8.7-5"></path><path d="M12 22V12"></path>
          </svg>
        );
      case "tag":
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line>
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{t("team_dashboard_title")}</h1>
        <p className="text-gray-500">{t("team_dashboard_description")}</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <div className={`${stat.color} p-2 rounded-full text-white`}>
                {renderIcon(stat.icon)}
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-gray-500">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Accessible Warehouses List */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>{t("accessible_warehouses_title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {accessibleWarehouses.map((warehouse) => (
              <div key={warehouse.id} className="border rounded-lg p-4 flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-medium">{warehouse.name}</h3>
                  <span className={`text-xs px-2 py-1 rounded ${warehouse.isManageable ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                    {warehouse.isManageable ? t("can_manage") : t("can_view")}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mb-2">{warehouse.location}</p>
                <div className="mt-auto">
                  <Link href={`/warehouses/${warehouse.id}`} className="text-sm text-blue-500 hover:underline">
                    {t("view_warehouse")}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <div className="grid gap-6 md:grid-cols-2">
        <LanguageDistribution teamFiltered={true} />
        <RecentActivity teamFiltered={true} />
      </div>
    </div>
  );
}