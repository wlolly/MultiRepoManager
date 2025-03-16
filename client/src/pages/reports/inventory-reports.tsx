import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { FileSpreadsheet, BarChart3, TrendingUp, Package, Server } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

// 导入库存报表导出组件
import { InventoryReportExport } from "@/components/inventory/InventoryReportExport";

export default function InventoryReportsPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("overview");
  
  // 获取所有仓库数据用于导出报表选择
  const { data: warehouses = [], isLoading: isLoadingWarehouses } = useQuery<any[]>({
    queryKey: ["/api/warehouses"],
  });
  
  // 获取所有产品分类
  const { data: productCategories = [], isLoading: isLoadingCategories } = useQuery<string[]>({
    queryKey: ["/api/products/categories"],
  });
  
  // 获取库存统计数据
  const { data: inventoryStats, isLoading: isLoadingStats } = useQuery<any>({
    queryKey: ["/api/inventory/stats"],
  });
  
  // 库存概览统计卡片数据
  const statsCards = inventoryStats ? [
    {
      title: t("inventory.total_products"),
      value: inventoryStats.totalProducts.toLocaleString(),
      description: t("inventory.total_products_description"),
      icon: <Package className="h-4 w-4" />,
      color: "bg-blue-500"
    },
    {
      title: t("inventory.total_value"),
      value: `$${inventoryStats.totalValue.toLocaleString()}`,
      description: t("inventory.total_value_description"),
      icon: <TrendingUp className="h-4 w-4" />,
      color: "bg-green-500"
    },
    {
      title: t("inventory.low_stock_items"),
      value: inventoryStats.lowStockProducts.toLocaleString(),
      description: t("inventory.low_stock_description"),
      icon: <Server className="h-4 w-4" />,
      color: "bg-yellow-500"
    },
    {
      title: t("inventory.categories"),
      value: inventoryStats.totalCategories.toLocaleString(),
      description: t("inventory.categories_description"),
      icon: <BarChart3 className="h-4 w-4" />,
      color: "bg-purple-500"
    }
  ] : [];
  
  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* 页面标题和操作按钮 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t("reports.inventory_reports")}</h1>
          <p className="text-gray-500">{t("reports.inventory_reports_description")}</p>
        </div>
        
        <div className="flex items-center gap-2">
          <InventoryReportExport 
            warehouseOptions={warehouses}
            categoryOptions={productCategories}
          />
        </div>
      </div>
      
      {/* 标签页 */}
      <Tabs
        defaultValue="overview"
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger value="overview">{t("reports.overview")}</TabsTrigger>
          <TabsTrigger value="movement">{t("reports.inventory_movement")}</TabsTrigger>
          <TabsTrigger value="status">{t("reports.inventory_status")}</TabsTrigger>
          <TabsTrigger value="analysis">{t("reports.inventory_analysis")}</TabsTrigger>
        </TabsList>
        
        {/* 概览标签内容 */}
        <TabsContent value="overview" className="space-y-6">
          {/* 库存统计卡片 */}
          {isLoadingStats ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {statsCards.map((stat, index) => (
                <Card key={index}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      {stat.title}
                    </CardTitle>
                    <div className={`${stat.color} p-2 rounded-full text-white`}>
                      {stat.icon}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stat.value}</div>
                    <p className="text-xs text-gray-500">{stat.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          
          {/* 可用报表列表 */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">{t("reports.available_reports")}</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 报表卡片 1: 当前库存报表 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileSpreadsheet className="h-5 w-5" />
                    {t("reports.current_inventory_report")}
                  </CardTitle>
                  <CardDescription>
                    {t("reports.current_inventory_description")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex justify-end">
                  <InventoryReportExport 
                    warehouseOptions={warehouses}
                    categoryOptions={productCategories}
                    triggerText={t("reports.generate_report")}
                  />
                </CardContent>
              </Card>
              
              {/* 报表卡片 2: 库存变动报表 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    {t("reports.inventory_movement_report")}
                  </CardTitle>
                  <CardDescription>
                    {t("reports.inventory_movement_description")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex justify-end">
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={() => {
                      const reportExport = document.getElementById('movement-report-export');
                      if (reportExport) {
                        (reportExport as HTMLButtonElement).click();
                      }
                    }}
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    {t("reports.generate_report")}
                  </Button>
                  
                  {/* 隐藏的导出组件，预设为库存变动报表 */}
                  <div className="hidden">
                    <InventoryReportExport 
                      warehouseOptions={warehouses}
                      categoryOptions={productCategories}
                      triggerText=""
                    />
                  </div>
                </CardContent>
              </Card>
              
              {/* 报表卡片 3: 库存汇总报表 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    {t("reports.inventory_summary_report")}
                  </CardTitle>
                  <CardDescription>
                    {t("reports.inventory_summary_description")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex justify-end">
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={() => {
                      const reportExport = document.getElementById('summary-report-export');
                      if (reportExport) {
                        (reportExport as HTMLButtonElement).click();
                      }
                    }}
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    {t("reports.generate_report")}
                  </Button>
                  
                  {/* 隐藏的导出组件，预设为库存汇总报表 */}
                  <div className="hidden">
                    <InventoryReportExport 
                      warehouseOptions={warehouses}
                      categoryOptions={productCategories}
                      triggerText=""
                    />
                  </div>
                </CardContent>
              </Card>
              
              {/* 报表卡片 4: 库存预警报表 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Server className="h-5 w-5" />
                    {t("reports.low_stock_report")}
                  </CardTitle>
                  <CardDescription>
                    {t("reports.low_stock_description")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex justify-end">
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={() => {
                      const reportExport = document.getElementById('lowstock-report-export');
                      if (reportExport) {
                        (reportExport as HTMLButtonElement).click();
                      }
                    }}
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    {t("reports.generate_report")}
                  </Button>
                  
                  {/* 隐藏的导出组件，预设为库存预警报表 */}
                  <div className="hidden">
                    <InventoryReportExport 
                      warehouseOptions={warehouses}
                      categoryOptions={productCategories}
                      triggerText=""
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
        
        {/* 库存变动标签内容 */}
        <TabsContent value="movement" className="space-y-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">{t("reports.inventory_movement")}</h2>
            <p className="text-gray-500 mb-6">{t("reports.movement_tab_description")}</p>
            
            <div className="flex justify-end">
              <InventoryReportExport 
                warehouseOptions={warehouses}
                categoryOptions={productCategories}
                triggerText={t("reports.generate_movement_report")}
              />
            </div>
          </Card>
        </TabsContent>
        
        {/* 库存状态标签内容 */}
        <TabsContent value="status" className="space-y-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">{t("reports.inventory_status")}</h2>
            <p className="text-gray-500 mb-6">{t("reports.status_tab_description")}</p>
            
            <div className="flex justify-end">
              <InventoryReportExport 
                warehouseOptions={warehouses}
                categoryOptions={productCategories}
                triggerText={t("reports.generate_status_report")}
              />
            </div>
          </Card>
        </TabsContent>
        
        {/* 库存分析标签内容 */}
        <TabsContent value="analysis" className="space-y-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">{t("reports.inventory_analysis")}</h2>
            <p className="text-gray-500 mb-6">{t("reports.analysis_tab_description")}</p>
            
            <div className="flex justify-end">
              <InventoryReportExport 
                warehouseOptions={warehouses}
                categoryOptions={productCategories}
                triggerText={t("reports.generate_analysis_report")}
              />
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}