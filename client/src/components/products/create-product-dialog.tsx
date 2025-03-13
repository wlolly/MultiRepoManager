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

// 创建商品的验证模式
const createProductSchema = z.object({
  name: z.string().min(1, "商品名称不能为空"),
  description: z.string().optional(),
  barcode: z.string().min(1, "商品条码不能为空"),
  category: z.string().min(1, "商品分类不能为空"),
  stock: z.number().min(0, "库存不能为负数"),
  price: z.number().min(0, "售价不能为负数"),
  cost: z.number().min(0, "成本不能为负数"),
  
  // 单件尺寸和重量信息
  lengthCm: z.number().min(0, "长度不能为负数"),     // 单件尺寸（长CM）
  widthCm: z.number().min(0, "宽度不能为负数"),      // 单件尺寸（宽CM）
  heightCm: z.number().min(0, "高度不能为负数"),     // 单件尺寸（高CM）
  weightKg: z.number().min(0, "重量不能为负数"),     // 单件重量（kg）
  volumeM3: z.number().min(0, "体积不能为负数").optional(), // 单件立方（M3）- 可以自动计算
  
  // 整件包装信息
  packageWidthCm: z.number().min(0, "包装宽度不能为负数"),    // 整件尺寸（宽CM）
  packageHeightCm: z.number().min(0, "包装高度不能为负数"),   // 整件尺寸（高CM）
  packageWeightKg: z.number().min(0, "包装重量不能为负数"),   // 整件重量（kg）
  packageVolumeM3: z.number().min(0, "包装体积不能为负数").optional(), // 整件立方（M3）- 可以自动计算
  
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
      category: "",
      stock: 0,
      price: 0,
      cost: 0,
      
      // 单件尺寸和重量信息
      lengthCm: 0,
      widthCm: 0,
      heightCm: 0,
      weightKg: 0,
      volumeM3: 0,
      
      // 整件包装信息
      packageWidthCm: 0,
      packageHeightCm: 0,
      packageWeightKg: 0,
      packageVolumeM3: 0,
      
      warehouseId: 1 // 默认仓库ID
    }
  });
  
  const { mutate, isPending } = useMutation({
    mutationFn: (data: FormValues) => 
      apiRequest(
        "POST",
        "/api/products",
        data
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      toast({
        title: t('product_created'),
        description: t('product_created_description')
      });
      form.reset();
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: t('product_creation_failed'),
        description: String(error),
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
              <Label htmlFor="weightKg">{t('weight')} (kg)</Label>
              <Input
                id="weightKg"
                type="number"
                step="0.01"
                {...form.register("weightKg", { valueAsNumber: true })}
                placeholder="0.00"
              />
              {form.formState.errors.weightKg && (
                <p className="text-sm text-red-500">{form.formState.errors.weightKg.message}</p>
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
            <h3 className="text-sm font-medium mb-2 border-b pb-1">{t('dimensions')}</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="lengthCm">{t('length')} (cm)</Label>
                  <Input
                    id="lengthCm"
                    type="number"
                    step="0.1"
                    {...form.register("lengthCm", { valueAsNumber: true })}
                    placeholder="0.0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="widthCm">{t('width')} (cm)</Label>
                  <Input
                    id="widthCm"
                    type="number"
                    step="0.1"
                    {...form.register("widthCm", { valueAsNumber: true })}
                    placeholder="0.0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="heightCm">{t('height')} (cm)</Label>
                  <Input
                    id="heightCm"
                    type="number"
                    step="0.1"
                    {...form.register("heightCm", { valueAsNumber: true })}
                    placeholder="0.0"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="volumeM3">{t('volume')} (m³)</Label>
                  <Input
                    id="volumeM3"
                    type="number"
                    step="0.001"
                    {...form.register("volumeM3", { valueAsNumber: true })}
                    placeholder="0.000"
                  />
                </div>
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="text-sm font-medium mb-2 border-b pb-1">{t('package_dimensions')}</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="packageWidthCm">{t('package_width')} (cm)</Label>
                  <Input
                    id="packageWidthCm"
                    type="number"
                    step="0.1"
                    {...form.register("packageWidthCm", { valueAsNumber: true })}
                    placeholder="0.0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="packageHeightCm">{t('package_height')} (cm)</Label>
                  <Input
                    id="packageHeightCm"
                    type="number"
                    step="0.1"
                    {...form.register("packageHeightCm", { valueAsNumber: true })}
                    placeholder="0.0"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="packageWeightKg">{t('package_weight')} (kg)</Label>
                  <Input
                    id="packageWeightKg"
                    type="number"
                    step="0.01"
                    {...form.register("packageWeightKg", { valueAsNumber: true })}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="packageVolumeM3">{t('package_volume')} (m³)</Label>
                  <Input
                    id="packageVolumeM3"
                    type="number"
                    step="0.001"
                    {...form.register("packageVolumeM3", { valueAsNumber: true })}
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