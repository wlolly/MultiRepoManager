import React, { useState } from "react";
import { useLocation } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Pencil, 
  Trash2, 
  MoreVertical, 
  Eye
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ProductForm } from "./product-actions";

interface Product {
  id: number;
  name: string;
  description: string;
  barcode: string;
  category: string;
  stock: number;
  price: number; // 批发价
  cost: number;  // 代理价
  
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
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  // 处理点击查看详情
  const handleViewDetails = (e: React.MouseEvent) => {
    // 防止点击操作菜单时触发行跳转
    if ((e.target as HTMLElement).closest('.product-list-actions')) {
      e.stopPropagation();
      return;
    }
    navigate(`/products/${product.id}`);
  };
  
  // 处理删除产品
  const deleteProductMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/products/${product.id}`, {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      toast({
        title: t('product_deleted'),
        description: t('product_deleted_description'),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      queryClient.invalidateQueries({ queryKey: ['/api/products/stats'] });
    },
    onError: (error) => {
      toast({
        title: t('error'),
        description: t('delete_product_error'),
        variant: 'destructive',
      });
      console.error('删除产品失败:', error);
    },
  });
  
  // 确认删除对话框
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(t('confirm_delete_product'))) {
      deleteProductMutation.mutate();
    }
  };
  
  // 打开编辑对话框
  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditDialogOpen(true);
  };
  
  return (
    <>
      <div 
        className="flex items-center py-4 border-b hover:bg-gray-50 cursor-pointer transition-colors relative"
        onClick={handleViewDetails}
      >
        {/* 操作菜单 */}
        <div className="product-list-actions absolute right-0 top-4" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{t('actions')}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate(`/products/${product.id}`)}>
                <Eye className="mr-2 h-4 w-4" />
                {t('view_details')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleEdit}>
                <Pencil className="mr-2 h-4 w-4" />
                {t('edit')}
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={handleDelete}
                className="text-red-600 focus:text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {t('delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        <div className="flex-1 pr-10">
          <h3 className="text-lg font-medium text-gray-900 hover:text-blue-600 transition-colors">
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
              {t('dimensions')}: <span className="text-gray-700">
                {product.singleLengthCm !== undefined ? product.singleLengthCm : '0'}×
                {product.singleWidthCm !== undefined ? product.singleWidthCm : '0'}×
                {product.singleHeightCm !== undefined ? product.singleHeightCm : '0'} cm
              </span>
            </span>
            <span className="mx-2">•</span>
            <span>
              {t('weight')}: <span className="text-gray-700">{product.singleWeightKg !== undefined ? Number(product.singleWeightKg).toFixed(2) : '0.00'} kg</span>
            </span>
            <span className="mx-2">•</span>
            <span>
              {t('volume')}: <span className="text-gray-700">{product.singleVolumeM3 !== undefined ? Number(product.singleVolumeM3).toFixed(3) : '0.000'} m³</span>
            </span>
          </div>
        </div>
        <div className="ml-4 flex flex-col items-end">
          <div className="flex items-center">
            <div className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {t('stock')}: {product.stock !== undefined ? product.stock : 0}
            </div>
          </div>
          <div className="mt-2 text-sm text-gray-700">{t('wholesale_price')}: {product.price !== undefined ? Number(product.price).toFixed(2) : '0.00'}</div>
          <div className="mt-1 text-xs text-gray-700">{t('agent_price')}: {product.cost !== undefined ? Number(product.cost).toFixed(2) : '0.00'}</div>
          <div className="mt-1 text-xs text-gray-500">{product.updatedAt ? formatDate(product.updatedAt) : formatDate(new Date())}</div>
        </div>
      </div>
      
      {/* 编辑产品对话框 */}
      {isEditDialogOpen && (
        <ProductForm
          isOpen={isEditDialogOpen} 
          onClose={() => setIsEditDialogOpen(false)}
          warehouses={queryClient.getQueryData(['/api/warehouses']) || []}
          productToEdit={product}
        />
      )}
    </>
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