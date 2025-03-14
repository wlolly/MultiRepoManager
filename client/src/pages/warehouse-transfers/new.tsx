import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";

import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeftIcon, PlusIcon, MinusIcon, ArrowRightIcon, ScanLine, QrCode } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { BarcodeScanner } from "@/components/BarcodeScanner";

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
  uniqueCode?: string;
  category: string;
  stock: number;
  singleWeightKg: number;
  singleVolumeM3: number;
}

// 调拨单表单Schema
const transferSchema = z.object({
  sourceWarehouseId: z.string().min(1, { message: "来源仓库是必填项" }),
  targetWarehouseId: z.string().min(1, { message: "目标仓库是必填项" }),
  notes: z.string().optional(),
  items: z.array(
    z.object({
      productId: z.string().min(1, { message: "商品是必填项" }),
      quantity: z.string().min(1, { message: "数量是必填项" }).transform(val => parseInt(val)),
      packageCount: z.string().min(1, { message: "件数是必填项" }).transform(val => parseInt(val)),
      weight: z.string().min(0, { message: "重量不能为负" }).transform(val => parseFloat(val)),
      volume: z.string().min(0, { message: "体积不能为负" }).transform(val => parseFloat(val)),
      uniqueCode: z.string().optional(), // 商品唯一码，可选
    })
  ).min(1, { message: "至少需要添加一个商品" }),
});

// 表单类型定义
type TransferFormValues = z.infer<typeof transferSchema>;

export default function NewWarehouseTransfer() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // 条码扫描对话框状态
  const [isBarcodeScannerOpen, setIsBarcodeScannerOpen] = useState(false);
  const [currentScanningIndex, setCurrentScanningIndex] = useState<number | null>(null);
  
  // 获取仓库列表
  const { data: warehouses = [], isLoading: isLoadingWarehouses } = useQuery<Warehouse[]>({
    queryKey: ["/api/warehouses"],
  });
  
  // 获取商品列表
  const { data: products = [], isLoading: isLoadingProducts } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });
  
  // 唯一码对应的产品查询
  const findProductByUniqueCode = (uniqueCode: string) => {
    return products.find(p => p.uniqueCode === uniqueCode);
  };
  
  // 调拨单表单
  const form = useForm<TransferFormValues>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      sourceWarehouseId: "",
      targetWarehouseId: "",
      notes: "",
      items: [
        {
          productId: "",
          quantity: "1",
          packageCount: "1",
          weight: "0",
          volume: "0",
          uniqueCode: "" // 初始化唯一码字段为空
        }
      ],
    }
  });
  
  // 使用 useFieldArray 管理多个调拨商品
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });
  
  // 创建调拨单（同时创建出库单和入库单）
  const createTransferMutation = useMutation({
    mutationFn: (data: TransferFormValues) => {
      return apiRequest("/api/warehouse-transfers", {
        method: "POST",
        body: JSON.stringify({
          sourceWarehouseId: parseInt(data.sourceWarehouseId),
          targetWarehouseId: parseInt(data.targetWarehouseId),
          notes: data.notes,
          items: data.items.map(item => ({
            productId: parseInt(item.productId),
            quantity: item.quantity,
            packageCount: item.packageCount,
            weight: item.weight,
            volume: item.volume,
            uniqueCode: item.uniqueCode || null // 添加唯一码数据，如果为空则传null
          }))
        }),
      });
    },
    onSuccess: (response) => {
      toast({
        title: t("transfer_created"),
        description: t("transfer_created_description"),
      });
      navigate("/warehouse-transfers");
    },
    onError: (error) => {
      console.error("创建调拨单失败:", error);
      toast({
        title: t("transfer_create_failed"),
        description: t("transfer_create_failed_description"),
        variant: "destructive",
      });
      setIsSubmitting(false);
    }
  });
  
  // 提交表单
  const onSubmit = (data: TransferFormValues) => {
    // 验证源仓库和目标仓库不能相同
    if (data.sourceWarehouseId === data.targetWarehouseId) {
      toast({
        title: t("validation_error"),
        description: t("source_target_warehouse_same_error"),
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    createTransferMutation.mutate(data);
  };
  
  // 添加商品行
  const handleAddItem = () => {
    append({
      productId: "",
      quantity: "1",
      packageCount: "1",
      weight: "0",
      volume: "0",
      uniqueCode: "" // 添加唯一码字段，初始为空
    });
  };
  
  // 打开条码扫描器对话框
  const openBarcodeScanner = (index: number) => {
    setCurrentScanningIndex(index);
    setIsBarcodeScannerOpen(true);
  };
  
  // 处理唯一码扫描结果
  const handleUniqueCodeScanned = (code: string) => {
    if (currentScanningIndex !== null) {
      // 将扫描结果更新到对应的表单字段
      form.setValue(`items.${currentScanningIndex}.uniqueCode`, code);
      
      // 查找对应的产品
      const product = findProductByUniqueCode(code);
      if (product) {
        // 自动填充产品信息
        form.setValue(`items.${currentScanningIndex}.productId`, product.id.toString());
        
        // 获取数量并计算重量和体积
        const quantity = parseInt(form.getValues(`items.${currentScanningIndex}.quantity`) || "1");
        
        // 计算总重量和体积
        const weight = product.singleWeightKg * quantity;
        const volume = product.singleVolumeM3 * quantity;
        
        form.setValue(`items.${currentScanningIndex}.weight`, weight.toFixed(3));
        form.setValue(`items.${currentScanningIndex}.volume`, volume.toFixed(3));
        
        toast({
          title: t("product_found"),
          description: `${t("product_found_description")}: ${product.name}`,
        });
      } else {
        toast({
          title: t("product_not_found"),
          description: t("product_not_found_description"),
          variant: "destructive",
        });
      }
      
      // 关闭扫描对话框
      setIsBarcodeScannerOpen(false);
    }
  };
  
  // 移除商品行
  const handleRemoveItem = (index: number) => {
    if (fields.length > 1) {
      remove(index);
    } else {
      toast({
        title: t("validation_error"),
        description: t("min_one_item_required"),
        variant: "destructive",
      });
    }
  };
  
  // 商品选择时自动计算重量和体积
  const handleProductChange = (value: string, index: number) => {
    form.setValue(`items.${index}.productId`, value);
    const selectedProduct = products.find(p => p.id === parseInt(value));
    if (selectedProduct) {
      const quantity = parseInt(form.getValues(`items.${index}.quantity`) || "1");
      // 计算总重量和体积
      const weight = selectedProduct.singleWeightKg * quantity;
      const volume = selectedProduct.singleVolumeM3 * quantity;
      
      form.setValue(`items.${index}.weight`, weight.toFixed(3));
      form.setValue(`items.${index}.volume`, volume.toFixed(3));
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
        form.setValue(`items.${index}.volume`, volume.toFixed(3));
      }
    }
  };
  
  // 计算总数量、件数、重量和体积
  const calculateTotals = () => {
    const items = form.getValues("items");
    return items.reduce((acc, item) => {
      const quantity = parseInt(item.quantity || "0");
      const packageCount = parseInt(item.packageCount || "0");
      const weight = parseFloat(item.weight || "0");
      const volume = parseFloat(item.volume || "0");
      
      return {
        totalQuantity: acc.totalQuantity + quantity,
        totalPackages: acc.totalPackages + packageCount,
        totalWeight: acc.totalWeight + weight,
        totalVolume: acc.totalVolume + volume,
      };
    }, { totalQuantity: 0, totalPackages: 0, totalWeight: 0, totalVolume: 0 });
  };
  
  // 计算汇总
  const { totalQuantity, totalPackages, totalWeight, totalVolume } = calculateTotals();
  
  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <Button variant="outline" size="sm" onClick={() => navigate("/warehouse-transfers")}>
          <ArrowLeftIcon className="mr-2 h-4 w-4" />
          {t("back_to_warehouse_transfers")}
        </Button>
        <h1 className="text-2xl font-bold">{t("new_warehouse_transfer")}</h1>
      </div>
      
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>{t("create_warehouse_transfer")}</CardTitle>
          <CardDescription>
            {t("create_warehouse_transfer_description")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="sourceWarehouseId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("source_warehouse")}</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t("select_source_warehouse")} />
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
                      <FormDescription>{t("source_warehouse_description")}</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="targetWarehouseId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("target_warehouse")}</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t("select_target_warehouse")} />
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
                      <FormDescription>{t("target_warehouse_description")}</FormDescription>
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
                        placeholder={t("transfer_notes_placeholder")} 
                        className="resize-none" 
                        rows={3}
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>{t("transfer_notes_description")}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium">{t("transfer_items")}</h3>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={handleAddItem}
                  >
                    <PlusIcon className="mr-2 h-4 w-4" />
                    {t("add_item")}
                  </Button>
                </div>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-12 gap-2 px-2 py-1 bg-muted font-medium text-sm">
                    <div className="col-span-2">{t("unique_code")}</div>
                    <div className="col-span-3">{t("product")}</div>
                    <div>{t("quantity")}</div>
                    <div>{t("package_count")}</div>
                    <div>{t("weight")} (kg)</div>
                    <div>{t("volume")} (m³)</div>
                    <div></div>
                  </div>
                  
                  {fields.map((field, index) => (
                    <div key={field.id} className="grid grid-cols-12 gap-2 items-center p-2 border rounded-md">
                      {/* 唯一码输入 */}
                      <div className="col-span-2">
                        <FormField
                          control={form.control}
                          name={`items.${index}.uniqueCode`}
                          render={({ field }) => (
                            <FormItem className="space-y-0">
                              <FormControl>
                                <div className="flex">
                                  <Input 
                                    type="text" 
                                    placeholder={t("unique_code")} 
                                    {...field} 
                                    className="w-full"
                                    maxLength={5}
                                  />
                                  <Button 
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    className="ml-1"
                                    onClick={() => openBarcodeScanner(index)}
                                  >
                                    <QrCode className="h-4 w-4" />
                                  </Button>
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* 商品 */}
                      <div className="col-span-3">
                        <FormField
                          control={form.control}
                          name={`items.${index}.productId`}
                          render={({ field }) => (
                            <FormItem className="space-y-0">
                              <FormControl>
                                <Select 
                                  onValueChange={(value) => handleProductChange(value, index)} 
                                  defaultValue={field.value}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder={t("select_product")} />
                                  </SelectTrigger>
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
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      {/* 数量 */}
                      <div>
                        <FormField
                          control={form.control}
                          name={`items.${index}.quantity`}
                          render={({ field }) => (
                            <FormItem className="space-y-0">
                              <FormControl>
                                <Input 
                                  type="number" 
                                  min="1" 
                                  placeholder="1" 
                                  {...field} 
                                  onChange={(e) => handleQuantityChange(e.target.value, index)}
                                  className="w-full"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      {/* 件数 */}
                      <div>
                        <FormField
                          control={form.control}
                          name={`items.${index}.packageCount`}
                          render={({ field }) => (
                            <FormItem className="space-y-0">
                              <FormControl>
                                <Input 
                                  type="number" 
                                  min="1" 
                                  placeholder="1" 
                                  {...field} 
                                  className="w-full"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      {/* 重量 */}
                      <div>
                        <FormField
                          control={form.control}
                          name={`items.${index}.weight`}
                          render={({ field }) => (
                            <FormItem className="space-y-0">
                              <FormControl>
                                <Input 
                                  type="number" 
                                  step="0.001" 
                                  min="0" 
                                  placeholder="0" 
                                  {...field} 
                                  className="w-full"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      {/* 体积 */}
                      <div>
                        <FormField
                          control={form.control}
                          name={`items.${index}.volume`}
                          render={({ field }) => (
                            <FormItem className="space-y-0">
                              <FormControl>
                                <Input 
                                  type="number" 
                                  step="0.001" 
                                  min="0" 
                                  placeholder="0" 
                                  {...field} 
                                  className="w-full"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      {/* 删除按钮 */}
                      <div className="flex justify-center">
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleRemoveItem(index)}
                          className="h-8 w-8"
                        >
                          <MinusIcon className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="bg-muted p-4 rounded-md">
                <h3 className="text-lg font-medium mb-2">{t("transfer_summary")}</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">{t("total_quantity")}</p>
                    <p className="text-lg font-semibold">{totalQuantity}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t("total_packages")}</p>
                    <p className="text-lg font-semibold">{totalPackages}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t("total_weight")}</p>
                    <p className="text-lg font-semibold">{`${totalWeight.toFixed(2)} kg`}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t("total_volume")}</p>
                    <p className="text-lg font-semibold">{`${totalVolume.toFixed(3)} m³`}</p>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end">
                <Button 
                  type="submit" 
                  className="w-full md:w-auto" 
                  disabled={isSubmitting}
                >
                  {isSubmitting ? t("creating_transfer") : t("create_transfer")}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>{t("transfer_process")}</CardTitle>
          <CardDescription>
            {t("transfer_process_description")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8 py-4">
            <div className="text-center">
              <div className="mb-2 text-lg font-medium">{t("source_warehouse")}</div>
              <div className="bg-primary/10 p-6 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-12 w-12 mx-auto text-primary">
                  <path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z" />
                  <path d="M3 9V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4" />
                </svg>
              </div>
            </div>
            
            <div className="flex flex-col items-center">
              <ArrowRightIcon className="hidden md:block h-8 w-8 text-muted-foreground" />
              <div className="md:hidden flex items-center justify-center w-8 h-8">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8 text-muted-foreground">
                  <path d="M12 5v14" />
                  <path d="m19 12-7 7-7-7" />
                </svg>
              </div>
              <div className="text-center my-2">
                <Badge variant="outline" className="font-semibold">
                  {t("transfer_order")}
                </Badge>
              </div>
            </div>
            
            <div className="text-center">
              <div className="mb-2 text-lg font-medium">{t("target_warehouse")}</div>
              <div className="bg-primary/10 p-6 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-12 w-12 mx-auto text-primary">
                  <path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z" />
                  <path d="M3 9V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4" />
                </svg>
              </div>
            </div>
          </div>
          
          <div className="mt-6 border-t pt-4">
            <p className="text-muted-foreground">
              {t("transfer_explanation")}
            </p>
            
            <ul className="mt-4 space-y-2 list-disc pl-5">
              <li>{t("transfer_step_1")}</li>
              <li>{t("transfer_step_2")}</li>
              <li>{t("transfer_step_3")}</li>
              <li>{t("transfer_step_4")}</li>
            </ul>
          </div>
        </CardContent>
      </Card>
      
      {/* 条码扫描对话框 */}
      <Dialog open={isBarcodeScannerOpen} onOpenChange={setIsBarcodeScannerOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("scan_unique_code")}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center py-4">
            <BarcodeScanner 
              onCodeDetected={handleUniqueCodeScanned}
              label={t("scan_or_enter_code")}
              placeholder={t("unique_code_placeholder")}
              uniqueCodeMode={true}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}