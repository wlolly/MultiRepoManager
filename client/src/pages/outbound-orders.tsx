import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";

interface OutboundOrder {
  id: number;
  orderNumber: string;
  warehouseId: number;
  totalWeight: number;
  totalVolume: number;
  createdBy: number;
  createdAt: string;
  status: string;
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
  items?: OutboundOrderItem[];
}

interface OutboundOrderItem {
  id: number;
  outboundOrderId: number;
  productId: number;
  quantity: number;
  weight: number;
  volume: number;
  product?: {
    id: number;
    name: string;
    barcode: string;
    category: string;
  };
}

interface Warehouse {
  id: number;
  name: string;
  location: string;
}

export default function OutboundOrders() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [warehouseFilter, setWarehouseFilter] = useState<string>("");

  // 查询出库单列表
  const { data: outboundOrders = [], isLoading: isLoadingOrders, refetch: refetchOrders } = useQuery<OutboundOrder[]>({
    queryKey: ["/api/outbound-orders", { status: statusFilter, warehouseId: warehouseFilter }],
  });

  // 查询仓库列表（用于过滤）
  const { data: warehouses = [] } = useQuery<Warehouse[]>({
    queryKey: ["/api/warehouses"],
  });

  // 过滤出库单
  const filteredOrders = outboundOrders.filter((order) => {
    return order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // 导出到Excel
  const exportToExcel = () => {
    const dataToExport = filteredOrders.map((order) => ({
      [t("order_number")]: order.orderNumber,
      [t("warehouse")]: order.warehouse?.name || '',
      [t("total_weight")]: order.totalWeight,
      [t("total_volume")]: order.totalVolume,
      [t("status")]: t(order.status),
      [t("created_at")]: formatDate(order.createdAt),
      [t("notes")]: order.notes || ''
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "OutboundOrders");
    XLSX.writeFile(wb, "outbound-orders.xlsx");

    toast({
      title: t("export_success"),
      description: t("file_saved"),
    });
  };

  // 获取状态徽章颜色
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 hover:bg-yellow-200";
      case "completed":
        return "bg-green-100 text-green-800 hover:bg-green-200";
      case "cancelled":
        return "bg-red-100 text-red-800 hover:bg-red-200";
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-200";
    }
  };

  return (
    <div className="container mx-auto py-6 px-4 md:px-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">{t("outbound_orders")}</h1>
        <div className="flex space-x-3">
          <Link href="/outbound-orders/new">
            <Button>
              <i className="ri-add-line mr-2"></i> {t("create_outbound_order")}
            </Button>
          </Link>
          <Button variant="outline" onClick={exportToExcel}>
            <i className="ri-file-excel-line mr-2"></i> {t("export_to_excel")}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="all" className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 space-y-4 md:space-y-0">
          <TabsList>
            <TabsTrigger value="all" onClick={() => setStatusFilter("")}>
              {t("all_orders")}
            </TabsTrigger>
            <TabsTrigger value="pending" onClick={() => setStatusFilter("pending")}>
              {t("pending")}
            </TabsTrigger>
            <TabsTrigger value="completed" onClick={() => setStatusFilter("completed")}>
              {t("completed")}
            </TabsTrigger>
            <TabsTrigger value="cancelled" onClick={() => setStatusFilter("cancelled")}>
              {t("cancelled")}
            </TabsTrigger>
          </TabsList>

          <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-2">
            <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder={t("select_warehouse")} />
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
            <Input 
              placeholder={t("search_by_order_number")} 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full md:w-[300px]"
            />
          </div>
        </div>

        <TabsContent value="all" className="mt-0">
          <Card>
            <CardHeader className="pb-1">
              <CardTitle>{t("outbound_orders")}</CardTitle>
              <CardDescription>
                {t("outbound_orders_description")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingOrders ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
                </div>
              ) : filteredOrders.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("order_number")}</TableHead>
                        <TableHead>{t("warehouse")}</TableHead>
                        <TableHead>{t("total_weight")}</TableHead>
                        <TableHead>{t("total_volume")}</TableHead>
                        <TableHead>{t("status")}</TableHead>
                        <TableHead>{t("created_at")}</TableHead>
                        <TableHead>{t("actions")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredOrders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-medium">{order.orderNumber}</TableCell>
                          <TableCell>{order.warehouse?.name || `-`}</TableCell>
                          <TableCell>{order.totalWeight} kg</TableCell>
                          <TableCell>{order.totalVolume} m³</TableCell>
                          <TableCell>
                            <Badge className={getStatusBadgeColor(order.status)}>
                              {t(order.status)}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatDate(order.createdAt)}</TableCell>
                          <TableCell>
                            <Link href={`/outbound-orders/${order.id}`}>
                              <Button variant="ghost" size="sm">
                                <i className="ri-eye-line mr-1"></i> {t("view")}
                              </Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-10">
                  <i className="ri-inbox-line text-5xl text-gray-300 mb-3"></i>
                  <p className="text-gray-500">{t("no_outbound_orders_found")}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending" className="mt-0">
          <Card>
            <CardHeader className="pb-1">
              <CardTitle>{t("pending_outbound_orders")}</CardTitle>
              <CardDescription>
                {t("pending_outbound_orders_description")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* 内容与 "all" Tab 相同，由状态过滤器控制 */}
              {/* 使用上面相同的表格代码，避免重复 */}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="completed" className="mt-0">
          <Card>
            <CardHeader className="pb-1">
              <CardTitle>{t("completed_outbound_orders")}</CardTitle>
              <CardDescription>
                {t("completed_outbound_orders_description")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* 内容与 "all" Tab 相同，由状态过滤器控制 */}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cancelled" className="mt-0">
          <Card>
            <CardHeader className="pb-1">
              <CardTitle>{t("cancelled_outbound_orders")}</CardTitle>
              <CardDescription>
                {t("cancelled_outbound_orders_description")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* 内容与 "all" Tab 相同，由状态过滤器控制 */}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}