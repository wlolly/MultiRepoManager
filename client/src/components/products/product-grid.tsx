import React, { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn, formatDate } from "@/lib/utils";
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

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { t } = useTranslation();
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  // 处理点击查看详情
  const handleViewDetails = (e: React.MouseEvent) => {
    // 防止点击操作菜单时触发卡片跳转
    if ((e.target as HTMLElement).closest('.product-actions')) {
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
      <Card 
        className="relative overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
        onClick={handleViewDetails}
      >
        <CardContent className="pt-6">
          {/* 商品库存标签 */}
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
          
          {/* 操作菜单 */}
          <div className="absolute top-3 left-3 product-actions" onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
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
          
          <div className="flex flex-col space-y-1.5 mt-4">
            <h3 className="font-semibold text-lg text-gray-900 hover:text-blue-600 transition-colors">
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
          </div>
        </CardContent>
        
        <CardFooter className="flex flex-col pt-2 pb-4 px-6">
          <div className="flex justify-between w-full">
            <div className="text-sm text-gray-700">
              {t('wholesale_price')}: {product.price !== undefined ? Number(product.price).toFixed(2) : '0.00'}
            </div>
            <div className="text-sm text-gray-700">
              {t('agent_price')}: {product.cost !== undefined ? Number(product.cost).toFixed(2) : '0.00'}
            </div>
          </div>
          <div className="text-xs text-gray-500 mt-1">
            <i className="ri-time-line mr-1"></i>
            {formatDate(product.updatedAt)}
          </div>
        </CardFooter>
      </Card>
      
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
              <CardFooter className="flex flex-col pt-2 pb-4 px-6">
                <div className="flex justify-between w-full">
                  <Skeleton className="h-3 w-1/3" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
                <div className="mt-1">
                  <Skeleton className="h-3 w-1/4" />
                </div>
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