import React from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn, formatDate } from "@/lib/utils";
import { useTranslation } from "react-i18next";

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
}

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { t } = useTranslation();
  
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="pt-6">
        <div className="absolute top-3 right-3">
          <Badge variant="outline" className={cn(
            "text-xs",
            product.stock > 10 ? "bg-green-100 text-green-800 border-green-200" : 
            product.stock > 0 ? "bg-yellow-100 text-yellow-800 border-yellow-200" : 
            "bg-red-100 text-red-800 border-red-200"
          )}>
            {t("stock")}: {product.stock}
          </Badge>
        </div>
        
        <div className="flex flex-col space-y-1.5">
          <h3 className="font-semibold text-lg text-gray-900 group-hover:text-blue-600">
            {product.name}
          </h3>
          <p className="text-sm text-gray-500 line-clamp-2">{product.description}</p>
        </div>
        
        <div className="mt-3 flex flex-col gap-2">
          <div className="flex items-center text-xs">
            <i className="ri-price-tag-3-line mr-1 text-gray-500"></i>
            <span className="text-gray-600">{product.category}</span>
          </div>
          <div className="flex items-center text-xs">
            <i className="ri-barcode-line mr-1 text-gray-500"></i>
            <span className="text-gray-600">{product.barcode}</span>
          </div>
          <div className="flex items-center text-xs">
            <i className="ri-store-2-line mr-1 text-gray-500"></i>
            <span className="text-gray-600">{product.warehouse.name}</span>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-between pt-2 pb-4 px-6">
        <div className="text-sm text-gray-500">
          <i className="ri-time-line mr-1"></i>
          {formatDate(product.updatedAt)}
        </div>
        <div className="text-sm font-medium text-blue-600">
          ¥{product.price.toFixed(2)}
        </div>
      </CardFooter>
    </Card>
  );
}

interface ProductGridProps {
  products: Product[];
  isLoading: boolean;
}

export function ProductGrid({ products, isLoading }: ProductGridProps) {
  const { t } = useTranslation();
  
  return (
    <div>
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array(6).fill(0).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <CardContent className="pt-6">
                <Skeleton className="h-5 w-2/3 mb-2" />
                <Skeleton className="h-4 w-full mb-4" />
                <div className="space-y-2">
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </CardContent>
              <CardFooter className="flex justify-between pt-2 pb-4 px-6">
                <Skeleton className="h-3 w-1/3" />
                <Skeleton className="h-3 w-1/4" />
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : products.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="py-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
            <i className="ri-inbox-line text-2xl text-gray-400"></i>
          </div>
          <h3 className="text-lg font-medium text-gray-900">{t('products_not_found')}</h3>
          <p className="mt-1 text-sm text-gray-500">{t('no_products_description')}</p>
        </div>
      )}
    </div>
  );
}