import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { CreateWarehouseProductDialog } from "@/components/warehouse-products/create-warehouse-product-dialog";

export default function NewWarehouseProduct() {
  const { t } = useTranslation();
  const [location, navigate] = useLocation();
  const [dialogOpen, setDialogOpen] = useState(true);

  // 获取当前用户 - 用于记录创建者
  const { data: currentUser } = useQuery<any>({
    queryKey: ['/api/users/current'],
  });

  // 当对话框关闭时返回列表页面
  const handleDialogOpenChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      navigate("/warehouse-products");
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <Button 
          variant="outline" 
          onClick={() => navigate("/warehouse-products")}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('back_to_warehouse_products')}
        </Button>
        
        <h1 className="text-2xl font-bold">{t('new_warehouse_product')}</h1>
        <p className="text-muted-foreground">{t('new_warehouse_product_description')}</p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>{t('new_warehouse_product')}</CardTitle>
          <CardDescription>{t('fill_product_details')}</CardDescription>
        </CardHeader>
        <CardContent>
          <p>{t('use_dialog_to_create')}</p>
          <div className="mt-4">
            <Button onClick={() => setDialogOpen(true)}>
              {t('open_product_form')}
            </Button>
          </div>
        </CardContent>
      </Card>
      
      <CreateWarehouseProductDialog 
        open={dialogOpen} 
        onOpenChange={handleDialogOpenChange}
        currentUserId={currentUser?.id || 1}
      />
    </div>
  );
}