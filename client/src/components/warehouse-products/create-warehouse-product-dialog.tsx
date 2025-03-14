import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { BarcodeScanner } from "@/components/BarcodeScanner";

// 创建仓库商品的验证模式
const createWarehouseProductSchema = z.object({
  name: z.string().min(1, "商品名称不能为空"),
  description: z.string().optional(),
  barcode: z.string().min(1, "商品条码不能为空"),
  uniqueCode: z.string().optional(), // 商品唯一码，用于与电商平台匹配
  category: z.string().min(1, "商品分类不能为空"),
  stock: z.number().min(0, "库存不能为负数"),
  price: z.number().min(0, "批发价不能为负数"),
  cost: z.number().min(0, "代理价不能为负数"),
  warehouseId: z.number().min(1, "必须选择仓库"),
  
  // 单件尺寸和重量信息
  singleLengthCm: z.number().min(0, "长度不能为负数"),     // 单件尺寸（长CM）
  singleWidthCm: z.number().min(0, "宽度不能为负数"),      // 单件尺寸（宽CM）
  singleHeightCm: z.number().min(0, "高度不能为负数"),     // 单件尺寸（高CM）
  singleWeightKg: z.number().min(0, "重量不能为负数"),     // 单件重量（kg）
  singleVolumeM3: z.number().min(0, "体积不能为负数").optional(), // 单件立方（M3）- 可以自动计算
  
  // 整件包装信息
  bulkQuantity: z.number().min(1, "每件包装内的产品数量必须至少为1").default(1), // 每件包装内的产品数量
  bulkLengthCm: z.number().min(0, "整件长度不能为负数"),     // 整件尺寸（长CM）
  bulkWidthCm: z.number().min(0, "整件宽度不能为负数"),      // 整件尺寸（宽CM）
  bulkHeightCm: z.number().min(0, "整件高度不能为负数"),     // 整件尺寸（高CM）
  bulkWeightKg: z.number().min(0, "整件重量不能为负数"),     // 整件重量（kg）
  bulkVolumeM3: z.number().min(0, "整件体积不能为负数").optional() // 整件立方（M3）- 可以自动计算
});

type FormValues = z.infer<typeof createWarehouseProductSchema>;

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

  // 默认值
  const defaultValues: Partial<FormValues> = {
    stock: 0,
    price: 0,
    cost: 0,
    singleLengthCm: 0,
    singleWidthCm: 0,
    singleHeightCm: 0,
    singleWeightKg: 0,
    bulkQuantity: 1,
    bulkLengthCm: 0,
    bulkWidthCm: 0,
    bulkHeightCm: 0,
    bulkWeightKg: 0
  };

  // 获取仓库列表
  const { data: warehouses = [] } = useQuery<any[]>({
    queryKey: ['/api/warehouses'],
  });

  // 表单初始化
  const form = useForm<FormValues>({
    resolver: zodResolver(createWarehouseProductSchema),
    defaultValues,
  });

  // 添加新商品的mutation
  const { mutate: createProduct, isPending } = useMutation({
    mutationFn: (data: FormValues) => {
      // 计算体积
      const singleVolumeM3 = (data.singleLengthCm * data.singleWidthCm * data.singleHeightCm) / 1000000;
      const bulkVolumeM3 = (data.bulkLengthCm * data.bulkWidthCm * data.bulkHeightCm) / 1000000;
      
      // 添加计算字段
      return apiRequest('/api/products', 'POST', {
        ...data,
        singleVolumeM3,
        bulkVolumeM3,
        type: 'warehouse' // 标记为仓库商品
      });
    },
    onSuccess: () => {
      toast({
        title: t('success'),
        description: t('product_created_successfully'),
      });
      form.reset(defaultValues); // 重置表单
      queryClient.invalidateQueries({ queryKey: ['/api/products'] }); // 刷新列表
      onOpenChange(false); // 关闭对话框
    },
    onError: (error: any) => {
      toast({
        title: t('error'),
        description: error.message || t('product_creation_failed'),
        variant: "destructive",
      });
    },
  });

  // 表单提交处理
  const onSubmit = (data: FormValues) => {
    createProduct(data);
  };

  // 条码扫描器回调
  const handleBarcodeScanned = (barcode: string) => {
    form.setValue('barcode', barcode);
  };

  // 自动计算体积的辅助函数
  const calculateVolume = (length: number, width: number, height: number): number => {
    return (length * width * height) / 1000000; // 立方厘米到立方米的转换
  };

  // 更新全部单件体积字段
  const updateSingleVolume = () => {
    const length = form.getValues('singleLengthCm');
    const width = form.getValues('singleWidthCm');
    const height = form.getValues('singleHeightCm');
    
    if (length && width && height) {
      const volume = calculateVolume(length, width, height);
      form.setValue('singleVolumeM3', volume);
    }
  };

  // 更新全部整件体积字段
  const updateBulkVolume = () => {
    const length = form.getValues('bulkLengthCm');
    const width = form.getValues('bulkWidthCm');
    const height = form.getValues('bulkHeightCm');
    
    if (length && width && height) {
      const volume = calculateVolume(length, width, height);
      form.setValue('bulkVolumeM3', volume);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('new_warehouse_product')}</DialogTitle>
          <DialogDescription>
            {t('new_warehouse_product_description')}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 商品名称 */}
            <div className="space-y-2">
              <Label htmlFor="name">{t('product_name')} *</Label>
              <Input
                id="name"
                placeholder={t('enter_product_name')}
                {...form.register('name')}
              />
              {form.formState.errors.name && (
                <p className="text-sm text-red-500">{form.formState.errors.name.message}</p>
              )}
            </div>

            {/* 商品条码 */}
            <div className="space-y-2">
              <Label htmlFor="barcode">{t('barcode')} *</Label>
              <div className="flex space-x-2">
                <Input
                  id="barcode"
                  placeholder={t('enter_barcode')}
                  {...form.register('barcode')}
                  className="flex-1"
                />
                <BarcodeScanner onBarcodeScanned={handleBarcodeScanned} />
              </div>
              {form.formState.errors.barcode && (
                <p className="text-sm text-red-500">{form.formState.errors.barcode.message}</p>
              )}
            </div>

            {/* 唯一码 */}
            <div className="space-y-2">
              <Label htmlFor="uniqueCode">{t('unique_code')}</Label>
              <Input
                id="uniqueCode"
                placeholder={t('enter_unique_code')}
                {...form.register('uniqueCode')}
              />
              {form.formState.errors.uniqueCode && (
                <p className="text-sm text-red-500">{form.formState.errors.uniqueCode.message}</p>
              )}
            </div>

            {/* 商品分类 */}
            <div className="space-y-2">
              <Label htmlFor="category">{t('category')} *</Label>
              <Input
                id="category"
                placeholder={t('enter_category')}
                {...form.register('category')}
              />
              {form.formState.errors.category && (
                <p className="text-sm text-red-500">{form.formState.errors.category.message}</p>
              )}
            </div>

            {/* 仓库 */}
            <div className="space-y-2">
              <Label htmlFor="warehouseId">{t('warehouse')} *</Label>
              <Select
                onValueChange={(value) => form.setValue('warehouseId', parseInt(value))}
                defaultValue={form.getValues('warehouseId')?.toString()}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('select_warehouse')} />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((warehouse) => (
                    <SelectItem key={warehouse.id} value={warehouse.id.toString()}>
                      {warehouse.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.warehouseId && (
                <p className="text-sm text-red-500">{form.formState.errors.warehouseId.message}</p>
              )}
            </div>

            {/* 商品库存 */}
            <div className="space-y-2">
              <Label htmlFor="stock">{t('stock')}</Label>
              <Input
                id="stock"
                type="number"
                min="0"
                placeholder="0"
                {...form.register('stock', { valueAsNumber: true })}
              />
              {form.formState.errors.stock && (
                <p className="text-sm text-red-500">{form.formState.errors.stock.message}</p>
              )}
            </div>

            {/* 批发价 */}
            <div className="space-y-2">
              <Label htmlFor="price">{t('wholesale_price')}</Label>
              <Input
                id="price"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                {...form.register('price', { valueAsNumber: true })}
              />
              {form.formState.errors.price && (
                <p className="text-sm text-red-500">{form.formState.errors.price.message}</p>
              )}
            </div>

            {/* 代理价 */}
            <div className="space-y-2">
              <Label htmlFor="cost">{t('agent_price')}</Label>
              <Input
                id="cost"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                {...form.register('cost', { valueAsNumber: true })}
              />
              {form.formState.errors.cost && (
                <p className="text-sm text-red-500">{form.formState.errors.cost.message}</p>
              )}
            </div>
          </div>

          {/* 商品描述 */}
          <div className="space-y-2">
            <Label htmlFor="description">{t('description')}</Label>
            <Textarea
              id="description"
              placeholder={t('enter_description')}
              {...form.register('description')}
            />
            {form.formState.errors.description && (
              <p className="text-sm text-red-500">{form.formState.errors.description.message}</p>
            )}
          </div>

          {/* 尺寸和重量信息 */}
          <div className="space-y-4">
            <h3 className="font-medium">{t('single_item_dimensions')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* 单品长度 */}
              <div className="space-y-2">
                <Label htmlFor="singleLengthCm">{t('length')} (cm)</Label>
                <Input
                  id="singleLengthCm"
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="0.0"
                  {...form.register('singleLengthCm', { 
                    valueAsNumber: true,
                    onChange: () => updateSingleVolume()
                  })}
                />
                {form.formState.errors.singleLengthCm && (
                  <p className="text-sm text-red-500">{form.formState.errors.singleLengthCm.message}</p>
                )}
              </div>

              {/* 单品宽度 */}
              <div className="space-y-2">
                <Label htmlFor="singleWidthCm">{t('width')} (cm)</Label>
                <Input
                  id="singleWidthCm"
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="0.0"
                  {...form.register('singleWidthCm', { 
                    valueAsNumber: true,
                    onChange: () => updateSingleVolume()
                  })}
                />
                {form.formState.errors.singleWidthCm && (
                  <p className="text-sm text-red-500">{form.formState.errors.singleWidthCm.message}</p>
                )}
              </div>

              {/* 单品高度 */}
              <div className="space-y-2">
                <Label htmlFor="singleHeightCm">{t('height')} (cm)</Label>
                <Input
                  id="singleHeightCm"
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="0.0"
                  {...form.register('singleHeightCm', { 
                    valueAsNumber: true,
                    onChange: () => updateSingleVolume()
                  })}
                />
                {form.formState.errors.singleHeightCm && (
                  <p className="text-sm text-red-500">{form.formState.errors.singleHeightCm.message}</p>
                )}
              </div>

              {/* 单品重量 */}
              <div className="space-y-2">
                <Label htmlFor="singleWeightKg">{t('weight')} (kg)</Label>
                <Input
                  id="singleWeightKg"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  {...form.register('singleWeightKg', { valueAsNumber: true })}
                />
                {form.formState.errors.singleWeightKg && (
                  <p className="text-sm text-red-500">{form.formState.errors.singleWeightKg.message}</p>
                )}
              </div>

              {/* 单品体积 (计算字段) */}
              <div className="space-y-2">
                <Label htmlFor="singleVolumeM3">{t('volume')} (m³)</Label>
                <Input
                  id="singleVolumeM3"
                  type="number"
                  min="0"
                  step="0.0001"
                  placeholder="0.0000"
                  disabled
                  value={calculateVolume(
                    form.getValues('singleLengthCm') || 0,
                    form.getValues('singleWidthCm') || 0,
                    form.getValues('singleHeightCm') || 0
                  ).toFixed(6)}
                />
              </div>
            </div>

            <h3 className="font-medium">{t('bulk_package_dimensions')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* 每个包装的商品数量 */}
              <div className="space-y-2">
                <Label htmlFor="bulkQuantity">{t('items_per_package')}</Label>
                <Input
                  id="bulkQuantity"
                  type="number"
                  min="1"
                  placeholder="1"
                  {...form.register('bulkQuantity', { valueAsNumber: true })}
                />
                {form.formState.errors.bulkQuantity && (
                  <p className="text-sm text-red-500">{form.formState.errors.bulkQuantity.message}</p>
                )}
              </div>

              {/* 整件长度 */}
              <div className="space-y-2">
                <Label htmlFor="bulkLengthCm">{t('length')} (cm)</Label>
                <Input
                  id="bulkLengthCm"
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="0.0"
                  {...form.register('bulkLengthCm', { 
                    valueAsNumber: true,
                    onChange: () => updateBulkVolume()
                  })}
                />
                {form.formState.errors.bulkLengthCm && (
                  <p className="text-sm text-red-500">{form.formState.errors.bulkLengthCm.message}</p>
                )}
              </div>

              {/* 整件宽度 */}
              <div className="space-y-2">
                <Label htmlFor="bulkWidthCm">{t('width')} (cm)</Label>
                <Input
                  id="bulkWidthCm"
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="0.0"
                  {...form.register('bulkWidthCm', { 
                    valueAsNumber: true,
                    onChange: () => updateBulkVolume()
                  })}
                />
                {form.formState.errors.bulkWidthCm && (
                  <p className="text-sm text-red-500">{form.formState.errors.bulkWidthCm.message}</p>
                )}
              </div>

              {/* 整件高度 */}
              <div className="space-y-2">
                <Label htmlFor="bulkHeightCm">{t('height')} (cm)</Label>
                <Input
                  id="bulkHeightCm"
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="0.0"
                  {...form.register('bulkHeightCm', { 
                    valueAsNumber: true,
                    onChange: () => updateBulkVolume()
                  })}
                />
                {form.formState.errors.bulkHeightCm && (
                  <p className="text-sm text-red-500">{form.formState.errors.bulkHeightCm.message}</p>
                )}
              </div>

              {/* 整件重量 */}
              <div className="space-y-2">
                <Label htmlFor="bulkWeightKg">{t('weight')} (kg)</Label>
                <Input
                  id="bulkWeightKg"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  {...form.register('bulkWeightKg', { valueAsNumber: true })}
                />
                {form.formState.errors.bulkWeightKg && (
                  <p className="text-sm text-red-500">{form.formState.errors.bulkWeightKg.message}</p>
                )}
              </div>

              {/* 整件体积 (计算字段) */}
              <div className="space-y-2">
                <Label htmlFor="bulkVolumeM3">{t('volume')} (m³)</Label>
                <Input
                  id="bulkVolumeM3"
                  type="number"
                  min="0"
                  step="0.0001"
                  placeholder="0.0000"
                  disabled
                  value={calculateVolume(
                    form.getValues('bulkLengthCm') || 0,
                    form.getValues('bulkWidthCm') || 0,
                    form.getValues('bulkHeightCm') || 0
                  ).toFixed(6)}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? t('creating') : t('create_product')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}