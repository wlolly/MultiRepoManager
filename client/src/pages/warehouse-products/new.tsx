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

// 产品创建表单Schema定义
const productSchema = z.object({
  warehouseId: z.string().min(1, { message: "请选择仓库" }),
  items: z.array(
    z.object({
      productId: z.string().min(1, { message: "产品是必填项" }),
      uniqueCode: z.string().optional(),
      quantity: z.string().min(1, { message: "数量是必填项" }).transform(val => parseInt(val)),
      packageCount: z.string().min(1, { message: "件数是必填项" }).transform(val => parseInt(val)),
      weight: z.string().min(0, { message: "重量不能为负" }).transform(val => parseFloat(val)),
      volume: z.string().min(0, { message: "体积不能为负" }).transform(val => parseFloat(val)),
      remark: z.string().optional(),
    })
  ).min(1, { message: "至少添加一个产品" }),
  documentImage: z.instanceof(FileList).optional().transform(fileList => 
    fileList && fileList.length > 0 ? fileList[0] : undefined
  ),
  photoData: z.string().optional(),
  notes: z.string().optional(),
});

type ProductFormValues = z.infer<typeof productSchema>;

export default function NewWarehouseProduct() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // 汇总数据状态
  const [totalQuantity, setTotalQuantity] = useState(0);
  const [totalPackages, setTotalPackages] = useState(0);
  const [totalWeight, setTotalWeight] = useState(0);
  const [totalVolume, setTotalVolume] = useState(0);
  
  // 条码扫描状态
  const [isBarcodeScannerOpen, setIsBarcodeScannerOpen] = useState(false);
  const [currentScanningIndex, setCurrentScanningIndex] = useState<number | null>(null);
  
  // 获取仓库列表
  const { data: warehouses = [], isLoading: isLoadingWarehouses } = useQuery<Warehouse[]>({
    queryKey: ['/api/warehouses'],
  });
  
  // 获取商品列表
  const { data: products = [], isLoading: isLoadingProducts } = useQuery<Product[]>({
    queryKey: ['/api/products'],
  });
  
  // 根据唯一码查找商品
  const findProductByUniqueCode = (uniqueCode: string) => {
    return products.find(p => p.uniqueCode === uniqueCode);
  };
  
  // 处理唯一码输入变化
  const handleUniqueCodeChange = (value: string, index: number) => {
    // 只允许输入数字，且最大长度为5位
    const numericValue = value.replace(/\D/g, '').substring(0, 5);
    form.setValue(`items.${index}.uniqueCode`, numericValue);
    
    // 当输入达到5位数字时，尝试查找对应的商品
    if (numericValue.length === 5) {
      const product = findProductByUniqueCode(numericValue);
      
      if (product) {
        // 如果找到匹配的商品，自动填充相关字段
        form.setValue(`items.${index}.productId`, product.id.toString());
        
        // 默认数量为1
        const quantity = parseInt(form.getValues(`items.${index}.quantity`) || "1");
        form.setValue(`items.${index}.quantity`, quantity.toString());
        
        // 计算件数 = ⌈数量 / 每件包装数量⌉
        const bulkQuantity = product.bulkQuantity || 1; // 默认为1
        const packageCount = Math.ceil(quantity / bulkQuantity);
        form.setValue(`items.${index}.packageCount`, packageCount.toString());
        
        // 计算总重量 = 件数 * 每件重量
        const weightPerPackage = product.bulkWeightKg || 0;
        const totalWeight = packageCount * weightPerPackage;
        form.setValue(`items.${index}.weight`, totalWeight.toFixed(2));
        
        // 计算总体积 = 件数 * 每件体积
        const volumePerPackage = product.bulkVolumeM3 || 0;
        const totalVolume = packageCount * volumePerPackage;
        form.setValue(`items.${index}.volume`, totalVolume.toFixed(4));
        
        // 显示成功通知
        toast.success(t('product_found_by_code'));
        
        // 更新汇总信息
        calculateTotals();
      } else {
        // 如果未找到匹配的商品，显示警告信息
        toast({
          title: t('product_not_found'),
          description: t('product_not_found_by_code', { code: numericValue }),
          variant: "warning",
        });
      }
    }
  };
  
  // 处理商品选择变化
  const handleProductChange = (value: string, index: number) => {
    if (!value) return;
    
    const productId = parseInt(value);
    const product = products.find(p => p.id === productId);
    
    if (product) {
      // 设置产品ID
      form.setValue(`items.${index}.productId`, value);
      
      // 如果有唯一码，则同步更新
      if (product.uniqueCode) {
        form.setValue(`items.${index}.uniqueCode`, product.uniqueCode);
      }
      
      // 默认数量为1，如果已有数量则保留
      const quantity = parseInt(form.getValues(`items.${index}.quantity`) || "1");
      form.setValue(`items.${index}.quantity`, quantity.toString());
      
      // 重新计算件数、重量和体积
      updateItemCalculations(index, quantity, product);
      
      // 更新汇总数据
      calculateTotals();
    }
  };
  
  // 处理数量变化
  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const quantity = parseInt(e.target.value || "0");
    
    // 获取当前选中的产品
    const productId = form.getValues(`items.${index}.productId`);
    if (!productId) return;
    
    const product = products.find(p => p.id === parseInt(productId));
    if (!product) return;
    
    // 更新件数、重量和体积
    updateItemCalculations(index, quantity, product);
    
    // 更新汇总数据
    calculateTotals();
  };
  
  // 处理件数变化
  const handlePackageCountChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const packageCount = parseInt(e.target.value || "0");
    
    // 获取当前选中的产品
    const productId = form.getValues(`items.${index}.productId`);
    if (!productId) return;
    
    const product = products.find(p => p.id === parseInt(productId));
    if (!product) return;
    
    // 更新重量和体积
    const weightPerPackage = product.bulkWeightKg || 0;
    const volumePerPackage = product.bulkVolumeM3 || 0;
    
    form.setValue(`items.${index}.weight`, (packageCount * weightPerPackage).toFixed(2));
    form.setValue(`items.${index}.volume`, (packageCount * volumePerPackage).toFixed(4));
    
    // 更新汇总数据
    calculateTotals();
  };
  
  // 更新商品行的计算字段
  const updateItemCalculations = (index: number, quantity: number, product: Product) => {
    // 计算件数 = ⌈数量 / 每件包装数量⌉
    const bulkQuantity = product.bulkQuantity || 1; // 默认为1
    const packageCount = Math.ceil(quantity / bulkQuantity);
    form.setValue(`items.${index}.packageCount`, packageCount.toString());
    
    // 计算总重量 = 件数 * 每件重量
    const weightPerPackage = product.bulkWeightKg || 0;
    const totalWeight = packageCount * weightPerPackage;
    form.setValue(`items.${index}.weight`, totalWeight.toFixed(2));
    
    // 计算总体积 = 件数 * 每件体积
    const volumePerPackage = product.bulkVolumeM3 || 0;
    const totalVolume = packageCount * volumePerPackage;
    form.setValue(`items.${index}.volume`, totalVolume.toFixed(4));
  };
  
  // 初始化表单
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      warehouseId: "",
      items: [
        { 
          productId: "", 
          uniqueCode: "", 
          quantity: "1", 
          packageCount: "1", 
          weight: "0", 
          volume: "0",
          remark: "" 
        }
      ],
      notes: "",
    }
  });
  
  // 字段数组控制
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items"
  });
  
  // 计算汇总数据
  const calculateTotals = () => {
    const items = form.getValues("items");
    let quantity = 0;
    let packages = 0;
    let weight = 0;
    let volume = 0;
    
    // 遍历所有商品行，累加数量、件数、重量和体积
    items.forEach(item => {
      // 将字符串转换为数字
      const itemQuantity = parseInt(item.quantity?.toString() || "0");
      const itemPackages = parseInt(item.packageCount?.toString() || "0");
      const itemWeight = parseFloat(item.weight?.toString() || "0");
      const itemVolume = parseFloat(item.volume?.toString() || "0");
      
      // 累加到总计
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
    
    // 更新表单中的汇总字段 - 如果需要的话
    // form.setValue("totalWeight", weight.toFixed(2));
    // form.setValue("totalVolume", volume.toFixed(4));
  };
  
  // 添加商品行
  const handleAddItem = () => {
    append({ 
      productId: "", 
      uniqueCode: "", 
      quantity: "1", 
      packageCount: "1", 
      weight: "0", 
      volume: "0",
      remark: "" 
    });
  };
  
  // 移除商品行
  const handleRemoveItem = (index: number) => {
    remove(index);
    // 在下一个渲染周期更新汇总
    setTimeout(() => calculateTotals(), 0);
  };
  
  // 打开条码扫描
  const handleOpenBarcodeScanner = (index: number) => {
    setCurrentScanningIndex(index);
    setIsBarcodeScannerOpen(true);
  };
  
  // 处理唯一码扫描结果
  const handleUniqueCodeScanned = (code: string) => {
    if (currentScanningIndex !== null) {
      // 将扫描到的唯一码应用到当前选中的商品行
      form.setValue(`items.${currentScanningIndex}.uniqueCode`, code);
      
      // 尝试查找对应的商品
      const product = findProductByUniqueCode(code);
      
      if (product) {
        // 如果找到匹配的商品，自动填充相关字段
        form.setValue(`items.${currentScanningIndex}.productId`, product.id.toString());
        
        // 默认数量为1
        const quantity = parseInt(form.getValues(`items.${currentScanningIndex}.quantity`) || "1");
        
        // 更新件数、重量和体积
        updateItemCalculations(currentScanningIndex, quantity, product);
        
        // 更新汇总数据
        calculateTotals();
        
        // 显示成功通知
        toast.success(t('product_found_by_code'));
      } else {
        // 如果未找到匹配的商品，显示警告信息
        toast({
          title: t('product_not_found'),
          description: t('product_not_found_by_code', { code }),
          variant: "warning",
        });
      }
      
      // 关闭扫描对话框
      setIsBarcodeScannerOpen(false);
      setCurrentScanningIndex(null);
    }
  };
  
  // 相机引用和状态
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // 打开相机
  const openCamera = () => {
    setIsCameraOpen(true);
    
    // 在下一个渲染周期后初始化相机
    setTimeout(() => {
      if (videoRef.current && navigator.mediaDevices?.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment' } 
        }).then(stream => {
          videoRef.current!.srcObject = stream;
          videoRef.current!.play();
        }).catch(err => {
          console.error('相机访问失败:', err);
          toast.error(t('camera_access_failed'));
        });
      }
    }, 100);
  };
  
  // 捕获照片
  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // 确保视频已加载
      if (video.readyState === 4) {
        // 设置画布尺寸与视频相同
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // 将视频帧绘制到画布
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // 将画布内容转换为数据URL
        const dataURL = canvas.toDataURL('image/jpeg');
        form.setValue('photoData', dataURL);
        
        // 关闭视频流
        if (video.srcObject) {
          const stream = video.srcObject as MediaStream;
          stream.getTracks().forEach(track => track.stop());
          video.srcObject = null;
        }
        
        // 关闭相机对话框
        setIsCameraOpen(false);
        
        // 显示成功通知
        toast.success(t('photo_captured_successfully'));
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
  
  // 表单提交处理
  const onSubmit = async (data: ProductFormValues) => {
    setIsSubmitting(true);
    
    try {
      // 构建表单数据，包括文件上传
      const formData = new FormData();
      
      // 添加基本字段
      formData.append('warehouseId', data.warehouseId);
      formData.append('notes', data.notes || '');
      
      // 如果有拍照数据，添加到表单
      if (data.photoData) {
        formData.append('photoData', data.photoData);
      }
      
      // 如果有文件上传，添加到表单
      if (data.documentImage instanceof File) {
        formData.append('documentImage', data.documentImage);
      }
      
      // 添加商品数据
      formData.append('items', JSON.stringify(data.items));
      
      // 添加汇总数据
      formData.append('totalWeight', totalWeight.toString());
      formData.append('totalVolume', totalVolume.toString());
      
      // 发送API请求
      const response = await fetch('/api/warehouse-products/multi', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || t('create_product_failed'));
      }
      
      // 成功处理
      toast.success(t('products_created_successfully'));
      
      // 重定向到产品列表页面
      setLocation('/warehouse-products');
    } catch (error: any) {
      toast.error(`${t('create_product_failed')}: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // 只有管理员可以访问
  const { data: currentUser } = useQuery<any>({
    queryKey: ['/api/users/current'],
  });
  
  // 检查用户是否是管理员
  const isAdmin = currentUser?.role === 'admin';
  
  // 如果不是管理员，显示无权限提示
  if (currentUser && !isAdmin) {
    return (
      <div className="container mx-auto py-12">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>{t('permission_denied')}</CardTitle>
            <CardDescription>{t('admin_only_feature')}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4">{t('contact_admin_for_access')}</p>
            <Button 
              variant="outline" 
              onClick={() => setLocation("/warehouse-products")}
            >
              <ArrowLeftIcon className="mr-2 h-4 w-4" />
              {t('back_to_warehouse_products')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <Button 
          variant="outline" 
          onClick={() => setLocation("/warehouse-products")}
          className="mb-4"
        >
          <ArrowLeftIcon className="mr-2 h-4 w-4" />
          {t('back_to_warehouse_products')}
        </Button>
        
        <h1 className="text-2xl font-bold">{t('new_warehouse_product_multi')}</h1>
        <p className="text-muted-foreground">{t('new_warehouse_product_multi_description')}</p>
      </div>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Card>
            <CardHeader>
              <CardTitle>{t('new_warehouse_product_multi')}</CardTitle>
              <CardDescription>{t('fill_product_details')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 仓库选择 */}
              <FormField
                control={form.control}
                name="warehouseId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('warehouse')}</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('select_warehouse')} />
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
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* 商品明细表格 */}
              <div className="relative overflow-x-auto border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40px]">#</TableHead>
                      <TableHead>{t('product')}</TableHead>
                      <TableHead className="w-[100px] text-center">{t('quantity')}</TableHead>
                      <TableHead className="w-[100px] text-center">{t('package_count')}</TableHead>
                      <TableHead className="w-[100px] text-center">{t('weight')} (kg)</TableHead>
                      <TableHead className="w-[100px] text-center">{t('volume')} (m³)</TableHead>
                      <TableHead className="w-[150px]">{t('remark')}</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields.map((field, index) => (
                      <TableRow key={field.id}>
                        <TableCell className="align-top py-4">
                          <div className="flex items-center space-x-2">
                            <span>{index + 1}</span>
                            <button 
                              type="button" 
                              className="text-blue-500 hover:text-blue-700"
                              onClick={() => handleOpenBarcodeScanner(index)}
                            >
                              <QrCode className="h-4 w-4" />
                            </button>
                          </div>
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
                <h3 className="text-lg font-medium mb-4">{t("product_summary")}</h3>
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
              
              {/* 备注和文件上传 */}
              <div className="space-y-4 pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('notes')}</FormLabel>
                        <FormControl>
                          <Textarea 
                            rows={4} 
                            placeholder={t('enter_any_additional_notes')}
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div>
                    <FormField
                      control={form.control}
                      name="documentImage"
                      render={({ field: { value, onChange, ...fieldProps } }) => (
                        <FormItem>
                          <FormLabel>{t('document_image')}</FormLabel>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Input
                                type="file"
                                accept="image/*"
                                onChange={(e) => onChange(e.target.files)}
                                {...fieldProps}
                              />
                              <FormDescription>
                                {t('upload_document_description')}
                              </FormDescription>
                            </div>
                            <div>
                              <Button
                                type="button"
                                variant="outline"
                                className="w-full h-10"
                                onClick={openCamera}
                              >
                                <Camera className="mr-2 h-4 w-4" />
                                {t('take_photo')}
                              </Button>
                              {form.watch('photoData') && (
                                <div className="mt-2">
                                  <p className="text-sm text-green-600">{t('photo_captured')}</p>
                                </div>
                              )}
                            </div>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => setLocation("/warehouse-products")}
              >
                {t("cancel")}
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? t('creating') : t('create_products')}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </Form>
      
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