import React, { useState } from "react";
import { StatsCard } from "@/components/dashboard/stats-card";
import { LanguageDistribution } from "@/components/dashboard/language-distribution";
import { RecentActivity } from "@/components/dashboard/recent-activity";
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
import { usePermissions } from "@/hooks/use-permissions";
import { Link } from "wouter";

export default function Dashboard() {
  const { t } = useTranslation();
  const { isAuthenticated, loading: authLoading } = usePermissions();
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [warehouseFilter, setWarehouseFilter] = useState<string>("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // 定义接口类型
  interface Product {
    id: number;
    name: string;
    description: string;
    barcode: string;
    category: string;
    stock: number;
    price: number;
    cost: number;
    
    // 单件尺寸和重量信息（映射到数据库中的single前缀字段）
    singleLengthCm: number;    // 单件尺寸（长CM）
    singleWidthCm: number;     // 单件尺寸（宽CM）
    singleHeightCm: number;    // 单件尺寸（高CM）
    singleWeightKg: number;    // 单件重量（kg）
    singleVolumeM3: number;    // 单件立方（M3）
    
    // 整件包装信息（映射到数据库中的bulk前缀字段）
    bulkLengthCm: number;      // 整件尺寸（长CM）
    bulkWidthCm: number;       // 整件尺寸（宽CM）
    bulkHeightCm: number;      // 整件尺寸（高CM）
    bulkWeightKg: number;      // 整件重量（kg）
    bulkVolumeM3: number;      // 整件立方（M3）
    
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

  interface Stats {
    totalProducts: number;
    totalWarehouses: number;
    categoriesCount: number;
    recentOperations: number;
    totalPackages: number;     // 总件数
    totalWeight: number;       // 总重量(kg)
    totalVolume: number;       // 总体积(m3)
    totalValue: number;        // 总值
    avgPrice: number;          // 平均价格
  }

  // Fetch products with filters
  const { data: products, isLoading: isLoadingProducts } = useQuery<Product[]>({
    queryKey: ["/api/products", categoryFilter, warehouseFilter],
  });

  // Fetch warehouse stats
  const { data: stats, isLoading: isLoadingStats } = useQuery<Stats>({
    queryKey: ["/api/stats"],
  });

  // Fetch current user (hardcoded for now)
  const currentUserId = 1;

  return (
      <div>
        <div className="pb-5 border-b border-gray-200 mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('dashboard_stats_title')}</h1>
            <p className="mt-1 text-gray-500 text-sm">
              {isAuthenticated 
                ? t('dashboard_welcome') 
                : t('dashboard_welcome_public')}
            </p>
          </div>
          
          {isAuthenticated && (
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
                  <SelectItem value="main">{t('my_products')}</SelectItem>
                  <SelectItem value="branch">{t('warehouse_products')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          
          {!isAuthenticated && (
            <div className="mt-4 sm:mt-0">
              <Link href="/login">
                <Button className="flex items-center">
                  <i className="ri-login-box-line mr-1.5"></i> {t('login_btn')}
                </Button>
              </Link>
            </div>
          )}
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
        
        {/* 库存详细统计 - 只对登录用户可见 */}
        {isAuthenticated && (
          <div className="mb-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">{t('inventory_stats')}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              <StatsCard 
                title={t('total_packages')} 
                value={isLoadingStats ? "..." : stats?.totalPackages || 0} 
                icon="ri-inbox-line" 
                color="indigo" 
              />
              <StatsCard 
                title={t('total_weight')} 
                value={isLoadingStats ? "..." : `${(stats?.totalWeight || 0).toFixed(2)} kg`} 
                icon="ri-scales-line" 
                color="red" 
              />
              <StatsCard 
                title={t('total_volume')} 
                value={isLoadingStats ? "..." : `${(stats?.totalVolume || 0).toFixed(3)} m³`} 
                icon="ri-cube-line" 
                color="orange" 
              />
              <StatsCard 
                title={t('total_value')} 
                value={isLoadingStats ? "..." : `¥${(stats?.totalValue || 0).toFixed(2)}`} 
                icon="ri-money-cny-circle-line" 
                color="emerald" 
              />
              <StatsCard 
                title={t('avg_price')} 
                value={isLoadingStats ? "..." : `¥${(stats?.avgPrice || 0).toFixed(2)}`} 
                icon="ri-price-tag-line" 
                color="pink" 
              />
            </div>
          </div>
        )}

        {/* 未登录用户看到的公开内容 */}
        {!isAuthenticated && (
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
        )}

        {/* 产品列表 - 只对登录用户可见 */}
        {isAuthenticated && (
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
        )}
        
        {/* 语言分布和最近活动 - 对所有用户可见 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <LanguageDistribution />
          <RecentActivity />
        </div>

        {isAuthenticated && (
          <CreateProductDialog 
            open={createDialogOpen}
            onOpenChange={setCreateDialogOpen}
            currentUserId={currentUserId}
          />
        )}
      </div>
  );
}
