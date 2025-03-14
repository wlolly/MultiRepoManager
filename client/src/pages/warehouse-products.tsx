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
import { Plus, Grid, List } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";

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
    navigate("/products/new");
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">{t('warehouse_products')}</h1>
          <p className="text-muted-foreground">{t('warehouse_products_description')}</p>
        </div>
        <Button onClick={handleCreateProduct}>
          <Plus className="mr-2 h-4 w-4" />
          {t('new_product')}
        </Button>
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