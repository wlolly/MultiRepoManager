import React, { useState } from "react";
import { Layout } from "@/components/layout/layout";
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
import { useTranslation } from "react-i18next";

export default function WarehouseProducts() {
  const { t } = useTranslation();
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [warehouseFilter, setWarehouseFilter] = useState<string>("all");

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
  const { data: products, isLoading: isLoadingProducts } = useQuery<Product[]>({
    queryKey: ["/api/products", { warehouseId: warehouseFilter !== "all" ? warehouseFilter : undefined }],
  });

  // Fetch warehouses
  const { data: warehouses, isLoading: isLoadingWarehouses } = useQuery<Warehouse[]>({
    queryKey: ["/api/warehouses"],
  });

  return (
    <Layout>
      <div className="pb-5 border-b border-gray-200 mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('warehouse_products')}</h1>
          <p className="mt-1 text-gray-500 text-sm">{t('warehouse_products_description')}</p>
        </div>
        <div className="mt-4 sm:mt-0 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
          <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t('warehouse')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('all_warehouses')}</SelectItem>
              {!isLoadingWarehouses && warehouses?.map((warehouse) => (
                <SelectItem key={warehouse.id} value={warehouse.id.toString()}>
                  {warehouse.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
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
          </div>
        </div>
        
        {viewMode === "list" ? (
          <ProductList 
            products={products || []} 
            isLoading={isLoadingProducts} 
            title={t('warehouse_products')}
            subtitle={t('warehouse_products_subtitle')}
          />
        ) : (
          <ProductGrid 
            products={products || []} 
            isLoading={isLoadingProducts} 
          />
        )}
      </div>
    </Layout>
  );
}