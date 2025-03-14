import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { Plus, Download, Filter, ArrowUpDown, Search, FileUp, FileDown, FileText, AlertCircle, X } from "lucide-react";
import axios from "axios";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
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
  outboundOrder: {
    id: number;
    orderNumber: string;
  };
  inboundOrder: {
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
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [dateFilter, setDateFilter] = useState<string>("");
  const [warehouseFilter, setWarehouseFilter] = useState<string>("");
  const [view, setView] = useState<"all" | "recent">("all");
  
  // 获取调拨单列表
  const { data: transfers = [], isLoading: isLoadingTransfers } = useQuery<WarehouseTransfer[]>({
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
  const totalWeight = filteredTransfers.reduce((sum, transfer) => sum + transfer.totalWeight, 0);
  const totalVolume = filteredTransfers.reduce((sum, transfer) => sum + transfer.totalVolume, 0);
  
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
      
      toast({
        title: t("warehouseTransfer.template_downloaded"),
        description: t("warehouseTransfer.template_download_success"),
      });
    } catch (error) {
      console.error('Template download error:', error);
      toast({
        title: t("warehouseTransfer.download_failed"),
        description: t("warehouseTransfer.template_download_error"),
        variant: "destructive",
      });
    }
  };
  
  // 导出单个调拨单到Excel
  const exportTransferToExcel = async (transferId: number) => {
    try {
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
      
      toast({
        title: t("warehouseTransfer.export_successful"),
        description: t("warehouseTransfer.transfer_export_success"),
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: t("warehouseTransfer.export_failed"),
        description: t("warehouseTransfer.transfer_export_error"),
        variant: "destructive",
      });
    }
  };
  
  // 显示导入对话框
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [importFile, setImportFile] = useState<File | null>(null);
  
  // 处理文件选择变更
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImportFile(e.target.files[0]);
      setImportErrors([]);
      setImportPreview([]);
    }
  };
  
  // 处理Excel文件上传
  const handleImportExcel = async () => {
    if (!importFile) {
      toast({
        title: t("no_file_selected"),
        description: t("please_select_file"),
        variant: "destructive",
      });
      return;
    }
    
    const formData = new FormData();
    formData.append('file', importFile);
    
    try {
      const response = await axios.post('/api/warehouse-transfers/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      if (response.data.errors && response.data.errors.length > 0) {
        setImportErrors(response.data.errors);
        if (response.data.items && response.data.items.length > 0) {
          setImportPreview(response.data.items);
        }
        return;
      }
      
      // 如果没有错误，设置预览
      if (response.data.items && response.data.items.length > 0) {
        setImportPreview(response.data.items);
        toast({
          title: t("warehouseTransfer.import_successful"),
          description: t("warehouseTransfer.data_preview_ready"),
        });
      } else {
        toast({
          title: t("warehouseTransfer.import_successful"),
          description: t("warehouseTransfer.no_items_found"),
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: t("warehouseTransfer.import_failed"),
        description: t("warehouseTransfer.import_error"),
        variant: "destructive",
      });
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
  
  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">{t("warehouse_transfers")}</h1>
          <p className="text-muted-foreground">{t("warehouse_transfers_description")}</p>
        </div>
        <Button onClick={handleCreateTransfer}>
          <Plus className="mr-2 h-4 w-4" />
          {t("new_transfer")}
        </Button>
      </div>
      
      {/* 统计卡片 */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("total_transfers")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalTransfers}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("pending_transfers")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingTransfers}</div>
              <p className="text-xs text-muted-foreground">
                {((stats.pendingTransfers / stats.totalTransfers) * 100 || 0).toFixed(1)}% {t("of_total")}
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
      
      {/* 过滤和搜索 */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex items-center space-x-2 flex-1">
          <Input
            placeholder={t("search_transfers")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-sm"
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="mr-2 h-4 w-4" />
                {t("filter")}
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
        </div>
        
        <div className="flex items-center space-x-2">
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
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <FileDown className="mr-2 h-4 w-4" />
                {t("excel_options")}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>{t("excel_operations")}</DropdownMenuLabel>
              <DropdownMenuItem onClick={handleDownloadTemplate}>
                <FileText className="mr-2 h-4 w-4" />
                {t("download_template")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setImportDialogOpen(true)}>
                <FileUp className="mr-2 h-4 w-4" />
                {t("import_from_excel")}
              </DropdownMenuItem>
              {displayedTransfers.length > 0 && (
                <DropdownMenuSeparator />
              )}
              {displayedTransfers.length > 0 && displayedTransfers.map((transfer) => (
                <DropdownMenuItem 
                  key={transfer.id}
                  onClick={() => exportTransferToExcel(transfer.id)}
                >
                  <Download className="mr-2 h-4 w-4" />
                  {t("export_transfer", { ref: transfer.referenceNumber })}
                </DropdownMenuItem>
              )).slice(0, 5)}
              {displayedTransfers.length > 5 && (
                <DropdownMenuItem disabled>
                  {t("more_items_available")}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      {/* 数据视图选择 */}
      <Tabs defaultValue="all" value={view} onValueChange={(value) => setView(value as "all" | "recent")} className="mb-6">
        <TabsList>
          <TabsTrigger value="all">{t("all_transfers")}</TabsTrigger>
          <TabsTrigger value="recent">{t("recent_transfers")}</TabsTrigger>
        </TabsList>
      </Tabs>
      
      {/* 调拨单列表 */}
      <Card>
        <CardHeader>
          <CardTitle>{t("warehouse_transfers_list")}</CardTitle>
          <CardDescription>
            {t("found_count_items", { count: displayedTransfers.length })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingTransfers ? (
            <div className="flex items-center justify-center h-[200px]">
              <p>{t("loading")}...</p>
            </div>
          ) : displayedTransfers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[200px] text-center">
              <p className="text-muted-foreground mb-2">{t("no_transfers_found")}</p>
              <Button variant="outline" size="sm" onClick={handleCreateTransfer}>
                <Plus className="mr-2 h-4 w-4" />
                {t("create_first_transfer")}
              </Button>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("reference_number")}</TableHead>
                    <TableHead>{t("source_warehouse")}</TableHead>
                    <TableHead>{t("target_warehouse")}</TableHead>
                    <TableHead>{t("status")}</TableHead>
                    <TableHead className="text-right">{t("items")}</TableHead>
                    <TableHead className="text-right">{t("weight")}</TableHead>
                    <TableHead className="text-right">{t("volume")}</TableHead>
                    <TableHead>{t("created_at")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedTransfers.map((transfer) => (
                    <TableRow 
                      key={transfer.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleViewTransfer(transfer.id)}
                    >
                      <TableCell className="font-medium">{transfer.referenceNumber}</TableCell>
                      <TableCell>{transfer.sourceWarehouse.name}</TableCell>
                      <TableCell>{transfer.targetWarehouse.name}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(transfer.status)}>
                          {t(transfer.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{transfer.totalItems}</TableCell>
                      <TableCell className="text-right">{transfer.totalWeight.toFixed(2)} kg</TableCell>
                      <TableCell className="text-right">{transfer.totalVolume.toFixed(3)} m³</TableCell>
                      <TableCell>{formatDate(transfer.createdAt)}</TableCell>
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
              t("showing_filtered_results", { count: filteredTransfers.length })}
          </div>
          <div className="text-sm text-muted-foreground">
            {filteredTransfers.length > 0 && (
              <>
                {t("current_page_total")}: {formatDate(new Date())}
                <br />
                {t("weight_volume_total")}: {totalWeight.toFixed(2)} kg / {totalVolume.toFixed(3)} m³
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
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Label htmlFor="excel-file">{t("warehouseTransfer.excel_file")}</Label>
              <Input 
                id="excel-file" 
                type="file" 
                accept=".xlsx,.xls" 
                onChange={handleFileChange}
              />
              <p className="text-xs text-muted-foreground">
                {t("warehouseTransfer.supported_formats")}: .xlsx, .xls
              </p>
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
          
          <DialogFooter className="flex justify-between items-center">
            <div>
              {importPreview.length > 0 && (
                <div className="text-sm text-muted-foreground">
                  {t("warehouseTransfer.valid_items")}: {importPreview.filter(item => item.matched).length}/{importPreview.length}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setImportDialogOpen(false)}
              >
                {t("cancel")}
              </Button>
              <Button 
                type="submit" 
                disabled={!importFile || importPreview.length === 0 || importPreview.filter(item => item.matched).length === 0}
                onClick={handleImportExcel}
              >
                {t("import")}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}