import React from "react";
import { StatsCard } from "@/components/dashboard/stats-card";
import { LanguageDistribution } from "@/components/dashboard/language-distribution";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";

interface Stats {
  totalProducts: number;
  totalWarehouses: number;
  categoriesCount: number;
  recentOperations: number;
}

/**
 * 公共仪表盘组件
 * 显示公开的统计数据，不需要登录即可查看
 */
export function PublicDashboard() {
  const { t } = useTranslation();

  // 获取公开统计数据
  const { data: stats, isLoading: isLoadingStats } = useQuery<Stats>({
    queryKey: ["/api/stats/public"],
    staleTime: 5 * 60 * 1000, // 5分钟缓存
  });

  return (
    <div>
      <div className="pb-5 border-b border-gray-200 mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('dashboard_stats_title')}</h1>
          <p className="mt-1 text-gray-500 text-sm">
            {t('dashboard_welcome_public')}
          </p>
        </div>
        
        <div className="mt-4 sm:mt-0">
          <Link href="/login">
            <Button className="flex items-center">
              <i className="ri-login-box-line mr-1.5"></i> {t('login_btn')}
            </Button>
          </Link>
        </div>
      </div>

      {/* 公开数据统计部分 - 对所有用户可见 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatsCard 
          title={t('products_count')} 
          value={isLoadingStats ? "..." : stats?.totalProducts || 0} 
          icon="ri-shopping-bag-line" 
          color="blue" 
        />
        <StatsCard 
          title={t('warehouse')} 
          value={isLoadingStats ? "..." : stats?.totalWarehouses || 0} 
          icon="ri-archive-line" 
          color="green" 
        />
        <StatsCard 
          title={t('category')} 
          value={isLoadingStats ? "..." : stats?.categoriesCount || 0} 
          icon="ri-price-tag-3-line" 
          color="purple" 
        />
        <StatsCard 
          title={t('operations')} 
          value={isLoadingStats ? "..." : stats?.recentOperations || 0} 
          icon="ri-file-list-3-line" 
          color="yellow" 
        />
      </div>
      
      {/* 公共仪表盘欢迎区域 */}
      <div className="mb-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg shadow-sm">
        <h2 className="text-xl font-bold text-gray-900 mb-3">{t('welcome_to_system')}</h2>
        <p className="mb-4 text-gray-600">{t('system_description')}</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="p-4 bg-white rounded-md shadow-sm">
            <i className="ri-store-2-line text-2xl text-blue-500 mb-2"></i>
            <h3 className="font-medium text-gray-900 mb-1">{t('warehouse_management')}</h3>
            <p className="text-sm text-gray-500">{t('warehouse_management_desc')}</p>
          </div>
          <div className="p-4 bg-white rounded-md shadow-sm">
            <i className="ri-truck-line text-2xl text-green-500 mb-2"></i>
            <h3 className="font-medium text-gray-900 mb-1">{t('inventory_tracking')}</h3>
            <p className="text-sm text-gray-500">{t('inventory_tracking_desc')}</p>
          </div>
          <div className="p-4 bg-white rounded-md shadow-sm">
            <i className="ri-bar-chart-box-line text-2xl text-purple-500 mb-2"></i>
            <h3 className="font-medium text-gray-900 mb-1">{t('data_analysis')}</h3>
            <p className="text-sm text-gray-500">{t('data_analysis_desc')}</p>
          </div>
        </div>
        <div className="mt-6 text-center">
          <p className="mb-4 text-gray-600">{t('login_prompt')}</p>
          <Link href="/login">
            <Button size="lg" className="px-8">
              {t('login_now')}
            </Button>
          </Link>
        </div>
      </div>
      
      {/* 语言分布和最近活动 - 公开数据 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LanguageDistribution />
        <RecentActivity />
      </div>
    </div>
  );
}