import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { v4 as uuidv4 } from 'uuid';
import { 
  Plus, Trash2, Save, ArrowLeft, Package, Search, 
  PlusCircle, Calculator, RotateCw, ListFilter, X,
  ScanLine
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { BarcodeScanner } from "@/components/BarcodeScanner";

// 仓库接口
interface Warehouse {
  id: number;
  name: string;
  location: string;
}

// 商品接口
interface Product {
  id: number;
  name: string;
  barcode: string;
  category: string;
  stock: number;
  singleWeightKg: number;
  singleVolumeM3: number;
}

// 出库单项目表单验证
const itemSchema = z.object({
  id: z.string().optional(),
  productId: z.number({
    required_error: "请选择商品",
  }),
  productName: z.string().min(1, "商品名称不能为空"),
  barcode: z.string().min(1, "条形码不能为空"),
  uniqueCode: z.string().nullable().optional(),
  externalOrderNumber: z.string().nullable().optional(),
  quantity: z.number({
    required_error: "数量不能为空",
    invalid_type_error: "请输入有效的数字",
  }).min(1, "数量必须大于0"),
  packageCount: z.number({
    required_error: "件数不能为空",
    invalid_type_error: "请输入有效的数字",
  }).min(1, "件数必须大于0"),
  weight: z.string().min(1, "重量不能为空"),
  volume: z.string().min(1, "体积不能为空"),
  remark: z.string().nullable().optional(),
});

// 出库单表单验证
const createOutboundOrderSchema = z.object({
  orderNumber: z.string().min(1, "订单号不能为空"),
  warehouseId: z.number({
    required_error: "请选择仓库",
  }),
  totalWeight: z.string().min(1, "总重量不能为空"),
  totalVolume: z.string().min(1, "总体积不能为空"),
  status: z.string().default("pending"),
  orderType: z.enum(["sale", "return", "transfer", "scrap"]).nullable().default("sale"),
  destinationType: z.enum(["customer", "retail", "wholesale", "transfer", "other"]).nullable().default("customer"),
  notes: z.string().nullable().optional(),
  items: z.array(itemSchema).min(1, "至少需要添加一个商品"),
});

type FormValues = z.infer<typeof createOutboundOrderSchema>;

export default function NewOutboundOrderWithItems() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [currentItemIndex, setCurrentItemIndex] = useState<number | null>(null);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [isScanningBarcode, setIsScanningBarcode] = useState(false);
  const [currentScanItemIndex, setCurrentScanItemIndex] = useState<number | null>(null);
  
  // 获取仓库列表
  const { data: warehouses = [] } = useQuery<Warehouse[]>({
    queryKey: ["/api/warehouses"],
  });

  // 获取商品列表
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  // 新建出库单表单
  const form = useForm<FormValues>({
    resolver: zodResolver(createOutboundOrderSchema),
    defaultValues: {
      orderNumber: `OUT-${new Date().getTime().toString().slice(-6)}`,
      warehouseId: 0,
      status: "pending",
      orderType: "sale",
      destinationType: "customer",
      totalWeight: "0",
      totalVolume: "0",
      items: [],
    },
  });

  // 表单中的商品项
  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "items",
  });

  // 创建出库单请求
  const createOrderMutation = useMutation({
    mutationFn: (data: FormValues) => 
      apiRequest("/api/outbound-orders/with-items", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      toast.success(t("outbound_order_created"));
      queryClient.invalidateQueries({queryKey: ["/api/outbound-orders"]});
      setLocation("/outbound-orders");
    },
    onError: (error) => {
      toast.error(t("create_outbound_order_failed"));
      console.error(error);
    },
  });

  // 表单提交处理
  const onSubmit = (data: FormValues) => {
    createOrderMutation.mutate(data);
  };

  // 搜索商品
  useEffect(() => {
    if (searchTerm.length > 0) {
      setIsSearching(true);
      const results = products.filter(
        (product) =>
          product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          product.barcode.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setSearchResults(results);
      setIsSearching(false);
    } else {
      setSearchResults([]);
    }
  }, [searchTerm, products]);

  // 添加商品项
  const handleAddItem = () => {
    try {
      if (!selectedProduct) {
        console.error("未选择产品");
        toast.error(t("no_product_selected"));
        return;
      }
      
      // 处理计算逻辑，防止NaN
      const singleWeightKg = typeof selectedProduct.singleWeightKg === 'number' ? selectedProduct.singleWeightKg : 0;
      const singleVolumeM3 = typeof selectedProduct.singleVolumeM3 === 'number' ? selectedProduct.singleVolumeM3 : 0;
      
      // 计算重量和体积
      const weight = singleWeightKg.toString();
      const volume = singleVolumeM3.toString();
      
      append({
        id: uuidv4(),
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        barcode: selectedProduct.barcode,
        uniqueCode: null,
        externalOrderNumber: null,
        quantity: 1,
        packageCount: 1,
        weight,
        volume,
        remark: null,
      });
      
      // 成功提示
      toast.success(t("product_added_successfully"));
      
      // 重置状态
      setSelectedProduct(null);
      setSearchTerm("");
      setProductDialogOpen(false);
    } catch (error) {
      console.error("添加商品项时发生错误:", error);
      toast.error(t("failed_to_add_product"));
    }
  };

  // 编辑商品项
  const handleEditItem = () => {
    try {
      if (!selectedProduct) {
        console.error("未选择产品");
        toast.error(t("no_product_selected"));
        return;
      }
      
      if (currentItemIndex === null || currentItemIndex < 0 || currentItemIndex >= fields.length) {
        console.error("无效的项目索引", currentItemIndex);
        toast.error(t("invalid_item_index"));
        return;
      }
      
      const currentItem = fields[currentItemIndex];
      if (!currentItem || !currentItem.id) {
        console.error("无效的项目数据", currentItem);
        toast.error(t("invalid_item_data"));
        return;
      }
      
      // 安全获取表单值，提供默认值防止undefined或null
      const currentQuantity = form.getValues(`items.${currentItemIndex}.quantity`) || 1;
      const currentPackageCount = form.getValues(`items.${currentItemIndex}.packageCount`) || 1;
      const uniqueCode = form.getValues(`items.${currentItemIndex}.uniqueCode`) || null;
      const externalOrderNumber = form.getValues(`items.${currentItemIndex}.externalOrderNumber`) || null;
      const remark = form.getValues(`items.${currentItemIndex}.remark`) || null;
      
      // 处理计算逻辑，防止NaN
      const singleWeightKg = typeof selectedProduct.singleWeightKg === 'number' ? selectedProduct.singleWeightKg : 0;
      const singleVolumeM3 = typeof selectedProduct.singleVolumeM3 === 'number' ? selectedProduct.singleVolumeM3 : 0;
      const quantity = typeof currentQuantity === 'number' ? currentQuantity : 1;
      
      // 计算重量和体积
      const weight = (singleWeightKg * quantity).toString();
      const volume = (singleVolumeM3 * quantity).toString();
      
      update(currentItemIndex, {
        id: currentItem.id,
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        barcode: selectedProduct.barcode,
        uniqueCode,
        externalOrderNumber,
        quantity: currentQuantity,
        packageCount: currentPackageCount,
        weight,
        volume,
        remark,
      });
      
      // 成功提示
      toast.success(t("product_updated_successfully"));
      
      // 重置状态
      setSelectedProduct(null);
      setSearchTerm("");
      setCurrentItemIndex(null);
      setProductDialogOpen(false);
    } catch (error) {
      console.error("编辑商品项时发生错误:", error);
      toast.error(t("failed_to_update_product"));
    }
  };

  // 选择商品
  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
  };

  // 计算总重量和总体积
  const calculateTotals = () => {
    try {
      const items = form.getValues("items");
      
      // 确保items是有效的数组
      if (!items || !Array.isArray(items) || items.length === 0) {
        form.setValue("totalWeight", "0");
        form.setValue("totalVolume", "0");
        return;
      }
      
      const totalWeight = items.reduce(
        (sum, item) => {
          if (!item || typeof item.weight === 'undefined') return sum;
          return sum + parseFloat(item.weight || "0");
        },
        0
      );
      
      const totalVolume = items.reduce(
        (sum, item) => {
          if (!item || typeof item.volume === 'undefined') return sum;
          return sum + parseFloat(item.volume || "0");
        },
        0
      );
      
      form.setValue("totalWeight", totalWeight.toString());
      form.setValue("totalVolume", totalVolume.toString());
    } catch (error) {
      console.error("计算总重量和总体积时发生错误:", error);
      // 出错时设置默认值
      form.setValue("totalWeight", "0");
      form.setValue("totalVolume", "0");
    }
  };

  // 更新单项重量和体积
  const updateItemWeightAndVolume = (index: number) => {
    try {
      const items = form.getValues("items");
      
      // 确保items是有效的数组且索引有效
      if (!items || !Array.isArray(items) || index < 0 || index >= items.length) {
        console.error("无效的items数组或索引", items, index);
        return;
      }
      
      const item = items[index];
      
      if (item && selectedProduct) {
        // 确保quantity是有效数字
        const quantity = typeof item.quantity === 'number' ? item.quantity : 0;
        
        // 处理计算逻辑，防止NaN
        const singleWeightKg = typeof selectedProduct.singleWeightKg === 'number' ? selectedProduct.singleWeightKg : 0;
        const singleVolumeM3 = typeof selectedProduct.singleVolumeM3 === 'number' ? selectedProduct.singleVolumeM3 : 0;
        
        const weight = (singleWeightKg * quantity).toString();
        const volume = (singleVolumeM3 * quantity).toString();
        
        form.setValue(`items.${index}.weight`, weight);
        form.setValue(`items.${index}.volume`, volume);
        
        calculateTotals();
      }
    } catch (error) {
      console.error("更新单项重量和体积时发生错误:", error);
    }
  };

  // 当商品数量变化时更新重量和体积
  useEffect(() => {
    calculateTotals();
  }, [fields]);

  // 库存校验
  const checkStock = () => {
    try {
      const items = form.getValues("items");
      
      // 确保items是有效的数组
      if (!items || !Array.isArray(items) || items.length === 0) {
        toast.error(t("please_add_at_least_one_item"));
        return false;
      }
      
      for (const item of items) {
        if (!item || !item.productId) continue;
        
        const product = products.find(p => p.id === item.productId);
        if (product && item.quantity > product.stock) {
          toast.error(t("insufficient_stock_for_product", { 
            product: product.name, 
            available: product.stock, 
            required: item.quantity 
          }));
          return false;
        }
      }
      
      return true;
    } catch (error) {
      console.error("库存校验时发生错误:", error);
      toast.error(t("stock_check_error"));
      return false;
    }
  };

  // 表单提交前的库存校验
  const handleSubmit = (data: FormValues) => {
    if (checkStock()) {
      onSubmit(data);
    }
  };

  // 处理扫码结果
  const handleBarcodeScanned = (code: string) => {
    try {
      if (currentScanItemIndex === null || currentScanItemIndex < 0 || currentScanItemIndex >= fields.length) {
        console.error("无效的扫码项目索引", currentScanItemIndex);
        toast.error(t("invalid_scan_item_index"));
        setIsScanningBarcode(false);
        setCurrentScanItemIndex(null);
        return;
      }
      
      if (!code || typeof code !== 'string') {
        console.error("无效的条码值", code);
        toast.error(t("invalid_barcode_value"));
        return;
      }
      
      // 将扫码结果填入对应的唯一码字段
      form.setValue(`items.${currentScanItemIndex}.uniqueCode`, code);
      
      // 关闭扫码对话框
      setIsScanningBarcode(false);
      setCurrentScanItemIndex(null);
      
      // 成功提示
      toast.success(t("unique_code_scanned_successfully"));
    } catch (error) {
      console.error("处理扫码结果时发生错误:", error);
      toast.error(t("scan_processing_error"));
      
      // 出错时也关闭扫码对话框
      setIsScanningBarcode(false);
      setCurrentScanItemIndex(null);
    }
  };

  // 扫码对话框组件
  const BarcodeScannerDialog = () => (
    <Dialog open={isScanningBarcode} onOpenChange={setIsScanningBarcode}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("scan_unique_code")}</DialogTitle>
          <DialogDescription>
            {t("scan_unique_code_description")}
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <BarcodeScanner
            onCodeDetected={handleBarcodeScanned}
            label={t("unique_code")}
            placeholder={t("scan_or_enter_unique_code")}
            uniqueCodeMode={true}
          />
        </div>
        
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setIsScanningBarcode(false);
              setCurrentScanItemIndex(null);
            }}
          >
            {t("cancel")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
  
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocation("/outbound-orders")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("back")}
          </Button>
          <h1 className="text-2xl font-bold">{t("new_outbound_order")}</h1>
        </div>
      </div>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FormField
              control={form.control}
              name="orderNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("order_number")}</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder={t("order_number_placeholder")} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="warehouseId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("warehouse")}</FormLabel>
                  <Select
                    value={field.value?.toString()}
                    onValueChange={(value) => {
                      field.onChange(parseInt(value));
                    }}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t("select_warehouse")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {warehouses.map((warehouse) => (
                        <SelectItem key={warehouse.id} value={warehouse.id.toString()}>
                          {warehouse.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                    value={field.value?.toString()}
                    onValueChange={(value) => {
                      field.onChange(value);
                    }}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t("select_order_type")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="sale">{t("order_type_sale")}</SelectItem>
                      <SelectItem value="return">{t("order_type_return")}</SelectItem>
                      <SelectItem value="transfer">{t("order_type_transfer")}</SelectItem>
                      <SelectItem value="scrap">{t("order_type_scrap")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="destinationType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("destination_type")}</FormLabel>
                  <Select
                    value={field.value?.toString()}
                    onValueChange={(value) => {
                      field.onChange(value);
                    }}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t("select_destination_type")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="customer">{t("destination_type_customer")}</SelectItem>
                      <SelectItem value="retail">{t("destination_type_retail")}</SelectItem>
                      <SelectItem value="wholesale">{t("destination_type_wholesale")}</SelectItem>
                      <SelectItem value="transfer">{t("destination_type_transfer")}</SelectItem>
                      <SelectItem value="other">{t("destination_type_other")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
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
                      <SelectItem value="pending">{t("status_pending")}</SelectItem>
                      <SelectItem value="processing">{t("status_processing")}</SelectItem>
                      <SelectItem value="shipped">{t("status_shipped")}</SelectItem>
                      <SelectItem value="completed">{t("status_completed")}</SelectItem>
                      <SelectItem value="cancelled">{t("status_cancelled")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex flex-col space-y-2">
              <FormField
                control={form.control}
                name="totalWeight"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("total_weight")} (kg)</FormLabel>
                    <FormControl>
                      <Input {...field} type="text" readOnly />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                onClick={calculateTotals}
              >
                <Calculator className="mr-2 h-4 w-4" />
                {t("recalculate")}
              </Button>
            </div>
            
            <FormField
              control={form.control}
              name="totalVolume"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("total_volume")} (m³)</FormLabel>
                  <FormControl>
                    <Input {...field} type="text" readOnly />
                  </FormControl>
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
                    {...field}
                    value={field.value || ""}
                    placeholder={t("notes_placeholder")}
                    className="min-h-[100px]"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">{t("items")}</h2>
              <Dialog open={productDialogOpen} onOpenChange={setProductDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => {
                    setSelectedProduct(null);
                    setCurrentItemIndex(null);
                    setSearchTerm("");
                  }}>
                    <Plus className="mr-2 h-4 w-4" />
                    {t("add_item")}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>{t("add_product_to_order")}</DialogTitle>
                    <DialogDescription>
                      {t("search_and_select_product")}
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Input
                        placeholder={t("search_products")}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="flex-1"
                      />
                      <Button variant="outline" size="icon">
                        <Search className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    {isSearching ? (
                      <div className="flex justify-center py-4">
                        <span className="loading loading-spinner"></span>
                      </div>
                    ) : (
                      <div className="max-h-[300px] overflow-y-auto border rounded-md">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>{t("name")}</TableHead>
                              <TableHead>{t("barcode")}</TableHead>
                              <TableHead>{t("category")}</TableHead>
                              <TableHead>{t("stock")}</TableHead>
                              <TableHead>{t("actions")}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {searchResults.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={5} className="text-center">
                                  {searchTerm.length > 0
                                    ? t("no_products_found")
                                    : t("search_to_find_products")}
                                </TableCell>
                              </TableRow>
                            ) : (
                              searchResults.map((product) => (
                                <TableRow
                                  key={product.id}
                                  className={
                                    selectedProduct?.id === product.id
                                      ? "bg-muted"
                                      : ""
                                  }
                                >
                                  <TableCell>{product.name}</TableCell>
                                  <TableCell>{product.barcode}</TableCell>
                                  <TableCell>{product.category}</TableCell>
                                  <TableCell>
                                    <Badge variant={product.stock > 0 ? "outline" : "destructive"}>
                                      {product.stock}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleSelectProduct(product)}
                                    >
                                      {t("select")}
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                    
                    <div className="flex justify-between">
                      <div>
                        {selectedProduct && (
                          <div className="bg-muted p-2 rounded-md text-sm">
                            <p>
                              <strong>{t("selected")}:</strong> {selectedProduct.name}
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="space-x-2">
                        <Button
                          variant="outline"
                          onClick={() => setProductDialogOpen(false)}
                        >
                          {t("cancel")}
                        </Button>
                        {currentItemIndex !== null ? (
                          <Button
                            onClick={handleEditItem}
                            disabled={!selectedProduct}
                          >
                            {t("update_item")}
                          </Button>
                        ) : (
                          <Button
                            onClick={handleAddItem}
                            disabled={!selectedProduct}
                          >
                            {t("add_to_order")}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>No.</TableHead>
                      <TableHead>{t("unique_code")}</TableHead>
                      <TableHead>{t("name")}</TableHead>
                      <TableHead>{t("quantity")}</TableHead>
                      <TableHead>{t("package_count")}</TableHead>
                      <TableHead>{t("weight")}</TableHead>
                      <TableHead>{t("volume")}</TableHead>
                      <TableHead>{t("remark")}</TableHead>
                      <TableHead>{t("actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-4">
                          {t("no_items_added")}
                        </TableCell>
                      </TableRow>
                    ) : (
                      fields.map((field, index) => (
                        <TableRow key={field.id}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-1">
                              <Input
                                {...form.register(`items.${index}.uniqueCode`)}
                                placeholder={t("unique_code")}
                                className="w-24"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setCurrentScanItemIndex(index);
                                  setIsScanningBarcode(true);
                                }}
                              >
                                <ScanLine className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>{field.productName}</TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="1"
                              {...form.register(`items.${index}.quantity`, {
                                valueAsNumber: true,
                                onChange: () => updateItemWeightAndVolume(index),
                              })}
                              className="w-16"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="1"
                              {...form.register(`items.${index}.packageCount`, {
                                valueAsNumber: true,
                              })}
                              className="w-16"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              {...form.register(`items.${index}.weight`)}
                              className="w-20"
                              readOnly
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              {...form.register(`items.${index}.volume`)}
                              className="w-20"
                              readOnly
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              {...form.register(`items.${index}.remark`)}
                              placeholder={t("remark")}
                              className="w-24"
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  if (field && field.productId) {
                                    const product = products.find(p => p.id === field.productId);
                                    if (product) {
                                      setSelectedProduct(product);
                                      setCurrentItemIndex(index);
                                      setProductDialogOpen(true);
                                    } else {
                                      toast.error(t("product_not_found"));
                                    }
                                  }
                                }}
                              >
                                <PlusCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => remove(index)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setLocation("/outbound-orders")}
              >
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={createOrderMutation.isPending}>
                {createOrderMutation.isPending ? (
                  <>
                    <RotateCw className="mr-2 h-4 w-4 animate-spin" />
                    {t("saving")}...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    {t("save_order")}
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </Form>
      
      {/* 扫码对话框 */}
      <BarcodeScannerDialog />
    </div>
  );
}