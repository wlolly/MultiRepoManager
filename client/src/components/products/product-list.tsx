import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils";
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

interface ProductListItemProps {
  product: Product;
}

export function ProductListItem({ product }: ProductListItemProps) {
  const { t } = useTranslation();
  
  return (
    <div className="flex items-center py-4 border-b">
      <div className="flex-1">
        <h3 className="text-lg font-medium text-gray-900">
          {product.name}
        </h3>
        <p className="text-sm text-gray-500 mt-1">{product.description}</p>
        <div className="flex flex-wrap items-center mt-2 text-xs text-gray-500">
          <span>
            {t('category')}: <span className="text-gray-700">{product.category}</span>
          </span>
          <span className="mx-2">•</span>
          <span>
            {t('barcode')}: <span className="text-gray-700">{product.barcode}</span>
          </span>
          <span className="mx-2">•</span>
          <span>
            {t('dimensions')}: <span className="text-gray-700">{product.singleLengthCm}×{product.singleWidthCm}×{product.singleHeightCm} cm</span>
          </span>
          <span className="mx-2">•</span>
          <span>
            {t('weight')}: <span className="text-gray-700">{product.singleWeightKg.toFixed(2)} kg</span>
          </span>
          <span className="mx-2">•</span>
          <span>
            {t('volume')}: <span className="text-gray-700">{product.singleVolumeM3.toFixed(3)} m³</span>
          </span>
        </div>
      </div>
      <div className="ml-4 flex flex-col items-end">
        <div className="flex items-center">
          <div className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            {t('stock')}: {product.stock}
          </div>
        </div>
        <div className="mt-2 text-sm text-gray-700">¥{product.price.toFixed(2)}</div>
        <div className="mt-1 text-xs text-gray-500">{formatDate(product.updatedAt)}</div>
      </div>
    </div>
  );
}

interface ProductListProps {
  products: Product[];
  isLoading: boolean;
  title?: string;
  subtitle?: string;
}

export function ProductList({ products, isLoading, title, subtitle }: ProductListProps) {
  const { t } = useTranslation();
  
  return (
    <div className="bg-white shadow rounded-lg mb-6">
      {(title || subtitle) && (
        <div className="px-4 py-5 border-b border-gray-200 sm:px-6">
          {title && <h3 className="text-lg font-medium leading-6 text-gray-900">{title}</h3>}
          {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
        </div>
      )}
      
      <div className="px-4 py-3 sm:px-6">
        {isLoading ? (
          Array(3).fill(0).map((_, i) => (
            <div key={i} className="py-4 border-b">
              <Skeleton className="h-6 w-1/3 mb-2" />
              <Skeleton className="h-4 w-2/3 mb-4" />
              <div className="flex items-center space-x-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          ))
        ) : products.length > 0 ? (
          products.map((product) => (
            <ProductListItem key={product.id} product={product} />
          ))
        ) : (
          <div className="py-8 text-center text-gray-500">{t('products_not_found')}</div>
        )}
      </div>
    </div>
  );
}