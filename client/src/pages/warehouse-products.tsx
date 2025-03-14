import React, { useState } from "react";
import { ProductList } from "@/components/products/product-list";
import { ProductGrid } from "@/components/products/product-grid";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Plus, 
  Grid, 
  List, 
  Download as DownloadIcon, 
  Upload as UploadIcon, 
  FileType as FileTypeIcon, 
  Database as DatabaseIcon,
  ChevronDown as ChevronDownIcon
} from "lucide-react";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { queryClient } from "@/lib/queryClient";

export default function WarehouseProducts() {
  const { t } = useTranslation();
  const [location, navigate] = useLocation();
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [warehouseFilter, setWarehouseFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

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
  }

  interface Warehouse {
    id: number;
    name: string;
    location: string;
    capacity: number;
  }

  // Fetch products with warehouse filter
  const { data: products = [], isLoading: isLoadingProducts } = useQuery<Product[]>({
    queryKey: ["/api/products", { 
      warehouseId: warehouseFilter !== "all" ? warehouseFilter : undefined,
      category: categoryFilter !== "all" ? categoryFilter : undefined
    }],
  });

  // Fetch warehouses
  const { data: warehouses = [], isLoading: isLoadingWarehouses } = useQuery<Warehouse[]>({
    queryKey: ["/api/warehouses"],
  });

  // Get unique categories from products
  const categories = products && products.length > 0
    ? [...new Set(products.map(product => product.category))].sort()
    : [];

  // Filter products by search query
  const filteredProducts = products.filter(product => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      product.name.toLowerCase().includes(query) ||
      product.barcode.toLowerCase().includes(query) ||
      product.description.toLowerCase().includes(query) ||
      product.category.toLowerCase().includes(query)
    );
  });

  // Handle creating a new product
  const handleCreateProduct = () => {
    // 导航到创建新产品页面
    navigate("/warehouse-products/new");
  };

  // 处理Excel文件导入
  const handleExcelImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // 创建FormData对象
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await fetch('/api/products/excel/import?type=warehouse', {
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
        alert(`成功导入${result.products?.length || 0}个仓库商品`);
      }
      
      // 重置文件输入
      event.target.value = '';
      
      // 刷新产品数据
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      
    } catch (error) {
      console.error('Excel导入错误:', error);
      alert(`导入失败: ${error instanceof Error ? error.message : '未知错误'}`);
      // 重置文件输入
      event.target.value = '';
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">{t('warehouse_products')}</h1>
          <p className="text-muted-foreground">{t('warehouse_products_description')}</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button 
            onClick={handleCreateProduct}
            className="flex items-center"
          >
            <Plus className="mr-2 h-4 w-4" />
            {t('new_product')}
          </Button>
          
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
                link.href = "/api/products/excel/template?type=warehouse";
                link.download = "warehouse_product_import_template.xlsx";
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}>
                <DownloadIcon className="mr-2 h-4 w-4" />
                {t('download_template')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                const link = document.createElement('a');
                link.href = "/api/products/excel/export?type=warehouse";
                link.download = "warehouse_products_export.xlsx";
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
      </div>

      {/* 仓库商品 */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle>{t('warehouse_products')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div className="w-full md:w-1/3">
              <Input
                placeholder={t('search_products')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder={t('all_warehouses')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('all_warehouses')}</SelectItem>
                  {warehouses.map((warehouse) => (
                    <SelectItem key={warehouse.id} value={warehouse.id.toString()}>
                      {warehouse.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder={t('category')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('all_categories')}</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <div className="flex gap-1">
                <Button
                  variant={viewMode === "list" ? "default" : "outline"}
                  size="icon"
                  onClick={() => setViewMode("list")}
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "grid" ? "default" : "outline"}
                  size="icon"
                  onClick={() => setViewMode("grid")}
                >
                  <Grid className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <div>
            {viewMode === "list" ? (
              <ProductList 
                products={filteredProducts || []} 
                isLoading={isLoadingProducts} 
                title={t('warehouse_products')}
                subtitle={t('warehouse_products_subtitle')}
              />
            ) : (
              <ProductGrid 
                products={filteredProducts || []} 
                isLoading={isLoadingProducts} 
              />
            )}
            {!isLoadingProducts && filteredProducts.length === 0 && (
              <div className="text-center py-10">
                <p className="text-muted-foreground">{t('no_products_found')}</p>
                <Button 
                  className="mt-4" 
                  variant="outline" 
                  onClick={handleCreateProduct}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {t('add_first_product')}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}