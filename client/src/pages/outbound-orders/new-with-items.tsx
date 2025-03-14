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
      toast({
        title: t("success"),
        description: t("outbound_order_created"),
      });
      queryClient.invalidateQueries({queryKey: ["/api/outbound-orders"]});
      setLocation("/outbound-orders");
    },
    onError: (error) => {
      toast({
        title: t("error"),
        description: t("create_outbound_order_failed"),
        variant: "destructive",
      });
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
    if (selectedProduct) {
      // 计算重量和体积
      const weight = (selectedProduct.singleWeightKg).toString();
      const volume = (selectedProduct.singleVolumeM3).toString();
      
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
      
      setSelectedProduct(null);
      setSearchTerm("");
      setProductDialogOpen(false);
    }
  };

  // 编辑商品项
  const handleEditItem = () => {
    if (selectedProduct && currentItemIndex !== null) {
      const currentItem = fields[currentItemIndex];
      const currentQuantity = form.getValues(`items.${currentItemIndex}.quantity`);
      const currentPackageCount = form.getValues(`items.${currentItemIndex}.packageCount`);
      const uniqueCode = form.getValues(`items.${currentItemIndex}.uniqueCode`);
      const externalOrderNumber = form.getValues(`items.${currentItemIndex}.externalOrderNumber`);
      const remark = form.getValues(`items.${currentItemIndex}.remark`);
      
      // 计算重量和体积
      const weight = (selectedProduct.singleWeightKg * currentQuantity).toString();
      const volume = (selectedProduct.singleVolumeM3 * currentQuantity).toString();
      
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
      
      setSelectedProduct(null);
      setSearchTerm("");
      setCurrentItemIndex(null);
      setProductDialogOpen(false);
    }
  };

  // 选择商品
  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
  };

  // 计算总重量和总体积
  const calculateTotals = () => {
    const items = form.getValues("items");
    
    const totalWeight = items.reduce(
      (sum, item) => sum + parseFloat(item.weight || "0"),
      0
    );
    
    const totalVolume = items.reduce(
      (sum, item) => sum + parseFloat(item.volume || "0"),
      0
    );
    
    form.setValue("totalWeight", totalWeight.toString());
    form.setValue("totalVolume", totalVolume.toString());
  };

  // 更新单项重量和体积
  const updateItemWeightAndVolume = (index: number) => {
    const items = form.getValues("items");
    const item = items[index];
    
    if (item && selectedProduct) {
      const quantity = item.quantity || 0;
      const weight = (selectedProduct.singleWeightKg * quantity).toString();
      const volume = (selectedProduct.singleVolumeM3 * quantity).toString();
      
      form.setValue(`items.${index}.weight`, weight);
      form.setValue(`items.${index}.volume`, volume);
      
      calculateTotals();
    }
  };

  // 当商品数量变化时更新重量和体积
  useEffect(() => {
    calculateTotals();
  }, [fields]);

  // 库存校验
  const checkStock = () => {
    const items = form.getValues("items");
    
    for (const item of items) {
      const product = products.find(p => p.id === item.productId);
      if (product && item.quantity > product.stock) {
        toast({
          title: t("stock_error"),
          description: t("insufficient_stock_for_product", { 
            product: product.name, 
            available: product.stock, 
            required: item.quantity 
          }),
          variant: "destructive",
        });
        return false;
      }
    }
    
    return true;
  };

  // 表单提交前的库存校验
  const handleSubmit = (data: FormValues) => {
    if (checkStock()) {
      onSubmit(data);
    }
  };

  // 处理扫码结果
  const handleBarcodeScanned = (code: string) => {
    if (currentScanItemIndex !== null) {
      // 将扫码结果填入对应的唯一码字段
      form.setValue(`items.${currentScanItemIndex}.uniqueCode`, code);
      
      // 关闭扫码对话框
      setIsScanningBarcode(false);
      setCurrentScanItemIndex(null);
      
      toast({
        title: t("success"),
        description: t("unique_code_scanned_successfully"),
      });
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

  // 选择商品对话框
  const ProductSelectionDialog = () => (
    <Dialog open={productDialogOpen} onOpenChange={setProductDialogOpen}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t("select_product")}</DialogTitle>
          <DialogDescription>
            {t("search_and_select_product")}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex items-center space-x-2 mb-4">
          <Input
            placeholder={t("search_by_name_or_barcode")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Button variant="outline" size="icon">
            <Search className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="max-h-[400px] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("name")}</TableHead>
                <TableHead>{t("barcode")}</TableHead>
                <TableHead>{t("category")}</TableHead>
                <TableHead className="text-right">{t("stock")}</TableHead>
                <TableHead className="text-right">{t("weight")}</TableHead>
                <TableHead className="text-right">{t("volume")}</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isSearching ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">
                    {t("searching")}...
                  </TableCell>
                </TableRow>
              ) : searchResults.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">
                    {searchTerm ? t("no_products_found") : t("search_to_find_products")}
                  </TableCell>
                </TableRow>
              ) : (
                searchResults.map((product) => (
                  <TableRow 
                    key={product.id}
                    className={`cursor-pointer ${selectedProduct?.id === product.id ? 'bg-muted' : ''}`}
                    onClick={() => handleSelectProduct(product)}
                  >
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>{product.barcode}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{product.category}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {product.stock > 0 ? (
                        product.stock
                      ) : (
                        <span className="text-destructive">{t("out_of_stock")}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">{product.singleWeightKg} kg</TableCell>
                    <TableCell className="text-right">{product.singleVolumeM3} m³</TableCell>
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleSelectProduct(product)}
                        disabled={product.stock <= 0}
                      >
                        <PlusCircle className="h-4 w-4 mr-1" />
                        {t("select")}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setSelectedProduct(null);
              setProductDialogOpen(false);
            }}
          >
            {t("cancel")}
          </Button>
          <Button
            disabled={!selectedProduct || (selectedProduct.stock <= 0)}
            onClick={() => currentItemIndex !== null ? handleEditItem() : handleAddItem()}
          >
            {currentItemIndex !== null ? t("update_product") : t("add_product")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/outbound-orders")}
            className="mr-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t("back")}
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{t("new_outbound_order_with_items")}</h1>
            <p className="text-muted-foreground">
              {t("create_new_outbound_order_with_items_description")}
            </p>
          </div>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 出库单基本信息 */}
            <Card>
              <CardHeader>
                <CardTitle>{t("basic_information")}</CardTitle>
                <CardDescription>
                  {t("outbound_order_basic_information_description")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="orderNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("order_number")}</FormLabel>
                      <FormControl>
                        <Input {...field} />
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
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        defaultValue={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t("select_warehouse")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {warehouses.map((warehouse) => (
                            <SelectItem
                              key={warehouse.id}
                              value={warehouse.id.toString()}
                            >
                              {warehouse.name} ({warehouse.location})
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
                        onValueChange={field.onChange}
                        defaultValue={field.value || "sale"}
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
                          <SelectItem value="scrap">{t("scrap_order")}</SelectItem>
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
                        onValueChange={field.onChange}
                        defaultValue={field.value || "customer"}
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
                          <SelectItem value="other">{t("other")}</SelectItem>
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
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("notes")}</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder={t("enter_notes")}
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* 出库单汇总信息 */}
            <Card>
              <CardHeader>
                <CardTitle>{t("summary")}</CardTitle>
                <CardDescription>
                  {t("outbound_order_summary_description")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="totalWeight"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("total_weight")} (kg)</FormLabel>
                        <FormControl>
                          <Input {...field} readOnly />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="totalVolume"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("total_volume")} (m³)</FormLabel>
                        <FormControl>
                          <Input {...field} readOnly />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="pt-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">{t("items_count")}</h3>
                    <Badge variant="outline">{fields.length}</Badge>
                  </div>
                  <Separator className="my-4" />
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t("unique_products")}</span>
                      <span>{new Set(fields.map(item => item.productId)).size}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t("total_items")}</span>
                      <span>{fields.reduce((sum, item) => sum + (item.quantity || 0), 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t("total_packages")}</span>
                      <span>{fields.reduce((sum, item) => sum + (item.packageCount || 0), 0)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  variant="outline"
                  className="w-full"
                  type="button"
                  onClick={calculateTotals}
                >
                  <Calculator className="h-4 w-4 mr-2" />
                  {t("recalculate_totals")}
                </Button>
              </CardFooter>
            </Card>

            {/* 操作按钮 */}
            <Card>
              <CardHeader>
                <CardTitle>{t("actions")}</CardTitle>
                <CardDescription>
                  {t("outbound_order_actions_description")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  type="submit"
                  className="w-full"
                  disabled={createOrderMutation.isPending}
                >
                  {createOrderMutation.isPending ? (
                    <RotateCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  {t("create_outbound_order")}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => setLocation("/outbound-orders")}
                >
                  <X className="h-4 w-4 mr-2" />
                  {t("cancel")}
                </Button>

                <Separator className="my-4" />

                <Button
                  type="button"
                  variant="secondary"
                  className="w-full"
                  onClick={() => {
                    setCurrentItemIndex(null);
                    setProductDialogOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t("add_item")}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* 商品列表 */}
          <Card>
            <CardHeader>
              <CardTitle>{t("items")}</CardTitle>
              <CardDescription>
                {t("outbound_order_items_description")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {fields.length === 0 ? (
                <div className="text-center py-8 border rounded-md">
                  <Package className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground mb-4">{t("no_items_added")}</p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setCurrentItemIndex(null);
                      setProductDialogOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {t("add_item")}
                  </Button>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[80px]">{t("no")}</TableHead>
                        <TableHead>{t("product_name")}</TableHead>
                        <TableHead>{t("barcode")}</TableHead>
                        <TableHead>{t("unique_code")}</TableHead>
                        <TableHead>{t("external_order_number")}</TableHead>
                        <TableHead className="text-right">{t("quantity")}</TableHead>
                        <TableHead className="text-right">{t("package_count")}</TableHead>
                        <TableHead className="text-right">{t("weight")} (kg)</TableHead>
                        <TableHead className="text-right">{t("volume")} (m³)</TableHead>
                        <TableHead className="w-[100px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fields.map((item, index) => (
                        <TableRow key={item.id}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell className="font-medium">
                            {item.productName}
                          </TableCell>
                          <TableCell>{item.barcode}</TableCell>
                          <TableCell>
                            <FormField
                              control={form.control}
                              name={`items.${index}.uniqueCode`}
                              render={({ field }) => (
                                <FormItem className="m-0">
                                  <FormControl>
                                    <div className="relative">
                                      <Input
                                        {...field}
                                        value={field.value || ""}
                                        placeholder={t("unique_code")}
                                        className="h-8 pr-8"
                                      />
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="absolute right-0 top-0 h-8 w-8"
                                        onClick={() => {
                                          // 打开扫码对话框
                                          setCurrentScanItemIndex(index);
                                          setIsScanningBarcode(true);
                                        }}
                                      >
                                        <ScanLine className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </FormControl>
                                  <FormMessage className="text-xs" />
                                </FormItem>
                              )}
                            />
                          </TableCell>
                          <TableCell>
                            <FormField
                              control={form.control}
                              name={`items.${index}.externalOrderNumber`}
                              render={({ field }) => (
                                <FormItem className="m-0">
                                  <FormControl>
                                    <Input
                                      {...field}
                                      value={field.value || ""}
                                      placeholder={t("external_order_number")}
                                      className="h-8"
                                    />
                                  </FormControl>
                                  <FormMessage className="text-xs" />
                                </FormItem>
                              )}
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <FormField
                              control={form.control}
                              name={`items.${index}.quantity`}
                              render={({ field }) => (
                                <FormItem className="m-0">
                                  <FormControl>
                                    <Input
                                      {...field}
                                      type="number"
                                      min="1"
                                      className="h-8 w-20 text-right ml-auto"
                                      onChange={(e) => {
                                        field.onChange(parseInt(e.target.value) || 0);
                                        setTimeout(() => {
                                          updateItemWeightAndVolume(index);
                                        }, 0);
                                      }}
                                    />
                                  </FormControl>
                                  <FormMessage className="text-xs" />
                                </FormItem>
                              )}
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <FormField
                              control={form.control}
                              name={`items.${index}.packageCount`}
                              render={({ field }) => (
                                <FormItem className="m-0">
                                  <FormControl>
                                    <Input
                                      {...field}
                                      type="number"
                                      min="1"
                                      className="h-8 w-20 text-right ml-auto"
                                    />
                                  </FormControl>
                                  <FormMessage className="text-xs" />
                                </FormItem>
                              )}
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <FormField
                              control={form.control}
                              name={`items.${index}.weight`}
                              render={({ field }) => (
                                <FormItem className="m-0">
                                  <FormControl>
                                    <Input
                                      {...field}
                                      readOnly
                                      className="h-8 w-20 text-right ml-auto"
                                    />
                                  </FormControl>
                                  <FormMessage className="text-xs" />
                                </FormItem>
                              )}
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <FormField
                              control={form.control}
                              name={`items.${index}.volume`}
                              render={({ field }) => (
                                <FormItem className="m-0">
                                  <FormControl>
                                    <Input
                                      {...field}
                                      readOnly
                                      className="h-8 w-20 text-right ml-auto"
                                    />
                                  </FormControl>
                                  <FormMessage className="text-xs" />
                                </FormItem>
                              )}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end space-x-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  const product = products.find(
                                    (p) => p.id === item.productId
                                  );
                                  if (product) {
                                    setSelectedProduct(product);
                                    setCurrentItemIndex(index);
                                    setProductDialogOpen(true);
                                  }
                                }}
                              >
                                <PlusCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => remove(index)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <p className="text-sm text-muted-foreground">
                {t("items_count")}: {fields.length}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setCurrentItemIndex(null);
                  setProductDialogOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                {t("add_item")}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </Form>

      {ProductSelectionDialog()}
      {BarcodeScannerDialog()}
    </div>
  );
}