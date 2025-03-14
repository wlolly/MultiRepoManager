import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import { ArrowLeftIcon, PlusCircledIcon, TrashIcon, CheckIcon } from "@radix-ui/react-icons";

import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatDate } from "@/lib/utils";

// 出库单接口定义
interface OutboundOrder {
  id: number;
  orderNumber: string;
  warehouseId: number;
  totalWeight: number;
  totalVolume: number;
  createdBy: number;
  createdAt: string;
  status: string;
  notes?: string;
  orderType: string; // 单据类型：销售单、退货出库单、调拨出库单等
  destinationType: string; // 目的地类型：客户、零售商、调拨仓库等
  warehouse?: {
    id: number;
    name: string;
    location: string;
  };
  creator?: {
    id: number;
    username: string;
    fullName?: string;
  };
  items: OutboundOrderItem[];
}

// 出库单明细接口定义
interface OutboundOrderItem {
  id: number;
  outboundOrderId: number;
  productId: number;
  productName: string; // 商品名称
  barcode: string; // 条形码
  externalOrderNumber?: string | null; // 外部订单号
  quantity: number; // 数量
  packageCount: number; // 件数
  weight: number; // 重量
  volume: number; // 体积
  remark?: string; // 备注
  product?: {
    id: number;
    name: string;
    barcode: string;
    category: string;
  };
}

// 商品接口定义
interface Product {
  id: number;
  name: string;
  barcode: string;
  category: string;
  stock: number;
  singleWeightKg: number;
  singleVolumeM3: number;
}

// 仓库接口定义
interface Warehouse {
  id: number;
  name: string;
  location: string;
}

// 添加商品表单Schema
const itemSchema = z.object({
  productId: z.string().min(1, { message: "商品是必填项" }),
  externalOrderNumber: z.string().optional(), // 外部订单号（可选）
  quantity: z.string().min(1, { message: "数量是必填项" }).transform(val => parseInt(val)),
  packageCount: z.string().min(1, { message: "件数是必填项" }).transform(val => parseInt(val)),
  weight: z.string().min(1, { message: "重量是必填项" }).transform(val => parseFloat(val)),
  volume: z.string().min(1, { message: "体积是必填项" }).transform(val => parseFloat(val)),
});

// 更新出库单表单Schema
const updateOrderSchema = z.object({
  notes: z.string().optional(),
  status: z.string(),
  orderType: z.string(),
  destinationType: z.string(),
});

// 表单类型定义
type ItemFormValues = z.infer<typeof itemSchema>;
type OrderUpdateFormValues = z.infer<typeof updateOrderSchema>;

export default function OutboundOrderDetail() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [location, navigate] = useLocation();
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [isUpdatingOrder, setIsUpdatingOrder] = useState(false);
  
  // 从URL获取出库单ID
  const id = location.split("/")[2];
  
  // 获取出库单数据
  const { 
    data: order, 
    isLoading: isLoadingOrder,
    isError: isErrorOrder,
    error: orderError
  } = useQuery<OutboundOrder>({
    queryKey: ["/api/outbound-orders", id],
    enabled: !!id
  });
  
  // 获取商品列表
  const { 
    data: products = [], 
    isLoading: isLoadingProducts 
  } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });
  
  // 获取仓库列表
  const { 
    data: warehouses = [], 
    isLoading: isLoadingWarehouses 
  } = useQuery<Warehouse[]>({
    queryKey: ["/api/warehouses"],
  });
  
  // 添加商品表单
  const itemForm = useForm<ItemFormValues>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      productId: "",
      externalOrderNumber: "",
      quantity: "1",
      packageCount: "1",
      weight: "0",
      volume: "0"
    }
  });
  
  // 更新出库单表单
  const orderForm = useForm<OrderUpdateFormValues>({
    resolver: zodResolver(updateOrderSchema),
    defaultValues: {
      notes: order?.notes || "",
      status: order?.status || "pending",
      orderType: order?.orderType || "sale",
      destinationType: order?.destinationType || "customer"
    }
  });
  
  // 当订单数据加载完成后，设置表单默认值
  useEffect(() => {
    if (order) {
      orderForm.reset({
        notes: order.notes || "",
        status: order.status,
        orderType: order.orderType,
        destinationType: order.destinationType
      });
    }
  }, [order, orderForm]);
  
  // 添加出库单明细
  const addItemMutation = useMutation({
    mutationFn: (data: ItemFormValues) => {
      return apiRequest<OutboundOrderItem>(`/api/outbound-orders/${id}/items`, {
        method: "POST",
        body: JSON.stringify({
          outboundOrderId: parseInt(id),
          productId: parseInt(data.productId),
          quantity: data.quantity,
          packageCount: data.packageCount,
          weight: data.weight,
          volume: data.volume
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/outbound-orders", id] });
      toast({
        title: t("item_added"),
        description: t("item_added_description"),
      });
      itemForm.reset({
        productId: "",
        externalOrderNumber: "",
        quantity: "1",
        packageCount: "1",
        weight: "0",
        volume: "0"
      });
      setIsAddingItem(false);
    },
    onError: (error) => {
      console.error("添加出库单明细出错:", error);
      toast({
        title: t("item_add_failed"),
        description: t("item_add_failed_description"),
        variant: "destructive",
      });
    }
  });
  
  // 更新出库单状态
  const updateOrderMutation = useMutation({
    mutationFn: (data: OrderUpdateFormValues) => {
      return apiRequest<OutboundOrder>(`/api/outbound-orders/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          notes: data.notes,
          status: data.status,
          orderType: data.orderType,
          destinationType: data.destinationType
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/outbound-orders", id] });
      toast({
        title: t("order_updated"),
        description: t("order_updated_description"),
      });
      setIsUpdatingOrder(false);
    },
    onError: (error) => {
      console.error("更新出库单出错:", error);
      toast({
        title: t("order_update_failed"),
        description: t("order_update_failed_description"),
        variant: "destructive",
      });
    }
  });
  
  // 删除出库单明细
  const deleteItemMutation = useMutation({
    mutationFn: (itemId: number) => {
      return apiRequest(`/api/outbound-orders/${id}/items/${itemId}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/outbound-orders", id] });
      toast({
        title: t("item_deleted"),
        description: t("item_deleted_description"),
      });
    },
    onError: (error) => {
      console.error("删除出库单明细出错:", error);
      toast({
        title: t("item_delete_failed"),
        description: t("item_delete_failed_description"),
        variant: "destructive",
      });
    }
  });
  
  // 提交添加商品表单
  const onSubmitAddItem = (data: ItemFormValues) => {
    addItemMutation.mutate(data);
  };
  
  // 提交更新出库单表单
  const onSubmitUpdateOrder = (data: OrderUpdateFormValues) => {
    updateOrderMutation.mutate(data);
  };
  
  // 商品选择时自动计算重量和体积
  const handleProductChange = (value: string) => {
    itemForm.setValue("productId", value);
    const selectedProduct = products.find(p => p.id === parseInt(value));
    if (selectedProduct) {
      const quantity = parseInt(itemForm.getValues("quantity") || "1");
      const packageCount = parseInt(itemForm.getValues("packageCount") || "1");
      // 计算总重量和体积
      const weight = selectedProduct.singleWeightKg * quantity;
      const volume = selectedProduct.singleVolumeM3 * quantity;
      
      itemForm.setValue("weight", weight.toFixed(3));
      itemForm.setValue("volume", volume.toFixed(3));
    }
  };
  
  // 数量变更时更新重量和体积
  const handleQuantityChange = (value: string) => {
    itemForm.setValue("quantity", value);
    const productId = itemForm.getValues("productId");
    if (productId) {
      const selectedProduct = products.find(p => p.id === parseInt(productId));
      if (selectedProduct) {
        const quantity = parseInt(value || "1");
        // 计算总重量和体积
        const weight = selectedProduct.singleWeightKg * quantity;
        const volume = selectedProduct.singleVolumeM3 * quantity;
        
        itemForm.setValue("weight", weight.toFixed(3));
        itemForm.setValue("volume", volume.toFixed(3));
      }
    }
  };

  // 件数变更
  const handlePackageCountChange = (value: string) => {
    itemForm.setValue("packageCount", value);
  };
  
  // 计算出库单物品的总数量、总重量和总体积
  const calculateTotals = () => {
    if (!order || !order.items) return { totalQuantity: 0, totalWeight: 0, totalVolume: 0, totalPackages: 0 };
    
    return order.items.reduce((acc, item) => {
      return {
        totalQuantity: acc.totalQuantity + item.quantity,
        totalWeight: acc.totalWeight + item.weight,
        totalVolume: acc.totalVolume + item.volume,
        totalPackages: acc.totalPackages + item.packageCount
      };
    }, { totalQuantity: 0, totalWeight: 0, totalVolume: 0, totalPackages: 0 });
  };
  
  // 获取商品信息
  const getProductById = (productId: number) => {
    return products.find(p => p.id === productId);
  };
  
  // 获取仓库信息
  const getWarehouseById = (warehouseId: number) => {
    return warehouses.find(w => w.id === warehouseId);
  };
  
  // 获取状态标签样式
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'processing':
        return 'warning';
      case 'cancelled':
        return 'destructive';
      default:
        return 'default';
    }
  };

  // 获取订单类型标签样式
  const getOrderTypeBadgeVariant = (orderType: string) => {
    switch (orderType) {
      case 'sale':
        return 'default';
      case 'return':
        return 'outline';
      case 'transfer':
        return 'secondary';
      default:
        return 'default';
    }
  };

  // 获取订单类型的中文名称
  const getOrderTypeName = (orderType: string) => {
    switch (orderType) {
      case 'sale':
        return t('sale_order'); // 销售单
      case 'return':
        return t('return_order'); // 退货单
      case 'transfer':
        return t('transfer_order'); // 调拨单
      default:
        return orderType;
    }
  };

  // 获取目的地类型的中文名称
  const getDestinationTypeName = (destinationType: string) => {
    switch (destinationType) {
      case 'customer':
        return t('customer'); // 客户
      case 'retail':
        return t('retail'); // 零售商
      case 'wholesale':
        return t('wholesale'); // 批发商
      case 'transfer':
        return t('transfer'); // 调拨仓库
      default:
        return destinationType;
    }
  };
  
  // 处理删除物品
  const handleDeleteItem = (itemId: number) => {
    if (window.confirm(t("confirm_delete_item"))) {
      deleteItemMutation.mutate(itemId);
    }
  };
  
  // 如果正在加载，显示加载状态
  if (isLoadingOrder) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-[50vh]">
          <p>{t("loading")}...</p>
        </div>
      </div>
    );
  }
  
  // 如果发生错误，显示错误信息
  if (isErrorOrder) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex flex-col items-center justify-center h-[50vh]">
          <h2 className="text-xl font-bold text-red-500 mb-4">{t("order_load_error")}</h2>
          <p className="text-gray-600 mb-4">{JSON.stringify(orderError)}</p>
          <Button onClick={() => navigate("/outbound-orders")}>{t("back_to_outbound_orders")}</Button>
        </div>
      </div>
    );
  }
  
  // 如果没有找到订单，显示未找到信息
  if (!order) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex flex-col items-center justify-center h-[50vh]">
          <h2 className="text-xl font-bold mb-4">{t("order_not_found")}</h2>
          <Button onClick={() => navigate("/outbound-orders")}>{t("back_to_outbound_orders")}</Button>
        </div>
      </div>
    );
  }
  
  // 计算汇总数据
  const { totalQuantity, totalWeight, totalVolume, totalPackages } = calculateTotals();
  
  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <Button variant="outline" size="sm" onClick={() => navigate("/outbound-orders")}>
          <ArrowLeftIcon className="mr-2 h-4 w-4" />
          {t("back_to_outbound_orders")}
        </Button>
        <div className="flex items-center gap-2">
          <Badge variant={getStatusBadgeVariant(order.status)}>
            {t(order.status)}
          </Badge>
          <Badge variant={getOrderTypeBadgeVariant(order.orderType)}>
            {getOrderTypeName(order.orderType)}
          </Badge>
          <Badge variant="outline">
            {getDestinationTypeName(order.destinationType)}
          </Badge>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>{t("outbound_order_details")}</CardTitle>
            <CardDescription>
              {t("outbound_order_details_description")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">{t("order_number")}</h3>
                  <p className="mt-1 text-base font-semibold">{order.orderNumber}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">{t("warehouse")}</h3>
                  <p className="mt-1 text-base">
                    {order.warehouse?.name || `ID: ${order.warehouseId}`}
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">{t("created_by")}</h3>
                  <p className="mt-1 text-base">
                    {order.creator?.username || `ID: ${order.createdBy}`}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">{t("created_at")}</h3>
                  <p className="mt-1 text-base">
                    {formatDate(order.createdAt)}
                  </p>
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-500">{t("notes")}</h3>
                <p className="mt-1 text-base">
                  {order.notes || t("no_notes")}
                </p>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">{t("total_items")}</h3>
                  <p className="mt-1 text-base font-semibold">{totalQuantity}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">{t("total_weight")}</h3>
                  <p className="mt-1 text-base font-semibold">{`${totalWeight.toFixed(2)} kg`}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">{t("total_volume")}</h3>
                  <p className="mt-1 text-base font-semibold">{`${totalVolume.toFixed(3)} m³`}</p>
                </div>
              </div>
              
              <div className="pt-4">
                <Button onClick={() => setIsUpdatingOrder(true)} variant="outline">
                  {t("edit_order_details")}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {isUpdatingOrder && (
          <Card>
            <CardHeader>
              <CardTitle>{t("edit_order")}</CardTitle>
              <CardDescription>
                {t("edit_order_description")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...orderForm}>
                <form onSubmit={orderForm.handleSubmit(onSubmitUpdateOrder)} className="space-y-6">
                  <FormField
                    control={orderForm.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("status")}</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t("select_status")} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="pending">{t("pending")}</SelectItem>
                            <SelectItem value="processing">{t("processing")}</SelectItem>
                            <SelectItem value="completed">{t("completed")}</SelectItem>
                            <SelectItem value="cancelled">{t("cancelled")}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          {t("status_description")}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={orderForm.control}
                    name="orderType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("order_type")}</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t("select_order_type")} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="sale">{t("sale_order")}</SelectItem>
                            <SelectItem value="return">{t("return_order")}</SelectItem>
                            <SelectItem value="transfer">{t("transfer_order")}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          {t("order_type_description")}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={orderForm.control}
                    name="destinationType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("destination_type")}</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t("select_destination_type")} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="customer">{t("customer")}</SelectItem>
                            <SelectItem value="retail">{t("retail")}</SelectItem>
                            <SelectItem value="wholesale">{t("wholesale")}</SelectItem>
                            <SelectItem value="transfer">{t("transfer")}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          {t("destination_type_description")}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={orderForm.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("notes")}</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder={t("notes_placeholder")} 
                            className="resize-none" 
                            rows={4}
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          {t("notes_description")}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex justify-end space-x-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsUpdatingOrder(false)}
                    >
                      {t("cancel")}
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={updateOrderMutation.isPending}
                    >
                      {updateOrderMutation.isPending ? t("saving") : t("save")}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}
      </div>
      
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{t("items")}</CardTitle>
            <CardDescription>
              {t("outbound_order_items_description")}
            </CardDescription>
          </div>
          <Button onClick={() => setIsAddingItem(true)} disabled={isAddingItem}>
            <PlusCircledIcon className="mr-2 h-4 w-4" />
            {t("add_item")}
          </Button>
        </CardHeader>
        <CardContent>
          {isAddingItem && (
            <Card className="mb-6 border-dashed">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{t("add_new_item")}</CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...itemForm}>
                  <form onSubmit={itemForm.handleSubmit(onSubmitAddItem)} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={itemForm.control}
                        name="productId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("product")}</FormLabel>
                            <Select 
                              onValueChange={handleProductChange} 
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder={t("select_product")} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {isLoadingProducts ? (
                                  <SelectItem value="loading" disabled>
                                    {t("loading")}
                                  </SelectItem>
                                ) : products.length === 0 ? (
                                  <SelectItem value="no-products" disabled>
                                    {t("no_products")}
                                  </SelectItem>
                                ) : (
                                  products.map((product) => (
                                    <SelectItem 
                                      key={product.id} 
                                      value={product.id.toString()}
                                    >
                                      {product.name} - {product.barcode}
                                    </SelectItem>
                                  ))
                                )}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={itemForm.control}
                        name="externalOrderNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("external_order_number")}</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder={t("external_order_number_placeholder")} 
                                {...field} 
                              />
                            </FormControl>
                            <FormDescription>
                              {t("external_order_number_description")}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={itemForm.control}
                        name="quantity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("quantity")}</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="1" 
                                placeholder="1" 
                                {...field} 
                                onChange={(e) => handleQuantityChange(e.target.value)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={itemForm.control}
                        name="packageCount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("package_count")}</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="1" 
                                placeholder="1" 
                                {...field} 
                                onChange={(e) => handlePackageCountChange(e.target.value)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={itemForm.control}
                        name="weight"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("weight")} (kg)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                step="0.001" 
                                min="0" 
                                placeholder="0" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={itemForm.control}
                        name="volume"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("volume")} (m³)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                step="0.001" 
                                min="0" 
                                placeholder="0" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="flex justify-end space-x-4 pt-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setIsAddingItem(false)}
                      >
                        {t("cancel")}
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={addItemMutation.isPending}
                      >
                        {addItemMutation.isPending ? t("adding") : t("add")}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          )}
          
          {order.items.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-2">{t("no_items")}</p>
              <Button onClick={() => setIsAddingItem(true)} variant="outline" size="sm">
                <PlusCircledIcon className="mr-2 h-4 w-4" />
                {t("add_first_item")}
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">{t("id")}</TableHead>
                    <TableHead className="min-w-[150px]">{t("product")}</TableHead>
                    <TableHead>{t("external_order_number")}</TableHead>
                    <TableHead className="text-right">{t("quantity")}</TableHead>
                    <TableHead className="text-right">{t("package_count")}</TableHead>
                    <TableHead className="text-right">{t("weight")} (kg)</TableHead>
                    <TableHead className="text-right">{t("volume")} (m³)</TableHead>
                    <TableHead className="w-[100px]">{t("actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.items.map((item) => {
                    const product = getProductById(item.productId);
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.id}</TableCell>
                        <TableCell>
                          {product ? (
                            <div>
                              <div className="font-medium">{product.name}</div>
                              <div className="text-sm text-gray-500">{product.barcode}</div>
                            </div>
                          ) : (
                            `ID: ${item.productId}`
                          )}
                        </TableCell>
                        <TableCell>{item.externalOrderNumber || '-'}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">{item.packageCount}</TableCell>
                        <TableCell className="text-right">{item.weight.toFixed(3)}</TableCell>
                        <TableCell className="text-right">{item.volume.toFixed(3)}</TableCell>
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleDeleteItem(item.id)}
                            disabled={order.status === 'completed' || deleteItemMutation.isPending}
                          >
                            <TrashIcon className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  
                  {/* 汇总行 */}
                  <TableRow className="font-semibold bg-muted/50">
                    <TableCell colSpan={2} className="text-right">{t("total")}</TableCell>
                    <TableCell></TableCell>
                    <TableCell className="text-right">{totalQuantity}</TableCell>
                    <TableCell className="text-right">{totalPackages}</TableCell>
                    <TableCell className="text-right">{totalWeight.toFixed(3)}</TableCell>
                    <TableCell className="text-right">{totalVolume.toFixed(3)}</TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      
      {order.status === 'pending' && (
        <div className="flex justify-end">
          <Button
            onClick={() => {
              orderForm.setValue("status", "completed");
              updateOrderMutation.mutate({
                ...orderForm.getValues(),
                status: "completed"
              });
            }}
            disabled={updateOrderMutation.isPending || order.items.length === 0}
            className="bg-green-600 hover:bg-green-700"
          >
            <CheckIcon className="mr-2 h-4 w-4" />
            {t("complete_order")}
          </Button>
        </div>
      )}
    </div>
  );
}