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
    } finally {
      // 重置导出状态
      setIsExporting(false);
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
  
  // 导入弹窗相关状态
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
          {/* 使用ExcelButtons组件 */}
          <ExcelButtons size="sm" 
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
              <CardTitle className="text-sm font-medium">
                {t("warehouseTransfer.total_transfers")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalTransfers}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                {t("warehouseTransfer.pending_transfers")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingTransfers}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                {t("warehouseTransfer.total_weight")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalWeight.toFixed(2)} kg</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                {t("warehouseTransfer.total_volume")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalVolume.toFixed(3)} m³</div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* 功能解释说明及Excel操作按钮 */}
      <div className="bg-accent/20 p-4 rounded-lg mb-6 flex flex-wrap gap-4 items-center">
        <div className="flex-1">
          <h3 className="text-lg font-medium mb-1">{t("warehouseTransfer.excel_operations")}</h3>
          <p className="text-sm text-muted-foreground">{t("warehouseTransfer.excel_description")}</p>
        </div>
        <div className="flex gap-2">
          {/* 使用ExcelButtons组件 */}
          <ExcelButtons size="sm" 
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
        </div>
      </div>

      {/* 筛选器 */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle>{t("warehouseTransfer.filter_title")}</CardTitle>
          <CardDescription>
            {t("warehouseTransfer.filter_description")}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* 搜索框 */}
          <div className="space-y-2">
            <Label htmlFor="search">{t("warehouseTransfer.search")}</Label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                placeholder={t("warehouseTransfer.search_placeholder")}
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          
          {/* 仓库筛选 */}
          <div className="space-y-2">
            <Label htmlFor="warehouse">{t("warehouseTransfer.filter_warehouse")}</Label>
            <Select
              value={warehouseFilter}
              onValueChange={setWarehouseFilter}
            >
              <SelectTrigger id="warehouse">
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
          </div>
          
          {/* 状态筛选 */}
          <div className="space-y-2">
            <Label htmlFor="status">{t("warehouseTransfer.filter_status")}</Label>
            <Select
              value={statusFilter}
              onValueChange={setStatusFilter}
            >
              <SelectTrigger id="status">
                <SelectValue placeholder={t("warehouseTransfer.all_statuses")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">{t("warehouseTransfer.all_statuses")}</SelectItem>
                <SelectItem value="pending">{t("warehouseTransfer.status_pending")}</SelectItem>
                <SelectItem value="processing">{t("warehouseTransfer.status_processing")}</SelectItem>
                <SelectItem value="completed">{t("warehouseTransfer.status_completed")}</SelectItem>
                <SelectItem value="cancelled">{t("warehouseTransfer.status_cancelled")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* 日期筛选 */}
          <div className="space-y-2">
            <Label htmlFor="date">{t("warehouseTransfer.filter_date")}</Label>
            <Select
              value={dateFilter}
              onValueChange={setDateFilter}
            >
              <SelectTrigger id="date">
                <SelectValue placeholder={t("warehouseTransfer.all_dates")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">{t("warehouseTransfer.all_dates")}</SelectItem>
                <SelectItem value="today">{t("warehouseTransfer.today")}</SelectItem>
                <SelectItem value="yesterday">{t("warehouseTransfer.yesterday")}</SelectItem>
                <SelectItem value="this-week">{t("warehouseTransfer.this_week")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
        <CardFooter className="border-t px-6 py-4">
          <div className="flex items-center justify-between w-full">
            <Button 
              variant="outline"
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("");
                setDateFilter("");
                setWarehouseFilter("");
              }}
              className="flex items-center"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              {t("warehouseTransfer.reset_filters")}
            </Button>
            
            <div className="flex items-center space-x-2">
              <Tabs 
                value={view} 
                onValueChange={(v) => setView(v as "all" | "recent")}
                className="w-full"
              >
                <TabsList className="grid w-48 grid-cols-2">
                  <TabsTrigger value="all">{t("warehouseTransfer.all_records")}</TabsTrigger>
                  <TabsTrigger value="recent">{t("warehouseTransfer.recent_records")}</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </CardFooter>
      </Card>
      
      {/* 批量操作区域 */}
      {selectedTransfers.length > 0 && (
        <Card className="mb-6 border border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-900">
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="px-3 py-1 text-sm">
                {t("warehouseTransfer.selected")}: {selectedTransfers.length}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {t("warehouseTransfer.total")}: {filteredTransfers.length}
              </span>
            </div>
            <div className="flex gap-2">
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => {
                  setSelectedTransfers([]);
                  setSelectAll(false);
                }}
              >
                {t("warehouseTransfer.deselect_all")}
              </Button>
              <Button 
                size="sm"
                onClick={() => setMultiExportDialogOpen(true)}
              >
                <FileDown className="mr-2 h-4 w-4" />
                {t("warehouseTransfer.export_selected")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* 多选导出确认对话框 */}
      <Dialog open={multiExportDialogOpen} onOpenChange={setMultiExportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("warehouseTransfer.export_selected_transfers")}</DialogTitle>
            <DialogDescription>
              {t("warehouseTransfer.export_selected_description", { count: selectedTransfers.length })}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              {t("warehouseTransfer.export_selected_details")}
            </p>
            <div className="flex justify-between items-center">
              <Badge variant="outline" className="px-3 py-1">
                {t("warehouseTransfer.selected")}: {selectedTransfers.length}
              </Badge>
              {isExporting && <p className="text-sm text-muted-foreground">{t("warehouseTransfer.exporting")}...</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMultiExportDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={exportSelectedTransfers} disabled={isExporting || selectedTransfers.length === 0}>
              {isExporting ? t("warehouseTransfer.processing") : t("warehouseTransfer.confirm_export")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* 调拨单列表 */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300"
                  checked={selectAll}
                  onChange={() => {
                    if (selectAll) {
                      setSelectedTransfers([]);
                    } else {
                      setSelectedTransfers(filteredTransfers.map(t => t.id));
                    }
                    setSelectAll(!selectAll);
                  }}
                />
              </TableHead>
              <TableHead className="w-[100px]">{t("warehouseTransfer.reference")}</TableHead>
              <TableHead>{t("warehouseTransfer.source_warehouse")}</TableHead>
              <TableHead>{t("warehouseTransfer.target_warehouse")}</TableHead>
              <TableHead className="hidden md:table-cell">{t("warehouseTransfer.created_at")}</TableHead>
              <TableHead className="hidden md:table-cell">{t("warehouseTransfer.items")}</TableHead>
              <TableHead className="hidden md:table-cell">{t("warehouseTransfer.weight")}</TableHead>
              <TableHead className="hidden md:table-cell">{t("warehouseTransfer.volume")}</TableHead>
              <TableHead>{t("warehouseTransfer.status")}</TableHead>
              <TableHead className="text-right">{t("warehouseTransfer.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoadingTransfers ? (
              <TableRow>
                <TableCell colSpan={10} className="h-24 text-center">
                  {t("warehouseTransfer.loading")}
                </TableCell>
              </TableRow>
            ) : displayedTransfers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="h-24 text-center">
                  {t("warehouseTransfer.no_results")}
                </TableCell>
              </TableRow>
            ) : (
              displayedTransfers.map((transfer) => (
                <TableRow key={transfer.id}>
                  <TableCell>
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300"
                      checked={selectedTransfers.includes(transfer.id)}
                      onChange={() => {
                        if (selectedTransfers.includes(transfer.id)) {
                          setSelectedTransfers(selectedTransfers.filter(id => id !== transfer.id));
                        } else {
                          setSelectedTransfers([...selectedTransfers, transfer.id]);
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {transfer.referenceNumber}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{transfer.sourceWarehouse.name}</span>
                      <span className="text-xs text-muted-foreground">{transfer.sourceWarehouse.location}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{transfer.targetWarehouse.name}</span>
                      <span className="text-xs text-muted-foreground">{transfer.targetWarehouse.location}</span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {formatDate(transfer.createdAt)}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-center">
                    {transfer.totalItems}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {transfer.totalWeight.toFixed(2)} kg
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {transfer.totalVolume.toFixed(3)} m³
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(transfer.status)}>
                      {t(`warehouseTransfer.status_${transfer.status}`)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">{t("warehouseTransfer.open_menu")}</span>
                          <MoreHorizontalIcon className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>{t("warehouseTransfer.actions")}</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => openConfirmDialog(transfer.id, "view")}>
                          <Eye className="mr-2 h-4 w-4" />
                          {t("warehouseTransfer.view_details")}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openConfirmDialog(transfer.id, "export")}>
                          <FileDown className="mr-2 h-4 w-4" />
                          {t("warehouseTransfer.export_to_excel")}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {transfer.status === "pending" && (
                          <DropdownMenuItem onClick={() => openConfirmDialog(transfer.id, "complete")}>
                            <Check className="mr-2 h-4 w-4" />
                            {t("warehouseTransfer.mark_as_completed")}
                          </DropdownMenuItem>
                        )}
                        {(transfer.status === "pending" || transfer.status === "processing") && (
                          <DropdownMenuItem onClick={() => openConfirmDialog(transfer.id, "cancel")}>
                            <X className="mr-2 h-4 w-4" />
                            {t("warehouseTransfer.cancel_transfer")}
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      
      {/* 摘要信息 */}
      <div className="mt-4 flex justify-between text-sm text-muted-foreground">
        <div>
          {t("warehouseTransfer.showing")} {displayedTransfers.length} {t("warehouseTransfer.of")} {filteredTransfers.length} {t("warehouseTransfer.transfers")}
        </div>
        <div>
          {t("warehouseTransfer.total")}: {totalWeight.toFixed(2)} kg, {totalVolume.toFixed(3)} m³
        </div>
      </div>
      
      {/* 操作确认对话框 */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === "export" && t("warehouseTransfer.confirm_export_title")}
              {actionType === "view" && t("warehouseTransfer.confirm_view_title")}
              {actionType === "cancel" && t("warehouseTransfer.confirm_cancel_title")}
              {actionType === "complete" && t("warehouseTransfer.confirm_complete_title")}
            </DialogTitle>
            <DialogDescription>
              {actionType === "export" && t("warehouseTransfer.confirm_export_description")}
              {actionType === "view" && t("warehouseTransfer.confirm_view_description")}
              {actionType === "cancel" && t("warehouseTransfer.confirm_cancel_description")}
              {actionType === "complete" && t("warehouseTransfer.confirm_complete_description")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={confirmAction}>
              {t("common.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* 导入对话框 */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{t("warehouseTransfer.import_title")}</DialogTitle>
            <DialogDescription>
              {t("warehouseTransfer.import_description")}
            </DialogDescription>
          </DialogHeader>
          
          {/* 上传区域 */}
          <div className="grid grid-cols-1 gap-4 py-4">
            {/* 文件上传 */}
            <div className="space-y-2">
              <Label htmlFor="file">{t("warehouseTransfer.select_file")}</Label>
              <Input 
                id="file" 
                type="file" 
                accept=".xlsx,.xls" 
                onChange={handleFileChange}
              />
              {importFile && (
                <p className="text-sm text-muted-foreground">
                  {t("warehouseTransfer.selected_file")}: {importFile.name}
                </p>
              )}
            </div>
            
            {/* 仓库选择 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sourceWarehouse">{t("warehouseTransfer.source_warehouse")}</Label>
                <Select
                  value={sourceWarehouseId}
                  onValueChange={setSourceWarehouseId}
                >
                  <SelectTrigger id="sourceWarehouse">
                    <SelectValue placeholder={t("warehouseTransfer.select_source_warehouse")} />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map((warehouse) => (
                      <SelectItem key={warehouse.id} value={warehouse.id.toString()}>
                        {warehouse.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="targetWarehouse">{t("warehouseTransfer.target_warehouse")}</Label>
                <Select
                  value={targetWarehouseId}
                  onValueChange={setTargetWarehouseId}
                >
                  <SelectTrigger id="targetWarehouse">
                    <SelectValue placeholder={t("warehouseTransfer.select_target_warehouse")} />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map((warehouse) => (
                      <SelectItem key={warehouse.id} value={warehouse.id.toString()}>
                        {warehouse.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* 备注 */}
            <div className="space-y-2">
              <Label htmlFor="notes">{t("warehouseTransfer.notes")}</Label>
              <Input 
                id="notes" 
                value={importNotes}
                onChange={(e) => setImportNotes(e.target.value)}
                placeholder={t("warehouseTransfer.notes_placeholder")}
              />
            </div>
            
            {/* 错误显示 */}
            {importErrors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>{t("warehouseTransfer.import_errors")}</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc list-inside text-sm mt-2">
                    {importErrors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
            
            {/* 预览表格 */}
            {importPreview.length > 0 && (
              <div>
                <h3 className="font-medium mb-2">{t("warehouseTransfer.preview")}</h3>
                <div className="rounded-md border max-h-60 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[60px]">{t("warehouseTransfer.row")}</TableHead>
                        <TableHead>{t("warehouseTransfer.product_name")}</TableHead>
                        <TableHead>{t("warehouseTransfer.barcode")}</TableHead>
                        <TableHead className="text-right">{t("warehouseTransfer.quantity")}</TableHead>
                        <TableHead className="text-right">{t("warehouseTransfer.packages")}</TableHead>
                        <TableHead className="text-right">{t("warehouseTransfer.weight")}</TableHead>
                        <TableHead className="text-right">{t("warehouseTransfer.volume")}</TableHead>
                        <TableHead>{t("warehouseTransfer.status")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importPreview.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{item.row}</TableCell>
                          <TableCell>{item.productName}</TableCell>
                          <TableCell>
                            <span className="font-mono text-xs">{item.barcode}</span>
                          </TableCell>
                          <TableCell className="text-right">{item.quantity}</TableCell>
                          <TableCell className="text-right">{item.packageCount || 1}</TableCell>
                          <TableCell className="text-right">{item.weight.toFixed(2)} kg</TableCell>
                          <TableCell className="text-right">{item.volume.toFixed(3)} m³</TableCell>
                          <TableCell>
                            <Badge variant={item.matched ? "success" : "destructive"}>
                              {item.matched ? t("warehouseTransfer.matched") : t("warehouseTransfer.not_matched")}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button 
              onClick={handleImportExcel}
              disabled={!importFile || !sourceWarehouseId || !targetWarehouseId}
            >
              {t("warehouseTransfer.import")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// 缺少的MoreHorizontalIcon组件
function MoreHorizontalIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="12" cy="12" r="1" />
      <circle cx="19" cy="12" r="1" />
      <circle cx="5" cy="12" r="1" />
    </svg>
  );
}