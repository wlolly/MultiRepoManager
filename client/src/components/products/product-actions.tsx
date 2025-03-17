import React, { useState } from "react";
import { useNavigate } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import {
  PlusCircle,
  FileSpreadsheet,
  Loader2,
  UploadCloud,
  Save,
  X
} from "lucide-react";

// 产品表单验证模式
const productFormSchema = z.object({
  name: z.string().min(2, "产品名称至少需要2个字符"),
  description: z.string().optional(),
  barcode: z.string().min(1, "条码不能为空"),
  uniqueCode: z.string().optional(),
  category: z.string().min(1, "分类不能为空"),
  stock: z.coerce.number().min(0, "库存不能为负数"),
  price: z.coerce.number().min(0, "批发价不能为负数"),
  cost: z.coerce.number().min(0, "代理价不能为负数"),
  
  // 单件尺寸和重量信息
  singleLengthCm: z.coerce.number().min(0, "长度不能为负数"),
  singleWidthCm: z.coerce.number().min(0, "宽度不能为负数"),
  singleHeightCm: z.coerce.number().min(0, "高度不能为负数"),
  singleWeightKg: z.coerce.number().min(0, "重量不能为负数"), 
  
  // 整件包装信息（可选）
  bulkLengthCm: z.coerce.number().min(0, "整件长度不能为负数").optional(),
  bulkWidthCm: z.coerce.number().min(0, "整件宽度不能为负数").optional(),
  bulkHeightCm: z.coerce.number().min(0, "整件高度不能为负数").optional(),
  bulkWeightKg: z.coerce.number().min(0, "整件重量不能为负数").optional(),
  bulkQuantity: z.coerce.number().min(1, "整件数量必须大于0").optional(),
  
  // 仓库ID（可选）
  warehouseId: z.coerce.number().optional(),
});

// 默认产品数据
const defaultProduct = {
  name: "",
  description: "",
  barcode: "",
  uniqueCode: "",
  category: "电子产品", // 默认分类
  stock: 0,
  price: 0,
  cost: 0,
  singleLengthCm: 0,
  singleWidthCm: 0,
  singleHeightCm: 0,
  singleWeightKg: 0,
  singleVolumeM3: 0, // 会自动计算
  bulkLengthCm: 0,
  bulkWidthCm: 0,
  bulkHeightCm: 0,
  bulkWeightKg: 0,
  bulkVolumeM3: 0, // 会自动计算
  bulkQuantity: 1,
  warehouseId: 1, // 默认仓库ID
};

// 产品种类列表
const PRODUCT_CATEGORIES = [
  "电子产品",
  "办公家具",
  "办公设备",
  "日用品",
  "文具",
  "其他"
];

interface ProductFormProps {
  isOpen: boolean;
  onClose: () => void;
  product?: any; // 编辑模式下的产品数据
  warehouses: any[]; // 仓库列表
}

export function ProductForm({ isOpen, onClose, product, warehouses }: ProductFormProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditMode = !!product?.id;
  
  // 表单初始值设置
  const form = useForm<z.infer<typeof productFormSchema>>({
    resolver: zodResolver(productFormSchema),
    defaultValues: isEditMode ? {
      ...product,
      // 确保数字字段正确转换
      stock: Number(product.stock || 0),
      price: Number(product.price || 0),
      cost: Number(product.cost || 0),
      singleLengthCm: Number(product.singleLengthCm || 0),
      singleWidthCm: Number(product.singleWidthCm || 0),
      singleHeightCm: Number(product.singleHeightCm || 0),
      singleWeightKg: Number(product.singleWeightKg || 0),
      bulkLengthCm: Number(product.bulkLengthCm || 0),
      bulkWidthCm: Number(product.bulkWidthCm || 0),
      bulkHeightCm: Number(product.bulkHeightCm || 0),
      bulkWeightKg: Number(product.bulkWeightKg || 0),
      bulkQuantity: Number(product.bulkQuantity || 1),
      warehouseId: Number(product.warehouseId || warehouses[0]?.id || 1),
    } : defaultProduct,
  });
  
  // 提交处理
  const onSubmit = (data: z.infer<typeof productFormSchema>) => {
    if (isEditMode) {
      updateProductMutation.mutate(data);
    } else {
      createProductMutation.mutate(data);
    }
  };
  
  // 创建产品
  const createProductMutation = useMutation({
    mutationFn: async (data: z.infer<typeof productFormSchema>) => {
      // 自动计算体积
      const singleVolumeM3 = (data.singleLengthCm * data.singleWidthCm * data.singleHeightCm) / 1000000;
      const bulkVolumeM3 = data.bulkLengthCm && data.bulkWidthCm && data.bulkHeightCm ? 
        (data.bulkLengthCm * data.bulkWidthCm * data.bulkHeightCm) / 1000000 : 0;
      
      return await apiRequest("/api/products", {
        method: "POST",
        body: JSON.stringify({
          ...data,
          singleVolumeM3,
          bulkVolumeM3,
        }),
      });
    },
    onSuccess: () => {
      toast.success("产品创建成功");
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      form.reset(defaultProduct);
      onClose();
    },
    onError: (error: any) => {
      toast.error(`创建失败: ${error.message}`);
    },
  });
  
  // 更新产品
  const updateProductMutation = useMutation({
    mutationFn: async (data: z.infer<typeof productFormSchema>) => {
      if (!product?.id) throw new Error("产品ID不存在");
      
      // 自动计算体积
      const singleVolumeM3 = (data.singleLengthCm * data.singleWidthCm * data.singleHeightCm) / 1000000;
      const bulkVolumeM3 = data.bulkLengthCm && data.bulkWidthCm && data.bulkHeightCm ? 
        (data.bulkLengthCm * data.bulkWidthCm * data.bulkHeightCm) / 1000000 : 0;
      
      return await apiRequest(`/api/products/${product.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          ...data,
          singleVolumeM3,
          bulkVolumeM3,
        }),
      });
    },
    onSuccess: () => {
      toast.success("产品更新成功");
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: [`/api/products/${product.id}`] });
      onClose();
    },
    onError: (error: any) => {
      toast.error(`更新失败: ${error.message}`);
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "编辑产品" : "新增产品"}</DialogTitle>
          <DialogDescription>
            {isEditMode ? "修改产品信息，保存后将更新产品数据。" : "填写产品信息，创建一个新的产品。"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 产品基本信息 */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>产品名称 *</FormLabel>
                    <FormControl>
                      <Input placeholder="请输入产品名称" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="barcode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>条码 *</FormLabel>
                    <FormControl>
                      <Input placeholder="请输入产品条码" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="uniqueCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>唯一码</FormLabel>
                    <FormControl>
                      <Input placeholder="产品唯一编码(选填)" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>产品分类 *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="选择分类" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PRODUCT_CATEGORIES.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
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
                name="description"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>描述</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="产品描述(选填)"
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* 价格和库存信息 */}
              <FormField
                control={form.control}
                name="stock"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>库存数量 *</FormLabel>
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
                    <FormLabel>批发价 *</FormLabel>
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
                    <FormLabel>代理价 *</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" step="0.01" {...field} />
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
                    <FormLabel>所在仓库 *</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(Number(value))}
                      defaultValue={String(field.value)}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="选择仓库" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {warehouses.map((warehouse) => (
                          <SelectItem key={warehouse.id} value={String(warehouse.id)}>
                            {warehouse.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
              
            {/* 单件尺寸信息 */}
            <div>
              <h3 className="text-sm font-medium mb-2">单件尺寸信息</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <FormField
                  control={form.control}
                  name="singleLengthCm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>长(CM) *</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" step="0.1" {...field} />
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
                      <FormLabel>宽(CM) *</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" step="0.1" {...field} />
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
                      <FormLabel>高(CM) *</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" step="0.1" {...field} />
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
                      <FormLabel>重量(KG) *</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
              
            {/* 整件包装信息 */}
            <div>
              <h3 className="text-sm font-medium mb-2">整件包装信息</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <FormField
                  control={form.control}
                  name="bulkLengthCm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>整件长(CM)</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" step="0.1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="bulkWidthCm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>整件宽(CM)</FormLabel>
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
                      <FormLabel>整件高(CM)</FormLabel>
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
                      <FormLabel>整件重量(KG)</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="bulkQuantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>整件数量</FormLabel>
                      <FormControl>
                        <Input type="number" min="1" step="1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
              
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                <X className="mr-2 h-4 w-4" />
                取消
              </Button>
              <Button 
                type="submit"
                disabled={createProductMutation.isPending || updateProductMutation.isPending}
              >
                {(createProductMutation.isPending || updateProductMutation.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {!isEditMode && <PlusCircle className="mr-2 h-4 w-4" />}
                {isEditMode && <Save className="mr-2 h-4 w-4" />}
                {isEditMode ? "保存修改" : "创建产品"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export function DeleteProductDialog({ isOpen, onClose, product, onConfirm }: any) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // 删除产品
  const deleteProductMutation = useMutation({
    mutationFn: async () => {
      if (!product?.id) throw new Error("产品ID不存在");
      return await apiRequest(`/api/products/${product.id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      toast.success("产品删除成功");
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      onClose();
      if (onConfirm) onConfirm();
    },
    onError: (error: any) => {
      toast.error(`删除失败: ${error.message}`);
    },
  });
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>确认删除</DialogTitle>
          <DialogDescription>
            您确定要删除产品 "{product?.name}" 吗？此操作不可撤销。
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>取消</Button>
          <Button 
            variant="destructive" 
            onClick={() => deleteProductMutation.mutate()}
            disabled={deleteProductMutation.isPending}
          >
            {deleteProductMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            确认删除
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// 产品操作按钮组
export function ProductActions() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { data: warehouses = [] } = useQuery({ queryKey: ["/api/warehouses"] });
  
  return (
    <>
      <Button onClick={() => setIsDialogOpen(true)}>
        <PlusCircle className="mr-2 h-4 w-4" />
        添加产品
      </Button>
      
      <ProductForm
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        warehouses={warehouses}
      />
    </>
  );
}