import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { BarcodeScanner } from "@/components/BarcodeScanner";

// 创建商品的验证模式
const createProductSchema = z.object({
  name: z.string().min(1, "商品名称不能为空"),
  description: z.string().optional(),
  barcode: z.string().min(1, "商品条码不能为空"),
  uniqueCode: z.string().optional(), // 商品唯一码，用于与电商平台匹配
  category: z.string().min(1, "商品分类不能为空"),
  stock: z.number().min(0, "库存不能为负数"),
  price: z.number().min(0, "售价不能为负数"),
  cost: z.number().min(0, "成本不能为负数"),
  
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
  bulkVolumeM3: z.number().min(0, "整件体积不能为负数").optional(), // 整件立方（M3）- 可以自动计算
  
  warehouseId: z.number().min(1, "必须选择仓库")
});

type FormValues = z.infer<typeof createProductSchema>;

interface CreateProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserId: number;
}

export function CreateProductDialog({ open, onOpenChange, currentUserId }: CreateProductDialogProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(createProductSchema),
    defaultValues: {
      name: "",
      description: "",
      barcode: "",
      uniqueCode: "", // 添加商品唯一码默认值
      category: "",
      stock: 0,
      price: 0,
      cost: 0,
      
      // 单件尺寸和重量信息
      singleLengthCm: 0,
      singleWidthCm: 0,
      singleHeightCm: 0,
      singleWeightKg: 0,
      singleVolumeM3: 0,
      
      // 整件包装信息
      bulkQuantity: 1, // 每件包装内的产品数量
      bulkLengthCm: 0,
      bulkWidthCm: 0,
      bulkHeightCm: 0,
      bulkWeightKg: 0,
      bulkVolumeM3: 0,
      
      warehouseId: 1 // 默认仓库ID
    }
  });
  
  const { mutate, isPending } = useMutation({
    mutationFn: (data: FormValues) => 
      apiRequest("/api/products", {
        method: "POST",
        body: data
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      toast({
        title: t('product_created'),
        description: t('product_created_description')
      });
      form.reset();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: t('product_creation_failed'),
        description: error.message || String(error) || t('unknown_error'),
        variant: "destructive"
      });
    }
  });
  
  const onSubmit = (data: FormValues) => {
    mutate(data);
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>{t('new_product')}</DialogTitle>
          <DialogDescription>
            {t('new_product_description')}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t('name')} *</Label>
              <Input
                id="name"
                {...form.register("name")}
                placeholder={t('product_name_placeholder')}
              />
              {form.formState.errors.name && (
                <p className="text-sm text-red-500">{form.formState.errors.name.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="barcode">{t('barcode')} *</Label>
              <Input
                id="barcode"
                {...form.register("barcode")}
                placeholder={t('barcode_placeholder')}
              />
              {form.formState.errors.barcode && (
                <p className="text-sm text-red-500">{form.formState.errors.barcode.message}</p>
              )}
            </div>
          </div>
          
          {/* 唯一码扫描组件 */}
          <div className="space-y-2">
            <BarcodeScanner
              label={t('unique_code') || "商品唯一码"}
              placeholder={t('unique_code_placeholder') || "请扫描或输入唯一码"}
              initialValue={form.watch("uniqueCode")}
              onCodeDetected={(code) => form.setValue("uniqueCode", code)}
              uniqueCodeMode={true}
            />
            {form.formState.errors.uniqueCode && (
              <p className="text-sm text-red-500">{form.formState.errors.uniqueCode.message}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">{t('description')} ({t('optional')})</Label>
            <Textarea
              id="description"
              {...form.register("description")}
              placeholder={t('product_description_placeholder')}
              rows={3}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">{t('category')} *</Label>
              <Select
                value={form.watch("category")}
                onValueChange={(value) => form.setValue("category", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('select_category')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="electronics">电子产品</SelectItem>
                  <SelectItem value="clothing">服装</SelectItem>
                  <SelectItem value="food">食品</SelectItem>
                  <SelectItem value="home">家居</SelectItem>
                  <SelectItem value="other">其他</SelectItem>
                </SelectContent>
              </Select>
              {form.formState.errors.category && (
                <p className="text-sm text-red-500">{form.formState.errors.category.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="warehouse">{t('warehouse')} *</Label>
              <Select
                value={form.watch("warehouseId")?.toString()}
                onValueChange={(value) => form.setValue("warehouseId", parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('select_warehouse')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">主仓库</SelectItem>
                  <SelectItem value="2">分仓库1</SelectItem>
                  <SelectItem value="3">分仓库2</SelectItem>
                </SelectContent>
              </Select>
              {form.formState.errors.warehouseId && (
                <p className="text-sm text-red-500">{form.formState.errors.warehouseId.message}</p>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="stock">{t('stock')} *</Label>
              <Input
                id="stock"
                type="number"
                {...form.register("stock", { valueAsNumber: true })}
                placeholder="0"
              />
              {form.formState.errors.stock && (
                <p className="text-sm text-red-500">{form.formState.errors.stock.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="singleWeightKg">{t('weight')} (kg)</Label>
              <Input
                id="singleWeightKg"
                type="number"
                step="0.01"
                {...form.register("singleWeightKg", { valueAsNumber: true })}
                placeholder="0.00"
              />
              {form.formState.errors.singleWeightKg && (
                <p className="text-sm text-red-500">{form.formState.errors.singleWeightKg.message}</p>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">{t('price')} (¥) *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                {...form.register("price", { valueAsNumber: true })}
                placeholder="0.00"
              />
              {form.formState.errors.price && (
                <p className="text-sm text-red-500">{form.formState.errors.price.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="cost">{t('cost')} (¥) *</Label>
              <Input
                id="cost"
                type="number"
                step="0.01"
                {...form.register("cost", { valueAsNumber: true })}
                placeholder="0.00"
              />
              {form.formState.errors.cost && (
                <p className="text-sm text-red-500">{form.formState.errors.cost.message}</p>
              )}
            </div>
          </div>
          
          <div>
            <h3 className="text-sm font-medium mb-2 border-b pb-1">{t('single_item_dimensions')}</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="singleLengthCm">{t('single_length')} (cm)</Label>
                  <Input
                    id="singleLengthCm"
                    type="number"
                    step="0.1"
                    {...form.register("singleLengthCm", { valueAsNumber: true })}
                    placeholder="0.0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="singleWidthCm">{t('single_width')} (cm)</Label>
                  <Input
                    id="singleWidthCm"
                    type="number"
                    step="0.1"
                    {...form.register("singleWidthCm", { valueAsNumber: true })}
                    placeholder="0.0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="singleHeightCm">{t('single_height')} (cm)</Label>
                  <Input
                    id="singleHeightCm"
                    type="number"
                    step="0.1"
                    {...form.register("singleHeightCm", { valueAsNumber: true })}
                    placeholder="0.0"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="singleVolumeM3">{t('single_volume')} (m³)</Label>
                  <Input
                    id="singleVolumeM3"
                    type="number"
                    step="0.001"
                    {...form.register("singleVolumeM3", { valueAsNumber: true })}
                    placeholder="0.000"
                  />
                </div>
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="text-sm font-medium mb-2 border-b pb-1">{t('bulk_package_dimensions')}</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="bulkLengthCm">{t('bulk_length')} (cm)</Label>
                  <Input
                    id="bulkLengthCm"
                    type="number"
                    step="0.1"
                    {...form.register("bulkLengthCm", { valueAsNumber: true })}
                    placeholder="0.0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bulkWidthCm">{t('bulk_width')} (cm)</Label>
                  <Input
                    id="bulkWidthCm"
                    type="number"
                    step="0.1"
                    {...form.register("bulkWidthCm", { valueAsNumber: true })}
                    placeholder="0.0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bulkHeightCm">{t('bulk_height')} (cm)</Label>
                  <Input
                    id="bulkHeightCm"
                    type="number"
                    step="0.1"
                    {...form.register("bulkHeightCm", { valueAsNumber: true })}
                    placeholder="0.0"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="bulkWeightKg">{t('bulk_weight')} (kg)</Label>
                  <Input
                    id="bulkWeightKg"
                    type="number"
                    step="0.01"
                    {...form.register("bulkWeightKg", { valueAsNumber: true })}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bulkVolumeM3">{t('bulk_volume')} (m³)</Label>
                  <Input
                    id="bulkVolumeM3"
                    type="number"
                    step="0.001"
                    {...form.register("bulkVolumeM3", { valueAsNumber: true })}
                    placeholder="0.000"
                  />
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? t('creating') + '...' : t('create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}