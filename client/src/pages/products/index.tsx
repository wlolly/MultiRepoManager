import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { ProductGrid } from "@/components/products/product-grid";
import { ProductList } from "@/components/products/product-list";
import { CreateProductDialog } from "@/components/products/create-product-dialog";
import { 
  PlusIcon, 
  SearchIcon, 
  SlidersHorizontalIcon,
  FileIcon as FileTypeIcon,
  DownloadIcon,
  DatabaseIcon,
  UploadIcon,
  ChevronDownIcon
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatsCard } from "@/components/dashboard/stats-card";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePermissions } from "@/hooks/use-permissions";

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
  bulkQuantity: number;      // 每件包装内的产品数量
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
}

interface ProductStats {
  totalProducts: number;
  totalCategories: number;
  lowStockProducts: number;
  totalValue: number;
  avgPrice: number;
}

export default function ProductsPage() {
  const { t } = useTranslation();
  const [viewMode, setViewMode] = useState<"list" | "grid">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [warehouseFilter, setWarehouseFilter] = useState("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  
  // 使用权限钩子判断用户是否已登录以及是否有管理权限
  const { isAuthenticated } = usePermissions();
  
  // 商品查询
  const { 
    data: products = [], 
    isLoading: isLoadingProducts 
  } = useQuery<Product[]>({
    queryKey: ["/api/products", searchQuery, categoryFilter, warehouseFilter],
  });
  
  // 商品统计
  const { 
    data: stats, 
    isLoading: isLoadingStats 
  } = useQuery<ProductStats>({
    queryKey: ["/api/products/stats"],
  });
  
  // 获取所有分类（从产品中提取）
  const categories = products 
    ? Array.from(new Set(products.map(p => p.category)))
    : [];
  
  // 获取所有仓库（从产品中提取）
  const warehouses = products 
    ? Array.from(new Set(products.map(p => p.warehouse?.name))).filter(Boolean) 
    : [];
  
  // 过滤产品
  const filteredProducts = products.filter(product => {
    const matchesSearch = !searchQuery || 
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.barcode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = categoryFilter === "all" || product.category === categoryFilter;
    
    const matchesWarehouse = warehouseFilter === "all" || 
      product.warehouse.name === warehouseFilter;
    
    return matchesSearch && matchesCategory && matchesWarehouse;
  });
  
  // 计算库存值(使用代理价)
  const calculateStockValue = (products: Product[]) => {
    return products.reduce((acc, product) => acc + (product.cost * product.stock), 0);
  };
  
  // 获取当前用户ID（硬编码用于演示）
  const currentUserId = 1;
  
  // 处理Excel导入
  const handleExcelImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // 创建FormData对象
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await fetch('/api/products/excel/import', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '导入失败');
      }
      
      const result = await response.json();
      
      // 显示导入结果
      if (result.errors && result.errors.length > 0) {
        alert(`导入完成，但有${result.errors.length}个错误:\n${result.errors.join('\n')}`);
      } else {
        alert(`成功导入${result.products?.length || 0}个产品`);
      }
      
      // 重置文件输入
      event.target.value = '';
      
      // 刷新产品数据
      // 这里使用React Query的invalidateQueries来使缓存失效，触发重新获取
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      
    } catch (error) {
      console.error('Excel导入错误:', error);
      alert(`导入失败: ${error instanceof Error ? error.message : '未知错误'}`);
      // 重置文件输入
      event.target.value = '';
    }
  };
  
  return (
    <div>
      <div className="pb-5 border-b border-gray-200 mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('products')}</h1>
          <p className="mt-1 text-gray-500 text-sm">{t('products_page_description')}</p>
        </div>
        {/* 仅对已登录用户显示操作按钮 */}
        {isAuthenticated && (
          <div className="flex items-center space-x-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex items-center">
                  <FileTypeIcon className="mr-2 h-4 w-4" />
                  {t('excel_operations')}
                  <ChevronDownIcon className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => {
                  const link = document.createElement('a');
                  link.href = "/api/products/excel/template";
                  link.download = "product_import_template.xlsx";
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}>
                  <DownloadIcon className="mr-2 h-4 w-4" />
                  {t('download_template')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {
                  const link = document.createElement('a');
                  link.href = "/api/products/excel/export";
                  link.download = "products_export.xlsx";
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}>
                  <DatabaseIcon className="mr-2 h-4 w-4" />
                  {t('export_products')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => document.getElementById('excel-upload')?.click()}>
                  <UploadIcon className="mr-2 h-4 w-4" />
                  {t('import_products')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <input
              type="file"
              id="excel-upload"
              className="hidden"
              accept=".xlsx"
              onChange={handleExcelImport}
            />
            
            <Button
              onClick={() => setCreateDialogOpen(true)}
              className="flex items-center"
            >
              <PlusIcon className="mr-2 h-4 w-4" />
              {t('new_product')}
            </Button>
          </div>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatsCard 
          title={t('total_products')} 
          value={isLoadingStats ? "..." : stats?.totalProducts || filteredProducts.length} 
          icon="package" 
          color="blue" 
        />
        <StatsCard 
          title={t('product_categories')} 
          value={isLoadingStats ? "..." : stats?.totalCategories || categories.length} 
          icon="tags" 
          color="green" 
        />
        <StatsCard 
          title={t('low_stock_products')} 
          value={isLoadingStats ? "..." : stats?.lowStockProducts || 
            filteredProducts.filter(p => p.stock < 10).length} 
          icon="alert-triangle" 
          color="yellow" 
        />
        <StatsCard 
          title={t('stock_value')} 
          value={isLoadingStats ? "..." : 
            new Intl.NumberFormat('zh-CN', { 
              style: 'currency', 
              currency: 'CNY',
              maximumFractionDigits: 0
            }).format(stats?.totalValue || calculateStockValue(filteredProducts))} 
          icon="banknote" 
          color="purple" 
        />
      </div>
      
      <Card className="mb-6">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <Input
              placeholder={t('search_products')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <div className="flex flex-col md:flex-row gap-4">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t('category')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('all_categories')}</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t('warehouse')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('all_warehouses')}</SelectItem>
                {warehouses.map(warehouse => (
                  <SelectItem key={warehouse} value={warehouse}>{warehouse}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <SlidersHorizontalIcon size={16} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{t('view_options')}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setViewMode("grid")}>
                  <div className="flex items-center">
                    {viewMode === "grid" && <span className="mr-2">✓</span>}
                    {t('grid_view')}
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setViewMode("list")}>
                  <div className="flex items-center">
                    {viewMode === "list" && <span className="mr-2">✓</span>}
                    {t('list_view')}
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>
      
      <div className="mb-4 flex items-center justify-between">
        <div>
          <span className="text-sm text-gray-500">
            {t('showing')} <strong>{filteredProducts.length}</strong> {t('of')} <strong>{products.length}</strong> {t('products')}
          </span>
          {(searchQuery || categoryFilter !== "all" || warehouseFilter !== "all") && (
            <div className="mt-2 flex flex-wrap gap-2">
              {searchQuery && (
                <Badge variant="outline" className="flex items-center gap-1">
                  {t('search')}: {searchQuery}
                  <button className="ml-1" onClick={() => setSearchQuery("")}>×</button>
                </Badge>
              )}
              {categoryFilter !== "all" && (
                <Badge variant="outline" className="flex items-center gap-1">
                  {t('category')}: {categoryFilter}
                  <button className="ml-1" onClick={() => setCategoryFilter("all")}>×</button>
                </Badge>
              )}
              {warehouseFilter !== "all" && (
                <Badge variant="outline" className="flex items-center gap-1">
                  {t('warehouse')}: {warehouseFilter}
                  <button className="ml-1" onClick={() => setWarehouseFilter("all")}>×</button>
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>
      
      <Tabs defaultValue={viewMode} onValueChange={(v) => setViewMode(v as "list" | "grid")}>
        <TabsList className="mb-4 hidden">
          <TabsTrigger value="grid">{t('grid_view')}</TabsTrigger>
          <TabsTrigger value="list">{t('list_view')}</TabsTrigger>
        </TabsList>
        
        <TabsContent value="grid" className="mt-0">
          <ProductGrid 
            products={filteredProducts} 
            isLoading={isLoadingProducts} 
          />
        </TabsContent>
        
        <TabsContent value="list" className="mt-0">
          <ProductList 
            products={filteredProducts} 
            isLoading={isLoadingProducts} 
          />
        </TabsContent>
      </Tabs>
      
      <CreateProductDialog 
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        currentUserId={currentUserId}
      />
    </div>
  );
}