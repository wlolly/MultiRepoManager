import React, { useState } from "react";
import { StatsCard } from "@/components/dashboard/stats-card";
import { ProductList } from "@/components/products/product-list";
import { ProductGrid } from "@/components/products/product-grid";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { CreateProductDialog } from "@/components/products/create-product-dialog";
import { useTranslation } from "react-i18next";
import { LanguageDistribution } from "@/components/dashboard/language-distribution";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { useAuthStatus } from "@/hooks/use-auth-status";

// 产品类型定义
interface Product {
  id: number;
  name: string;
  description: string;
  barcode: string;
  category: string;
  stock: number;
  price: number;
  cost: number;
  
  // 单件尺寸和重量信息
  singleLengthCm: number;
  singleWidthCm: number;
  singleHeightCm: number;
  singleWeightKg: number;
  singleVolumeM3: number;
  
  // 整件包装信息
  bulkLengthCm: number;
  bulkWidthCm: number;
  bulkHeightCm: number;
  bulkWeightKg: number;
  bulkVolumeM3: number;
  
  createdAt: string;
  updatedAt: string;
  warehouse: {
    id: number;
    name: string;
    location: string;
    imageUrl: string;
  };
  suppliers?: {
    id: number;
    name: string;
    contact?: string;
    avatarUrl?: string;
  }[];
}

// 团队统计数据类型
interface TeamStats {
  totalProducts: number;
  totalWarehouses: number;
  categoriesCount: number;
  recentOperations: number;
  totalPackages: number;
  totalWeight: number;
  totalVolume: number;
  totalValue: number;
  avgPrice: number;
  warehousePermissions: {
    [warehouseId: number]: {
      canView: boolean;
      canManage: boolean;
      warehouseName: string;
    }
  };
}

/**
 * 团队仪表盘组件
 * 显示基于用户团队权限的数据，只有登录用户可见
 */
export function TeamDashboard() {
  const { t } = useTranslation();
  const { userId, userRole, realAuthenticated } = useAuthStatus();
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [warehouseFilter, setWarehouseFilter] = useState<string>("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // 获取团队统计数据（基于团队权限）
  const { data: teamStats, isLoading: isLoadingTeamStats } = useQuery<TeamStats>({
    queryKey: ["/api/stats/team"],
    enabled: realAuthenticated, // 只有真实认证用户才能获取团队数据
    staleTime: 5 * 60 * 1000, // 5分钟缓存
  });

  // 获取产品数据（基于权限过滤）
  const { data: products, isLoading: isLoadingProducts } = useQuery<Product[]>({
    queryKey: ["/api/products/team", categoryFilter, warehouseFilter],
    enabled: realAuthenticated, // 只有真实认证用户才能获取产品数据
  });

  // 获取可访问的仓库列表（基于权限）
  const { data: warehouses } = useQuery({
    queryKey: ["/api/warehouses/accessible"],
    enabled: realAuthenticated,
  });

  // 获取当前用户ID
  const currentUserId = userId;

  return (
    <div>
      <div className="pb-5 border-b border-gray-200 mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('team_dashboard_title')}</h1>
          <p className="mt-1 text-gray-500 text-sm">
            {t('dashboard_welcome')}
          </p>
        </div>
        
        <div className="mt-4 sm:mt-0 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t('category')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('all_categories')}</SelectItem>
              <SelectItem value="electronics">电子产品</SelectItem>
              <SelectItem value="clothing">服装</SelectItem>
              <SelectItem value="food">食品</SelectItem>
              <SelectItem value="home">家居</SelectItem>
              <SelectItem value="other">其他</SelectItem>
            </SelectContent>
          </Select>

          <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t('warehouse')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('all_warehouses')}</SelectItem>
              {warehouses && warehouses.map((wh: any) => (
                <SelectItem key={wh.id} value={String(wh.id)}>{wh.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 团队仪表盘基本统计数据 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatsCard 
          title={t('accessible_products')} 
          value={isLoadingTeamStats ? "..." : teamStats?.totalProducts || 0} 
          icon="ri-shopping-bag-line" 
          color="blue" 
        />
        <StatsCard 
          title={t('accessible_warehouses')} 
          value={isLoadingTeamStats ? "..." : teamStats?.totalWarehouses || 0} 
          icon="ri-archive-line" 
          color="green" 
        />
        <StatsCard 
          title={t('category')} 
          value={isLoadingTeamStats ? "..." : teamStats?.categoriesCount || 0} 
          icon="ri-price-tag-3-line" 
          color="purple" 
        />
        <StatsCard 
          title={t('recent_operations')} 
          value={isLoadingTeamStats ? "..." : teamStats?.recentOperations || 0} 
          icon="ri-file-list-3-line" 
          color="yellow" 
        />
      </div>
      
      {/* 团队库存详细统计 */}
      <div className="mb-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">{t('team_inventory_stats')}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <StatsCard 
            title={t('total_packages')} 
            value={isLoadingTeamStats ? "..." : teamStats?.totalPackages || 0} 
            icon="ri-inbox-line" 
            color="indigo" 
          />
          <StatsCard 
            title={t('total_weight')} 
            value={isLoadingTeamStats ? "..." : `${(teamStats?.totalWeight || 0).toFixed(2)} kg`} 
            icon="ri-scales-line" 
            color="red" 
          />
          <StatsCard 
            title={t('total_volume')} 
            value={isLoadingTeamStats ? "..." : `${(teamStats?.totalVolume || 0).toFixed(3)} m³`} 
            icon="ri-cube-line" 
            color="orange" 
          />
          <StatsCard 
            title={t('total_value')} 
            value={isLoadingTeamStats ? "..." : `¥${(teamStats?.totalValue || 0).toFixed(2)}`} 
            icon="ri-money-cny-circle-line" 
            color="emerald" 
          />
          <StatsCard 
            title={t('avg_price')} 
            value={isLoadingTeamStats ? "..." : `¥${(teamStats?.avgPrice || 0).toFixed(2)}`} 
            icon="ri-price-tag-line" 
            color="pink" 
          />
        </div>
      </div>

      {/* 产品列表区域 */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg leading-6 font-medium text-gray-900">{t('products')}</h3>
          <div className="flex space-x-3">
            <Button
              variant={viewMode === "list" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("list")}
              className="flex items-center"
            >
              <i className="ri-list-check-2 mr-1.5"></i> {t('list_view')}
            </Button>
            <Button
              variant={viewMode === "grid" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("grid")}
              className="flex items-center"
            >
              <i className="ri-grid-line mr-1.5"></i> {t('grid_view')}
            </Button>
            <Button
              onClick={() => setCreateDialogOpen(true)}
              className="flex items-center"
            >
              <i className="ri-add-line mr-1.5"></i> {t('new_product')}
            </Button>
          </div>
        </div>
        
        {viewMode === "list" ? (
          <ProductList 
            products={products || []} 
            isLoading={isLoadingProducts} 
          />
        ) : (
          <ProductGrid 
            products={products || []} 
            isLoading={isLoadingProducts} 
          />
        )}
      </div>
      
      {/* 团队活动数据 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LanguageDistribution teamFiltered={true} />
        <RecentActivity teamFiltered={true} />
      </div>

      <CreateProductDialog 
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        currentUserId={currentUserId}
      />
    </div>
  );
}