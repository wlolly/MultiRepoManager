import React, { useState, useRef, useEffect } from "react";
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
import { ArrowLeftIcon, PlusIcon, MinusIcon, ArrowRightIcon, ScanLine, QrCode, Camera, TruckIcon } from "lucide-react";
import { toast } from "@/lib/toast";
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

// 入库单表单Schema
const inboundOrderSchema = z.object({
  warehouseId: z.string().min(1, { message: "仓库是必填项" }),
  orderNumber: z.string().min(1, { message: "订单号是必填项" }),
  status: z.string().default("pending"),
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
      remark: z.string().optional(), // 备注，可选
    })
  ).min(1, { message: "至少需要添加一个商品" }),
});

// 表单类型定义
type InboundOrderFormValues = z.infer<typeof inboundOrderSchema>;

export default function NewMultiInboundOrder() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // 汇总数据
  const [totalQuantity, setTotalQuantity] = useState(0);
  const [totalPackages, setTotalPackages] = useState(0);
  const [totalWeight, setTotalWeight] = useState(0);
  const [totalVolume, setTotalVolume] = useState(0);
  
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
  
  // 生成随机订单号
  const generateOrderNumber = () => {
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomPart = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `INB-${datePart}-${randomPart}`;
  };
  
  // 入库单表单
  const form = useForm<InboundOrderFormValues>({
    resolver: zodResolver(inboundOrderSchema),
    defaultValues: {
      warehouseId: "",
      orderNumber: generateOrderNumber(),
      status: "pending",
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
          remark: ""
        }
      ],
    }
  });
  
  // 使用 useFieldArray 管理多个入库商品
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });
  
  // 计算汇总数据
  const calculateTotals = () => {
    const items = form.getValues("items");
    let quantity = 0;
    let packages = 0;
    let weight = 0;
    let volume = 0;
    
    // 计算所有行的总和
    items.forEach(item => {
      // 确保值为数字
      const itemQuantity = parseInt(item.quantity?.toString() || "0");
      const itemPackages = parseInt(item.packageCount?.toString() || "0");
      const itemWeight = parseFloat(item.weight?.toString() || "0");
      const itemVolume = parseFloat(item.volume?.toString() || "0");
      
      // 累加
      quantity += itemQuantity;
      packages += itemPackages;
      weight += itemWeight;
      volume += itemVolume;
    });
    
    // 更新状态
    setTotalQuantity(quantity);
    setTotalPackages(packages);
    setTotalWeight(weight);
    setTotalVolume(volume);
  };
  
  // 创建入库单
  const createInboundOrderMutation = useMutation({
    mutationFn: async (data: InboundOrderFormValues) => {
      // 创建FormData对象用于文件上传
      const formData = new FormData();
      
      // 添加基本信息到FormData
      formData.append('warehouseId', data.warehouseId);
      formData.append('orderNumber', data.orderNumber);
      formData.append('status', data.status);
      if (data.notes) formData.append('notes', data.notes);
      
      // 添加商品信息到FormData (需要以JSON字符串形式添加)
      const itemsArray = data.items.map(item => ({
        productId: item.productId,
        quantity: item.quantity.toString(), // 确保是字符串
        packageCount: item.packageCount.toString(), // 确保是字符串
        weight: item.weight.toString(),
        volume: item.volume.toString(),
        uniqueCode: item.uniqueCode || "", // 添加唯一码数据，如果为空则传空字符串
        remark: item.remark || "" // 添加备注数据，如果为空则传空字符串
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
      return apiRequest("/api/inbound-orders/multi", {
        method: "POST",
        body: formData, // 直接发送FormData对象，不需要JSON.stringify
      });
    },
    onSuccess: (response) => {
      // 显示入库单创建成功以及入库单号
      toast({
        title: t("inboundOrder.order_created"),
        description: response.orderNumber 
          ? t("inboundOrder.order_created_with_number", { number: response.orderNumber })
          : t("inboundOrder.order_created_description"),
      });
      setLocation("/inbound-orders");
    },
    onError: (error) => {
      console.error("创建入库单失败:", error);
      toast({
        title: t("inboundOrder.order_create_failed"),
        description: t("inboundOrder.order_create_failed_description"),
        variant: "destructive",
      });
      setIsSubmitting(false);
    }
  });
  
  // 提交表单
  const onSubmit = (data: InboundOrderFormValues) => {
    setIsSubmitting(true);
    createInboundOrderMutation.mutate(data);
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
      remark: ""
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
      const totalWeight = packageCount * selectedProduct.bulkWeightKg;
      
      // 计算总体积 = 件数 * 每件体积
      const totalVolume = packageCount * selectedProduct.bulkVolumeM3;
      
      // 更新重量和体积，保留3位小数
      form.setValue(`items.${index}.weight`, totalWeight.toFixed(3));
      form.setValue(`items.${index}.volume`, totalVolume.toFixed(3));
      
      // 检查是否已存在唯一码
      const currentUniqueCode = form.getValues(`items.${index}.uniqueCode`);
      
      // 自动填充唯一码（如果商品有唯一码且当前没有设置）
      if (selectedProduct.uniqueCode && !currentUniqueCode) {
        form.setValue(`items.${index}.uniqueCode`, selectedProduct.uniqueCode);
      }
      
      // 触发表单验证，确保UI更新
      form.trigger(`items.${index}.packageCount`);
      form.trigger(`items.${index}.weight`);
      form.trigger(`items.${index}.volume`);
      
      // 更新总计
      calculateTotals();
    }
  };
  
  // 数量变更时，重新计算件数、重量和体积
  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    // 获取输入值，确保为数字
    const inputValue = e.target.value;
    const quantity = parseInt(inputValue) || 0;
    
    // 更新数量字段
    form.setValue(`items.${index}.quantity`, inputValue);
    
    // 获取当前选择的产品
    const productId = form.getValues(`items.${index}.productId`);
    if (productId) {
      const selectedProduct = products.find(p => p.id === parseInt(productId));
      if (selectedProduct) {
        // 计算件数 - 根据产品的bulkQuantity属性计算
        const bulkQuantity = selectedProduct.bulkQuantity || 1; // 默认为1
        const packageCount = Math.ceil(quantity / bulkQuantity);
        
        // 更新件数
        form.setValue(`items.${index}.packageCount`, packageCount.toString());
        
        // 计算总重量 = 件数 * 每件重量
        const totalWeight = packageCount * selectedProduct.bulkWeightKg;
        
        // 计算总体积 = 件数 * 每件体积
        const totalVolume = packageCount * selectedProduct.bulkVolumeM3;
        
        // 更新重量和体积，保留3位小数
        form.setValue(`items.${index}.weight`, totalWeight.toFixed(3));
        form.setValue(`items.${index}.volume`, totalVolume.toFixed(3));
        
        // 触发表单验证，确保UI更新
        form.trigger(`items.${index}.packageCount`);
        form.trigger(`items.${index}.weight`);
        form.trigger(`items.${index}.volume`);
        
        // 更新总计
        calculateTotals();
      }
    }
  };
  
  // 件数变更时，重新计算重量和体积
  const handlePackageCountChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    // 获取输入值，确保为数字
    const inputValue = e.target.value;
    const packageCount = parseInt(inputValue) || 0;
    
    // 更新件数字段
    form.setValue(`items.${index}.packageCount`, inputValue);
    
    // 获取当前选择的产品
    const productId = form.getValues(`items.${index}.productId`);
    if (productId) {
      const selectedProduct = products.find(p => p.id === parseInt(productId));
      if (selectedProduct) {
        // 计算总重量 = 件数 * 每件重量
        const totalWeight = packageCount * selectedProduct.bulkWeightKg;
        
        // 计算总体积 = 件数 * 每件体积
        const totalVolume = packageCount * selectedProduct.bulkVolumeM3;
        
        // 更新重量和体积，保留3位小数
        form.setValue(`items.${index}.weight`, totalWeight.toFixed(3));
        form.setValue(`items.${index}.volume`, totalVolume.toFixed(3));
        
        // 触发表单验证，确保UI更新
        form.trigger(`items.${index}.weight`);
        form.trigger(`items.${index}.volume`);
        
        // 更新总计
        calculateTotals();
      }
    }
  };
  
  // 将base64数据URI转换为Blob对象
  const dataURItoBlob = (dataURI: string): Blob => {
    const byteString = atob(dataURI.split(',')[1]);
    const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    
    return new Blob([ab], { type: mimeString });
  };
  
  // 进入页面时初始化计算总计
  React.useEffect(() => {
    calculateTotals();
  }, []);
  
  // 监听表单数据变化，更新汇总数据
  React.useEffect(() => {
    const subscription = form.watch(() => {
      calculateTotals();
    });
    
    return () => subscription.unsubscribe();
  }, [form.watch]);
  
  // 文件选择变更处理
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      // 同时清除photoData，因为选择了文件上传
      form.setValue("photoData", "");
    }
  };
  
  // 拍照数据变更处理
  const handlePhotoDataChange = (dataUrl: string) => {
    if (dataUrl) {
      form.setValue("photoData", dataUrl);
      // 同时清除文件上传，因为使用了拍照
      form.setValue("documentImage", undefined);
    }
  };
  
  // 拍照底单对话框状态
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // 打开相机
  const openCamera = async () => {
    try {
      if (videoRef.current && navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment' } 
        });
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsCameraOpen(true);
      }
    } catch (error) {
      console.error("Error accessing camera:", error);
      toast({
        title: t("camera_error"),
        description: t("camera_access_denied"),
        variant: "destructive",
      });
    }
  };
  
  // 拍照
  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        // 设置canvas尺寸与视频匹配
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // 绘制视频帧到canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // 获取图像数据
        const dataUrl = canvas.toDataURL('image/jpeg');
        handlePhotoDataChange(dataUrl);
        
        // 关闭相机流
        if (video.srcObject) {
          const stream = video.srcObject as MediaStream;
          stream.getTracks().forEach(track => track.stop());
          video.srcObject = null;
        }
        
        setIsCameraOpen(false);
        
        toast({
          title: t("photo_captured"),
          description: t("photo_captured_description"),
        });
      }
    }
  };
  
  // 关闭相机
  const closeCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraOpen(false);
  };

  return (
    <div className="max-w-6xl mx-auto py-6 space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setLocation("/inbound-orders")}
          >
            <ArrowLeftIcon className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">{t("inboundOrder.create_new_inbound_order")}</h1>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>{t("inboundOrder.basic_information")}</CardTitle>
              <CardDescription>
                {t("inboundOrder.enter_basic_order_information")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 订单号 */}
                <FormField
                  control={form.control}
                  name="orderNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("inboundOrder.order_number")}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormDescription>
                        {t("inboundOrder.order_number_description")}
                      </FormDescription>
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
                      <FormLabel>{t("warehouse")}</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t("select_warehouse")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {warehouses.map((warehouse) => (
                            <SelectItem key={warehouse.id} value={warehouse.id.toString()}>
                              {warehouse.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        {t("inboundOrder.warehouse_description")}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* 备注 */}
                <div className="md:col-span-2">
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("notes")}</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder={t("inboundOrder.notes_placeholder")}
                            className="resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                {/* 底单文件上传 */}
                <div className="md:col-span-2">
                  <FormField
                    control={form.control}
                    name="documentImage"
                    render={({ field: { value, onChange, ...field } }) => (
                      <FormItem>
                        <FormLabel>{t("inboundOrder.document_image")}</FormLabel>
                        <FormControl>
                          <div className="flex flex-col space-y-2">
                            <Input
                              id="documentImage"
                              type="file"
                              accept="image/*,.pdf"
                              onChange={(e) => {
                                handleFileChange(e);
                                onChange(e.target.files);
                              }}
                              {...field}
                            />
                            <div className="flex items-center space-x-2">
                              <div className="text-sm text-muted-foreground">
                                {t("inboundOrder.or_take_photo")}
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={openCamera}
                              >
                                <Camera className="mr-2 h-4 w-4" />
                                {t("take_photo")}
                              </Button>
                            </div>
                            {form.getValues("photoData") && (
                              <div className="mt-2">
                                <p className="text-sm text-muted-foreground mb-2">
                                  {t("inboundOrder.preview")}:
                                </p>
                                <img
                                  src={form.getValues("photoData")}
                                  alt="Document preview"
                                  className="max-w-full h-auto max-h-40 rounded-md border"
                                />
                              </div>
                            )}
                          </div>
                        </FormControl>
                        <FormDescription>
                          {t("inboundOrder.document_image_description")}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 商品信息表格 */}
          <Card>
            <CardHeader>
              <CardTitle>{t("inboundOrder.items_information")}</CardTitle>
              <CardDescription>
                {t("inboundOrder.add_items_to_inbound_order")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">No.</TableHead>
                      <TableHead className="w-[100px]">{t("unique_code")}</TableHead>
                      <TableHead>{t("product")}</TableHead>
                      <TableHead className="w-[80px] text-center">{t("quantity")}</TableHead>
                      <TableHead className="w-[80px] text-center">{t("package_count")}</TableHead>
                      <TableHead className="w-[80px] text-center">{t("weight")}</TableHead>
                      <TableHead className="w-[80px] text-center">{t("volume")}</TableHead>
                      <TableHead className="w-[150px]">{t("remark")}</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields.map((field, index) => (
                      <TableRow key={field.id}>
                        <TableCell className="align-top py-4 text-center">
                          {index + 1}
                        </TableCell>
                        <TableCell className="align-top py-4">
                          <FormField
                            control={form.control}
                            name={`items.${index}.uniqueCode`}
                            render={({ field }) => (
                              <FormItem className="space-y-0">
                                <FormControl>
                                  <div className="flex items-center space-x-1">
                                    <Input
                                      {...field}
                                      value={field.value || ""}
                                      placeholder={t("unique_code")}
                                      className="h-8"
                                      onChange={(e) => {
                                        field.onChange(e);
                                        handleUniqueCodeChange(e.target.value, index);
                                      }}
                                    />
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
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
                        </TableCell>
                        <TableCell className="align-top py-4">
                          <FormField
                            control={form.control}
                            name={`items.${index}.productId`}
                            render={({ field }) => (
                              <FormItem className="space-y-0">
                                <FormControl>
                                  {isLoadingProducts ? (
                                    <div className="h-8 w-full bg-muted animate-pulse rounded"></div>
                                  ) : (
                                    <Combobox
                                      options={products.map(product => ({
                                        label: `${product.name} (${product.barcode})`,
                                        value: product.id.toString()
                                      }))}
                                      value={field.value}
                                      onValueChange={(value: string) => handleProductChange(value, index)}
                                      placeholder={t("select_product")}
                                      emptyText={t("no_product_found")}
                                      className="h-8"
                                    />
                                  )}
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </TableCell>
                        <TableCell className="align-top py-4">
                          <FormField
                            control={form.control}
                            name={`items.${index}.quantity`}
                            render={({ field }) => (
                              <FormItem className="space-y-0">
                                <FormControl>
                                  <Input
                                    {...field}
                                    type="number"
                                    min="1"
                                    className="h-8 text-center"
                                    onChange={(e) => handleQuantityChange(e, index)}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </TableCell>
                        <TableCell className="align-top py-4">
                          <FormField
                            control={form.control}
                            name={`items.${index}.packageCount`}
                            render={({ field }) => (
                              <FormItem className="space-y-0">
                                <FormControl>
                                  <Input
                                    {...field}
                                    type="number"
                                    min="1"
                                    className="h-8 text-center"
                                    onChange={(e) => handlePackageCountChange(e, index)}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </TableCell>
                        <TableCell className="align-top py-4">
                          <FormField
                            control={form.control}
                            name={`items.${index}.weight`}
                            render={({ field }) => (
                              <FormItem className="space-y-0">
                                <FormControl>
                                  <Input
                                    {...field}
                                    readOnly
                                    className="h-8 text-center bg-muted"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </TableCell>
                        <TableCell className="align-top py-4">
                          <FormField
                            control={form.control}
                            name={`items.${index}.volume`}
                            render={({ field }) => (
                              <FormItem className="space-y-0">
                                <FormControl>
                                  <Input
                                    {...field}
                                    readOnly
                                    className="h-8 text-center bg-muted"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </TableCell>
                        <TableCell className="align-top py-4">
                          <FormField
                            control={form.control}
                            name={`items.${index}.remark`}
                            render={({ field }) => (
                              <FormItem className="space-y-0">
                                <FormControl>
                                  <Input
                                    {...field}
                                    value={field.value || ""}
                                    placeholder={t("remark")}
                                    className="h-8"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </TableCell>
                        <TableCell className="align-top py-4">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleRemoveItem(index)}
                            disabled={fields.length <= 1}
                          >
                            <MinusIcon className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              {/* 添加商品按钮 */}
              <div className="mt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddItem}
                  className="w-full"
                >
                  <PlusIcon className="mr-2 h-4 w-4" />
                  {t("add_item")}
                </Button>
              </div>
              
              {/* 汇总信息 */}
              <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                <h3 className="text-lg font-medium mb-4">{t("order_summary")}</h3>
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
                    <p className="text-lg font-semibold">{`${totalVolume.toFixed(2)} m³`}</p>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => setLocation("/inbound-orders")}
              >
                {t("cancel")}
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? t('creating') : t('inboundOrder.create_inbound_order')}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </Form>
      
      {/* 条码扫描对话框 */}
      <Dialog open={isBarcodeScannerOpen} onOpenChange={setIsBarcodeScannerOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("inboundOrder.scan_unique_code")}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center py-4">
            <BarcodeScanner 
              onCodeDetected={handleUniqueCodeScanned}
              label={t("inboundOrder.scan_or_enter_code")}
              placeholder={t("inboundOrder.unique_code_placeholder")}
              uniqueCodeMode={true}
            />
          </div>
        </DialogContent>
      </Dialog>
      
      {/* 拍照对话框 */}
      <Dialog open={isCameraOpen} onOpenChange={setIsCameraOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("take_photo_of_document")}</DialogTitle>
            <DialogDescription>
              {t("position_document_in_frame")}
            </DialogDescription>
          </DialogHeader>
          <div className="relative">
            <video 
              ref={videoRef} 
              className="w-full h-64 bg-black object-cover rounded-md"
              playsInline
            />
            <canvas ref={canvasRef} className="hidden" />
          </div>
          <div className="flex justify-between">
            <Button variant="outline" onClick={closeCamera}>
              {t("cancel")}
            </Button>
            <Button onClick={capturePhoto}>
              {t("capture")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}