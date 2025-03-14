import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import { ArrowLeftIcon, PlusIcon, TrashIcon } from "lucide-react";

import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

// 仓库接口定义
interface Warehouse {
  id: number;
  name: string;
  location: string;
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

// 创建入库单表单Schema（主表）
const createInboundOrderSchema = z.object({
  orderNumber: z.string()
    .min(1, { message: "订单号不能为空" })
    .max(50, { message: "订单号不能超过50个字符" }),
  warehouseId: z.string().min(1, { message: "仓库不能为空" }),
  status: z.string().default("pending"),
  orderType: z.string().default("purchase"),
  notes: z.string().optional(),
  // 添加明细项数组
  items: z.array(z.object({
    productId: z.string().min(1, { message: "商品不能为空" }),
    productName: z.string().optional(),
    barcode: z.string().optional(),
    externalOrderNumber: z.string().optional(),
    quantity: z.string().min(1, { message: "数量不能为空" }),
    packageCount: z.string().min(1, { message: "件数不能为空" }),
    weight: z.string().optional(),
    volume: z.string().optional(),
    remark: z.string().optional(),
  })).min(1, { message: "至少需要添加一个商品" })
});

// 表单类型
type FormValues = z.infer<typeof createInboundOrderSchema>;

export default function NewInboundOrderWithItems() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("basic");
  
  // 获取仓库数据
  const { data: warehouses = [], isLoading: isLoadingWarehouses } = useQuery<Warehouse[]>({
    queryKey: ["/api/warehouses"],
  });
  
  // 获取商品数据
  const { data: products = [], isLoading: isLoadingProducts } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });
  
  // 创建表单实例
  const form = useForm<FormValues>({
    resolver: zodResolver(createInboundOrderSchema),
    defaultValues: {
      orderNumber: "",
      warehouseId: "",
      status: "pending",
      orderType: "purchase",
      notes: "",
      items: [
        {
          productId: "",
          productName: "",
          barcode: "",
          externalOrderNumber: "",
          quantity: "1",
          packageCount: "1",
          weight: "0",
          volume: "0",
          remark: ""
        }
      ]
    },
  });
  
  // 使用useFieldArray处理动态明细项
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items"
  });
  
  // 提交表单处理函数
  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    
    try {
      // 计算总重量和总体积
      const totalWeight = data.items.reduce((total, item) => {
        return total + parseFloat(item.weight || "0");
      }, 0);
      
      const totalVolume = data.items.reduce((total, item) => {
        return total + parseFloat(item.volume || "0");
      }, 0);
      
      // 创建入库单
      const orderResponse = await apiRequest<any>("/api/inbound-orders", {
        method: "POST",
        body: JSON.stringify({
          orderNumber: data.orderNumber,
          warehouseId: parseInt(data.warehouseId),
          status: data.status,
          orderType: data.orderType,
          notes: data.notes || "",
          totalWeight: totalWeight.toFixed(3),
          totalVolume: totalVolume.toFixed(6),
        }),
      });
      
      // 如果创建成功，添加明细项
      if (orderResponse?.id) {
        const inboundOrderId = orderResponse.id;
        
        // 逐个添加明细项
        for (const item of data.items) {
          const selectedProduct = products.find(p => p.id === parseInt(item.productId));
          
          if (selectedProduct) {
            await apiRequest<any>(`/api/inbound-orders/${inboundOrderId}/items`, {
              method: "POST",
              body: JSON.stringify({
                inboundOrderId,
                productId: parseInt(item.productId),
                productName: selectedProduct.name,
                barcode: selectedProduct.barcode,
                externalOrderNumber: item.externalOrderNumber || null,
                quantity: parseInt(item.quantity),
                packageCount: parseInt(item.packageCount),
                weight: item.weight,
                volume: item.volume,
                remark: item.remark || null
              }),
            });
          }
        }
        
        toast({
          title: t("inbound_order_created"),
          description: t("inbound_order_created_description"),
        });
        
        // 创建成功后跳转到订单详情页
        navigate(`/inbound-order/${inboundOrderId}`);
      }
    } catch (error) {
      console.error("Error creating inbound order:", error);
      toast({
        title: t("inbound_order_creation_failed"),
        description: t("inbound_order_creation_failed_description"),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // 生成订单号
  const generateOrderNumber = () => {
    const prefix = "IN";
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
    return `${prefix}${timestamp}${random}`;
  };
  
  // 自动生成订单号
  const handleAutoGenerate = () => {
    form.setValue("orderNumber", generateOrderNumber());
  };
  
  // 商品选择时自动计算重量和体积
  const handleProductChange = (value: string, index: number) => {
    form.setValue(`items.${index}.productId`, value);
    const selectedProduct = products.find(p => p.id === parseInt(value));
    
    if (selectedProduct) {
      // 设置商品名称和条码
      form.setValue(`items.${index}.productName`, selectedProduct.name);
      form.setValue(`items.${index}.barcode`, selectedProduct.barcode);
      
      // 获取当前数量
      const quantity = parseInt(form.getValues(`items.${index}.quantity`) || "1");
      // 计算总重量和体积
      const weight = selectedProduct.singleWeightKg * quantity;
      const volume = selectedProduct.singleVolumeM3 * quantity;
      
      form.setValue(`items.${index}.weight`, weight.toFixed(3));
      form.setValue(`items.${index}.volume`, volume.toFixed(6));
    }
  };
  
  // 数量变更时更新重量和体积
  const handleQuantityChange = (value: string, index: number) => {
    form.setValue(`items.${index}.quantity`, value);
    const productId = form.getValues(`items.${index}.productId`);
    
    if (productId) {
      const selectedProduct = products.find(p => p.id === parseInt(productId));
      if (selectedProduct) {
        const quantity = parseInt(value || "1");
        // 计算总重量和体积
        const weight = selectedProduct.singleWeightKg * quantity;
        const volume = selectedProduct.singleVolumeM3 * quantity;
        
        form.setValue(`items.${index}.weight`, weight.toFixed(3));
        form.setValue(`items.${index}.volume`, volume.toFixed(6));
      }
    }
  };
  
  // 添加新商品行
  const addNewItem = () => {
    append({
      productId: "",
      productName: "",
      barcode: "",
      externalOrderNumber: "",
      quantity: "1",
      packageCount: "1",
      weight: "0",
      volume: "0",
      remark: ""
    });
  };
  
  // 计算总数量、总重量和体积
  const calculateTotals = () => {
    const items = form.getValues("items");
    let totalQuantity = 0;
    let totalWeight = 0;
    let totalVolume = 0;
    let totalPackages = 0;
    
    items.forEach(item => {
      totalQuantity += parseInt(item.quantity || "0");
      totalWeight += parseFloat(item.weight || "0");
      totalVolume += parseFloat(item.volume || "0");
      totalPackages += parseInt(item.packageCount || "0");
    });
    
    return { totalQuantity, totalWeight, totalVolume, totalPackages };
  };
  
  // 计算整个表单的概要
  const { totalQuantity, totalWeight, totalVolume, totalPackages } = calculateTotals();
  
  // 监听表单变化
  useEffect(() => {
    const subscription = form.watch(() => {
      // 当表单值变化时，可以做一些操作，如重新计算总计等
    });
    return () => subscription.unsubscribe();
  }, [form]);
  
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <Button variant="outline" size="sm" onClick={() => navigate("/inbound-orders")}>
          <ArrowLeftIcon className="mr-2 h-4 w-4" />
          {t("back_to_inbound_orders")}
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>{t("new_inbound_order")}</CardTitle>
          <CardDescription>
            {t("new_inbound_order_with_items_description")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="mb-4">
                  <TabsTrigger value="basic">{t("basic_info")}</TabsTrigger>
                  <TabsTrigger value="items">{t("items")} ({fields.length})</TabsTrigger>
                  <TabsTrigger value="summary">{t("summary")}</TabsTrigger>
                </TabsList>
                
                <TabsContent value="basic" className="space-y-4">
                  <div className="flex items-end gap-4">
                    <FormField
                      control={form.control}
                      name="orderNumber"
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormLabel>{t("order_number")}</FormLabel>
                          <FormControl>
                            <Input placeholder={t("order_number_placeholder")} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="mb-[2px]" 
                      onClick={handleAutoGenerate}
                    >
                      {t("auto_generate")}
                    </Button>
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="warehouseId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("warehouse")}</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t("select_warehouse")} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {isLoadingWarehouses ? (
                              <SelectItem value="loading" disabled>
                                {t("loading")}
                              </SelectItem>
                            ) : warehouses.length === 0 ? (
                              <SelectItem value="no-warehouses" disabled>
                                {t("no_warehouses")}
                              </SelectItem>
                            ) : (
                              warehouses.map((warehouse) => (
                                <SelectItem 
                                  key={warehouse.id} 
                                  value={warehouse.id.toString()}
                                >
                                  {warehouse.name} - {warehouse.location}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          {t("select_warehouse_description")}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
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
                      control={form.control}
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
                              <SelectItem value="purchase">{t("inbound_purchase")}</SelectItem>
                              <SelectItem value="return">{t("inbound_return")}</SelectItem>
                              <SelectItem value="transfer">{t("inbound_transfer")}</SelectItem>
                              <SelectItem value="production">{t("inbound_production")}</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            {t("order_type_description")}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
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
                  
                  <div className="flex justify-end">
                    <Button type="button" onClick={() => setActiveTab("items")}>
                      {t("next_step")}
                    </Button>
                  </div>
                </TabsContent>
                
                <TabsContent value="items" className="space-y-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium">{t("items_list")}</h3>
                    <Button 
                      type="button" 
                      onClick={addNewItem}
                      variant="outline"
                      size="sm"
                      className="flex items-center"
                    >
                      <PlusIcon className="mr-1 h-4 w-4" />
                      {t("add_item")}
                    </Button>
                  </div>
                  
                  <ScrollArea className="h-[400px] rounded-md border">
                    <div className="p-4 space-y-8">
                      {fields.map((field, index) => (
                        <div 
                          key={field.id} 
                          className="space-y-4 p-4 rounded-lg border relative"
                        >
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute top-2 right-2"
                            onClick={() => {
                              if (fields.length > 1) {
                                remove(index);
                              } else {
                                toast({
                                  title: t("cannot_remove_all_items"),
                                  description: t("at_least_one_item_required"),
                                  variant: "destructive",
                                });
                              }
                            }}
                          >
                            <TrashIcon className="h-4 w-4 text-red-500" />
                          </Button>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name={`items.${index}.productId`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>{t("product")}</FormLabel>
                                  <Select 
                                    onValueChange={(value) => handleProductChange(value, index)} 
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
                              control={form.control}
                              name={`items.${index}.externalOrderNumber`}
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
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <FormField
                              control={form.control}
                              name={`items.${index}.quantity`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>{t("quantity")}</FormLabel>
                                  <FormControl>
                                    <Input 
                                      type="number" 
                                      min="1"
                                      placeholder={t("quantity_placeholder")} 
                                      {...field}
                                      onChange={(e) => handleQuantityChange(e.target.value, index)}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={form.control}
                              name={`items.${index}.packageCount`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>{t("package_count")}</FormLabel>
                                  <FormControl>
                                    <Input 
                                      type="number" 
                                      min="1"
                                      placeholder={t("package_count_placeholder")} 
                                      {...field} 
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={form.control}
                              name={`items.${index}.weight`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>{t("weight")} (kg)</FormLabel>
                                  <FormControl>
                                    <Input 
                                      type="number" 
                                      step="0.001"
                                      placeholder={t("weight_placeholder")} 
                                      {...field} 
                                      disabled
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={form.control}
                              name={`items.${index}.volume`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>{t("volume")} (m³)</FormLabel>
                                  <FormControl>
                                    <Input 
                                      type="number" 
                                      step="0.000001"
                                      placeholder={t("volume_placeholder")} 
                                      {...field} 
                                      disabled
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          
                          <FormField
                            control={form.control}
                            name={`items.${index}.remark`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{t("remark")}</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder={t("remark_placeholder")} 
                                    {...field} 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <Badge variant="outline">
                            {t("item")} #{index + 1}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                  
                  <div className="flex justify-between">
                    <Button type="button" variant="outline" onClick={() => setActiveTab("basic")}>
                      {t("previous_step")}
                    </Button>
                    <Button type="button" onClick={() => setActiveTab("summary")}>
                      {t("next_step")}
                    </Button>
                  </div>
                </TabsContent>
                
                <TabsContent value="summary" className="space-y-6">
                  <div className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>{t("order_summary")}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <h4 className="font-medium text-gray-500">{t("order_number")}</h4>
                            <p className="text-lg">{form.getValues("orderNumber") || "-"}</p>
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-500">{t("warehouse")}</h4>
                            <p className="text-lg">
                              {warehouses.find(w => w.id.toString() === form.getValues("warehouseId"))?.name || "-"}
                            </p>
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-500">{t("status")}</h4>
                            <p className="text-lg">{t(form.getValues("status"))}</p>
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-500">{t("order_type")}</h4>
                            <p className="text-lg">{t(`inbound_${form.getValues("orderType")}`)}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader>
                        <CardTitle>{t("items_summary")}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div>
                            <h4 className="font-medium text-gray-500">{t("total_products")}</h4>
                            <p className="text-2xl font-bold">{fields.length}</p>
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-500">{t("total_quantity")}</h4>
                            <p className="text-2xl font-bold">{totalQuantity}</p>
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-500">{t("total_packages")}</h4>
                            <p className="text-2xl font-bold">{totalPackages}</p>
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-500">{t("total_weight")}</h4>
                            <p className="text-2xl font-bold">{totalWeight.toFixed(2)} kg</p>
                          </div>
                        </div>
                        
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>{t("product_name")}</TableHead>
                              <TableHead>{t("external_order_number")}</TableHead>
                              <TableHead className="text-right">{t("quantity")}</TableHead>
                              <TableHead className="text-right">{t("package_count")}</TableHead>
                              <TableHead className="text-right">{t("weight")}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {fields.map((field, index) => {
                              const productId = form.getValues(`items.${index}.productId`);
                              const selectedProduct = products.find(p => p.id.toString() === productId);
                              
                              return (
                                <TableRow key={field.id}>
                                  <TableCell>
                                    {selectedProduct?.name || "-"}
                                  </TableCell>
                                  <TableCell>
                                    {form.getValues(`items.${index}.externalOrderNumber`) || "-"}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {form.getValues(`items.${index}.quantity`)}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {form.getValues(`items.${index}.packageCount`)}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {parseFloat(form.getValues(`items.${index}.weight`) || "0").toFixed(2)} kg
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  </div>
                  
                  <div className="flex justify-between">
                    <Button type="button" variant="outline" onClick={() => setActiveTab("items")}>
                      {t("previous_step")}
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? t("creating") : t("create_inbound_order")}
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}