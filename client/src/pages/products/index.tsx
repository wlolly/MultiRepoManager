import React, { useState, useEffect } from "react";
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
import { ProductActions } from "@/components/products/product-actions";
import { 
  PlusIcon, 
  SearchIcon, 
  SlidersHorizontalIcon,
  FileIcon as FileTypeIcon,
  DownloadIcon,
  DatabaseIcon,
  UploadIcon,
  ChevronDownIcon,
  PlusCircle
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
  const { t, i18n } = useTranslation();
  
  // 确保关键翻译键已加载
  useEffect(() => {
    // 添加一些关键的翻译（兜底方案，确保UI有文字显示）
    const criticalTranslations = {
      'zh': {
        'product_categories': '产品类别',
        'low_stock_products': '低库存产品',
        'stock_value': '库存价值',
        'search_products': '搜索产品',
        'all_categories': '所有分类',
        'all_warehouses': '所有仓库',
        'view_options': '视图选项',
        'grid_view': '网格视图',
        'list_view': '列表视图',
        'showing': '显示',
        'of': '共',
        'category': '分类',
        'warehouse': '仓库',
        'excel_operations': 'Excel操作',
        'export_products': '导出产品',
        'import_products': '导入产品',
        'download_template': '下载模板',
        'products_page_description': '管理仓库中的所有商品，包括库存追踪和分类'
      }
    };
    
    // 当前语言代码
    const currentLang = i18n.language || 'zh';
    
    // 如果当前语言有兜底翻译，则添加
    if (criticalTranslations[currentLang as keyof typeof criticalTranslations]) {
      const translations = criticalTranslations[currentLang as keyof typeof criticalTranslations];
      Object.keys(translations).forEach(key => {
        // 检查翻译是否已存在，如果不存在或为空，则添加兜底翻译
        if (!i18n.exists(key) || !i18n.t(key)) {
          i18n.addResource(
            currentLang, 
            'translation', 
            key, 
            translations[key as keyof typeof translations]
          );
        }
      });
    }
    
    // 强制更新（确保UI能显示翻译）
    i18n.changeLanguage(currentLang);
  }, [i18n]);
  const [viewMode, setViewMode] = useState<"list" | "grid">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [warehouseFilter, setWarehouseFilter] = useState("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  
  // 使用权限钩子判断用户是否已登录以及是否有管理权限
  const { isAuthenticated } = usePermissions();
  
  // 检查当前用户状态
  const [isRealAuthenticated, setIsRealAuthenticated] = useState(false);
  
  // 使用会话存储而不是本地存储来处理用户状态
  // 在组件挂载和每次渲染时检查用户是否为真实登录用户
  useEffect(() => {
    const currentUserStr = localStorage.getItem('currentUser');
    console.log('ProductsPage - 尝试从localStorage获取用户信息');
    
    // 尝试从localStorage获取
    if (currentUserStr) {
      const currentUser = JSON.parse(currentUserStr);
      console.log('ProductsPage - 从localStorage获取的当前用户信息:', currentUser);
      
      // 检查是否是假阳性登录用户
      if (!currentUser.fakePositive && currentUser.id !== -1) {
        console.log('ProductsPage - 真实用户，显示管理按钮');
        setIsRealAuthenticated(true);
        return;
      }
    }
    
    // 如果localStorage没有或是访客用户，尝试从API重新获取
    console.log('ProductsPage - 尝试从API获取最新用户信息');
    
    fetch('/api/auth/current-user', {
      credentials: 'include'
    })
    .then(response => response.json())
    .then(data => {
      console.log('ProductsPage - API返回的用户信息:', data);
      
      // 检查API返回的用户是否为真实用户
      if (data && !data.fakePositive && data.id !== -1) {
        console.log('ProductsPage - API确认为真实用户');
        setIsRealAuthenticated(true);
      } else {
        console.log('ProductsPage - API确认为访客用户，隐藏管理按钮');
        setIsRealAuthenticated(false);
      }
    })
    .catch(error => {
      console.error('ProductsPage - 获取用户信息出错:', error);
      setIsRealAuthenticated(false);
    });
  }, []);
  
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
        {/* 显示操作按钮和Excel工具 */}
        {isRealAuthenticated && (
          <div className="flex items-center space-x-3">
            {/* 添加产品按钮 */}
            <ProductActions />
            
            {/* Excel操作下拉菜单 */}
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