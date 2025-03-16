import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { 
  Plus, Download, Filter, ArrowUpDown, Search, FileUp, 
  FileDown, RefreshCw, Calendar, Truck, Warehouse, ClipboardList
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/utils";

// 导入自定义组件
import { ExportTransferDialog } from "@/components/warehouse-transfers/ExportTransferDialog";
import { ImportTransferDialog } from "@/components/warehouse-transfers/ImportTransferDialog";

// 调拨单接口定义
interface WarehouseTransfer {
  id: number;
  referenceNumber: string;
  sourceWarehouseId: number;
  targetWarehouseId: number;
  createdAt: string;
  status: string;
  totalItems: number;
  totalWeight: number;
  totalVolume: number;
  totalPackages: number;
  createdBy: number;
  notes?: string;
  sourceWarehouse: {
    id: number;
    name: string;
    location: string;
  };
  targetWarehouse: {
    id: number;
    name: string;
    location: string;
  };
  creator: {
    id: number;
    username: string;
    fullName?: string;
  };
  outboundOrder?: {
    id: number;
    orderNumber: string;
  };
  inboundOrder?: {
    id: number;
    orderNumber: string;
  };
}

// 数据汇总接口
interface TransferStats {
  totalTransfers: number;
  pendingTransfers: number;
  completedTransfers: number;
  totalWeight: number;
  totalVolume: number;
  recentTransfers: number;
}

export default function OptimizedWarehouseTransfers() {
  const { t } = useTranslation();
  const [_, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // 状态管理
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [warehouseFilter, setWarehouseFilter] = useState<string>("all");
  const [view, setView] = useState<"all" | "pending" | "recent">("all");
  
  // 多选功能相关状态
  const [selectedTransfers, setSelectedTransfers] = useState<number[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  
  // 对话框状态
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  
  // 获取调拨单列表
  const { 
    data: transfers = [], 
    isLoading: isLoadingTransfers, 
    isError: isErrorTransfers,
    refetch: refetchTransfers 
  } = useQuery<WarehouseTransfer[]>({
    queryKey: ["/api/warehouse-transfers", { status: statusFilter, date: dateFilter, warehouse: warehouseFilter }],
  });
  
  // 获取调拨单统计数据
  const { 
    data: stats,
    isLoading: isLoadingStats,
    isError: isErrorStats 
  } = useQuery<TransferStats>({
    queryKey: ["/api/warehouse-transfers/stats"],
  });
  
  // 获取仓库列表
  const { 
    data: warehouses = [], 
    isLoading: isLoadingWarehouses 
  } = useQuery<{ id: number; name: string; location: string }[]>({
    queryKey: ["/api/warehouses"],
  });
  
  // 处理全选/取消全选
  useEffect(() => {
    if (selectAll) {
      setSelectedTransfers(filteredTransfers.map(transfer => transfer.id));
    } else {
      setSelectedTransfers([]);
    }
  }, [selectAll]);
  
  // 当过滤条件变化时，取消全选
  useEffect(() => {
    setSelectAll(false);
    setSelectedTransfers([]);
  }, [statusFilter, dateFilter, warehouseFilter, searchQuery, view]);
  
  // 过滤调拨单
  const filteredTransfers = transfers.filter((transfer) => {
    // 状态过滤
    if (statusFilter !== "all" && transfer.status !== statusFilter) {
      return false;
    }
    
    // 仓库过滤
    if (warehouseFilter !== "all") {
      const warehouseId = parseInt(warehouseFilter);
      if (transfer.sourceWarehouseId !== warehouseId && transfer.targetWarehouseId !== warehouseId) {
        return false;
      }
    }
    
    // 日期过滤
    if (dateFilter !== "all") {
      const transferDate = new Date(transfer.createdAt);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      const thisWeekStart = new Date(today);
      thisWeekStart.setDate(thisWeekStart.getDate() - thisWeekStart.getDay());
      
      const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      
      if (dateFilter === 'today' && transferDate < today) {
        return false;
      } else if (dateFilter === 'yesterday' && (transferDate < yesterday || transferDate >= today)) {
        return false;
      } else if (dateFilter === 'this-week' && transferDate < thisWeekStart) {
        return false;
      } else if (dateFilter === 'this-month' && transferDate < thisMonthStart) {
        return false;
      }
    }
    
    // 搜索查询
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        transfer.referenceNumber.toLowerCase().includes(query) ||
        transfer.sourceWarehouse.name.toLowerCase().includes(query) ||
        transfer.targetWarehouse.name.toLowerCase().includes(query) ||
        (transfer.notes && transfer.notes.toLowerCase().includes(query))
      );
    }
    
    return true;
  });
  
  // 根据视图选择不同的数据集
  const getViewTransfers = () => {
    if (view === "pending") {
      return filteredTransfers.filter(transfer => transfer.status === "pending");
    } else if (view === "recent") {
      return filteredTransfers.slice(0, 10);
    }
    return filteredTransfers;
  };
  
  // 显示的调拨单列表
  const displayedTransfers = getViewTransfers();
  
  // 计算选中的调拨单总数
  const selectedCount = selectedTransfers.length;
  
  // 计算总重量和体积
  const totalWeight = filteredTransfers.reduce((sum, transfer) => sum + Number(transfer.totalWeight), 0);
  const totalVolume = filteredTransfers.reduce((sum, transfer) => sum + Number(transfer.totalVolume), 0);
  
  // 获取状态标签样式
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'processing':
        return 'secondary';
      case 'pending':
        return 'outline';
      case 'cancelled':
        return 'destructive';
      default:
        return 'default';
    }
  };
  
  // 获取状态文本
  const getStatusText = (status: string) => {
    return t(`warehouseTransfer.status.${status}`);
  };
  
  // 处理排序
  const handleSort = (column: string) => {
    // 此处可实现排序逻辑
    // 使用useToast钩子返回的toast函数
    toast({
      title: t("common.not_implemented"),
      description: t("common.feature_coming_soon"),
    });
  };
  
  // 处理查看调拨单
  const handleViewTransfer = (id: number) => {
    navigate(`/warehouse-transfers/${id}`);
  };
  
  // 处理创建新调拨单
  const handleCreateTransfer = () => {
    navigate("/warehouse-transfers/new");
  };
  
  // 处理多选框变更
  const handleCheckboxChange = (id: number, checked: boolean) => {
    if (checked) {
      setSelectedTransfers(prev => [...prev, id]);
    } else {
      setSelectedTransfers(prev => prev.filter(transferId => transferId !== id));
    }
  };
  
  // 处理刷新数据
  const handleRefresh = () => {
    // 刷新数据
    queryClient.invalidateQueries({
      queryKey: ["/api/warehouse-transfers"],
    });
    queryClient.invalidateQueries({
      queryKey: ["/api/warehouse-transfers/stats"],
    });
    
    // 使用useToast钩子返回的toast函数
    toast({
      title: t("common.refreshing"),
      description: t("warehouseTransfer.refreshing_data"),
    });
  };
  
  // 统计卡片数据
  const statCards = stats ? [
    {
      title: t("warehouseTransfer.total_transfers"),
      value: stats.totalTransfers,
      icon: <ClipboardList className="h-4 w-4" />,
      color: "bg-blue-500"
    },
    {
      title: t("warehouseTransfer.pending_transfers"),
      value: stats.pendingTransfers,
      icon: <Truck className="h-4 w-4" />,
      color: "bg-yellow-500"
    },
    {
      title: t("warehouseTransfer.completed_transfers"),
      value: stats.completedTransfers,
      icon: <Warehouse className="h-4 w-4" />,
      color: "bg-green-500"
    },
    {
      title: t("warehouseTransfer.total_weight"),
      value: `${stats.totalWeight.toLocaleString()} kg`,
      icon: <ArrowUpDown className="h-4 w-4" />,
      color: "bg-purple-500"
    }
  ] : [];
  
  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* 页面标题和操作按钮 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t("warehouseTransfer.warehouse_transfers")}</h1>
          <p className="text-gray-500">
            {t("warehouseTransfer.manage_warehouse_transfers")}
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleRefresh}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            {t("common.refresh")}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setImportDialogOpen(true)}
          >
            <FileUp className="h-4 w-4 mr-2" />
            {t("warehouseTransfer.import")}
          </Button>
          
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setExportDialogOpen(true)}
            disabled={selectedCount === 0}
          >
            <FileDown className="h-4 w-4 mr-2" />
            {selectedCount > 0
              ? t("warehouseTransfer.export_selected", { count: selectedCount })
              : t("warehouseTransfer.export")}
          </Button>
          
          <Button
            size="sm"
            onClick={handleCreateTransfer}
          >
            <Plus className="h-4 w-4 mr-2" />
            {t("warehouseTransfer.create_transfer")}
          </Button>
        </div>
      </div>
      
      {/* 统计卡片 */}
      {isLoadingStats ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : isErrorStats ? (
        <div className="bg-red-50 p-4 rounded-md text-red-500">
          {t("warehouseTransfer.stats_error")}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat, index) => (
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
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      {/* 过滤器和搜索 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="flex items-center space-x-2">
          <Input
            placeholder={t("warehouseTransfer.search_placeholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
            prefix={<Search className="h-4 w-4 text-gray-400" />}
          />
        </div>
        
        <div className="flex items-center space-x-2">
          <Label className="whitespace-nowrap">{t("warehouseTransfer.status")}:</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder={t("warehouseTransfer.all_statuses")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("warehouseTransfer.all_statuses")}</SelectItem>
              <SelectItem value="pending">{t("warehouseTransfer.status.pending")}</SelectItem>
              <SelectItem value="processing">{t("warehouseTransfer.status.processing")}</SelectItem>
              <SelectItem value="completed">{t("warehouseTransfer.status.completed")}</SelectItem>
              <SelectItem value="cancelled">{t("warehouseTransfer.status.cancelled")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center space-x-2">
          <Label className="whitespace-nowrap">{t("warehouseTransfer.date")}:</Label>
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger>
              <SelectValue placeholder={t("warehouseTransfer.all_dates")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("warehouseTransfer.all_dates")}</SelectItem>
              <SelectItem value="today">{t("warehouseTransfer.today")}</SelectItem>
              <SelectItem value="yesterday">{t("warehouseTransfer.yesterday")}</SelectItem>
              <SelectItem value="this-week">{t("warehouseTransfer.this_week")}</SelectItem>
              <SelectItem value="this-month">{t("warehouseTransfer.this_month")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center space-x-2">
          <Label className="whitespace-nowrap">{t("warehouseTransfer.warehouse")}:</Label>
          <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
            <SelectTrigger>
              <SelectValue placeholder={t("warehouseTransfer.all_warehouses")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("warehouseTransfer.all_warehouses")}</SelectItem>
              {warehouses.map((warehouse) => (
                <SelectItem key={warehouse.id} value={warehouse.id.toString()}>
                  {warehouse.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {/* 视图选项卡 */}
      <Tabs defaultValue="all" value={view} onValueChange={(value) => setView(value as "all" | "pending" | "recent")}>
        <TabsList>
          <TabsTrigger value="all">
            {t("warehouseTransfer.all_transfers")}
          </TabsTrigger>
          <TabsTrigger value="pending">
            {t("warehouseTransfer.pending_only")}
          </TabsTrigger>
          <TabsTrigger value="recent">
            {t("warehouseTransfer.recent")}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="mt-4">
          <TransferTable 
            transfers={displayedTransfers}
            isLoading={isLoadingTransfers}
            isError={isErrorTransfers}
            selectedTransfers={selectedTransfers}
            selectAll={selectAll}
            setSelectAll={setSelectAll}
            onCheckboxChange={handleCheckboxChange}
            onViewTransfer={handleViewTransfer}
            warehouses={warehouses}
            t={t}
            getStatusBadgeVariant={getStatusBadgeVariant}
            getStatusText={getStatusText}
          />
        </TabsContent>
        
        <TabsContent value="pending" className="mt-4">
          <TransferTable 
            transfers={displayedTransfers}
            isLoading={isLoadingTransfers}
            isError={isErrorTransfers}
            selectedTransfers={selectedTransfers}
            selectAll={selectAll}
            setSelectAll={setSelectAll}
            onCheckboxChange={handleCheckboxChange}
            onViewTransfer={handleViewTransfer}
            warehouses={warehouses}
            t={t}
            getStatusBadgeVariant={getStatusBadgeVariant}
            getStatusText={getStatusText}
          />
        </TabsContent>
        
        <TabsContent value="recent" className="mt-4">
          <TransferTable 
            transfers={displayedTransfers}
            isLoading={isLoadingTransfers}
            isError={isErrorTransfers}
            selectedTransfers={selectedTransfers}
            selectAll={selectAll}
            setSelectAll={setSelectAll}
            onCheckboxChange={handleCheckboxChange}
            onViewTransfer={handleViewTransfer}
            warehouses={warehouses}
            t={t}
            getStatusBadgeVariant={getStatusBadgeVariant}
            getStatusText={getStatusText}
          />
        </TabsContent>
      </Tabs>
      
      {/* 导出对话框 */}
      <ExportTransferDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        transferIds={selectedTransfers}
        onSuccess={() => {
          // 重置选择
          setSelectedTransfers([]);
          setSelectAll(false);
        }}
      />
      
      {/* 导入对话框 */}
      <ImportTransferDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        warehouses={warehouses}
        onImportSuccess={() => {
          refetchTransfers();
        }}
      />
    </div>
  );
}

// 表格组件
interface TransferTableProps {
  transfers: WarehouseTransfer[];
  isLoading: boolean;
  isError: boolean;
  selectedTransfers: number[];
  selectAll: boolean;
  setSelectAll: (value: boolean) => void;
  onCheckboxChange: (id: number, checked: boolean) => void;
  onViewTransfer: (id: number) => void;
  warehouses: { id: number; name: string }[];
  t: any;
  getStatusBadgeVariant: (status: string) => string;
  getStatusText: (status: string) => string;
}

function TransferTable({
  transfers,
  isLoading,
  isError,
  selectedTransfers,
  selectAll,
  setSelectAll,
  onCheckboxChange,
  onViewTransfer,
  warehouses,
  t,
  getStatusBadgeVariant,
  getStatusText
}: TransferTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }
  
  if (isError) {
    return (
      <div className="bg-red-50 p-4 rounded-md text-red-500">
        {t("warehouseTransfer.load_error")}
      </div>
    );
  }
  
  if (transfers.length === 0) {
    return (
      <div className="text-center py-8 bg-gray-50 rounded-md">
        <p className="text-gray-500">{t("warehouseTransfer.no_transfers_found")}</p>
      </div>
    );
  }
  
  // 提取仓库名称
  const getWarehouseName = (id: number) => {
    const warehouse = warehouses.find(w => w.id === id);
    return warehouse ? warehouse.name : t("warehouseTransfer.unknown_warehouse");
  };
  
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]">
              <Checkbox
                checked={selectAll}
                onCheckedChange={setSelectAll}
                aria-label={t("warehouseTransfer.select_all")}
              />
            </TableHead>
            <TableHead className="w-[180px]">{t("warehouseTransfer.reference_number")}</TableHead>
            <TableHead>{t("warehouseTransfer.source_warehouse")}</TableHead>
            <TableHead>{t("warehouseTransfer.target_warehouse")}</TableHead>
            <TableHead>{t("warehouseTransfer.created_at")}</TableHead>
            <TableHead>{t("warehouseTransfer.status")}</TableHead>
            <TableHead className="text-right">{t("warehouseTransfer.total_items")}</TableHead>
            <TableHead className="text-right">{t("warehouseTransfer.weight_volume")}</TableHead>
            <TableHead className="w-[80px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transfers.map((transfer) => (
            <TableRow 
              key={transfer.id}
              className="cursor-pointer hover:bg-gray-50"
              onClick={() => onViewTransfer(transfer.id)}
            >
              <TableCell onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  checked={selectedTransfers.includes(transfer.id)}
                  onCheckedChange={(checked) => 
                    onCheckboxChange(transfer.id, checked as boolean)
                  }
                  aria-label={t("warehouseTransfer.select_transfer")}
                />
              </TableCell>
              <TableCell className="font-medium">
                {transfer.referenceNumber}
              </TableCell>
              <TableCell>
                {transfer.sourceWarehouse?.name || getWarehouseName(transfer.sourceWarehouseId)}
              </TableCell>
              <TableCell>
                {transfer.targetWarehouse?.name || getWarehouseName(transfer.targetWarehouseId)}
              </TableCell>
              <TableCell>
                {formatDate(transfer.createdAt)}
              </TableCell>
              <TableCell>
                <Badge variant={getStatusBadgeVariant(transfer.status)}>
                  {getStatusText(transfer.status)}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                {transfer.totalItems}
              </TableCell>
              <TableCell className="text-right">
                <div>{transfer.totalWeight} kg</div>
                <div className="text-gray-500 text-xs">{transfer.totalVolume} m³</div>
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="sm">
                      <span className="sr-only">{t("common.open_menu")}</span>
                      <MoreHorizontalIcon className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>{t("common.actions")}</DropdownMenuLabel>
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation();
                      onViewTransfer(transfer.id);
                    }}>
                      {t("common.view")}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        // 导出单个调拨单
                        console.log("Export transfer", transfer.id);
                      }}
                    >
                      {t("warehouseTransfer.export")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// 小组件辅助组件
function MoreHorizontalIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="1" />
      <circle cx="19" cy="12" r="1" />
      <circle cx="5" cy="12" r="1" />
    </svg>
  );
}

function Label({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`text-sm font-medium ${className || ""}`}
      {...props}
    />
  );
}