import React, { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
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
import { ArrowLeftIcon, PlusIcon, MinusIcon, ArrowRightIcon, ScanLine, QrCode, Camera } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
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

// 出库单表单Schema
const outboundOrderSchema = z.object({
  orderNumber: z.string().min(1, { message: "订单号是必填项" }),
  warehouseId: z.string().min(1, { message: "仓库是必填项" }),
  status: z.string().default("pending"),
  orderType: z.string().default("sale"),
  destinationType: z.string().default("customer"),
  notes: z.string().optional(),
  // 底单文件，可以是上传的图片或文档
  documentImage: z.instanceof(FileList).optional().transform(fileList => 
    fileList && fileList.length > 0 ? fileList : undefined
  ),
  // 如果是拍照，可以存储base64格式的图像数据
  photoData: z.string().optional(),
  items: z.array(
    z.object({
      productId: z.string().min(1, { message: "商品是必填项" }),
      quantity: z.string().min(1, { message: "数量是必填项" }).transform(val => parseInt(val)),
      packageCount: z.string().min(1, { message: "件数是必填项" }).transform(val => parseInt(val)),
      weight: z.string().min(0, { message: "重量不能为负" }).transform(val => parseFloat(val)),
      volume: z.string().min(0, { message: "体积不能为负" }).transform(val => parseFloat(val)),
      uniqueCode: z.string().optional(), // 商品唯一码，可选
      externalOrderNumber: z.string().optional(), // 外部订单号，可选
      remark: z.string().optional(), // 备注，可选
    })
  ).min(1, { message: "至少需要添加一个商品" }),
});

// 表单类型定义
type OutboundOrderFormValues = z.infer<typeof outboundOrderSchema>;

export default function AdvancedOutboundOrder() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
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
    const numericValue = value.replace(/\\D/g, '').substring(0, 5);
    form.setValue(`items.${index}.uniqueCode`, numericValue);
    
    // 如果唯一码是1-5位数字，则查找对应产品
    if (numericValue && /^\\d{1,5}$/.test(numericValue)) {
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
        
        toast.success(`${t("product_found_by_code")}: ${product.name}`);
        
        // 触发表单更新，确保UI反映当前状态
        form.trigger(`items.${index}.productId`);
        form.trigger(`items.${index}.quantity`);
        form.trigger(`items.${index}.packageCount`);
        form.trigger(`items.${index}.weight`);
        form.trigger(`items.${index}.volume`);
      } else if (numericValue.length === 5) {
        // 只有当输入完整的5位唯一码且找不到产品时才提示
        toast.error(t("no_product_with_unique_code", { code: numericValue }));
        
        // 清空相关产品信息
        form.setValue(`items.${index}.productId`, "");
        form.trigger(`items.${index}.productId`);
      }
    } else if (value && !/^\\d+$/.test(value)) {
      // 如果输入了非数字字符，给出提示（但我们已经在上面过滤掉非数字，这里只是确保用户知道）
      toast.warning(t("unique_code_must_be_numeric"));
    }
  };
  
  // 自动生成订单号
  const generateOrderNumber = () => {
    const prefix = "OUT";
    const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
    return `${prefix}-${date}-${random}`;
  };

  // 出库单表单
  const form = useForm<OutboundOrderFormValues>({
    resolver: zodResolver(outboundOrderSchema),
    defaultValues: {
      orderNumber: generateOrderNumber(),
      warehouseId: "",
      status: "pending",
      orderType: "sale",
      destinationType: "customer",
      notes: "",
      documentImage: undefined, // 底单文件上传
      photoData: "", // 底单拍照数据
      items: [
        {
          productId: "",
          quantity: "1",
          packageCount: "1",
          weight: "0",
          volume: "0",
          uniqueCode: "", // 初始化唯一码字段为空
          externalOrderNumber: "", // 初始化外部订单号为空
          remark: "" // 初始化备注为空
        }
      ],
    }
  });
  
  // 使用 useFieldArray 管理多个出库商品
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });
  
  // 创建出库单
  const createOutboundOrderMutation = useMutation({
    mutationFn: async (data: OutboundOrderFormValues) => {
      // 创建FormData对象用于文件上传
      const formData = new FormData();
      
      // 添加基本信息到FormData
      formData.append('orderNumber', data.orderNumber);
      formData.append('warehouseId', data.warehouseId);
      formData.append('status', data.status);
      formData.append('orderType', data.orderType);
      formData.append('destinationType', data.destinationType);
      if (data.notes) formData.append('notes', data.notes);
      
      // 添加商品信息到FormData (需要以JSON字符串形式添加)
      const itemsArray = data.items.map(item => ({
        productId: item.productId,
        quantity: item.quantity.toString(), // 确保是字符串
        packageCount: item.packageCount.toString(), // 确保是字符串
        weight: item.weight.toString(),
        volume: item.volume.toString(),
        uniqueCode: item.uniqueCode || "", // 添加唯一码数据，如果为空则传空字符串
        externalOrderNumber: item.externalOrderNumber || "", // 添加外部订单号，如果为空则传空字符串
        remark: item.remark || "" // 添加备注，如果为空则传空字符串
      }));
      
      // 添加商品数据
      formData.append('items', JSON.stringify(itemsArray));
      
      // 如果有上传的底单文件，添加到FormData
      if (data.documentImage && data.documentImage.length > 0) {
        formData.append('document', data.documentImage[0]);
      }
      // 如果有拍照底单数据，转换为文件并添加
      else if (data.photoData) {
        // 将base64图像数据转换为文件
        const blob = dataURItoBlob(data.photoData);
        const file = new File([blob], 'photo.jpg', { type: 'image/jpeg' });
        formData.append('document', file);
      }
      
      // 使用FormData发送到服务器
      return apiRequest("/api/outbound-orders/advanced", {
        method: "POST",
        body: formData, // 直接发送FormData对象，不需要JSON.stringify
      });
    },
    onSuccess: (response) => {
      // 显示出库单创建成功以及出库单号
      toast.success(response.orderNumber 
          ? t("outbound_order_created_with_number", { number: response.orderNumber })
          : t("outbound_order_created_description"));
      
      // 刷新出库单列表
      queryClient.invalidateQueries({queryKey: ["/api/outbound-orders"]});
      
      // 跳转到出库单列表页面
      setLocation("/outbound-orders");
    },
    onError: (error) => {
      console.error("创建出库单失败:", error);
      toast.error(t("outbound_order_create_failed_description"));
      setIsSubmitting(false);
    }
  });
  
  // 提交表单
  const onSubmit = (data: OutboundOrderFormValues) => {
    setIsSubmitting(true);
    
    // 校验库存
    const hasStockIssue = data.items.some(item => {
      const product = products.find(p => p.id === parseInt(item.productId));
      return product && item.quantity > product.stock;
    });
    
    if (hasStockIssue) {
      toast.error(t("insufficient_stock_error"));
      setIsSubmitting(false);
      return;
    }
    
    createOutboundOrderMutation.mutate(data);
  };
  
  // 添加商品行
  const handleAddItem = () => {
    append({
      productId: "",
      quantity: "1",
      packageCount: "1",
      weight: "0",
      volume: "0",
      uniqueCode: "", // 添加唯一码字段，初始为空
      externalOrderNumber: "", // 添加外部订单号字段，初始为空
      remark: "" // 添加备注字段，初始为空
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
      const numericCode = code.replace(/\\D/g, '').substring(0, 5);
      
      // 将扫描结果更新到对应的表单字段
      form.setValue(`items.${currentScanningIndex}.uniqueCode`, numericCode);
      
      // 只有当唯一码有效(1-5位数字)时才进行产品查找
      if (numericCode && /^\\d{1,5}$/.test(numericCode)) {
        // 查找对应的产品
        const product = findProductByUniqueCode(numericCode);
        if (product) {
          // 检查是否已有产品被选择
          const existingProductId = form.getValues(`items.${currentScanningIndex}.productId`);
          if (existingProductId && parseInt(existingProductId) !== product.id) {
            // 如果已选择了不同的产品，提示用户产品已被更新
            toast.warning(t("product_updated_by_unique_code", { 
              oldProduct: products.find(p => p.id === parseInt(existingProductId))?.name || "Unknown", 
              newProduct: product.name 
            }));
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
          
          toast.success(`${t("product_found_by_code")}: ${product.name}`);
          
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
            toast.error(t("no_product_with_unique_code", { code: numericCode }));
          } else {
            // 不完整的唯一码
            toast.warning(t("continue_scanning_or_select_product"));
          }
        }
      } else if (code && !/^\\d+$/.test(code)) {
        // 扫描结果包含非数字字符
        toast.error(t("barcode_must_be_numeric"));
      } else if (!code) {
        // 扫描结果为空
        toast.error(t("please_try_again"));
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
      toast.error(t("min_one_item_required"));
    }
  };
  
  // 商品选择时自动计算件数、重量和体积
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
      const weightPerPackage = selectedProduct.bulkWeightKg || 0;
      const totalWeight = packageCount * weightPerPackage;
      
      // 计算总体积 = 件数 * 每件体积
      const volumePerPackage = selectedProduct.bulkVolumeM3 || 0;
      const totalVolume = packageCount * volumePerPackage;
      
      // 更新重量和体积，保留3位小数
      form.setValue(`items.${index}.weight`, totalWeight.toFixed(3));
      form.setValue(`items.${index}.volume`, totalVolume.toFixed(3));
      
      // 检查是否已存在唯一码
      const currentUniqueCode = form.getValues(`items.${index}.uniqueCode`);
      
      // 如果产品有唯一码且当前没有设置唯一码，则自动填充
      if (selectedProduct.uniqueCode && !currentUniqueCode) {
        form.setValue(`items.${index}.uniqueCode`, selectedProduct.uniqueCode);
      }
      
      // 触发表单更新，确保UI反映当前状态
      form.trigger(`items.${index}.packageCount`);
      form.trigger(`items.${index}.weight`);
      form.trigger(`items.${index}.volume`);
      
      // 更新总计
      calculateTotals();
    }
  };
  
  // 数量变更时更新件数、重量和体积
  const handleQuantityChange = (value: string, index: number) => {
    // 设置数量
    form.setValue(`items.${index}.quantity`, value);
    
    // 如果没有选择产品，则不进行计算
    const productId = form.getValues(`items.${index}.productId`);
    if (!productId) return;
    
    // 查找产品信息
    const selectedProduct = products.find(p => p.id === parseInt(productId));
    if (selectedProduct) {
      // 解析数量，确保是有效的数字
      const quantity = parseInt(value) || 1;
      
      // 计算件数 - 根据产品的bulkQuantity属性计算
      const bulkQuantity = selectedProduct.bulkQuantity || 1; // 默认为1
      const packageCount = Math.ceil(quantity / bulkQuantity);
      
      // 更新件数
      form.setValue(`items.${index}.packageCount`, packageCount.toString());
      
      // 计算总重量 = 件数 * 每件重量
      const weightPerPackage = selectedProduct.bulkWeightKg || 0;
      const totalWeight = packageCount * weightPerPackage;
      
      // 计算总体积 = 件数 * 每件体积
      const volumePerPackage = selectedProduct.bulkVolumeM3 || 0;
      const totalVolume = packageCount * volumePerPackage;
      
      // 更新重量和体积，保留3位小数
      form.setValue(`items.${index}.weight`, totalWeight.toFixed(3));
      form.setValue(`items.${index}.volume`, totalVolume.toFixed(3));
      
      // 触发表单更新，确保UI反映当前状态
      form.trigger(`items.${index}.packageCount`);
      form.trigger(`items.${index}.weight`);
      form.trigger(`items.${index}.volume`);
      
      // 更新总计
      calculateTotals();
    }
  };
  
  // 计算所有项目的总重量和总体积
  const calculateTotals = () => {
    const items = form.getValues("items");
    
    // 计算总重量
    const totalWeight = items.reduce((sum, item) => {
      return sum + (parseFloat(item.weight?.toString() || "0") || 0);
    }, 0);
    
    // 计算总体积
    const totalVolume = items.reduce((sum, item) => {
      return sum + (parseFloat(item.volume?.toString() || "0") || 0);
    }, 0);
    
    console.log("计算的总重量:", totalWeight, "总体积:", totalVolume);
    
    // 更新状态用于显示
    form.setValue("totalWeight", totalWeight.toFixed(3));
    form.setValue("totalVolume", totalVolume.toFixed(3));
  };
  
  // 拍照功能 - 将Base64图像数据转换为Blob对象
  const dataURItoBlob = (dataURI: string): Blob => {
    // 从Base64字符串中提取MIME类型和数据部分
    const byteString = atob(dataURI.split(',')[1]);
    const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
    
    // 将Base64数据转换为Uint8Array
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    
    // 创建并返回Blob对象
    return new Blob([ab], { type: mimeString });
  };
  
  // 拍照底单
  const capturePhoto = () => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("访问摄像头失败:", err);
        toast.error(t("camera_access_failed"));
      }
    };
    
    const takePhoto = () => {
      if (videoRef.current && canvasRef.current) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        
        // 设置画布尺寸
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // 在画布上绘制视频帧
        const context = canvas.getContext('2d');
        if (context) {
          context.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          // 获取图像的base64数据
          const photoData = canvas.toDataURL('image/jpeg');
          
          // 保存图像数据
          form.setValue("photoData", photoData);
          
          // 关闭摄像头流
          const stream = video.srcObject as MediaStream;
          if (stream) {
            stream.getTracks().forEach(track => track.stop());
          }
          
          // 提示用户
          toast.success(t("photo_saved_as_document"));
        }
      }
    };
    
    return (
      <div>
        <video ref={videoRef} autoPlay style={{ width: '100%', borderRadius: '8px' }} />
        <canvas ref={canvasRef} style={{ display: 'none' }} />
        <div className="flex justify-between mt-4">
          <Button type="button" variant="outline" onClick={startCamera}>
            {t("start_camera")}
          </Button>
          <Button type="button" onClick={takePhoto}>
            {t("take_photo")}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto py-6">
      <div className="pb-5 border-b border-gray-200 mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('new_advanced_outbound_order')}</h1>
          <p className="mt-1 text-gray-500 text-sm">{t('new_advanced_outbound_order_description')}</p>
        </div>
        <div className="mt-4 sm:mt-0">
          <Button variant="outline" onClick={() => setLocation("/outbound-orders")}>
            <ArrowLeftIcon className="mr-2 h-4 w-4" />
            {t('back_to_outbound_orders')}
          </Button>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>{t('outbound_order_info')}</CardTitle>
              <CardDescription>{t('outbound_order_info_description')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 订单号 */}
                <FormField
                  control={form.control}
                  name="orderNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('order_number')}</FormLabel>
                      <div className="flex space-x-2">
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => field.onChange(generateOrderNumber())}
                        >
                          {t('auto_generate')}
                        </Button>
                      </div>
                      <FormDescription>{t('order_number_description')}</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* 仓库选择 */}
                <FormField
                  control={form.control}
                  name="warehouseId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('warehouse')}</FormLabel>
                      <Select 
                        value={field.value} 
                        onValueChange={field.onChange}
                        disabled={isLoadingWarehouses}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('select_warehouse')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {warehouses.map((warehouse) => (
                            <SelectItem key={warehouse.id} value={warehouse.id.toString()}>
                              {warehouse.name} ({warehouse.location})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>{t('warehouse_description')}</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* 状态 */}
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('status')}</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('select_status')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="pending">{t('status_pending')}</SelectItem>
                          <SelectItem value="processing">{t('status_processing')}</SelectItem>
                          <SelectItem value="completed">{t('status_completed')}</SelectItem>
                          <SelectItem value="cancelled">{t('status_cancelled')}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>{t('status_description')}</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* 订单类型 */}
                <FormField
                  control={form.control}
                  name="orderType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('order_type')}</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('select_order_type')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="sale">{t('outbound_sales')}</SelectItem>
                          <SelectItem value="return">{t('outbound_return')}</SelectItem>
                          <SelectItem value="transfer">{t('outbound_transfer')}</SelectItem>
                          <SelectItem value="scrap">{t('outbound_scrap')}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>{t('order_type_description')}</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* 目的地类型 */}
                <FormField
                  control={form.control}
                  name="destinationType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('destination_type')}</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('select_destination_type')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="customer">{t('destination_customer')}</SelectItem>
                          <SelectItem value="retail">{t('destination_retail')}</SelectItem>
                          <SelectItem value="wholesale">{t('destination_wholesale')}</SelectItem>
                          <SelectItem value="transfer">{t('destination_transfer')}</SelectItem>
                          <SelectItem value="supplier">{t('destination_supplier')}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>{t('destination_type_description')}</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* 底单文件上传 */}
                <FormField
                  control={form.control}
                  name="documentImage"
                  render={({ field: { onChange, value, ...rest } }) => (
                    <FormItem>
                      <FormLabel>{t('document_upload')}</FormLabel>
                      <FormControl>
                        <Input 
                          type="file" 
                          accept="image/*,application/pdf" 
                          onChange={(e) => onChange(e.target.files)} 
                          {...rest}
                        />
                      </FormControl>
                      <FormDescription>{t('document_upload_description')}</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* 备注 */}
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('notes')}</FormLabel>
                      <FormControl>
                        <Textarea rows={4} {...field} />
                      </FormControl>
                      <FormDescription>{t('notes_description')}</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* 商品信息 */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>{t('product_items')}</CardTitle>
                  <CardDescription>{t('product_items_description')}</CardDescription>
                </div>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleAddItem}
                >
                  <PlusIcon className="mr-2 h-4 w-4" />
                  {t('add_item')}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">#</TableHead>
                      <TableHead>{t('product')}</TableHead>
                      <TableHead className="w-[100px]">{t('quantity')}</TableHead>
                      <TableHead className="w-[100px]">{t('package_count')}</TableHead>
                      <TableHead className="w-[120px]">{t('unique_code')}</TableHead>
                      <TableHead className="w-[120px]">{t('external_order_number')}</TableHead>
                      <TableHead className="w-[100px]">{t('weight')}</TableHead>
                      <TableHead className="w-[100px]">{t('volume')}</TableHead>
                      <TableHead className="w-[120px]">{t('remark')}</TableHead>
                      <TableHead className="w-[100px]">{t('actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields.map((field, index) => (
                      <TableRow key={field.id}>
                        <TableCell className="font-medium">{index + 1}</TableCell>
                        <TableCell>
                          <FormField
                            control={form.control}
                            name={`items.${index}.productId`}
                            render={({ field }) => (
                              <FormItem>
                                <Select 
                                  value={field.value} 
                                  onValueChange={(value) => handleProductChange(value, index)}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder={t('select_product')} />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {isLoadingProducts ? (
                                      <SelectItem value="loading" disabled>
                                        {t('loading')}...
                                      </SelectItem>
                                    ) : (
                                      products
                                        .filter(product => product.stock > 0)
                                        .map(product => (
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
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          <FormField
                            control={form.control}
                            name={`items.${index}.quantity`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    min="1" 
                                    {...field} 
                                    onChange={(e) => handleQuantityChange(e.target.value, index)} 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          <FormField
                            control={form.control}
                            name={`items.${index}.packageCount`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    min="1" 
                                    {...field} 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-1">
                            <FormField
                              control={form.control}
                              name={`items.${index}.uniqueCode`}
                              render={({ field }) => (
                                <FormItem className="w-full">
                                  <FormControl>
                                    <Input 
                                      {...field} 
                                      placeholder={t('unique_code')}
                                      onChange={(e) => handleUniqueCodeChange(e.target.value, index)}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="icon"
                              onClick={() => openBarcodeScanner(index)}
                            >
                              <ScanLine className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <FormField
                            control={form.control}
                            name={`items.${index}.externalOrderNumber`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    placeholder={t('external_order_number')}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          <FormField
                            control={form.control}
                            name={`items.${index}.weight`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          <FormField
                            control={form.control}
                            name={`items.${index}.volume`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          <FormField
                            control={form.control}
                            name={`items.${index}.remark`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    placeholder={t('remark')}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleRemoveItem(index)}
                            disabled={fields.length <= 1}
                          >
                            <MinusIcon className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              {/* 汇总信息 */}
              <div className="mt-6 bg-muted p-4 rounded-md">
                <div className="text-sm font-medium mb-2">{t('summary')}</div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-muted-foreground">{t('total_items')}:</span>{" "}
                    <span className="font-medium">{fields.length}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t('total_quantity')}:</span>{" "}
                    <span className="font-medium">
                      {fields.reduce((sum, _, index) => {
                        const quantity = parseInt(form.getValues(`items.${index}.quantity`) || "0");
                        return sum + (isNaN(quantity) ? 0 : quantity);
                      }, 0)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t('total_weight')}:</span>{" "}
                    <span className="font-medium">
                      {fields.reduce((sum, _, index) => {
                        const weight = parseFloat(form.getValues(`items.${index}.weight`) || "0");
                        return sum + (isNaN(weight) ? 0 : weight);
                      }, 0).toFixed(3)} kg
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t('total_volume')}:</span>{" "}
                    <span className="font-medium">
                      {fields.reduce((sum, _, index) => {
                        const volume = parseFloat(form.getValues(`items.${index}.volume`) || "0");
                        return sum + (isNaN(volume) ? 0 : volume);
                      }, 0).toFixed(3)} m³
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 表单操作按钮 */}
          <div className="flex justify-end space-x-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setLocation("/outbound-orders")}
              disabled={isSubmitting}
            >
              {t('cancel')}
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
            >
              {isSubmitting ? t('creating') : t('create_outbound_order')}
            </Button>
          </div>
        </form>
      </Form>

      {/* 条码扫描对话框 */}
      <Dialog open={isBarcodeScannerOpen} onOpenChange={setIsBarcodeScannerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('scan_barcode')}</DialogTitle>
            <DialogDescription>
              {t('scan_barcode_or_unique_code')}
            </DialogDescription>
          </DialogHeader>
          <div className="py-6">
            <BarcodeScanner 
              onCodeDetected={handleUniqueCodeScanned} 
              label={t('barcode')}
              placeholder={t('scanning')}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}