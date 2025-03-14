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
import { Combobox } from "@/components/ui/combobox";
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
  
  // 单件信息
  singleWeightKg: number;
  singleVolumeM3: number;
  singleLengthCm?: number;
  singleWidthCm?: number;
  singleHeightCm?: number;
  
  // 整件包装信息
  bulkWeightKg: number;
  bulkVolumeM3: number;
  bulkLengthCm?: number;
  bulkWidthCm?: number;
  bulkHeightCm?: number;
  bulkQuantity?: number; // 每件包装内的产品数量，默认为1
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
  
  // 唯一码输入变更处理
  const handleUniqueCodeChange = (value: string, index: number) => {
    // 设置唯一码值，确保只有数字
    const numericValue = value.replace(/\D/g, '').substring(0, 5);
    form.setValue(`items.${index}.uniqueCode`, numericValue);
    
    // 如果唯一码是1-5位数字，则查找对应产品
    if (numericValue && /^\d{1,5}$/.test(numericValue)) {
      // 查找对应的产品
      const product = findProductByUniqueCode(numericValue);
      if (product) {
        // 找到产品后，自动填充产品信息
        form.setValue(`items.${index}.productId`, product.id.toString());
        
        // 获取数量
        const quantity = parseInt(form.getValues(`items.${index}.quantity`) || "1");
        
        // 计算件数 - 根据产品的bulkQuantity属性计算
        // bulkQuantity是每件包装内可以容纳的产品数量
        const bulkQuantity = product.bulkQuantity || 1; // 默认为1
        const packageCount = Math.ceil(quantity / bulkQuantity);
        
        // 更新件数
        form.setValue(`items.${index}.packageCount`, packageCount.toString());
        
        // 计算总重量 = 件数 * 每件重量
        const weightPerPackage = product.bulkWeightKg || 0;
        const totalWeight = packageCount * weightPerPackage;
        
        // 计算总体积 = 件数 * 每件体积
        const volumePerPackage = product.bulkVolumeM3 || 0;
        const totalVolume = packageCount * volumePerPackage;
        
        // 更新重量和体积，保留3位小数
        form.setValue(`items.${index}.weight`, totalWeight.toFixed(3));
        form.setValue(`items.${index}.volume`, totalVolume.toFixed(3));
        
        toast({
          title: t("product_found"),
          description: `${t("product_found_by_code")}: ${product.name}`,
        });
        
        // 触发表单更新，确保UI反映当前状态
        form.trigger(`items.${index}.productId`);
        form.trigger(`items.${index}.quantity`);
        form.trigger(`items.${index}.packageCount`);
        form.trigger(`items.${index}.weight`);
        form.trigger(`items.${index}.volume`);
      } else if (numericValue.length === 5) {
        // 只有当输入完整的5位唯一码且找不到产品时才提示
        toast({
          title: t("product_not_found"),
          description: t("no_product_with_unique_code", { code: numericValue }),
          variant: "destructive",
        });
        
        // 清空相关产品信息
        form.setValue(`items.${index}.productId`, "");
        form.trigger(`items.${index}.productId`);
      }
    } else if (value && !/^\d+$/.test(value)) {
      // 如果输入了非数字字符，给出提示（但我们已经在上面过滤掉非数字，这里只是确保用户知道）
      toast({
        title: t("input_corrected"),
        description: t("unique_code_must_be_numeric"),
        variant: "warning",
      });
    }
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
    
    // 添加商品后重新计算汇总数据 - 使用requestAnimationFrame确保在DOM更新后执行
    requestAnimationFrame(() => {
      calculateTotals();
      console.log("添加项目后汇总数据已更新");
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
      // 确保扫描结果是有效的唯一码（1-5位数字）
      const numericCode = code.replace(/\D/g, '').substring(0, 5);
      
      // 将扫描结果更新到对应的表单字段
      form.setValue(`items.${currentScanningIndex}.uniqueCode`, numericCode);
      
      // 只有当唯一码有效(1-5位数字)时才进行产品查找
      if (numericCode && /^\d{1,5}$/.test(numericCode)) {
        // 查找对应的产品
        const product = findProductByUniqueCode(numericCode);
        if (product) {
          // 检查是否已有产品被选择
          const existingProductId = form.getValues(`items.${currentScanningIndex}.productId`);
          if (existingProductId && parseInt(existingProductId) !== product.id) {
            // 如果已选择了不同的产品，提示用户产品已被更新
            toast({
              title: t("product_updated"),
              description: t("product_updated_by_unique_code", { oldProduct: products.find(p => p.id === parseInt(existingProductId))?.name || "Unknown", newProduct: product.name }),
              variant: "warning",
            });
          }
          
          // 自动填充产品信息
          form.setValue(`items.${currentScanningIndex}.productId`, product.id.toString());
          
          // 获取数量，如果未设置则默认为1
          const quantity = parseInt(form.getValues(`items.${currentScanningIndex}.quantity`) || "1");
          
          // 计算件数 - 根据产品的bulkQuantity属性计算
          // bulkQuantity是每件包装内可以容纳的产品数量
          const bulkQuantity = product.bulkQuantity || 1; // 默认为1
          const packageCount = Math.ceil(quantity / bulkQuantity);
          
          // 更新件数
          form.setValue(`items.${currentScanningIndex}.packageCount`, packageCount.toString());
          
          // 计算总重量 = 件数 * 每件重量
          const weightPerPackage = product.bulkWeightKg || 0;
          const totalWeight = packageCount * weightPerPackage;
          
          // 计算总体积 = 件数 * 每件体积
          const volumePerPackage = product.bulkVolumeM3 || 0;
          const totalVolume = packageCount * volumePerPackage;
          
          // 更新重量和体积，保留3位小数
          form.setValue(`items.${currentScanningIndex}.weight`, totalWeight.toFixed(3));
          form.setValue(`items.${currentScanningIndex}.volume`, totalVolume.toFixed(3));
          
          toast({
            title: t("product_found"),
            description: `${t("product_found_by_code")}: ${product.name}`,
          });
          
          // 触发表单验证，确保UI更新
          form.trigger(`items.${currentScanningIndex}.productId`);
          form.trigger(`items.${currentScanningIndex}.quantity`);
          form.trigger(`items.${currentScanningIndex}.packageCount`);
          form.trigger(`items.${currentScanningIndex}.weight`);
          form.trigger(`items.${currentScanningIndex}.volume`);
        } else {
          // 没有找到匹配的产品
          if (numericCode.length === 5) {
            // 完整的5位唯一码但未找到产品
            toast({
              title: t("product_not_found"),
              description: t("no_product_with_unique_code", { code: numericCode }),
              variant: "destructive",
            });
          } else {
            // 不完整的唯一码
            toast({
              title: t("incomplete_unique_code"),
              description: t("continue_scanning_or_select_product"),
              variant: "warning",
            });
          }
        }
      } else if (code && !/^\d+$/.test(code)) {
        // 扫描结果包含非数字字符
        toast({
          title: t("invalid_barcode"),
          description: t("barcode_must_be_numeric"),
          variant: "destructive",
        });
      } else if (!code) {
        // 扫描结果为空
        toast({
          title: t("scan_failed"),
          description: t("please_try_again"),
          variant: "destructive",
        });
      }
      
      // 关闭扫描对话框
      setIsBarcodeScannerOpen(false);
      
      // 更新总计数据
      calculateTotals();
    }
  };
  
  // 移除商品行
  const handleRemoveItem = (index: number) => {
    if (fields.length > 1) {
      remove(index);
      
      // 移除商品后重新计算汇总数据 - 使用requestAnimationFrame确保在DOM更新后执行
      requestAnimationFrame(() => {
        calculateTotals();
        console.log("删除项目后汇总数据已更新");
      });
    } else {
      toast({
        title: t("validation_error"),
        description: t("min_one_item_required"),
        variant: "destructive",
      });
    }
  };
  
  // 商品选择时自动计算件数、重量和体积，并填充唯一码
  const handleProductChange = (value: string, index: number) => {
    // 设置产品ID
    form.setValue(`items.${index}.productId`, value);
    
    // 查找选择的产品信息
    const selectedProduct = products.find(p => p.id === parseInt(value));
    if (selectedProduct) {
      // 获取当前数量，如果未设置则默认为1
      const quantity = parseInt(form.getValues(`items.${index}.quantity`) || "1");
      
      // 计算件数 - 根据产品的bulkQuantity属性计算
      // bulkQuantity是每件包装内可以容纳的产品数量
      const bulkQuantity = selectedProduct.bulkQuantity || 1; // 默认为1
      const packageCount = Math.ceil(quantity / bulkQuantity);
      
      // 更新件数
      form.setValue(`items.${index}.packageCount`, packageCount.toString());
      
      // 计算总重量 = 件数 * 每件重量
      const weightPerPackage = selectedProduct.bulkWeight || selectedProduct.bulkWeightKg || 0;
      const totalWeight = packageCount * weightPerPackage;
      
      // 计算总体积 = 件数 * 每件体积
      const volumePerPackage = selectedProduct.bulkVolume || selectedProduct.bulkVolumeM3 || 0;
      const totalVolume = packageCount * volumePerPackage;
      
      // 更新重量和体积，保留3位小数
      form.setValue(`items.${index}.weight`, totalWeight.toFixed(3));
      form.setValue(`items.${index}.volume`, totalVolume.toFixed(3));
      
      // 检查是否已存在唯一码
      const currentUniqueCode = form.getValues(`items.${index}.uniqueCode`);
      
      // 自动填充唯一码
      if (selectedProduct.uniqueCode && !currentUniqueCode) {
        // 仅当未手动输入唯一码时填充
        form.setValue(`items.${index}.uniqueCode`, selectedProduct.uniqueCode);
        toast({
          title: t("unique_code_auto_filled"),
          description: `${t("product")} ${selectedProduct.name} ${t("unique_code")}: ${selectedProduct.uniqueCode}`,
        });
      } else if (!selectedProduct.uniqueCode && currentUniqueCode) {
        // 如果已输入唯一码但选择的产品没有唯一码，询问是否保留
        toast({
          title: t("unique_code_conflict"),
          description: t("existing_unique_code_kept"),
          variant: "warning",
        });
      } else if (!selectedProduct.uniqueCode && !currentUniqueCode) {
        // 如果产品没有唯一码且没有输入，则清空唯一码字段
        form.setValue(`items.${index}.uniqueCode`, "");
      }
      
      // 触发表单验证，确保UI更新
      form.trigger(`items.${index}.productId`);
      form.trigger(`items.${index}.quantity`);
      form.trigger(`items.${index}.packageCount`);
      form.trigger(`items.${index}.weight`);
      form.trigger(`items.${index}.volume`);
      form.trigger(`items.${index}.uniqueCode`);
    }
  };
  
  // 数量变更防抖计时器引用
  const quantityDebounceTimerRef = useRef<number | null>(null);
  
  // 数量变更时更新件数、重量和体积（添加防抖机制）
  const handleQuantityChange = (value: string, index: number) => {
    // 确保数值有效
    const numericValue = value.replace(/[^\d]/g, '');
    
    // 设置经过验证的数值
    form.setValue(`items.${index}.quantity`, numericValue || "1");
    
    // 清除之前的计时器（如果存在）
    if (quantityDebounceTimerRef.current !== null) {
      window.clearTimeout(quantityDebounceTimerRef.current);
    }
    
    // 设置新的计时器，200ms后执行计算
    quantityDebounceTimerRef.current = window.setTimeout(() => {
      const productId = form.getValues(`items.${index}.productId`);
      if (productId) {
        const selectedProduct = products.find(p => p.id === parseInt(productId));
        if (selectedProduct) {
          const quantity = parseInt(numericValue || "1");
          
          // 计算件数 - 根据产品的bulkQuantity属性计算
          // bulkQuantity是每件包装内可以容纳的产品数量
          const bulkQuantity = selectedProduct.bulkQuantity || 1; // 默认为1
          const packageCount = Math.ceil(quantity / bulkQuantity);
          
          // 更新件数
          form.setValue(`items.${index}.packageCount`, packageCount.toString());
          
          // 计算总重量 = 件数 * 每件重量
          const weightPerPackage = selectedProduct.bulkWeight || selectedProduct.bulkWeightKg || 0;
          const totalWeight = packageCount * weightPerPackage;
          
          // 计算总体积 = 件数 * 每件体积
          const volumePerPackage = selectedProduct.bulkVolume || selectedProduct.bulkVolumeM3 || 0;
          const totalVolume = packageCount * volumePerPackage;
          
          // 更新重量和体积，保留3位小数
          form.setValue(`items.${index}.weight`, totalWeight.toFixed(3));
          form.setValue(`items.${index}.volume`, totalVolume.toFixed(3));
          
          // 自动更新表单验证状态
          form.trigger(`items.${index}.quantity`);
          form.trigger(`items.${index}.packageCount`);
          form.trigger(`items.${index}.weight`);
          form.trigger(`items.${index}.volume`);
          
          // 使用requestAnimationFrame确保在DOM更新后执行
          requestAnimationFrame(() => {
            calculateTotals();
            console.log("数量变更后汇总已更新", form.getValues());
            quantityDebounceTimerRef.current = null;
          });
        }
      } else {
        // 如果没有选择产品，给出提示
        if (numericValue && parseInt(numericValue) > 1) {
          toast({
            title: t("product_required"),
            description: t("select_product_first"),
            variant: "warning",
          });
        }
      }
    }, 200);
  };
  
  // 件数防抖计时器引用
  const packageDebounceTimerRef = useRef<number | null>(null);
  
  // 重量防抖计时器引用
  const weightDebounceTimerRef = useRef<number | null>(null);
  
  // 体积防抖计时器引用
  const volumeDebounceTimerRef = useRef<number | null>(null);
  
  // 件数变更时更新汇总数据（添加防抖机制）
  const handlePackageCountChange = (value: string, index: number) => {
    console.log("件数变更:", value, index); // 添加日志调试
    
    // 确保数值有效
    const numericValue = value.replace(/[^\d]/g, '');
    
    // 设置经过验证的数值（不小于1）
    const validValue = numericValue && parseInt(numericValue) > 0 ? numericValue : "1";
    form.setValue(`items.${index}.packageCount`, validValue);
    
    // 手动更新件数不直接计算重量和体积，但需要更新汇总信息
    form.trigger(`items.${index}.packageCount`);
    
    // 清除之前的计时器（如果存在）
    if (packageDebounceTimerRef.current !== null) {
      window.clearTimeout(packageDebounceTimerRef.current);
    }
    
    // 设置新的计时器，300ms后执行汇总计算
    packageDebounceTimerRef.current = window.setTimeout(() => {
      // 使用requestAnimationFrame确保在DOM更新后执行
      requestAnimationFrame(() => {
        calculateTotals();
        console.log("件数汇总已重新计算", form.getValues());
        packageDebounceTimerRef.current = null;
      });
    }, 300);
  };
  
  // 处理重量变更（添加防抖机制）
  const handleWeightChange = (value: string, index: number) => {
    console.log("重量变更:", value, index); // 添加日志调试
    
    // 确保数值有效
    const numericValue = value.replace(/[^\d.]/g, '');
    
    // 设置经过验证的数值（不小于0）
    const validValue = numericValue && parseFloat(numericValue) >= 0 ? numericValue : "0";
    form.setValue(`items.${index}.weight`, validValue);
    
    // 手动更新重量字段但不直接影响其他字段
    form.trigger(`items.${index}.weight`);
    
    // 清除之前的计时器（如果存在）
    if (weightDebounceTimerRef.current !== null) {
      window.clearTimeout(weightDebounceTimerRef.current);
    }
    
    // 设置新的计时器，300ms后执行汇总计算
    weightDebounceTimerRef.current = window.setTimeout(() => {
      // 使用requestAnimationFrame确保在DOM更新后执行
      requestAnimationFrame(() => {
        calculateTotals();
        console.log("重量汇总已重新计算", form.getValues());
        weightDebounceTimerRef.current = null;
      });
    }, 300);
  };
  
  // 处理体积变更（添加防抖机制）
  const handleVolumeChange = (value: string, index: number) => {
    console.log("体积变更:", value, index); // 添加日志调试
    
    // 确保数值有效
    const numericValue = value.replace(/[^\d.]/g, '');
    
    // 设置经过验证的数值（不小于0）
    const validValue = numericValue && parseFloat(numericValue) >= 0 ? numericValue : "0";
    form.setValue(`items.${index}.volume`, validValue);
    
    // 手动更新体积字段但不直接影响其他字段
    form.trigger(`items.${index}.volume`);
    
    // 清除之前的计时器（如果存在）
    if (volumeDebounceTimerRef.current !== null) {
      window.clearTimeout(volumeDebounceTimerRef.current);
    }
    
    // 设置新的计时器，300ms后执行汇总计算
    volumeDebounceTimerRef.current = window.setTimeout(() => {
      // 使用requestAnimationFrame确保在DOM更新后执行
      requestAnimationFrame(() => {
        calculateTotals();
        console.log("体积汇总已重新计算", form.getValues());
        volumeDebounceTimerRef.current = null;
      });
    }, 300);
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
                                    onChange={(e) => {
                                      field.onChange(e);
                                      handleUniqueCodeChange(e.target.value, index);
                                    }}
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

                      {/* 商品 - 可搜索下拉框 */}
                      <div className="col-span-3">
                        <FormField
                          control={form.control}
                          name={`items.${index}.productId`}
                          render={({ field }) => (
                            <FormItem className="space-y-0">
                              <FormControl>
                                {isLoadingProducts ? (
                                  <Button variant="outline" className="w-full" disabled>
                                    {t("loading")}
                                  </Button>
                                ) : products.length === 0 ? (
                                  <Button variant="outline" className="w-full" disabled>
                                    {t("no_products")}
                                  </Button>
                                ) : (
                                  <Combobox
                                    options={products.map(product => ({
                                      value: product.id.toString(),
                                      label: `${product.name} - ${product.barcode}${product.uniqueCode ? ` (唯一码: ${product.uniqueCode})` : ''}`
                                    }))}
                                    value={field.value}
                                    onValueChange={(value) => handleProductChange(value, index)}
                                    placeholder={t("select_product")}
                                    searchPlaceholder={t("search_product")}
                                    emptyText={t("no_matching_products")}
                                  />
                                )}
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
                                  type="text" 
                                  inputMode="numeric" 
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
                                  type="text" 
                                  inputMode="numeric" 
                                  placeholder="1" 
                                  {...field} 
                                  className="w-full"
                                  onChange={(e) => {
                                    field.onChange(e);
                                    handlePackageCountChange(e.target.value, index);
                                  }}
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
                                  type="text" 
                                  inputMode="decimal" 
                                  placeholder="0" 
                                  {...field} 
                                  className="w-full"
                                  onChange={(e) => {
                                    field.onChange(e);
                                    // 调用重量变更处理函数
                                    handleWeightChange(e.target.value, index);
                                  }}
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
                                  type="text" 
                                  inputMode="decimal" 
                                  placeholder="0" 
                                  {...field} 
                                  className="w-full"
                                  onChange={(e) => {
                                    field.onChange(e);
                                    // 调用体积变更处理函数
                                    handleVolumeChange(e.target.value, index);
                                  }}
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