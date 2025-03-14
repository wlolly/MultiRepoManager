import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import axios from "axios";
// 使用全局toast工具替代hooks
import toast from "../../lib/toast";
import { 
  Plus, Download, Filter, ArrowUpDown, Search, FileUp, 
  FileDown, FileText, FileSpreadsheet, Eye, Truck
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { formatDate } from "@/lib/utils";

// 出库单接口定义
interface OutboundOrder {
  id: number;
  orderNumber: string;
  warehouseId: number;
  totalWeight: number;
  totalVolume: number;
  createdAt: string;
  status: string;
  orderType: string; // 单据类型：销售单、退货出库单、调拨出库单等
  destinationType: string; // 目的地类型：客户、零售商、调拨仓库等
  notes?: string;
  warehouse?: {
    id: number;
    name: string;
    location: string;
  };
  creator?: {
    id: number;
    username: string;
    fullName?: string;
  };
  totalItems: number;
  totalPackages: number;
}

// 数据汇总接口
interface OutboundStats {
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  totalWeight: number;
  totalVolume: number;
  orderTypeDistribution: {
    type: string;
    count: number;
    percentage: number;
  }[];
  destinationTypeDistribution: {
    type: string;
    count: number;
    percentage: number;
  }[];
}

export default function OutboundOrders() {
  const { t } = useTranslation();
  const [_, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [destinationFilter, setDestinationFilter] = useState<string>("");
  const [dateFilter, setDateFilter] = useState<string>("");
  const [warehouseFilter, setWarehouseFilter] = useState<string>("");
  const [view, setView] = useState<"all" | "recent">("all");
  
  // 获取出库单列表
  const { data: orders = [], isLoading: isLoadingOrders } = useQuery<OutboundOrder[]>({
    queryKey: ["/api/outbound-orders", { 
      status: statusFilter, 
      type: typeFilter, 
      destination: destinationFilter,
      date: dateFilter, 
      warehouse: warehouseFilter 
    }],
  });
  
  // 获取出库单统计数据
  const { data: stats, isLoading: isLoadingStats } = useQuery<OutboundStats>({
    queryKey: ["/api/outbound-orders/stats"],
  });
  
  // 获取仓库列表
  const { data: warehouses = [] } = useQuery<{ id: number; name: string }[]>({
    queryKey: ["/api/warehouses"],
  });
  
  // 过滤出库单
  const filteredOrders = orders.filter((order) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        order.orderNumber.toLowerCase().includes(query) ||
        order.warehouse?.name.toLowerCase().includes(query) ||
        order.notes?.toLowerCase().includes(query)
      );
    }
    return true;
  });
  
  // 只展示最近的出库单
  const displayedOrders = view === "recent" 
    ? filteredOrders.slice(0, 10) 
    : filteredOrders;
  
  // 计算总重量和体积
  const totalWeight = filteredOrders.reduce((sum, order) => sum + order.totalWeight, 0);
  const totalVolume = filteredOrders.reduce((sum, order) => sum + order.totalVolume, 0);
  
  // 获取状态标签样式
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'processing':
        return 'secondary';
      case 'cancelled':
        return 'destructive';
      default:
        return 'default';
    }
  };
  
  // 获取订单类型标签样式
  const getOrderTypeBadgeVariant = (orderType: string) => {
    switch (orderType) {
      case 'sale':
        return 'default';
      case 'return':
        return 'outline';
      case 'transfer':
        return 'secondary';
      default:
        return 'default';
    }
  };

  // 获取订单类型的中文名称
  const getOrderTypeName = (orderType: string) => {
    switch (orderType) {
      case 'sale':
        return t('sale_order'); // 销售单
      case 'return':
        return t('return_order'); // 退货单
      case 'transfer':
        return t('transfer_order'); // 调拨单
      default:
        return orderType;
    }
  };

  // 获取目的地类型的中文名称
  const getDestinationTypeName = (destinationType: string) => {
    switch (destinationType) {
      case 'customer':
        return t('customer'); // 客户
      case 'retail':
        return t('retail'); // 零售商
      case 'wholesale':
        return t('wholesale'); // 批发商
      case 'transfer':
        return t('transfer'); // 调拨仓库
      default:
        return destinationType;
    }
  };
  
  // Excel模板下载
  const handleDownloadTemplate = async () => {
    try {
      const response = await axios.get('/api/outbound-orders/template', {
        responseType: 'blob' // 指定响应类型为 blob
      });
      // 创建一个URL对象指向blob
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'outbound_order_template.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      // 释放URL对象
      window.URL.revokeObjectURL(url);
      
      toast.success(t("template_download_success"));
    } catch (error) {
      console.error('Template download error:', error);
      toast.error(t("template_download_failed"));
    }
  };
  
  // 打开导入对话框
  const handleOpenImport = () => {
    // 导入功能实现
    setLocation("/outbound-orders/import");
  };
  
  // 导出为Excel
  const exportToExcel = (id?: number) => {
    if (id) {
      // 导出单个出库单
      window.open(`/api/outbound-orders/${id}/export`, '_blank');
    } else {
      // 导出所有出库单
      let url = `/api/outbound-orders/export`;
      
      // 添加过滤参数
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (typeFilter) params.append('type', typeFilter);
      if (destinationFilter) params.append('destination', destinationFilter);
      if (warehouseFilter) params.append('warehouse', warehouseFilter);
      if (dateFilter) params.append('date', dateFilter);
      if (searchQuery) params.append('search', searchQuery);
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      window.open(url, '_blank');
    }
  };
  
  // 处理创建新出库单
  const handleCreateOrder = () => {
    setLocation("/outbound-orders/new");
  };
  
  // 处理创建带明细的新出库单
  const handleCreateOrderWithItems = () => {
    setLocation("/outbound-orders/new-with-items");
  };
  
  // 处理导航到高级出库单页面
  const handleAdvancedOrder = () => {
    setLocation("/outbound-orders/advanced");
  };
  
  // 处理查看出库单详情
  const handleViewOrder = (id: number) => {
    setLocation(`/outbound-order/${id}`);
  };
  
  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">{t("outbound_orders")}</h1>
          <p className="text-muted-foreground">{t("outbound_orders_description")}</p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={handleAdvancedOrder} variant="default" className="bg-green-600 hover:bg-green-700">
            <Truck className="mr-2 h-4 w-4" />
            {t("advanced_outbound_order") || "高级出库单"}
          </Button>
          <Button onClick={handleCreateOrderWithItems} variant="default">
            <Plus className="mr-2 h-4 w-4" />
            {t("new_outbound_order_with_items")}
          </Button>
          <Button onClick={handleCreateOrder} variant="outline">
            <Plus className="mr-2 h-4 w-4" />
            {t("new_outbound_order")}
          </Button>
        </div>
      </div>
      
      {/* 统计卡片 */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("total_outbound_orders")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalOrders}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("pending_orders")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingOrders}</div>
              <p className="text-xs text-muted-foreground">
                {((stats.pendingOrders / stats.totalOrders) * 100 || 0).toFixed(1)}% {t("of_total")}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("total_weight")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalWeight.toFixed(2)} kg</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("total_volume")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalVolume.toFixed(3)} m³</div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* 订单类型分布 */}
      {stats && stats.orderTypeDistribution && stats.destinationTypeDistribution && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("order_type_distribution")}</CardTitle>
              <CardDescription>{t("order_type_distribution_description")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4">
                {stats.orderTypeDistribution.map((item) => (
                  <div key={item.type} className="flex items-center justify-between p-4 border rounded-md">
                    <div>
                      <Badge variant={getOrderTypeBadgeVariant(item.type)}>
                        {getOrderTypeName(item.type)}
                      </Badge>
                      <p className="text-2xl font-bold mt-2">{item.count}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">{t("percentage")}</p>
                      <p className="text-lg font-semibold">{item.percentage.toFixed(1)}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>{t("destination_type_distribution")}</CardTitle>
              <CardDescription>{t("destination_type_distribution_description")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4">
                {stats.destinationTypeDistribution.map((item) => (
                  <div key={item.type} className="flex items-center justify-between p-4 border rounded-md">
                    <div>
                      <Badge variant="outline">
                        {getDestinationTypeName(item.type)}
                      </Badge>
                      <p className="text-2xl font-bold mt-2">{item.count}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">{t("percentage")}</p>
                      <p className="text-lg font-semibold">{item.percentage.toFixed(1)}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* 过滤和搜索 */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex items-center space-x-2 flex-1">
          <Input
            placeholder={t("search_orders")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-sm"
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="mr-2 h-4 w-4" />
                {t("filter_status")}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[200px]">
              <DropdownMenuCheckboxItem
                checked={statusFilter === ""}
                onCheckedChange={() => setStatusFilter("")}
              >
                {t("all_statuses")}
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={statusFilter === "pending"}
                onCheckedChange={() => setStatusFilter("pending")}
              >
                {t("pending")}
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={statusFilter === "processing"}
                onCheckedChange={() => setStatusFilter("processing")}
              >
                {t("processing")}
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={statusFilter === "completed"}
                onCheckedChange={() => setStatusFilter("completed")}
              >
                {t("completed")}
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={statusFilter === "cancelled"}
                onCheckedChange={() => setStatusFilter("cancelled")}
              >
                {t("cancelled")}
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="mr-2 h-4 w-4" />
                {t("filter_type")}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[200px]">
              <DropdownMenuCheckboxItem
                checked={typeFilter === ""}
                onCheckedChange={() => setTypeFilter("")}
              >
                {t("all_types")}
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={typeFilter === "sale"}
                onCheckedChange={() => setTypeFilter("sale")}
              >
                {t("sale_order")}
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={typeFilter === "return"}
                onCheckedChange={() => setTypeFilter("return")}
              >
                {t("return_order")}
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={typeFilter === "transfer"}
                onCheckedChange={() => setTypeFilter("transfer")}
              >
                {t("transfer_order")}
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="mr-2 h-4 w-4" />
                {t("filter_destination")}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[200px]">
              <DropdownMenuCheckboxItem
                checked={destinationFilter === ""}
                onCheckedChange={() => setDestinationFilter("")}
              >
                {t("all_destinations")}
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={destinationFilter === "customer"}
                onCheckedChange={() => setDestinationFilter("customer")}
              >
                {t("customer")}
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={destinationFilter === "retail"}
                onCheckedChange={() => setDestinationFilter("retail")}
              >
                {t("retail")}
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={destinationFilter === "wholesale"}
                onCheckedChange={() => setDestinationFilter("wholesale")}
              >
                {t("wholesale")}
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={destinationFilter === "transfer"}
                onCheckedChange={() => setDestinationFilter("transfer")}
              >
                {t("transfer")}
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Excel功能按钮 - 使用共通组件 */}
          <div className="bg-accent/10 p-2 rounded-md flex items-center space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleDownloadTemplate}
              title={t("download_template_tooltip")}
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              {t("download_template")}
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleOpenImport}
              title={t("import_from_excel_tooltip")}
            >
              <FileUp className="mr-2 h-4 w-4" />
              {t("import_from_excel")}
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => exportToExcel()}
              title={t("export_to_excel_tooltip")}
            >
              <FileDown className="mr-2 h-4 w-4" />
              {t("export_to_excel")}
            </Button>
          </div>
          
          <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t("all_warehouses")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">{t("all_warehouses")}</SelectItem>
              {warehouses.map((warehouse) => (
                <SelectItem key={warehouse.id} value={warehouse.id.toString()}>
                  {warehouse.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t("date_range")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">{t("all_time")}</SelectItem>
              <SelectItem value="today">{t("today")}</SelectItem>
              <SelectItem value="week">{t("this_week")}</SelectItem>
              <SelectItem value="month">{t("this_month")}</SelectItem>
              <SelectItem value="year">{t("this_year")}</SelectItem>
            </SelectContent>
          </Select>
          

        </div>
      </div>
      
      {/* 数据视图选择 */}
      <Tabs defaultValue="all" value={view} onValueChange={(value) => setView(value as "all" | "recent")} className="mb-6">
        <TabsList>
          <TabsTrigger value="all">{t("all_orders")}</TabsTrigger>
          <TabsTrigger value="recent">{t("recent_orders")}</TabsTrigger>
        </TabsList>
      </Tabs>
      
      {/* 出库单列表 */}
      <Card>
        <CardHeader>
          <CardTitle>{t("outbound_orders_list")}</CardTitle>
          <CardDescription>
            {t("found_count_items", { count: displayedOrders.length })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingOrders ? (
            <div className="flex items-center justify-center h-[200px]">
              <p>{t("loading")}...</p>
            </div>
          ) : displayedOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[200px] text-center">
              <p className="text-muted-foreground mb-2">{t("no_orders_found")}</p>
              <div className="flex space-x-2">
                <Button variant="default" size="sm" onClick={handleAdvancedOrder} className="bg-green-600 hover:bg-green-700">
                  <Truck className="mr-2 h-4 w-4" />
                  {t("try_advanced_outbound") || "尝试高级出库单"}
                </Button>
                <Button variant="outline" size="sm" onClick={handleCreateOrder}>
                  <Plus className="mr-2 h-4 w-4" />
                  {t("create_first_order")}
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("order_number")}</TableHead>
                    <TableHead>{t("warehouse")}</TableHead>
                    <TableHead>{t("type")}</TableHead>
                    <TableHead>{t("destination")}</TableHead>
                    <TableHead>{t("status")}</TableHead>
                    <TableHead className="text-right">{t("items")}</TableHead>
                    <TableHead className="text-right">{t("packages")}</TableHead>
                    <TableHead className="text-right">{t("weight")}</TableHead>
                    <TableHead className="text-right">{t("volume")}</TableHead>
                    <TableHead>{t("created_at")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedOrders.map((order) => (
                    <TableRow 
                      key={order.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleViewOrder(order.id)}
                    >
                      <TableCell className="font-medium">{order.orderNumber}</TableCell>
                      <TableCell>{order.warehouse?.name || `ID: ${order.warehouseId}`}</TableCell>
                      <TableCell>
                        <Badge variant={getOrderTypeBadgeVariant(order.orderType)}>
                          {getOrderTypeName(order.orderType)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {getDestinationTypeName(order.destinationType)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(order.status)}>
                          {t(order.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{order.totalItems}</TableCell>
                      <TableCell className="text-right">{order.totalPackages}</TableCell>
                      <TableCell className="text-right">{order.totalWeight.toFixed(2)} kg</TableCell>
                      <TableCell className="text-right">{order.totalVolume.toFixed(3)} m³</TableCell>
                      <TableCell>{formatDate(order.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <div className="text-sm text-muted-foreground">
            {searchQuery && filteredOrders.length > 0 && 
              t("showing_filtered_results", { count: filteredOrders.length })}
          </div>
          <div className="text-sm text-muted-foreground">
            {filteredOrders.length > 0 && (
              <>
                {t("current_page_total")}: {formatDate(new Date())}
                <br />
                {t("weight_volume_total")}: {totalWeight.toFixed(2)} kg / {totalVolume.toFixed(3)} m³
              </>
            )}
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}