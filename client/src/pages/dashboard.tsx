import React, { useState } from "react";
import { Layout } from "@/components/layout/layout";
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

export default function Dashboard() {
  const { t } = useTranslation();
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
    
    // 单件尺寸和重量信息
    lengthCm: number;    // 单件尺寸（长CM）
    widthCm: number;     // 单件尺寸（宽CM）
    heightCm: number;    // 单件尺寸（高CM）
    weightKg: number;    // 单件重量（kg）
    volumeM3: number;    // 单件立方（M3）
    
    // 整件包装信息
    packageWidthCm: number;   // 整件尺寸（宽CM）
    packageHeightCm: number;  // 整件尺寸（高CM）
    packageWeightKg: number;  // 整件重量（kg）
    packageVolumeM3: number;  // 整件立方（M3）
    
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
  }

  // Fetch products with filters
  const { data: products, isLoading: isLoadingProducts } = useQuery<Product[]>({
    queryKey: ["/api/repositories", categoryFilter, warehouseFilter],
  });

  // Fetch warehouse stats
  const { data: stats, isLoading: isLoadingStats } = useQuery<Stats>({
    queryKey: ["/api/stats"],
  });

  // Fetch current user (hardcoded for now)
  const currentUserId = 1;

  return (
    <Layout>
      <div className="pb-5 border-b border-gray-200 mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('dashboard_stats_title')}</h1>
          <p className="mt-1 text-gray-500 text-sm">{t('dashboard_welcome')}</p>
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
              <SelectItem value="main">{t('my_products')}</SelectItem>
              <SelectItem value="branch">{t('warehouse_products')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

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
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LanguageDistribution />
        <RecentActivity />
      </div>

      <CreateProductDialog 
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        currentUserId={currentUserId}
      />
    </Layout>
  );
}
