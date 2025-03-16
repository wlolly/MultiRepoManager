import React, { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink } from "@/components/ui/breadcrumb";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronRight, Download, AlertTriangle, CheckCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { warehouseTransferKeys } from "@/lib/translations";

// 仓库调拨单详情组件
export default function WarehouseTransferDetail() {
  const { t } = useTranslation();
  const { id } = useParams();
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // 状态管理
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<"complete" | "cancel">("complete");
  
  // 获取调拨单详情
  const { 
    data: transfer, 
    isLoading: isLoadingTransfer, 
    isError: isErrorTransfer 
  } = useQuery({
    queryKey: [`/api/warehouse-transfers/${id}`],
    enabled: !!id
  });
  
  // 获取调拨单明细项
  const { 
    data: transferItems = [], 
    isLoading: isLoadingItems 
  } = useQuery({
    queryKey: [`/api/warehouse-transfers/${id}/items`],
    enabled: !!id
  });
  
  // 执行调拨单操作（完成或取消）
  const { mutate: executeAction, isPending: isExecutingAction } = useMutation({
    mutationFn: async (action: "complete" | "cancel") => {
      return fetch(`/api/transfers/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: Number(id) })
      }).then(res => {
        if (!res.ok) throw new Error("操作失败");
        return res.json();
      });
    },
    onSuccess: () => {
      // 刷新数据
      queryClient.invalidateQueries({ queryKey: [`/api/warehouse-transfers/${id}`] });
      
      // 根据操作类型显示不同的成功提示
      const messageKey = actionType === "complete" 
        ? "transfer_completed_successfully" 
        : "transfer_cancelled_successfully";
      
      toast({
        title: t(messageKey),
        description: t(actionType === "complete" 
          ? "transfer_completed_description" 
          : "transfer_cancelled_description"
        ),
        type: "success"
      });
      
      setConfirmDialogOpen(false);
    },
    onError: (error) => {
      console.error("执行操作失败:", error);
      toast({
        title: t("operation_failed"),
        description: t("please_try_again_later"),
        type: "error"
      });
    }
  });
  
  // 打开确认对话框
  const openConfirmDialog = (action: "complete" | "cancel") => {
    setActionType(action);
    setConfirmDialogOpen(true);
  };
  
  // 执行操作
  const handleConfirmAction = () => {
    executeAction(actionType);
  };
  
  // 导出调拨单到Excel
  const handleExportToExcel = async () => {
    try {
      const response = await fetch(`/api/warehouse-transfers/${id}/export`, {
        method: "GET"
      });
      
      if (!response.ok) {
        throw new Error("导出失败");
      }
      
      // 获取文件名
      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = "transfer.xlsx";
      
      if (contentDisposition) {
        const filenameMatch = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(contentDisposition);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1].replace(/['"]/g, "");
        }
      }
      
      // 下载文件
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: t("export_successful"),
        description: t("file_downloaded_successfully"),
        type: "success"
      });
    } catch (error) {
      console.error("导出失败:", error);
      toast({
        title: t("export_failed"),
        description: t("please_try_again_later"),
        type: "error"
      });
    }
  };
  
  // 获取状态徽章样式
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">{t(warehouseTransferKeys.statusPending)}</Badge>;
      case "in_transit":
        return <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">{t(warehouseTransferKeys.statusInTransit)}</Badge>;
      case "completed":
        return <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">{t(warehouseTransferKeys.statusCompleted)}</Badge>;
      case "cancelled":
        return <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">{t(warehouseTransferKeys.statusCancelled)}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  // 加载中显示骨架屏
  if (isLoadingTransfer) {
    return (
      <div className="container py-8">
        <Skeleton className="h-8 w-64 mb-6" />
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
        <Skeleton className="h-64 w-full mt-6" />
      </div>
    );
  }
  
  // 加载出错显示错误信息
  if (isErrorTransfer || !transfer) {
    return (
      <div className="container py-8">
        <div className="bg-red-50 p-6 rounded-lg text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-red-700 mb-2">{t("error_loading_transfer")}</h2>
          <p className="text-red-600 mb-4">{t("could_not_load_transfer_details")}</p>
          <Button onClick={() => navigate("/warehouse-transfers")}>
            {t("back_to_transfers_list")}
          </Button>
        </div>
      </div>
    );
  }
  
  // 格式化日期
  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "yyyy-MM-dd HH:mm");
    } catch (e) {
      return dateStr;
    }
  };
  
  return (
    <div className="container py-8">
      {/* 面包屑导航 */}
      <Breadcrumb className="mb-6">
        <BreadcrumbItem>
          <BreadcrumbLink href="/">{t("home")}</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbItem>
          <BreadcrumbLink href="/warehouse-transfers">{t(warehouseTransferKeys.title)}</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbItem>
          <BreadcrumbLink>{transfer.referenceNumber}</BreadcrumbLink>
        </BreadcrumbItem>
      </Breadcrumb>
      
      {/* 页面标题 */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{t(warehouseTransferKeys.transferDetails)}</h1>
        <div className="flex gap-2">
          {/* 显示不同状态下可用的操作按钮 */}
          {transfer.status === "pending" && (
            <>
              <Button 
                variant="outline" 
                onClick={() => openConfirmDialog("cancel")}
              >
                {t(warehouseTransferKeys.cancel)}
              </Button>
              <Button
                onClick={() => openConfirmDialog("complete")}
              >
                {t(warehouseTransferKeys.complete)}
              </Button>
            </>
          )}
          <Button 
            variant="outline" 
            onClick={handleExportToExcel}
          >
            <Download className="h-4 w-4 mr-2" />
            {t(warehouseTransferKeys.exportExcel)}
          </Button>
        </div>
      </div>
      
      {/* 调拨单基本信息 */}
      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>{t("basic_information")}</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
              <dt className="text-sm font-medium text-gray-500">{t(warehouseTransferKeys.referenceNumber)}</dt>
              <dd className="text-sm text-gray-900">{transfer.referenceNumber}</dd>
              
              <dt className="text-sm font-medium text-gray-500">{t(warehouseTransferKeys.status)}</dt>
              <dd className="text-sm text-gray-900">{getStatusBadge(transfer.status)}</dd>
              
              <dt className="text-sm font-medium text-gray-500">{t("created_date")}</dt>
              <dd className="text-sm text-gray-900">{formatDate(transfer.createdAt)}</dd>
              
              <dt className="text-sm font-medium text-gray-500">{t("created_by")}</dt>
              <dd className="text-sm text-gray-900">{transfer.creator?.fullName || transfer.creator?.username}</dd>
              
              {transfer.completedAt && (
                <>
                  <dt className="text-sm font-medium text-gray-500">{t("completed_date")}</dt>
                  <dd className="text-sm text-gray-900">{formatDate(transfer.completedAt)}</dd>
                </>
              )}
              
              {transfer.notes && (
                <>
                  <dt className="text-sm font-medium text-gray-500">{t(warehouseTransferKeys.notes)}</dt>
                  <dd className="text-sm text-gray-900 col-span-2">{transfer.notes}</dd>
                </>
              )}
            </dl>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>{t("warehouse_information")}</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 gap-y-2">
              <div className="border rounded p-3 mb-3">
                <dt className="text-sm font-medium text-gray-500">{t(warehouseTransferKeys.sourceWarehouse)}</dt>
                <dd className="text-base font-medium">{transfer.sourceWarehouse.name}</dd>
                <dd className="text-sm text-gray-500">{transfer.sourceWarehouse.location}</dd>
              </div>
              
              <div className="flex justify-center my-2">
                <ChevronRight className="h-6 w-6 text-gray-400" />
              </div>
              
              <div className="border rounded p-3">
                <dt className="text-sm font-medium text-gray-500">{t(warehouseTransferKeys.targetWarehouse)}</dt>
                <dd className="text-base font-medium">{transfer.targetWarehouse.name}</dd>
                <dd className="text-sm text-gray-500">{transfer.targetWarehouse.location}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>
      
      {/* 汇总信息 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{t("summary_information")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <p className="text-sm text-gray-500">{t(warehouseTransferKeys.totalItems)}</p>
              <p className="text-2xl font-bold">{transfer.totalItems}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <p className="text-sm text-gray-500">{t(warehouseTransferKeys.totalPackages)}</p>
              <p className="text-2xl font-bold">{transfer.totalPackages}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <p className="text-sm text-gray-500">{t(warehouseTransferKeys.totalWeight)}</p>
              <p className="text-2xl font-bold">{Number(transfer.totalWeight).toFixed(3)} kg</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <p className="text-sm text-gray-500">{t(warehouseTransferKeys.totalVolume)}</p>
              <p className="text-2xl font-bold">{Number(transfer.totalVolume).toFixed(6)} m³</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* 调拨单明细 */}
      <Card>
        <CardHeader>
          <CardTitle>{t(warehouseTransferKeys.itemsList)}</CardTitle>
          <CardDescription>
            {t("total_items")}: {transferItems.length}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingItems ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t(warehouseTransferKeys.productName)}</TableHead>
                    <TableHead>{t(warehouseTransferKeys.barcode)}</TableHead>
                    <TableHead>{t(warehouseTransferKeys.uniqueCode)}</TableHead>
                    <TableHead className="text-right">{t(warehouseTransferKeys.quantity)}</TableHead>
                    <TableHead className="text-right">{t(warehouseTransferKeys.packageCount)}</TableHead>
                    <TableHead className="text-right">{t(warehouseTransferKeys.weight)}</TableHead>
                    <TableHead className="text-right">{t(warehouseTransferKeys.volume)}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transferItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.product?.name}</TableCell>
                      <TableCell>{item.product?.barcode}</TableCell>
                      <TableCell>{item.uniqueCode || "-"}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">{item.packageCount}</TableCell>
                      <TableCell className="text-right">{Number(item.weight).toFixed(3)} kg</TableCell>
                      <TableCell className="text-right">{Number(item.volume).toFixed(6)} m³</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* 确认操作对话框 */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === "complete" 
                ? t("confirm_complete_transfer") 
                : t("confirm_cancel_transfer")}
            </DialogTitle>
            <DialogDescription>
              {actionType === "complete"
                ? t("complete_transfer_confirmation_message")
                : t("cancel_transfer_confirmation_message")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDialogOpen(false)}
            >
              {t("cancel")}
            </Button>
            <Button
              variant={actionType === "complete" ? "default" : "destructive"}
              onClick={handleConfirmAction}
              disabled={isExecutingAction}
            >
              {isExecutingAction && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {actionType === "complete" ? t("confirm_complete") : t("confirm_cancel")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}