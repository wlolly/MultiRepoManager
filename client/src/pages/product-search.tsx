import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search } from "lucide-react";

interface Product {
  id: number;
  name: string;
  description: string;
  barcode: string;
  uniqueCode?: string; // 唯一码
  category: string;
  stock: number;
  price: number; // 批发价
  cost: number; // 代理价
  
  // 单件尺寸和重量信息
  singleLengthCm: number;
  singleWidthCm: number;
  singleHeightCm: number;
  singleWeightKg: number;
  singleVolumeM3: number;
  
  // 整件包装信息
  bulkQuantity: number;
  bulkLengthCm: number;
  bulkWidthCm: number;
  bulkHeightCm: number;
  bulkWeightKg: number;
  bulkVolumeM3: number;
  
  createdAt: string;
  updatedAt: string;
  warehouse?: {
    id: number;
    name: string;
    location: string;
  };
}

export default function ProductSearch() {
  const { t } = useTranslation();
  const [location, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // 防抖搜索查询
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    
    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery]);
  
  // 查询产品数据 - 使用专门的搜索API
  const { data: searchResults = [], isLoading } = useQuery<Product[]>({
    queryKey: ["/api/products/search", debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery) return [];
      const response = await fetch(`/api/products/search?q=${encodeURIComponent(debouncedQuery)}`);
      if (!response.ok) {
        throw new Error('搜索请求失败');
      }
      return response.json();
    },
    enabled: debouncedQuery.length > 0,
  });
  
  // 处理搜索表单提交
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDebouncedQuery(searchQuery);
  };
  
  // 处理产品选择
  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    // 导航到产品详情页
    setLocation(`/products/product-detail?id=${product.id}`);
  };

  return (
    <Layout>
      <div className="pb-5 border-b border-gray-200 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t("product_search")}</h1>
        <p className="mt-1 text-gray-500 text-sm">{t("search_products_by_name_or_unique_code")}</p>
      </div>
      
      <div className="max-w-3xl mx-auto mb-6">
        <form onSubmit={handleSearchSubmit}>
          <div className="relative flex gap-2">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <Input
                type="text"
                className="pl-10 py-6 text-lg"
                placeholder={t("search_by_name_or_unique_code")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
              {searchQuery && (
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-500"
                  onClick={() => setSearchQuery("")}
                >
                  <i className="ri-close-line text-xl"></i>
                </button>
              )}
            </div>
            <Button type="submit">{t("search")}</Button>
          </div>
        </form>
      </div>
      
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>{t("search_results")}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            // 加载状态
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-12 w-12 rounded-md" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-[250px]" />
                    <Skeleton className="h-4 w-[200px]" />
                  </div>
                </div>
              ))}
            </div>
          ) : debouncedQuery ? (
            // 搜索结果
            searchResults.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("name")}</TableHead>
                    <TableHead>{t("unique_code")}</TableHead>
                    <TableHead>{t("barcode")}</TableHead>
                    <TableHead>{t("category")}</TableHead>
                    <TableHead>{t("stock")}</TableHead>
                    <TableHead>{t("action")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {searchResults.map((product) => (
                    <TableRow 
                      key={product.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSelectProduct(product)}
                    >
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>
                        {product.uniqueCode ? (
                          <Badge variant="outline">{product.uniqueCode}</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>{product.barcode}</TableCell>
                      <TableCell>{product.category}</TableCell>
                      <TableCell>
                        <Badge variant={product.stock > 10 ? "default" : "destructive"}>
                          {product.stock}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button 
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectProduct(product);
                          }}
                        >
                          {t("details")}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              // 没有找到结果
              <div className="text-center py-12">
                <div className="text-6xl text-muted-foreground/30 mb-4">
                  <i className="ri-inbox-line"></i>
                </div>
                <h3 className="text-lg font-medium text-muted-foreground">
                  {t("no_products_found")}
                </h3>
                <p className="text-sm text-muted-foreground/70 mt-1">
                  {t("try_different_search_terms")}
                </p>
              </div>
            )
          ) : (
            // 初始状态，还没有搜索
            <div className="text-center py-12">
              <div className="text-6xl text-muted-foreground/30 mb-4">
                <Search className="mx-auto h-12 w-12" />
              </div>
              <h3 className="text-lg font-medium text-muted-foreground">
                {t("search_for_products")}
              </h3>
              <p className="text-sm text-muted-foreground/70 mt-1">
                {t("enter_product_name_or_code")}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </Layout>
  );
}