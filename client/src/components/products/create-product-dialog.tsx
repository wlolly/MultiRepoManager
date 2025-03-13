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
  weight: z.number().min(0, "重量不能为负数"),
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
      weight: 0,
      warehouseId: 1 // 默认仓库ID
    }
  });
  
  const { mutate, isPending } = useMutation({
    mutationFn: (data: FormValues) => 
      apiRequest<any>({
        url: "/api/products",
        method: "POST",
        data
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
              <Label htmlFor="weight">{t('weight')} (kg)</Label>
              <Input
                id="weight"
                type="number"
                step="0.01"
                {...form.register("weight", { valueAsNumber: true })}
                placeholder="0.00"
              />
              {form.formState.errors.weight && (
                <p className="text-sm text-red-500">{form.formState.errors.weight.message}</p>
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