import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { BarcodeScanner } from "@/components/BarcodeScanner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Barcode, Scan, Calculator } from "lucide-react";

// 商品创建表单Schema定义
const productSchema = z.object({
  name: z.string().min(1, { message: "名称不能为空" }),
  barcode: z.string().min(1, { message: "条码不能为空" }),
  uniqueCode: z.string().optional(),
  category: z.string().min(1, { message: "分类不能为空" }),
  description: z.string().optional(),
  stock: z.coerce.number().min(0, { message: "库存不能为负数" }),
  price: z.coerce.number().min(0, { message: "批发价不能为负数" }),
  cost: z.coerce.number().min(0, { message: "代理价不能为负数" }),
  warehouseId: z.coerce.number().min(1, { message: "请选择仓库" }),
  
  // 单件信息
  singleLengthCm: z.coerce.number().min(0, { message: "长度不能为负数" }),
  singleWidthCm: z.coerce.number().min(0, { message: "宽度不能为负数" }),
  singleHeightCm: z.coerce.number().min(0, { message: "高度不能为负数" }),
  singleWeightKg: z.coerce.number().min(0, { message: "重量不能为负数" }),
  
  // 整件包装信息
  bulkQuantity: z.coerce.number().min(1, { message: "包装数量至少为1" }),
  bulkLengthCm: z.coerce.number().min(0, { message: "长度不能为负数" }),
  bulkWidthCm: z.coerce.number().min(0, { message: "宽度不能为负数" }),
  bulkHeightCm: z.coerce.number().min(0, { message: "高度不能为负数" }),
  bulkWeightKg: z.coerce.number().min(0, { message: "重量不能为负数" }),
});

type ProductFormValues = z.infer<typeof productSchema>;

interface CreateWarehouseProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserId: number;
}

export function CreateWarehouseProductDialog({
  open,
  onOpenChange,
  currentUserId
}: CreateWarehouseProductDialogProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("basic");
  const [autoBulkCalculation, setAutoBulkCalculation] = useState(true);
  
  // 创建表单
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      barcode: "",
      uniqueCode: "",
      category: "",
      description: "",
      stock: 0,
      price: 0,
      cost: 0,
      warehouseId: 0,
      
      singleLengthCm: 0,
      singleWidthCm: 0,
      singleHeightCm: 0,
      singleWeightKg: 0,
      
      bulkQuantity: 1,
      bulkLengthCm: 0,
      bulkWidthCm: 0,
      bulkHeightCm: 0,
      bulkWeightKg: 0
    }
  });
  
  // 获取仓库列表
  const { data: warehouses = [] } = useQuery<any[]>({
    queryKey: ['/api/warehouses'],
  });

  // 获取分类列表
  const { data: products = [] } = useQuery<any[]>({
    queryKey: ['/api/products'],
  });
  
  // 提取唯一分类列表
  const categories = Array.from(new Set(products.map(p => p.category))).sort();
  
  // 商品创建mutation
  const createProduct = useMutation({
    mutationFn: async (data: ProductFormValues) => {
      // 计算体积，后端API需要
      const singleVolumeM3 = (data.singleLengthCm * data.singleWidthCm * data.singleHeightCm) / 1000000; // cm³ to m³
      const bulkVolumeM3 = (data.bulkLengthCm * data.bulkWidthCm * data.bulkHeightCm) / 1000000; // cm³ to m³
      
      // 构建完整数据
      const productData = {
        ...data,
        singleVolumeM3,
        bulkVolumeM3
      };
      
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(productData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '创建商品失败');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      toast.success(t('product_created_successfully'));
      form.reset();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(t('product_creation_failed') + ': ' + error.message);
    }
  });
  
  // 表单提交
  const onSubmit = (data: ProductFormValues) => {
    createProduct.mutate(data);
  };
  
  // 条码扫描处理
  const handleBarcodeScanned = (barcode: string) => {
    form.setValue("barcode", barcode);
    // 使用正确的toast API
    toast.success(`${t('barcode_scanned')}: ${barcode}`);
  };
  
  // 自动计算整件信息
  const calculateBulkDimensions = () => {
    if (!autoBulkCalculation) return;
    
    const singleLength = form.getValues("singleLengthCm");
    const singleWidth = form.getValues("singleWidthCm");
    const singleHeight = form.getValues("singleHeightCm");
    const singleWeight = form.getValues("singleWeightKg");
    const bulkQuantity = form.getValues("bulkQuantity");
    
    // 简单计算 - 在实际应用中可以使用更复杂的装箱算法
    form.setValue("bulkWeightKg", Math.round((singleWeight * bulkQuantity) * 100) / 100); // 四舍五入到2位小数
    form.setValue("bulkLengthCm", Math.max(singleLength, Math.sqrt(singleLength * singleWidth * bulkQuantity / singleHeight)));
    form.setValue("bulkWidthCm", Math.max(singleWidth, Math.sqrt(singleLength * singleWidth * bulkQuantity / singleHeight)));
    form.setValue("bulkHeightCm", Math.max(singleHeight, Math.ceil(bulkQuantity / (Math.floor(form.getValues("bulkLengthCm") / singleLength) * Math.floor(form.getValues("bulkWidthCm") / singleWidth)) * singleHeight)));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('create_new_product')}</DialogTitle>
          <DialogDescription>
            {t('fill_product_details_description')}
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs defaultValue="basic" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-3">
                <TabsTrigger value="basic">{t('basic_info')}</TabsTrigger>
                <TabsTrigger value="dimensions">{t('dimensions')}</TabsTrigger>
                <TabsTrigger value="packaging">{t('packaging')}</TabsTrigger>
              </TabsList>
              
              {/* 基本信息标签页 */}
              <TabsContent value="basic" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('product_name')}</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* 条码字段带扫描按钮 */}
                  <div className="flex gap-2">
                    <FormField
                      control={form.control}
                      name="barcode"
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormLabel>{t('barcode')}</FormLabel>
                          <div className="flex gap-2">
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <Button 
                              type="button" 
                              variant="outline" 
                              size="icon"
                              onClick={() => document.getElementById('barcodeScannerModal')?.click()}
                            >
                              <Scan className="h-4 w-4" />
                            </Button>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="uniqueCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('unique_code')}</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormDescription>
                          {t('unique_code_description')}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('category')}</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t('select_category')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {categories.map((category) => (
                              <SelectItem key={category} value={category}>
                                {category}
                              </SelectItem>
                            ))}
                            <SelectItem value="other">{t('other')}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="warehouseId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('warehouse')}</FormLabel>
                        <Select 
                          onValueChange={(value) => field.onChange(parseInt(value))} 
                          defaultValue={field.value.toString()}
                          value={field.value.toString()}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t('select_warehouse')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {warehouses.map((warehouse: any) => (
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
                    name="stock"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('initial_stock')}</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" step="1" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('wholesale_price')}</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" step="0.01" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="cost"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('agent_price')}</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" step="0.01" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="md:col-span-2">
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('description')}</FormLabel>
                          <FormControl>
                            <Textarea rows={3} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </TabsContent>
              
              {/* 尺寸信息标签页 */}
              <TabsContent value="dimensions" className="space-y-4">
                <Card>
                  <CardContent className="pt-6">
                    <h3 className="font-medium mb-4">{t('single_item_dimensions')}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="singleLengthCm"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('length')} (cm)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="0" 
                                step="0.1" 
                                {...field} 
                                onChange={(e) => {
                                  field.onChange(e);
                                  calculateBulkDimensions();
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="singleWidthCm"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('width')} (cm)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="0" 
                                step="0.1" 
                                {...field} 
                                onChange={(e) => {
                                  field.onChange(e);
                                  calculateBulkDimensions();
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="singleHeightCm"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('height')} (cm)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="0" 
                                step="0.1" 
                                {...field} 
                                onChange={(e) => {
                                  field.onChange(e);
                                  calculateBulkDimensions();
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="singleWeightKg"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('weight')} (kg)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="0" 
                                step="0.001" 
                                {...field} 
                                onChange={(e) => {
                                  field.onChange(e);
                                  calculateBulkDimensions();
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="md:col-span-2">
                        <div className="text-sm text-muted-foreground">
                          {t('single_volume')}: {(form.watch("singleLengthCm") * form.watch("singleWidthCm") * form.watch("singleHeightCm") / 1000000).toFixed(6)} m³
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              {/* 包装信息标签页 */}
              <TabsContent value="packaging" className="space-y-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-medium">{t('bulk_packaging')}</h3>
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="auto-calculate"
                          checked={autoBulkCalculation}
                          onCheckedChange={(checked) => {
                            setAutoBulkCalculation(checked === true);
                            if (checked) calculateBulkDimensions();
                          }}
                        />
                        <label
                          htmlFor="auto-calculate"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center"
                        >
                          <Calculator className="h-4 w-4 mr-1" />
                          {t('auto_calculate')}
                        </label>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="bulkQuantity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('items_per_package')}</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="1" 
                                step="1" 
                                {...field} 
                                onChange={(e) => {
                                  field.onChange(e);
                                  calculateBulkDimensions();
                                }}
                              />
                            </FormControl>
                            <FormDescription>
                              {t('items_per_package_description')}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="md:col-span-2">
                        <FormField
                          control={form.control}
                          name="bulkLengthCm"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t('package_length')} (cm)</FormLabel>
                              <FormControl>
                                <Input type="number" min="0" step="0.1" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <FormField
                        control={form.control}
                        name="bulkWidthCm"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('package_width')} (cm)</FormLabel>
                            <FormControl>
                              <Input type="number" min="0" step="0.1" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="bulkHeightCm"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('package_height')} (cm)</FormLabel>
                            <FormControl>
                              <Input type="number" min="0" step="0.1" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="bulkWeightKg"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('package_weight')} (kg)</FormLabel>
                            <FormControl>
                              <Input type="number" min="0" step="0.001" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="md:col-span-2">
                        <div className="text-sm text-muted-foreground">
                          {t('package_volume')}: {(form.watch("bulkLengthCm") * form.watch("bulkWidthCm") * form.watch("bulkHeightCm") / 1000000).toFixed(6)} m³
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t('cancel')}
              </Button>
              <Button type="submit" disabled={createProduct.isPending}>
                {createProduct.isPending ? t('creating') : t('create_product')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
        
        {/* 条码扫描模态框触发元素 */}
        <button id="barcodeScannerModal" className="hidden" />
        
        {/* 条码扫描器 */}
        <Dialog>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t('scan_barcode')}</DialogTitle>
              <DialogDescription>
                {t('scan_barcode_description')}
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center py-4">
              <BarcodeScanner 
                onBarcodeScanned={handleBarcodeScanned}
                label={t('scan_or_enter_barcode')}
                placeholder={t('barcode_placeholder')}
              />
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}