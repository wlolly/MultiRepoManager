import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LanguageDistribution } from "@/components/dashboard/language-distribution";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";

// Public dashboard stats interface
interface PublicDashboardStats {
  totalProducts: number;
  totalWarehouses: number;
  categoriesCount: number;
  recentOperations: number;
}

export function PublicDashboard() {
  const { t } = useTranslation();
  
  // Fetch public stats
  const { data: publicStats, isLoading } = useQuery<PublicDashboardStats>({
    queryKey: ["/api/stats/public"],
  });

  if (isLoading) {
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

  // Define statistics cards data
  const stats = [
    {
      title: t("total_products"),
      value: publicStats?.totalProducts.toLocaleString() || "0",
      description: t("total_products_description"),
      icon: "package",
      color: "bg-blue-500"
    },
    {
      title: t("total_warehouses"),
      value: publicStats?.totalWarehouses.toLocaleString() || "0",
      description: t("total_warehouses_description"),
      icon: "home",
      color: "bg-green-500"
    },
    {
      title: t("categories_count"),
      value: publicStats?.categoriesCount.toLocaleString() || "0",
      description: t("categories_description"),
      icon: "tag",
      color: "bg-purple-500"
    },
    {
      title: t("recent_operations"),
      value: publicStats?.recentOperations.toLocaleString() || "0",
      description: t("recent_operations_description"),
      icon: "activity",
      color: "bg-yellow-500"
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
      case "tag":
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line>
          </svg>
        );
      case "activity":
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{t("public_dashboard_title")}</h1>
        <p className="text-gray-500">{t("public_dashboard_description")}</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
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

      {/* Main Content */}
      <div className="grid gap-6 md:grid-cols-2">
        <LanguageDistribution teamFiltered={false} />
        <RecentActivity teamFiltered={false} />
      </div>

      {/* Login Call to Action */}
      <div className="mt-8 p-6 bg-blue-50 rounded-lg">
        <h2 className="text-xl font-bold mb-2">{t("login_to_access_more")}</h2>
        <p className="mb-4">{t("login_to_access_more_description")}</p>
        <Link href="/login" className="inline-block bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded transition-colors">
          {t("login_button")}
        </Link>
      </div>
    </div>
  );
}