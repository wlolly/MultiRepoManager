import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { 
  FileSpreadsheet, 
  Check, 
  X, 
  ArrowLeftRight,
  Truck,
  Package,
  User,
  FileText,
  CalendarDays
} from "lucide-react";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils";

// 导入导出组件
import { ExportTransferDialog } from "./ExportTransferDialog";

interface TransferDetailsViewProps {
  transferId: number;
  onExecute?: () => void;
  onCancel?: () => void;
  onBack?: () => void;
}

export function TransferDetailsView({
  transferId,
  onExecute,
  onCancel,
  onBack
}: TransferDetailsViewProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<"complete" | "cancel">("complete");
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  
  // 获取调拨单详情
  const { 
    data: transfer, 
    isLoading,
    isError,
    refetch
  } = useQuery({
    queryKey: [`/api/warehouse-transfers/${transferId}`],
  });
  
  // 获取调拨单明细
  const { 
    data: items = [], 
    isLoading: isItemsLoading
  } = useQuery({
    queryKey: [`/api/warehouse-transfers/${transferId}/items`],
  });
  
  // 打开确认对话框
  const openConfirmDialog = (action: "complete" | "cancel") => {
    setActionType(action);
    setConfirmDialogOpen(true);
  };
  
  // 执行操作
  const confirmAction = async () => {
    // 关闭确认对话框
    setConfirmDialogOpen(false);
    
    try {
      if (actionType === "complete") {
        // 标记调拨单为已完成
        await axios.post(`/api/warehouse-transfers/${transferId}/execute`);
        // 使用useToast钩子返回的toast函数
        toast({
          title: t("common.success"),
          description: t("warehouseTransfer.transfer_completed_success")
          // 移除了不支持的variant属性
        });
      } else {
        // 取消调拨单
        await axios.post(`/api/warehouse-transfers/${transferId}/cancel`);
        // 使用useToast钩子返回的toast函数
        toast({
          title: t("common.success"),
          description: t("warehouseTransfer.transfer_cancelled_success")
          // 移除了不支持的variant属性
        });
      }
      
      // 刷新数据
      refetch();
      
      // 触发回调
      if (actionType === "complete" && onExecute) {
        onExecute();
      } else if (actionType === "cancel" && onCancel) {
        onCancel();
      }
    } catch (error) {
      console.error(`${actionType} error:`, error);
      
      // 使用useToast钩子返回的toast函数
      toast({
        title: t("common.error"),
        description: actionType === "complete" 
          ? t("warehouseTransfer.transfer_completed_error") 
          : t("warehouseTransfer.transfer_cancelled_error")
        // 移除了不支持的variant属性
      });
    }
  };
  
  // 获取状态标签样式
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'processing':
        return 'secondary';
      case 'pending':
        return 'default';
      case 'cancelled':
        return 'destructive';
      default:
        return 'default';
    }
  };
  
  // 获取状态文本
  const getStatusText = (status: string) => {
    return t(`warehouseTransfer.status_${status}`);
  };
  
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-1/3" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
        <Skeleton className="h-60 w-full" />
      </div>
    );
  }
  
  if (isError || !transfer) {
    return (
      <Alert variant="destructive">
        <AlertTitle>{t("common.error")}</AlertTitle>
        <AlertDescription>
          {t("warehouseTransfer.load_error")}
        </AlertDescription>
        {onBack && (
          <Button variant="outline" size="sm" className="mt-4" onClick={onBack}>
            {t("common.back")}
          </Button>
        )}
      </Alert>
    );
  }
  
  // 判断是否可以执行调拨操作
  const canExecute = transfer.status === 'pending';
  // 判断是否可以取消调拨单
  const canCancel = transfer.status === 'pending';
  
  return (
    <div className="space-y-6">
      {/* 标题和操作按钮 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t("warehouseTransfer.transfer_details")}</h1>
          <p className="text-gray-500">
            {t("warehouseTransfer.reference_number")}: {transfer.referenceNumber}
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {onBack && (
            <Button variant="outline" onClick={onBack}>
              {t("common.back")}
            </Button>
          )}
          
          <Button 
            variant="secondary" 
            onClick={() => setExportDialogOpen(true)}
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            {t("warehouseTransfer.export")}
          </Button>
          
          {canCancel && (
            <Button 
              variant="destructive" 
              onClick={() => openConfirmDialog("cancel")}
            >
              <X className="mr-2 h-4 w-4" />
              {t("warehouseTransfer.cancel")}
            </Button>
          )}
          
          {canExecute && (
            <Button 
              onClick={() => openConfirmDialog("complete")}
            >
              <Check className="mr-2 h-4 w-4" />
              {t("warehouseTransfer.execute")}
            </Button>
          )}
        </div>
      </div>
      
      {/* 调拨单信息卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <ArrowLeftRight className="h-5 w-5" />
              {t("warehouseTransfer.transfer_info")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-500">{t("warehouseTransfer.status")}</div>
                <Badge variant={getStatusBadgeVariant(transfer.status)}>{getStatusText(transfer.status)}</Badge>
              </div>
              <div>
                <div className="text-sm text-gray-500">{t("warehouseTransfer.created_at")}</div>
                <div className="flex items-center gap-1">
                  <CalendarDays className="h-4 w-4 text-gray-400" />
                  <span>{formatDate(transfer.createdAt)}</span>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-500">{t("warehouseTransfer.total_items")}</div>
                <div className="flex items-center gap-1">
                  <Package className="h-4 w-4 text-gray-400" />
                  <span>{transfer.totalItems}</span>
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">{t("warehouseTransfer.total_packages")}</div>
                <div>{transfer.totalPackages}</div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-500">{t("warehouseTransfer.total_weight")}</div>
                <div>{transfer.totalWeight} kg</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">{t("warehouseTransfer.total_volume")}</div>
                <div>{transfer.totalVolume} m³</div>
              </div>
            </div>
            
            {transfer.notes && (
              <div>
                <div className="text-sm text-gray-500">{t("warehouseTransfer.notes")}</div>
                <div className="flex items-start gap-1">
                  <FileText className="h-4 w-4 text-gray-400 mt-1" />
                  <span>{transfer.notes}</span>
                </div>
              </div>
            )}
            
            <div>
              <div className="text-sm text-gray-500">{t("warehouseTransfer.created_by")}</div>
              <div className="flex items-center gap-1">
                <User className="h-4 w-4 text-gray-400" />
                <span>{transfer.creator?.fullName || transfer.creator?.username}</span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Truck className="h-5 w-5" />
              {t("warehouseTransfer.warehouse_info")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="text-sm text-gray-500">{t("warehouseTransfer.source_warehouse")}</div>
              <div className="font-medium">{transfer.sourceWarehouse?.name}</div>
              <div className="text-sm text-gray-500">{transfer.sourceWarehouse?.location}</div>
            </div>
            
            <div className="flex justify-center">
              <ArrowLeftRight className="h-6 w-6 text-gray-400" />
            </div>
            
            <div>
              <div className="text-sm text-gray-500">{t("warehouseTransfer.target_warehouse")}</div>
              <div className="font-medium">{transfer.targetWarehouse?.name}</div>
              <div className="text-sm text-gray-500">{transfer.targetWarehouse?.location}</div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* 调拨单明细 */}
      <Card>
        <CardHeader>
          <CardTitle>{t("warehouseTransfer.transfer_items")}</CardTitle>
          <CardDescription>
            {t("warehouseTransfer.items_count", { count: items.length })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isItemsLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">#</TableHead>
                    <TableHead>{t("warehouseTransfer.product_name")}</TableHead>
                    <TableHead>{t("warehouseTransfer.barcode")}</TableHead>
                    <TableHead className="text-right">{t("warehouseTransfer.quantity")}</TableHead>
                    <TableHead className="text-right">{t("warehouseTransfer.package_count")}</TableHead>
                    <TableHead className="text-right">{t("warehouseTransfer.weight")}</TableHead>
                    <TableHead className="text-right">{t("warehouseTransfer.volume")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-6 text-gray-500">
                        {t("warehouseTransfer.no_items")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((item, index) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{index + 1}</TableCell>
                        <TableCell>
                          {item.product?.name || t("warehouseTransfer.unknown_product")}
                        </TableCell>
                        <TableCell>{item.product?.barcode || '—'}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">{item.packageCount}</TableCell>
                        <TableCell className="text-right">{item.weight} kg</TableCell>
                        <TableCell className="text-right">{item.volume} m³</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* 确认对话框 */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === "complete" 
                ? t("warehouseTransfer.confirm_execute") 
                : t("warehouseTransfer.confirm_cancel")
              }
            </DialogTitle>
            <DialogDescription>
              {actionType === "complete"
                ? t("warehouseTransfer.confirm_execute_description")
                : t("warehouseTransfer.confirm_cancel_description")
              }
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setConfirmDialogOpen(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button 
              variant={actionType === "complete" ? "default" : "destructive"} 
              onClick={confirmAction}
            >
              {actionType === "complete" ? t("warehouseTransfer.confirm_execute_button") : t("warehouseTransfer.confirm_cancel_button")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* 导出对话框 */}
      <ExportTransferDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        transferId={transferId}
        referenceNumber={transfer.referenceNumber}
      />
    </div>
  );
}