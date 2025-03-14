import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { ArrowLeftIcon } from "@radix-ui/react-icons";

import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// 仓库接口定义
interface Warehouse {
  id: number;
  name: string;
  location: string;
}

// 创建出库单表单Schema
const createOutboundOrderSchema = z.object({
  orderNumber: z.string()
    .min(1, { message: "Order number is required" })
    .max(50, { message: "Order number must be 50 characters or less" }),
  warehouseId: z.string().min(1, { message: "Warehouse is required" }),
  status: z.string().default("pending"),
  orderType: z.string().default("sale"),
  destinationType: z.string().default("customer"),
  notes: z.string().optional(),
});

// 表单类型
type FormValues = z.infer<typeof createOutboundOrderSchema>;

export default function NewOutboundOrder() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // 获取仓库数据
  const { data: warehouses = [], isLoading: isLoadingWarehouses } = useQuery<Warehouse[]>({
    queryKey: ["/api/warehouses"],
  });
  
  // 创建表单实例
  const form = useForm<FormValues>({
    resolver: zodResolver(createOutboundOrderSchema),
    defaultValues: {
      orderNumber: "",
      warehouseId: "",
      status: "pending",
      orderType: "sale",
      destinationType: "customer",
      notes: ""
    },
  });
  
  // 提交表单处理函数
  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    
    try {
      // 提交数据到API
      const response = await apiRequest<any>("/api/outbound-orders", {
        method: "POST",
        body: JSON.stringify({
          orderNumber: data.orderNumber,
          warehouseId: parseInt(data.warehouseId),
          status: data.status,
          orderType: data.orderType,
          destinationType: data.destinationType,
          notes: data.notes || ""
        }),
      });
      
      toast({
        title: t("outbound_order_created"),
        description: t("outbound_order_created_description"),
      });
      
      // 创建成功后跳转到订单详情页
      navigate(`/outbound-order/${response.id}`);
    } catch (error) {
      console.error("Error creating outbound order:", error);
      toast({
        title: t("outbound_order_creation_failed"),
        description: t("outbound_order_creation_failed_description"),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // 生成订单号
  const generateOrderNumber = () => {
    const prefix = "OUT";
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
    return `${prefix}${timestamp}${random}`;
  };
  
  // 自动生成订单号
  const handleAutoGenerate = () => {
    form.setValue("orderNumber", generateOrderNumber());
  };
  
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <Button variant="outline" size="sm" onClick={() => navigate("/outbound-orders")}>
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
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="flex items-end gap-4">
                <FormField
                  control={form.control}
                  name="orderNumber"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>{t("order_number")}</FormLabel>
                      <FormControl>
                        <Input placeholder={t("order_number_placeholder")} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  className="mb-[2px]" 
                  onClick={handleAutoGenerate}
                >
                  {t("auto_generate")}
                </Button>
              </div>
              
              <FormField
                control={form.control}
                name="warehouseId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("warehouse")}</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("select_warehouse")} />
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
                    <FormDescription>
                      {t("select_warehouse_description")}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("status")}</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("select_status")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="pending">{t("pending")}</SelectItem>
                        <SelectItem value="processing">{t("processing")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      {t("status_description")}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="orderType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("order_type")}</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("select_order_type")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="sale">{t("outbound_sales")}</SelectItem>
                        <SelectItem value="return">{t("outbound_return")}</SelectItem>
                        <SelectItem value="transfer">{t("outbound_transfer")}</SelectItem>
                        <SelectItem value="scrap">{t("outbound_scrap")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      {t("order_type_description")}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="destinationType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("destination_type")}</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("select_destination_type")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="customer">{t("destination_customer")}</SelectItem>
                        <SelectItem value="retail">{t("destination_retail")}</SelectItem>
                        <SelectItem value="wholesale">{t("destination_wholesale")}</SelectItem>
                        <SelectItem value="transfer">{t("destination_transfer")}</SelectItem>
                        <SelectItem value="supplier">{t("destination_supplier")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      {t("destination_type_description")}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("notes")}</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder={t("notes_placeholder")} 
                        className="resize-none" 
                        rows={4}
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      {t("notes_description")}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex justify-end space-x-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => navigate("/outbound-orders")}
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
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}