import { useState } from "react";
import { useRoute, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface InboundOrder {
  id: number;
  orderNumber: string;
  warehouseId: number;
  totalWeight: number;
  totalVolume: number;
  createdBy: number;
  createdAt: string;
  status: string;
  notes?: string;
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
  items: InboundOrderItem[];
}

interface InboundOrderItem {
  id: number;
  inboundOrderId: number;
  productId: number;
  quantity: number;
  weight: number;
  volume: number;
  product?: {
    id: number;
    name: string;
    barcode: string;
    category: string;
  };
}

interface Product {
  id: number;
  name: string;
  barcode: string;
  category: string;
  singleWeightKg: number;
  singleVolumeM3: number;
}

interface Warehouse {
  id: number;
  name: string;
  location: string;
}

// 表单架构
const itemSchema = z.object({
  productId: z.string().min(1, { message: "Product is required" }),
  quantity: z.string().min(1, { message: "Quantity is required" })
    .transform(val => parseInt(val, 10))
    .refine(val => val > 0, { message: "Quantity must be greater than 0" }),
});

const updateOrderSchema = z.object({
  status: z.string().min(1, { message: "Status is required" }),
  notes: z.string().optional(),
});

type ItemFormValues = z.infer<typeof itemSchema>;
type OrderUpdateFormValues = z.infer<typeof updateOrderSchema>;

export default function InboundOrderDetail() {
  const [, params] = useRoute("/inbound-order/:id");
  const orderId = params?.id ? parseInt(params.id) : 0;
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [isUpdatingOrder, setIsUpdatingOrder] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<number | null>(null);

  // 表单
  const itemForm = useForm<ItemFormValues>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      productId: "",
      quantity: "1",
    },
  });

  const orderUpdateForm = useForm<OrderUpdateFormValues>({
    resolver: zodResolver(updateOrderSchema),
    defaultValues: {
      status: "",
      notes: "",
    },
  });

  // 查询入库单详情
  const { data: order, isLoading: isLoadingOrder } = useQuery<InboundOrder>({
    queryKey: [`/api/inbound-orders/${orderId}`],
    enabled: !!orderId,
    onSuccess: (data) => {
      // 设置订单更新表单的默认值
      orderUpdateForm.reset({
        status: data.status,
        notes: data.notes || "",
      });
    },
  });

  // 查询产品列表
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  // 添加明细项
  const addItemMutation = useMutation({
    mutationFn: (data: ItemFormValues) => {
      const product = products.find(p => p.id === parseInt(data.productId));
      if (!product) throw new Error("Product not found");
      
      const weight = product.singleWeightKg * data.quantity;
      const volume = product.singleVolumeM3 * data.quantity;
      
      return apiRequest(`/api/inbound-orders/${orderId}/items`, {
        method: "POST",
        body: JSON.stringify({
          productId: parseInt(data.productId),
          quantity: data.quantity,
          weight,
          volume,
        }),
      });
    },
    onSuccess: () => {
      setIsAddingItem(false);
      itemForm.reset();
      queryClient.invalidateQueries({ queryKey: [`/api/inbound-orders/${orderId}`] });
      toast({
        title: t("item_added"),
        description: t("item_added_successfully"),
      });
    },
    onError: (error) => {
      toast({
        title: t("error"),
        description: error.message || t("failed_to_add_item"),
        variant: "destructive",
      });
    },
  });

  // 删除明细项
  const deleteItemMutation = useMutation({
    mutationFn: (itemId: number) => {
      return apiRequest(`/api/inbound-order-items/${itemId}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      setItemToDelete(null);
      queryClient.invalidateQueries({ queryKey: [`/api/inbound-orders/${orderId}`] });
      toast({
        title: t("item_deleted"),
        description: t("item_deleted_successfully"),
      });
    },
    onError: (error) => {
      toast({
        title: t("error"),
        description: error.message || t("failed_to_delete_item"),
        variant: "destructive",
      });
    },
  });

  // 更新订单
  const updateOrderMutation = useMutation({
    mutationFn: (data: OrderUpdateFormValues) => {
      return apiRequest(`/api/inbound-orders/${orderId}`, {
        method: "PATCH",
        body: JSON.stringify({
          status: data.status,
          notes: data.notes,
        }),
      });
    },
    onSuccess: () => {
      setIsUpdatingOrder(false);
      queryClient.invalidateQueries({ queryKey: [`/api/inbound-orders/${orderId}`] });
      toast({
        title: t("order_updated"),
        description: t("order_updated_successfully"),
      });
    },
    onError: (error) => {
      toast({
        title: t("error"),
        description: error.message || t("failed_to_update_order"),
        variant: "destructive",
      });
    },
  });

  // 添加明细项
  const onSubmitAddItem = (data: ItemFormValues) => {
    addItemMutation.mutate(data);
  };

  // 更新订单
  const onSubmitUpdateOrder = (data: OrderUpdateFormValues) => {
    updateOrderMutation.mutate(data);
  };

  // 获取状态徽章颜色
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 hover:bg-yellow-200";
      case "completed":
        return "bg-green-100 text-green-800 hover:bg-green-200";
      case "cancelled":
        return "bg-red-100 text-red-800 hover:bg-red-200";
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-200";
    }
  };

  if (isLoadingOrder) {
    return (
      <div className="container mx-auto py-6 px-4 md:px-6 flex justify-center items-center min-h-[70vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container mx-auto py-6 px-4 md:px-6 text-center">
        <h1 className="text-3xl font-bold text-red-600 mb-4">{t("order_not_found")}</h1>
        <p className="mb-6">{t("order_not_found_description")}</p>
        <Link href="/inbound-orders">
          <Button>{t("back_to_inbound_orders")}</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 md:px-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <div className="flex items-center mb-2">
            <Link href="/inbound-orders">
              <Button variant="ghost" size="sm" className="mr-2">
                <i className="ri-arrow-left-line"></i>
              </Button>
            </Link>
            <h1 className="text-3xl font-bold">{t("inbound_order")}: {order.orderNumber}</h1>
          </div>
          <div className="flex items-center mt-2">
            <Badge className={getStatusBadgeColor(order.status)}>
              {t(order.status)}
            </Badge>
            <span className="mx-2 text-gray-400">•</span>
            <span className="text-gray-500">
              {t("created_at")} {formatDate(order.createdAt)}
            </span>
            {order.warehouse && (
              <>
                <span className="mx-2 text-gray-400">•</span>
                <span className="text-gray-500">
                  {t("warehouse")}: {order.warehouse.name}
                </span>
              </>
            )}
          </div>
        </div>
        <div className="mt-4 md:mt-0 space-x-2 flex">
          <Dialog open={isUpdatingOrder} onOpenChange={setIsUpdatingOrder}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <i className="ri-edit-line mr-2"></i> {t("update_order")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("update_inbound_order")}</DialogTitle>
                <DialogDescription>
                  {t("update_inbound_order_description")}
                </DialogDescription>
              </DialogHeader>
              <Form {...orderUpdateForm}>
                <form onSubmit={orderUpdateForm.handleSubmit(onSubmitUpdateOrder)} className="space-y-4">
                  <FormField
                    control={orderUpdateForm.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("status")}</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t("select_status")} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="pending">{t("pending")}</SelectItem>
                            <SelectItem value="completed">{t("completed")}</SelectItem>
                            <SelectItem value="cancelled">{t("cancelled")}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={orderUpdateForm.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("notes")}</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder={t("notes_placeholder")}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button type="submit" disabled={updateOrderMutation.isPending}>
                      {updateOrderMutation.isPending ? (
                        <><i className="ri-loader-4-line animate-spin mr-2"></i> {t("updating")}</>
                      ) : (
                        t("update")
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
          <Button>
            <i className="ri-printer-line mr-2"></i> {t("print")}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>{t("order_details")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-500">{t("order_number")}:</span>
                <span className="font-medium">{order.orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">{t("warehouse")}:</span>
                <span className="font-medium">{order.warehouse?.name || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">{t("total_weight")}:</span>
                <span className="font-medium">{order.totalWeight} kg</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">{t("total_volume")}:</span>
                <span className="font-medium">{order.totalVolume} m³</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">{t("created_by")}:</span>
                <span className="font-medium">{order.creator?.username || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">{t("created_at")}:</span>
                <span className="font-medium">{formatDate(order.createdAt)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle>{t("notes")}</CardTitle>
          </CardHeader>
          <CardContent>
            {order.notes ? (
              <p className="text-gray-700">{order.notes}</p>
            ) : (
              <p className="text-gray-500 italic">{t("no_notes")}</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>{t("order_items")}</CardTitle>
            <Dialog open={isAddingItem} onOpenChange={setIsAddingItem}>
              <DialogTrigger asChild>
                <Button>
                  <i className="ri-add-line mr-2"></i> {t("add_item")}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t("add_order_item")}</DialogTitle>
                  <DialogDescription>
                    {t("add_order_item_description")}
                  </DialogDescription>
                </DialogHeader>
                <Form {...itemForm}>
                  <form onSubmit={itemForm.handleSubmit(onSubmitAddItem)} className="space-y-4">
                    <FormField
                      control={itemForm.control}
                      name="productId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("product")}</FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={t("select_product")} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <ScrollArea className="h-72">
                                {products.map((product) => (
                                  <SelectItem key={product.id} value={product.id.toString()}>
                                    {product.name} ({product.barcode})
                                  </SelectItem>
                                ))}
                              </ScrollArea>
                            </SelectContent>
                          </Select>
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
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <DialogFooter>
                      <Button type="submit" disabled={addItemMutation.isPending}>
                        {addItemMutation.isPending ? (
                          <><i className="ri-loader-4-line animate-spin mr-2"></i> {t("adding")}</>
                        ) : (
                          t("add_item")
                        )}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {order.items && order.items.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("product")}</TableHead>
                    <TableHead>{t("barcode")}</TableHead>
                    <TableHead>{t("quantity")}</TableHead>
                    <TableHead>{t("weight")}</TableHead>
                    <TableHead>{t("volume")}</TableHead>
                    <TableHead className="text-right">{t("actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.product?.name || `-`}</TableCell>
                      <TableCell>{item.product?.barcode || `-`}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>{item.weight} kg</TableCell>
                      <TableCell>{item.volume} m³</TableCell>
                      <TableCell className="text-right">
                        <AlertDialog open={itemToDelete === item.id} onOpenChange={(open) => !open && setItemToDelete(null)}>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700" onClick={() => setItemToDelete(item.id)}>
                              <i className="ri-delete-bin-line"></i>
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{t("confirm_delete")}</AlertDialogTitle>
                              <AlertDialogDescription>
                                {t("confirm_delete_item_description")}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteItemMutation.mutate(item.id)}>
                                {deleteItemMutation.isPending ? (
                                  <><i className="ri-loader-4-line animate-spin mr-2"></i> {t("deleting")}</>
                                ) : (
                                  t("delete")
                                )}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-10">
              <i className="ri-inbox-line text-5xl text-gray-300 mb-3"></i>
              <p className="text-gray-500">{t("no_items_found")}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}