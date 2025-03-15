import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { 
  Plus, Download, Filter, ArrowUpDown, Search, FileUp, 
  FileDown, FileText, FileSpreadsheet, Eye, Truck, 
  RefreshCw, Check, X, Calendar, FileIcon, AlertCircle,
  Warehouse
} from "lucide-react";
import { Label } from "@/components/ui/label";
import axios from "axios";


import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import toast from "../../lib/toast";
import { ExcelButtons } from "@/components/ExcelButtons";
import { formatDate } from "@/lib/utils";

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

export default function WarehouseTransfers() {
  const { t } = useTranslation();
  const [_, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [dateFilter, setDateFilter] = useState<string>("");
  const [warehouseFilter, setWarehouseFilter] = useState<string>("");
  const [view, setView] = useState<"all" | "recent">("all");
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [selectedTransferId, setSelectedTransferId] = useState<number | null>(null);
  const [actionType, setActionType] = useState<"export" | "view" | "cancel" | "complete">("view");
  
  // 多选功能相关状态
  const [selectedTransfers, setSelectedTransfers] = useState<number[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [multiExportDialogOpen, setMultiExportDialogOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  // 获取调拨单列表
  const { data: transfers = [], isLoading: isLoadingTransfers, refetch: refetchTransfers } = useQuery<WarehouseTransfer[]>({
    queryKey: ["/api/warehouse-transfers", { status: statusFilter, date: dateFilter, warehouse: warehouseFilter }],
  });
  
  // 获取调拨单统计数据
  const { data: stats, isLoading: isLoadingStats } = useQuery<TransferStats>({
    queryKey: ["/api/warehouse-transfers/stats"],
  });
  
  // 获取仓库列表
  const { data: warehouses = [] } = useQuery<{ id: number; name: string }[]>({
    queryKey: ["/api/warehouses"],
  });
  
  // 过滤调拨单
  const filteredTransfers = transfers.filter((transfer) => {
    // 状态过滤
    if (statusFilter && transfer.status !== statusFilter) {
      return false;
    }
    
    // 仓库过滤
    if (warehouseFilter) {
      const warehouseId = parseInt(warehouseFilter);
      if (transfer.sourceWarehouseId !== warehouseId && transfer.targetWarehouseId !== warehouseId) {
        return false;
      }
    }
    
    // 日期过滤
    if (dateFilter) {
      const transferDate = new Date(transfer.createdAt).toLocaleDateString();
      const today = new Date().toLocaleDateString();
      const yesterday = new Date(Date.now() - 86400000).toLocaleDateString();
      const thisWeekStart = new Date(Date.now() - (new Date().getDay() * 86400000)).toLocaleDateString();
      
      if (dateFilter === 'today' && transferDate !== today) {
        return false;
      } else if (dateFilter === 'yesterday' && transferDate !== yesterday) {
        return false;
      } else if (dateFilter === 'this-week') {
        const transferDateTime = new Date(transfer.createdAt).getTime();
        const thisWeekStartTime = new Date(thisWeekStart).getTime();
        if (transferDateTime < thisWeekStartTime) {
          return false;
        }
      }
    }
    
    // 搜索查询
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        transfer.referenceNumber.toLowerCase().includes(query) ||
        transfer.sourceWarehouse.name.toLowerCase().includes(query) ||
        transfer.targetWarehouse.name.toLowerCase().includes(query) ||
        transfer.notes?.toLowerCase().includes(query)
      );
    }
    
    return true;
  });
  
  // 只展示最近的调拨单
  const displayedTransfers = view === "recent" 
    ? filteredTransfers.slice(0, 10) 
    : filteredTransfers;
  
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
      case 'cancelled':
        return 'destructive';
      default:
        return 'default';
    }
  };
  
  // Excel模板下载
  const handleDownloadTemplate = async () => {
    try {
      const response = await axios.get('/api/warehouse-transfers/template', {
        responseType: 'blob' // 指定响应类型为 blob
      });
      // 创建一个URL对象指向blob
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'warehouse_transfer_template.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      // 释放URL对象
      window.URL.revokeObjectURL(url);
      
      toast.success(t("warehouseTransfer.template_download_success"));
    } catch (error) {
      console.error('Template download error:', error);
      toast.error(t("warehouseTransfer.template_download_error"));
    }
  };
  
  // 导出单个调拨单到Excel
  // 批量导出选中的调拨单
  const exportSelectedTransfers = async () => {
    if (selectedTransfers.length === 0) {
      toast({
        title: t("common.warning"),
        description: t("warehouseTransfer.no_transfers_selected"),
        variant: "destructive"
      });
      return;
    }
    
    try {
      // 设置导出中状态
      setIsExporting(true);
      
      // 显示加载提示
      toast({
        title: t("warehouseTransfer.exporting"),
        description: t("warehouseTransfer.preparing_export_file"),
      });
      
      // 发送多选导出请求
      const response = await axios.post('/api/warehouse-transfers/export-selected', 
        { transferIds: selectedTransfers },
        { responseType: 'blob' }
      );
      
      // 创建下载链接
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      // 从响应头获取文件名或使用默认文件名
      const contentDisposition = response.headers['content-disposition'];
      let filename = 'transfers_export.xlsx';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch && filenameMatch.length === 2) filename = filenameMatch[1];
      }
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // 成功提示
      toast({
        title: t("common.success"),
        description: t("warehouseTransfer.export_success"),
      });
      
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: t("common.error"),
        description: t("warehouseTransfer.export_failed"),
        variant: "destructive"
      });
    }
  };

  // 导出单个调拨单
  const exportTransferToExcel = async (transferId: number) => {
    try {
      // 设置导出中状态
      setIsExporting(true);
      
      const response = await axios.get(`/api/warehouse-transfers/${transferId}/export`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      // 尝试从响应头获取文件名
      const contentDisposition = response.headers['content-disposition'];
      let filename = 'transfer_export.xlsx';
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1];
        }
      }
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success(t("warehouseTransfer.transfer_export_success"));
    } catch (error) {
      console.error('Export error:', error);
      toast.error(t("warehouseTransfer.transfer_export_error"));
    } finally {
      // 重置导出状态
      setIsExporting(false);
    }
  };
  
  // 导出所有筛选后的调拨单到Excel（通过后端API调用）
  const exportAllTransfersToExcel = async () => {
    console.log("Exporting all transfers...", filteredTransfers.length);
    
    if (filteredTransfers.length === 0) {
      toast.error(t("warehouseTransfer.no_data_to_export"));
      return;
    }
    
    try {
      // 设置导出中状态
      setIsExporting(true);
      
      console.log("Starting export process...");
      toast.success(t("warehouseTransfer.preparing_export"));
      
      // 构建过滤参数，与当前视图相同的过滤条件
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (warehouseFilter) params.append('warehouseId', warehouseFilter);
      if (dateFilter) params.append('dateFilter', dateFilter);
      if (searchQuery) params.append('query', searchQuery);
      
      // 调用后端API导出Excel
      const response = await axios.get(`/api/warehouse-transfers/export-all?${params.toString()}`, {
        responseType: 'blob'
      });
      
      // 下载文件
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      // 设置文件名称
      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `${t("warehouseTransfer.transfers_export")}_${dateStr}.xlsx`;
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success(t("warehouseTransfer.export_all_success"));
    } catch (error) {
      console.error('Bulk export error:', error);
      toast.error(t("warehouseTransfer.export_all_error"));
    } finally {
      // 重置导出状态
      setIsExporting(false);
    }
  };
  
  // 更新调拨单状态
  const updateTransferStatus = async (transferId: number, status: string) => {
    try {
      await axios.patch(`/api/warehouse-transfers/${transferId}`, { status });
      
      refetchTransfers();
      
      toast.success(t(`warehouseTransfer.transfer_${status}_success`));
    } catch (error) {
      console.error(`Status update error:`, error);
      toast.error(t(`warehouseTransfer.transfer_${status}_error`));
    }
  };
  
  // 处理文件选择变更
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImportFile(e.target.files[0]);
      setImportErrors([]);
      setImportPreview([]);
      
      // 上传文件并获取预览数据
      const formData = new FormData();
      formData.append('file', e.target.files[0]);
      
      axios.post('/api/warehouse-transfers/preview', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      .then(response => {
        if (response.data.items) {
          setImportPreview(response.data.items);
        }
      })
      .catch(error => {
        console.error('Preview error:', error);
        if (error.response && error.response.data && error.response.data.errors) {
          setImportErrors(error.response.data.errors);
        } else {
          setImportErrors([t("warehouseTransfer.file_processing_error")]);
        }
      });
    }
  };
  
  // 处理Excel导入
  const handleImportExcel = async () => {
    if (!importFile) {
      toast.error(t("warehouseTransfer.no_file_selected"));
      return;
    }
    
    if (!sourceWarehouseId) {
      toast.error(t("warehouseTransfer.no_source_warehouse"));
      return;
    }
    
    if (!targetWarehouseId) {
      toast.error(t("warehouseTransfer.no_target_warehouse"));
      return;
    }
    
    // 如果源仓库和目标仓库相同，显示错误
    if (sourceWarehouseId === targetWarehouseId) {
      toast.error(t("warehouseTransfer.same_warehouse_error"));
      return;
    }
    
    try {
      const formData = new FormData();
      formData.append('file', importFile);
      formData.append('sourceWarehouseId', sourceWarehouseId);
      formData.append('targetWarehouseId', targetWarehouseId);
      formData.append('notes', importNotes);
      
      const response = await axios.post('/api/warehouse-transfers/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      if (response.data.id) {
        toast.success(t("warehouseTransfer.transfer_created", { ref: response.data.referenceNumber }));
        
        // 关闭对话框并刷新列表
        setImportDialogOpen(false);
        setSourceWarehouseId("");
        setTargetWarehouseId("");
        setImportFile(null);
        setImportErrors([]);
        setImportPreview([]);
        refetchTransfers();
      }
    } catch (error) {
      console.error('Import error:', error);
      let errorMsg = t("warehouseTransfer.import_failed");
      
      // 添加类型检查和类型断言
      if (
        error && 
        typeof error === 'object' && 
        'response' in error && 
        error.response && 
        typeof error.response === 'object' && 
        'data' in error.response && 
        error.response.data && 
        typeof error.response.data === 'object' && 
        'errors' in error.response.data && 
        Array.isArray(error.response.data.errors)
      ) {
        setImportErrors(error.response.data.errors);
        errorMsg = error.response.data.errors[0] || errorMsg;
      }
      
      toast.error(errorMsg);
    }
  };
  
  // 处理创建新调拨单
  const handleCreateTransfer = () => {
    navigate("/warehouse-transfers/new");
  };
  
  // 处理查看调拨单详情
  const handleViewTransfer = (id: number) => {
    navigate(`/warehouse-transfers/${id}`);
  };
  
  // 打开确认对话框
  const openConfirmDialog = (id: number, action: "export" | "view" | "cancel" | "complete") => {
    setSelectedTransferId(id);
    setActionType(action);
    setConfirmDialogOpen(true);
  };
  
  // 确认操作
  const confirmAction = () => {
    if (!selectedTransferId) return;
    
    switch (actionType) {
      case "export":
        exportTransferToExcel(selectedTransferId);
        break;
      case "view":
        handleViewTransfer(selectedTransferId);
        break;
      case "cancel":
        updateTransferStatus(selectedTransferId, "cancelled");
        break;
      case "complete":
        updateTransferStatus(selectedTransferId, "completed");
        break;
    }
    
    setConfirmDialogOpen(false);
    setSelectedTransferId(null);
  };
  
  // 显示导入对话框
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [sourceWarehouseId, setSourceWarehouseId] = useState<string>("");
  const [targetWarehouseId, setTargetWarehouseId] = useState<string>("");
  const [importNotes, setImportNotes] = useState<string>("通过Excel导入创建的调拨单");
  
  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">{t("warehouseTransfer.title")}</h1>
          <p className="text-muted-foreground">{t("warehouseTransfer.subtitle")}</p>
        </div>
        <div className="flex gap-2">
          {/* Excel操作按钮组 */}
          <ExcelButtons 
            onDownloadTemplate={handleDownloadTemplate}
            onImport={() => setImportDialogOpen(true)}
            onExport={() => {
              if (filteredTransfers.length > 0) {
                exportAllTransfersToExcel();
              } else {
                toast.error(t("warehouseTransfer.no_data_to_export"));
              }
            }}
            size="sm"
            tooltips={{
              template: t("warehouseTransfer.download_template_tooltip"),
              import: t("warehouseTransfer.import_tooltip"),
              export: t("warehouseTransfer.export_tooltip")
            }}
          />
          {/* 创建调拨单按钮 */}
          <Button onClick={handleCreateTransfer}>
            <Plus className="mr-2 h-4 w-4" />
            {t("warehouseTransfer.new_warehouse_transfer")}
          </Button>
        </div>
      </div>
      
      {/* 统计卡片 */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("warehouseTransfer.total_transfers")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalTransfers}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("warehouseTransfer.pending_transfers")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingTransfers}</div>
              <p className="text-xs text-muted-foreground">
                {((stats.pendingTransfers / stats.totalTransfers) * 100 || 0).toFixed(1)}% {t("warehouseTransfer.of_total")}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("warehouseTransfer.total_weight")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalWeight.toFixed(2)} kg</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("warehouseTransfer.total_volume")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalVolume.toFixed(3)} m³</div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* 功能解释说明 */}
      <div className="bg-accent/20 p-4 rounded-lg mb-6 flex flex-wrap gap-4 items-center">
        <div className="flex-1">
          <h3 className="text-lg font-medium mb-1">{t("warehouseTransfer.excel_operations")}</h3>
          <p className="text-sm text-muted-foreground">{t("warehouseTransfer.excel_description")}</p>
        </div>
        <div className="flex gap-2">
          <ExcelButtons 
            onDownloadTemplate={handleDownloadTemplate}
            onImport={() => setImportDialogOpen(true)}
            onExport={() => {
              if (filteredTransfers.length > 0) {
                exportAllTransfersToExcel();
              } else {
                toast.error(t("warehouseTransfer.no_data_to_export"));
              }
            }}
            tooltips={{
              template: t("warehouseTransfer.download_template_tooltip"),
              import: t("warehouseTransfer.import_tooltip"),
              export: t("warehouseTransfer.export_tooltip")
            }}
          />
        </div>
      </div>

      {/* 过滤和搜索 */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex items-center space-x-2 flex-1">
          <Input
            placeholder={t("warehouseTransfer.search_transfers")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-sm"
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="mr-2 h-4 w-4" />
                {t("warehouseTransfer.filter")}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[200px]">
              <DropdownMenuCheckboxItem
                checked={statusFilter === ""}
                onCheckedChange={() => setStatusFilter("")}
              >
                {t("warehouseTransfer.all_statuses")}
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={statusFilter === "pending"}
                onCheckedChange={() => setStatusFilter("pending")}
              >
                {t("warehouseTransfer.pending")}
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={statusFilter === "processing"}
                onCheckedChange={() => setStatusFilter("processing")}
              >
                {t("warehouseTransfer.processing")}
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={statusFilter === "completed"}
                onCheckedChange={() => setStatusFilter("completed")}
              >
                {t("warehouseTransfer.completed")}
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={statusFilter === "cancelled"}
                onCheckedChange={() => setStatusFilter("cancelled")}
              >
                {t("warehouseTransfer.cancelled")}
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        <div className="flex items-center space-x-2">
          <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t("warehouseTransfer.all_warehouses")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">{t("warehouseTransfer.all_warehouses")}</SelectItem>
              {warehouses.map((warehouse) => (
                <SelectItem key={warehouse.id} value={warehouse.id.toString()}>
                  {warehouse.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t("warehouseTransfer.date_range")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">{t("warehouseTransfer.all_time")}</SelectItem>
              <SelectItem value="today">{t("warehouseTransfer.today")}</SelectItem>
              <SelectItem value="week">{t("warehouseTransfer.this_week")}</SelectItem>
              <SelectItem value="month">{t("warehouseTransfer.this_month")}</SelectItem>
              <SelectItem value="year">{t("warehouseTransfer.this_year")}</SelectItem>
            </SelectContent>
          </Select>
          
          {/* 单个调拨单导出选项已移至全局Excel按钮 */}
        </div>
      </div>
      
      {/* 数据视图选择 */}
      <Tabs defaultValue="all" value={view} onValueChange={(value) => setView(value as "all" | "recent")} className="mb-6">
        <TabsList>
          <TabsTrigger value="all">{t("warehouseTransfer.all_transfers")}</TabsTrigger>
          <TabsTrigger value="recent">{t("warehouseTransfer.recent_transfers")}</TabsTrigger>
        </TabsList>
      </Tabs>
      
      {/* 调拨单列表 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{t("warehouseTransfer.warehouse_transfers_list")}</CardTitle>
            <CardDescription>
              {t("warehouseTransfer.found_count_items", { count: displayedTransfers.length })}
            </CardDescription>
          </div>
          {selectedTransfers.length > 0 && (
            <Button variant="outline" size="sm" onClick={exportSelectedTransfers}>
              <FileDown className="mr-2 h-4 w-4" />
              {t("warehouseTransfer.export_selected", { count: selectedTransfers.length })}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {isLoadingTransfers ? (
            <div className="flex items-center justify-center h-[200px]">
              <p>{t("warehouseTransfer.loading")}...</p>
            </div>
          ) : displayedTransfers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[200px] text-center">
              <p className="text-muted-foreground mb-2">{t("warehouseTransfer.no_transfers_found")}</p>
              <Button variant="outline" size="sm" onClick={handleCreateTransfer}>
                <Plus className="mr-2 h-4 w-4" />
                {t("warehouseTransfer.create_first_transfer")}
              </Button>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <div className="flex items-center justify-center">
                        <input
                          type="checkbox"
                          checked={selectAll}
                          onChange={(e) => {
                            setSelectAll(e.target.checked);
                            if (e.target.checked) {
                              // 选择所有显示的调拨单
                              setSelectedTransfers(displayedTransfers.map(t => t.id));
                            } else {
                              // 取消所有选择
                              setSelectedTransfers([]);
                            }
                          }}
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                      </div>
                    </TableHead>
                    <TableHead>{t("warehouseTransfer.reference_number")}</TableHead>
                    <TableHead>{t("warehouseTransfer.source_warehouse")}</TableHead>
                    <TableHead>{t("warehouseTransfer.target_warehouse")}</TableHead>
                    <TableHead>{t("warehouseTransfer.status")}</TableHead>
                    <TableHead className="text-right">{t("warehouseTransfer.items")}</TableHead>
                    <TableHead className="text-right">{t("warehouseTransfer.weight")}</TableHead>
                    <TableHead className="text-right">{t("warehouseTransfer.volume")}</TableHead>
                    <TableHead>{t("warehouseTransfer.created_at")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedTransfers.map((transfer) => (
                    <TableRow 
                      key={transfer.id}
                      className="hover:bg-muted/50"
                    >
                      <TableCell className="w-12">
                        <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedTransfers.includes(transfer.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedTransfers([...selectedTransfers, transfer.id]);
                              } else {
                                setSelectedTransfers(selectedTransfers.filter(id => id !== transfer.id));
                              }
                              // 同步全选状态
                              if (!e.target.checked && selectAll) {
                                setSelectAll(false);
                              } else if (e.target.checked && selectedTransfers.length + 1 === displayedTransfers.length) {
                                setSelectAll(true);
                              }
                            }}
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                          />
                        </div>
                      </TableCell>
                      <TableCell 
                        className="font-medium cursor-pointer"
                        onClick={() => handleViewTransfer(transfer.id)}
                      >{transfer.referenceNumber}</TableCell>
                      <TableCell className="cursor-pointer" onClick={() => handleViewTransfer(transfer.id)}>
                        {transfer.sourceWarehouse.name}
                      </TableCell>
                      <TableCell className="cursor-pointer" onClick={() => handleViewTransfer(transfer.id)}>
                        {transfer.targetWarehouse.name}
                      </TableCell>
                      <TableCell className="cursor-pointer" onClick={() => handleViewTransfer(transfer.id)}>
                        <Badge variant={getStatusBadgeVariant(transfer.status)}>
                          {t(`warehouseTransfer.status.${transfer.status}`)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right cursor-pointer" onClick={() => handleViewTransfer(transfer.id)}>
                        {transfer.totalItems}
                      </TableCell>
                      <TableCell className="text-right cursor-pointer" onClick={() => handleViewTransfer(transfer.id)}>
                        {transfer.totalWeight.toFixed(2)} kg
                      </TableCell>
                      <TableCell className="text-right cursor-pointer" onClick={() => handleViewTransfer(transfer.id)}>
                        {transfer.totalVolume.toFixed(3)} m³
                      </TableCell>
                      <TableCell className="cursor-pointer" onClick={() => handleViewTransfer(transfer.id)}>
                        {formatDate(transfer.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <div className="text-sm text-muted-foreground">
            {searchQuery && filteredTransfers.length > 0 && 
              t("warehouseTransfer.showing_filtered_results", { count: filteredTransfers.length })}
          </div>
          <div className="text-sm text-muted-foreground">
            {filteredTransfers.length > 0 && (
              <>
                {t("warehouseTransfer.current_page_total")}: {formatDate(new Date())}
                <br />
                {t("warehouseTransfer.weight_volume_total")}: {totalWeight.toFixed(2)} kg / {totalVolume.toFixed(3)} m³
              </>
            )}
          </div>
        </CardFooter>
      </Card>

      {/* Excel导入对话框 */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{t("warehouseTransfer.import_from_excel")}</DialogTitle>
            <DialogDescription>
              {t("warehouseTransfer.import_excel_description")}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* 导入步骤指南 */}
            <div className="bg-muted p-4 rounded-lg mb-4">
              <h3 className="font-medium mb-2">{t("warehouseTransfer.import_steps")}：</h3>
              <ol className="list-decimal pl-5 space-y-1 text-sm">
                <li>{t("warehouseTransfer.download_first")}<Button 
                  variant="link" 
                  className="h-auto p-0 text-sm font-medium underline" 
                  onClick={(e) => {
                    e.preventDefault();
                    handleDownloadTemplate();
                  }}
                >{t("warehouseTransfer.template")}</Button>{t("warehouseTransfer.fill_template")}</li>
                <li>{t("warehouseTransfer.upload_filled_file")}</li>
                <li>{t("warehouseTransfer.system_will_verify")}</li>
                <li>{t("warehouseTransfer.confirm_and_import")}</li>
              </ol>
              <div className="mt-2 text-xs text-muted-foreground">
                <strong>{t("common.note")}：</strong> {t("warehouseTransfer.format_requirement")}
              </div>
            </div>
            
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Label htmlFor="excel-file">{t("warehouseTransfer.excel_file")}</Label>
              <Input 
                id="excel-file" 
                type="file" 
                accept=".xlsx,.xls" 
                onChange={handleFileChange}
              />
              <div className="flex justify-between items-center">
                <p className="text-xs text-muted-foreground">
                  {t("warehouseTransfer.supported_formats")}: .xlsx, .xls
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleDownloadTemplate}
                  className="h-8 text-xs ml-2"
                >
                  <FileSpreadsheet className="mr-2 h-3 w-3" />
                  {t("warehouseTransfer.download_template")}
                </Button>
              </div>
            </div>
            
            {/* 源仓库和目标仓库选择 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="source-warehouse">{t("warehouseTransfer.source_warehouse")}</Label>
                <Select value={sourceWarehouseId} onValueChange={setSourceWarehouseId}>
                  <SelectTrigger id="source-warehouse">
                    <SelectValue placeholder={t("warehouseTransfer.select_source_warehouse")} />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map((warehouse) => (
                      <SelectItem 
                        key={`source-${warehouse.id}`} 
                        value={warehouse.id.toString()}
                        disabled={warehouse.id.toString() === targetWarehouseId}
                      >
                        {warehouse.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="target-warehouse">{t("warehouseTransfer.target_warehouse")}</Label>
                <Select value={targetWarehouseId} onValueChange={setTargetWarehouseId}>
                  <SelectTrigger id="target-warehouse">
                    <SelectValue placeholder={t("warehouseTransfer.select_target_warehouse")} />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map((warehouse) => (
                      <SelectItem 
                        key={`target-${warehouse.id}`} 
                        value={warehouse.id.toString()}
                        disabled={warehouse.id.toString() === sourceWarehouseId}
                      >
                        {warehouse.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* 备注输入框 */}
            <div className="space-y-2 mt-4">
              <Label htmlFor="import-notes">{t("warehouseTransfer.notes")}</Label>
              <Input
                id="import-notes"
                value={importNotes}
                onChange={(e) => setImportNotes(e.target.value)}
                placeholder={t("warehouseTransfer.enter_notes")}
              />
            </div>
            
            {importErrors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>{t("warehouseTransfer.import_errors")}</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc pl-4 mt-2">
                    {importErrors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
            
            {importPreview.length > 0 && (
              <div className="max-h-[400px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[80px]">{t("warehouseTransfer.row")}</TableHead>
                      <TableHead>{t("warehouseTransfer.product_name")}</TableHead>
                      <TableHead>{t("warehouseTransfer.barcode")}</TableHead>
                      <TableHead className="text-right">{t("warehouseTransfer.quantity")}</TableHead>
                      <TableHead className="text-right">{t("warehouseTransfer.packages")}</TableHead>
                      <TableHead className="text-right">{t("warehouseTransfer.status")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {importPreview.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>{item.productName}</TableCell>
                        <TableCell>{item.barcode}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">{item.packageCount || 1}</TableCell>
                        <TableCell className="text-right">
                          {item.matched ? (
                            <Badge variant="success">{t("warehouseTransfer.matched")}</Badge>
                          ) : (
                            <Badge variant="destructive">{t("warehouseTransfer.not_matched")}</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
          
          <DialogFooter className="flex-col sm:flex-row justify-between gap-4">
            <div className="w-full">
              {importPreview.length > 0 && (
                <div className="flex flex-col space-y-1">
                  <div className="text-sm">
                    <span className="font-medium">{t("warehouseTransfer.valid_items")}:</span>{" "}
                    <Badge variant={importPreview.filter(item => item.matched).length === 0 ? "destructive" : "success"}>
                      {importPreview.filter(item => item.matched).length}/{importPreview.length}
                    </Badge>
                  </div>
                  {importPreview.filter(item => !item.matched).length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      <AlertCircle className="h-3 w-3 inline mr-1" />
                      {t("warehouseTransfer.unmatched_products_notice")}
                    </p>
                  )}
                </div>
              )}
              
              {/* 操作步骤引导 */}
              {importFile && importPreview.length > 0 && (
                <div className="mt-4 bg-muted rounded-md p-3 text-xs">
                  <h4 className="font-medium mb-1">{t("warehouseTransfer.actions_after_import")}：</h4>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>{t("warehouseTransfer.create_transfer_record")}</li>
                    <li>{t("warehouseTransfer.generate_reference_number")}</li>
                    <li>{t("warehouseTransfer.create_outbound_order")}</li>
                    <li>{t("warehouseTransfer.create_inbound_order")}</li>
                    <li>{t("warehouseTransfer.record_transfer_details")}</li>
                  </ol>
                </div>
              )}
            </div>
            
            <div className="flex gap-2 self-end">
              <Button 
                variant="outline" 
                onClick={() => setImportDialogOpen(false)}
              >
                {t("warehouseTransfer.cancel")}
              </Button>
              <Button 
                type="submit" 
                disabled={!importFile || importPreview.length === 0 || importPreview.filter(item => item.matched).length === 0}
                onClick={handleImportExcel}
              >
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                {t("warehouseTransfer.import")}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}