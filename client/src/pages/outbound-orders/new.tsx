import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface Warehouse {
  id: number;
  name: string;
  location: string;
}

// 表单架构
const createOutboundOrderSchema = z.object({
  orderNumber: z.string().min(3, { message: "Order number must be at least 3 characters" }),
  warehouseId: z.string().min(1, { message: "Warehouse is required" }),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof createOutboundOrderSchema>;

export default function NewOutboundOrder() {
  const [, navigate] = useLocation();
  const { t } = useTranslation();
  const { toast } = useToast();

  // 查询仓库列表
  const { data: warehouses = [] } = useQuery<Warehouse[]>({
    queryKey: ["/api/warehouses"],
  });

  // 表单
  const form = useForm<FormValues>({
    resolver: zodResolver(createOutboundOrderSchema),
    defaultValues: {
      orderNumber: `OUT-${Date.now()}`,
      warehouseId: "",
      notes: "",
    },
  });

  // 创建出库单
  const createMutation = useMutation({
    mutationFn: (data: FormValues) => {
      return apiRequest(`/api/outbound-orders`, {
        method: "POST",
        body: JSON.stringify({
          orderNumber: data.orderNumber,
          warehouseId: parseInt(data.warehouseId),
          totalWeight: 0, // 初始总重量为0
          totalVolume: 0, // 初始总体积为0
          createdBy: 1, // 假设用户ID为1，实际应该从认证中获取
          status: "pending",
          notes: data.notes,
        }),
      });
    },
    onSuccess: (data) => {
      toast({
        title: t("outbound_order_created"),
        description: t("outbound_order_created_successfully"),
      });
      // 导航到新创建的出库单详情页
      navigate(`/outbound-order/${data.id}`);
    },
    onError: (error) => {
      toast({
        title: t("error"),
        description: error.message || t("failed_to_create_outbound_order"),
        variant: "destructive",
      });
    },
  });

  // 提交表单
  const onSubmit = (data: FormValues) => {
    createMutation.mutate(data);
  };

  return (
    <div className="container mx-auto py-6 px-4 md:px-6">
      <div className="flex items-center mb-6">
        <Link href="/outbound-orders">
          <Button variant="ghost" size="sm" className="mr-2">
            <i className="ri-arrow-left-line"></i>
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">{t("create_outbound_order")}</h1>
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
              <FormField
                control={form.control}
                name="orderNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("order_number")}</FormLabel>
                    <FormControl>
                      <div className="flex">
                        <Input
                          {...field}
                          placeholder={t("order_number_placeholder")}
                        />
                        <Button 
                          type="button" 
                          variant="outline" 
                          className="ml-2 whitespace-nowrap"
                          onClick={() => form.setValue("orderNumber", `OUT-${Date.now()}`)}
                        >
                          {t("generate_number")}
                        </Button>
                      </div>
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
                    <FormLabel>{t("warehouse")}</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("select_warehouse")} />
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
                        className="min-h-[120px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2">
                <Link href="/outbound-orders">
                  <Button variant="outline" type="button">
                    {t("cancel")}
                  </Button>
                </Link>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? (
                    <><i className="ri-loader-4-line animate-spin mr-2"></i> {t("creating")}</>
                  ) : (
                    t("create")
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}