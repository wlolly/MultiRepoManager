import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { MixerHorizontalIcon, PlusIcon, DownloadIcon, UploadIcon } from "@radix-ui/react-icons";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableRow, 
  TableHead, 
  TableCell 
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { toast } from "@/lib/toast";
import * as XLSX from 'xlsx';

// 入库单接口定义
interface InboundOrder {
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
  items?: InboundOrderItem[];
}

// 入库单明细接口定义
interface InboundOrderItem {
  id: number;
  inboundOrderId: number;
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

// 仓库接口定义
interface Warehouse {
  id: number;
  name: string;
  location: string;
}

export default function InboundOrders() {
  const { t } = useTranslation();

  const [searchQuery, setSearchQuery] = useState("");
  const [warehouseFilter, setWarehouseFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  // 获取入库单数据
  const { data: inboundOrders = [], isLoading: isLoadingOrders } = useQuery<InboundOrder[]>({
    queryKey: ["/api/inbound-orders"],
  });
  
  // 获取仓库数据
  const { data: warehouses = [], isLoading: isLoadingWarehouses } = useQuery<Warehouse[]>({
    queryKey: ["/api/warehouses"],
  });
  
  // 导出Excel功能
  const exportToExcel = () => {
    // 筛选数据
    const filteredData = inboundOrders
      .filter(order => 
        (warehouseFilter === "all" || order.warehouseId === Number(warehouseFilter)) &&
        (statusFilter === "all" || order.status === statusFilter) &&
        (searchQuery === "" || 
          order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (order.warehouse?.name.toLowerCase().includes(searchQuery.toLowerCase())))
      )
      .map(order => ({
        [t('order_number')]: order.orderNumber,
        [t('warehouse')]: order.warehouse?.name,
        [t('status')]: t(order.status),
        [t('total_weight')]: order.totalWeight,
        [t('total_volume')]: order.totalVolume,
        [t('created_at')]: formatDate(new Date(order.createdAt)),
        [t('notes')]: order.notes || '',
      }));
    
    // 创建工作簿和工作表
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(filteredData);
    
    // 添加工作表到工作簿
    XLSX.utils.book_append_sheet(wb, ws, t('inbound_orders'));
    
    // 导出Excel文件
    XLSX.writeFile(wb, `${t('inbound_orders')}_${new Date().toISOString().split('T')[0]}.xlsx`);
    
    toast.success(t('export_success') + ": " + t('file_saved_description'));
  };
  
  // 导入Excel功能
  const importFromExcel = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setSelectedFile(file);
  };
  
  const processExcelImport = async () => {
    if (!selectedFile) return;
    
    // 读取Excel文件
    const reader = new FileReader();
    reader.onload = async (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      
      // 获取第一个工作表
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      // 将工作表转换为JSON
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      
      try {
        // 上传数据到服务器
        const response = await fetch('/api/inbound-orders/import', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(jsonData),
        });
        
        if (response.ok) {
          toast.success(t('import_success') + ": " + t('data_imported_description'));
          // 刷新数据
          // queryClient.invalidateQueries({queryKey: ["/api/inbound-orders"]});
        } else {
          const error = await response.json();
          toast.error(t('import_failed') + ": " + (error.message || t('import_failed_description')));
        }
      } catch (error) {
        toast.error(t('import_failed') + ": " + ((error as Error).message || t('import_failed_description')));
      }
      
      // 清除选择的文件
      setSelectedFile(null);
    };
    
    reader.readAsArrayBuffer(selectedFile);
  };
  
  // 根据筛选条件过滤数据
  const filteredOrders = inboundOrders.filter(order => 
    (warehouseFilter === "all" || order.warehouseId === Number(warehouseFilter)) &&
    (statusFilter === "all" || order.status === statusFilter) &&
    (searchQuery === "" || 
      order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.warehouse?.name.toLowerCase().includes(searchQuery.toLowerCase())))
  );
  
  // 状态徽章颜色映射
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'pending':
        return "secondary";
      case 'processing':
        return "default";
      case 'completed':
        return "success";
      case 'cancelled':
        return "destructive";
      default:
        return "outline";
    }
  };
  
  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('inbound_orders')}</h1>
          <p className="text-muted-foreground">{t('manage_inbound_orders')}</p>
        </div>
        <div className="flex items-center gap-4">
          {/* 导入Excel按钮 */}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <UploadIcon className="mr-2 h-4 w-4" />
                {t('import')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('import_inbound_orders')}</DialogTitle>
                <DialogDescription>
                  {t('import_excel_description')}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div>
                  <Label htmlFor="excel-file">{t('select_file')}</Label>
                  <Input 
                    id="excel-file" 
                    type="file" 
                    accept=".xlsx, .xls" 
                    onChange={importFromExcel} 
                    className="mt-2"
                  />
                </div>
                {selectedFile && (
                  <div className="text-sm">
                    {t('selected_file')}: {selectedFile.name}
                  </div>
                )}
              </div>
              <div className="flex justify-end">
                <Button onClick={processExcelImport} disabled={!selectedFile}>
                  {t('process_import')}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          
          {/* 导出Excel按钮 */}
          <Button variant="outline" size="sm" onClick={exportToExcel}>
            <DownloadIcon className="mr-2 h-4 w-4" />
            {t('export')}
          </Button>
          
          {/* 创建入库单按钮 */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>
                <PlusIcon className="mr-2 h-4 w-4" />
                {t('new_inbound_order')}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem asChild>
                <Link href="/inbound-orders/new">
                  {t('simple_inbound_order')}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/inbound-orders/new-with-items">
                  {t('inbound_order_with_items')}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/inbound-orders/new-multi">
                  {t('multi_item_inbound_order')}
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      {/* 筛选器和搜索 */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle>{t('filter_and_search')}</CardTitle>
          <CardDescription>
            {t('filter_orders_description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <Label htmlFor="warehouse-filter">{t('warehouse')}</Label>
              <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
                <SelectTrigger id="warehouse-filter" className="mt-1">
                  <SelectValue placeholder={t('all_warehouses')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('all_warehouses')}</SelectItem>
                  {warehouses.map((warehouse) => (
                    <SelectItem key={warehouse.id} value={warehouse.id.toString()}>
                      {warehouse.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex-1 min-w-[200px]">
              <Label htmlFor="status-filter">{t('status')}</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger id="status-filter" className="mt-1">
                  <SelectValue placeholder={t('all_statuses')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('all_statuses')}</SelectItem>
                  <SelectItem value="pending">{t('pending')}</SelectItem>
                  <SelectItem value="processing">{t('processing')}</SelectItem>
                  <SelectItem value="completed">{t('completed')}</SelectItem>
                  <SelectItem value="cancelled">{t('cancelled')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex-[2] min-w-[300px]">
              <Label htmlFor="search">{t('search')}</Label>
              <Input
                id="search"
                placeholder={t('search_inbound_orders')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* 入库单列表 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>{t('inbound_orders_list')}</CardTitle>
          <CardDescription>
            {t('total_orders')}: {filteredOrders.length}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingOrders || isLoadingWarehouses ? (
            <div className="flex justify-center items-center h-40">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-muted-foreground">{t('no_inbound_orders')}</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('order_number')}</TableHead>
                    <TableHead>{t('warehouse')}</TableHead>
                    <TableHead>{t('status')}</TableHead>
                    <TableHead>{t('total_weight')}</TableHead>
                    <TableHead>{t('total_volume')}</TableHead>
                    <TableHead>{t('created_at')}</TableHead>
                    <TableHead className="text-right">{t('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">
                        <Link href={`/inbound-order/${order.id}`} className="hover:underline text-blue-600">
                          {order.orderNumber}
                        </Link>
                      </TableCell>
                      <TableCell>{order.warehouse?.name}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(order.status)}>
                          {t(order.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>{order.totalWeight} kg</TableCell>
                      <TableCell>{order.totalVolume} m³</TableCell>
                      <TableCell>{formatDate(new Date(order.createdAt))}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MixerHorizontalIcon className="h-4 w-4" />
                              <span className="sr-only">{t('open_menu')}</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/inbound-order/${order.id}`}>
                                {t('view_details')}
                              </Link>
                            </DropdownMenuItem>
                            {order.status === 'pending' && (
                              <DropdownMenuItem asChild>
                                <Link href={`/inbound-order/${order.id}`}>
                                  {t('edit')}
                                </Link>
                              </DropdownMenuItem>
                            )}
                            {(order.status === 'pending' || order.status === 'processing') && (
                              <DropdownMenuItem asChild>
                                <Link href={`/inbound-order/${order.id}`}>
                                  {t('process')}
                                </Link>
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}