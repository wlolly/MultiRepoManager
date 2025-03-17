import { useState, FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { ArrowLeftIcon } from "@radix-ui/react-icons";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

// 仓库接口定义
interface Warehouse {
  id: number;
  name: string;
  location: string;
}

export default function NewOutboundOrder() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // 表单状态
  const [orderNumber, setOrderNumber] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [status, setStatus] = useState("pending");
  const [orderType, setOrderType] = useState("sale");
  const [destinationType, setDestinationType] = useState("customer");
  const [notes, setNotes] = useState("");
  
  // 获取仓库数据
  const { data: warehouses = [], isLoading: isLoadingWarehouses } = useQuery<Warehouse[]>({
    queryKey: ["/api/warehouses"],
  });
  
  // 自动生成订单号
  const generateOrderNumber = () => {
    const prefix = "OUT";
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
    return `${prefix}${timestamp}${random}`;
  };
  
  // 处理自动生成
  const handleAutoGenerate = () => {
    setOrderNumber(generateOrderNumber());
  };
  
  // 表单提交处理
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    console.log("表单提交开始");
    
    // 验证表单
    if (!orderNumber) {
      toast({
        variant: "destructive",
        title: t("validation_error"),
        description: t("order_number_required"),
      });
      return;
    }
    
    if (!warehouseId) {
      toast({
        variant: "destructive",
        title: t("validation_error"),
        description: t("warehouse_required"),
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const payload = {
        orderNumber,
        warehouseId: parseInt(warehouseId),
        status,
        orderType,
        destinationType,
        notes: notes || "",
        totalWeight: "0",
        totalVolume: "0",
        items: []
      };
      
      console.log("提交到API的数据:", payload);
      
      const response = await fetch("/api/outbound-orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        credentials: "include"
      });
      
      console.log("API响应状态:", response.status);
      
      // 解析响应
      const responseText = await response.text();
      console.log("原始响应内容:", responseText);
      
      let data;
      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch (e) {
        console.error("解析响应失败:", e);
        throw new Error("无法解析服务器响应");
      }
      
      if (!response.ok) {
        throw new Error(data.error || "创建出库单失败");
      }
      
      console.log("API响应数据:", data);
      
      toast({
        title: t("success"),
        description: t("outbound_order_created"),
      });
      
      if (data && data.id) {
        setLocation(`/outbound-order/${data.id}`);
      } else {
        setLocation("/outbound-orders");
      }
      
    } catch (error: any) {
      console.error("出库单创建错误:", error);
      toast({
        variant: "destructive",
        title: t("error"),
        description: error.message || t("outbound_order_create_error"),
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setLocation("/outbound-orders")}
        >
          <ArrowLeftIcon className="mr-2 h-4 w-4" />
          {t("back_to_outbound_orders")}
        </Button>
      </div>
      
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>{t("new_outbound_order")}</CardTitle>
          <CardDescription>
            {t("new_outbound_order_description")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 订单号 */}
            <div className="flex items-end gap-4">
              <div className="flex-1 space-y-2">
                <Label htmlFor="orderNumber">{t("order_number")}</Label>
                <Input 
                  id="orderNumber"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  placeholder={t("order_number_placeholder")}
                />
              </div>
              <Button 
                type="button" 
                variant="outline" 
                className="mb-[2px]" 
                onClick={handleAutoGenerate}
              >
                {t("auto_generate")}
              </Button>
            </div>
            
            {/* 仓库 */}
            <div className="space-y-2">
              <Label htmlFor="warehouseId">{t("warehouse")}</Label>
              <Select 
                value={warehouseId} 
                onValueChange={setWarehouseId}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("select_warehouse")} />
                </SelectTrigger>
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
              <p className="text-sm text-muted-foreground">{t("select_warehouse_description")}</p>
            </div>
            
            {/* 状态 */}
            <div className="space-y-2">
              <Label htmlFor="status">{t("status")}</Label>
              <Select 
                value={status} 
                onValueChange={setStatus}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("select_status")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">{t("pending")}</SelectItem>
                  <SelectItem value="processing">{t("processing")}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">{t("status_description")}</p>
            </div>
            
            {/* 订单类型 */}
            <div className="space-y-2">
              <Label htmlFor="orderType">{t("order_type")}</Label>
              <Select 
                value={orderType} 
                onValueChange={setOrderType}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("select_order_type")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sale">{t("outbound_sales")}</SelectItem>
                  <SelectItem value="return">{t("outbound_return")}</SelectItem>
                  <SelectItem value="transfer">{t("outbound_transfer")}</SelectItem>
                  <SelectItem value="scrap">{t("outbound_scrap")}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">{t("order_type_description")}</p>
            </div>
            
            {/* 目的地类型 */}
            <div className="space-y-2">
              <Label htmlFor="destinationType">{t("destination_type")}</Label>
              <Select 
                value={destinationType} 
                onValueChange={setDestinationType}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("select_destination_type")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="customer">{t("destination_customer")}</SelectItem>
                  <SelectItem value="retail">{t("destination_retail")}</SelectItem>
                  <SelectItem value="wholesale">{t("destination_wholesale")}</SelectItem>
                  <SelectItem value="transfer">{t("destination_transfer")}</SelectItem>
                  <SelectItem value="supplier">{t("destination_supplier")}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">{t("destination_type_description")}</p>
            </div>
            
            {/* 备注 */}
            <div className="space-y-2">
              <Label htmlFor="notes">{t("notes")}</Label>
              <Textarea 
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t("notes_placeholder")}
                className="resize-none"
                rows={4}
              />
              <p className="text-sm text-muted-foreground">{t("notes_description")}</p>
            </div>
            
            {/* 按钮 */}
            <div className="flex justify-end space-x-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setLocation("/outbound-orders")}
              >
                {t("cancel")}
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting}
              >
                {isSubmitting ? t("creating") : t("create")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Select } from '@/components/ui/select';

export default function NewOutboundOrder() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { register, handleSubmit } = useForm();

  const onSubmit = async (data) => {
    try {
      const response = await fetch('/api/outbound-orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        toast({
          title: "创建成功",
          description: "出库单已成功创建"
        });
        navigate('/outbound-orders');
      }
    } catch (error) {
      toast({
        title: "创建失败",
        description: "请检查输入并重试",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">新建出库单</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-2xl">
        <div>
          <label>出库单号</label>
          <Input {...register('orderNumber')} required />
        </div>
        <div>
          <label>仓库</label>
          <Select {...register('warehouseId')} required>
            <option value="1">上海仓库</option>
            <option value="2">北京仓库</option>
          </Select>
        </div>
        <div>
          <label>出库类型</label>
          <Select {...register('orderType')} required>
            <option value="sale">销售出库</option>
            <option value="return">退货出库</option>
            <option value="transfer">调拨出库</option>
            <option value="scrap">报废出库</option>
          </Select>
        </div>
        <div>
          <label>备注</label>
          <Input {...register('notes')} />
        </div>
        <Button type="submit">创建出库单</Button>
      </form>
    </div>
  );
}
