import React, { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
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
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChevronRight,
  Plus,
  Search,
  FileDown,
  Filter,
  Package,
  TrendingUp,
  Clipboard,
  MoreHorizontal,
  AlertCircle,
} from "lucide-react";
import { LanguageSwitcher, LanguageStatusBadge } from "@/components/LanguageSwitcher";
import { warehouseTransferKeys } from "@/lib/translations";

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
}

// 统计数据接口
interface TransferStats {
  totalTransfers: number;
  pendingTransfers: number;
  completedTransfers: number;
  totalWeight: number;
  totalVolume: number;
  recentTransfers: number;
}

// 仓库调拨主页组件
export default function WarehouseTransfersOptimized() {
  const { t } = useTranslation();
  const [_, navigate] = useLocation();
  
  // 状态管理
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [warehouseFilter, setWarehouseFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // 获取调拨单列表
  const { 
    data: transfers = [], 
    isLoading: isLoadingTransfers,
    isError: isErrorTransfers
  } = useQuery({
    queryKey: ['/api/warehouse-transfers', statusFilter, warehouseFilter, searchTerm],
    queryFn: () => fetch(`/api/warehouse-transfers?status=${statusFilter}&warehouseId=${warehouseFilter}&search=${searchTerm}`).then(res => res.json()),
  });
  
  // 获取统计信息
  const { 
    data: stats, 
    isLoading: isLoadingStats 
  } = useQuery({
    queryKey: ['/api/warehouse-transfers/stats'],
    queryFn: () => fetch('/api/warehouse-transfers/stats').then(res => res.json()),
  });
  
  // 获取仓库列表
  const { 
    data: warehouses = [], 
    isLoading: isLoadingWarehouses 
  } = useQuery({
    queryKey: ['/api/warehouses'],
    queryFn: () => fetch('/api/warehouses').then(res => res.json()),
  });
  
  // 每页显示的条目数
  const itemsPerPage = 10;
  
  // 计算分页
  const totalPages = Math.ceil(transfers.length / itemsPerPage);
  const paginatedTransfers = transfers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  
  // 格式化日期
  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "yyyy-MM-dd HH:mm");
    } catch (e) {
      return dateStr;
    }
  };
  
  // 获取状态徽章样式
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">
            {t(warehouseTransferKeys.statusPending)}
          </Badge>
        );
      case "in_transit":
        return (
          <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">
            {t(warehouseTransferKeys.statusInTransit)}
          </Badge>
        );
      case "completed":
        return (
          <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
            {t(warehouseTransferKeys.statusCompleted)}
          </Badge>
        );
      case "cancelled":
        return (
          <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">
            {t(warehouseTransferKeys.statusCancelled)}
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  // 处理新建调拨单
  const handleNewTransfer = () => {
    navigate("/warehouse-transfers/new");
  };
  
  // 查看调拨单详情
  const handleViewTransfer = (id: number) => {
    navigate(`/warehouse-transfers/${id}`);
  };
  
  // 渲染分页控件
  const renderPagination = () => {
    if (totalPages <= 1) return null;
    
    return (
      <Pagination className="mt-4">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious 
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
            />
          </PaginationItem>
          
          {Array.from({ length: totalPages }).map((_, i) => (
            <PaginationItem key={i}>
              <PaginationLink
                onClick={() => setCurrentPage(i + 1)}
                isActive={currentPage === i + 1}
              >
                {i + 1}
              </PaginationLink>
            </PaginationItem>
          ))}
          
          <PaginationItem>
            <PaginationNext
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    );
  };
  
  // 待实现：导出全部调拨单
  const handleExportAll = () => {
    console.log("导出所有调拨单");
  };
  
  // 渲染统计卡片
  const renderStatsCards = () => {
    if (isLoadingStats) {
      return (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 mb-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      );
    }
    
    if (!stats) return null;
    
    return (
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 mb-6">
        <Card>
          <CardContent className="p-4 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">{t(warehouseTransferKeys.totalTransfers)}</span>
              <Clipboard className="h-4 w-4 text-blue-500" />
            </div>
            <div className="text-2xl font-bold">{stats.totalTransfers}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">{t(warehouseTransferKeys.pendingTransfers)}</span>
              <AlertCircle className="h-4 w-4 text-yellow-500" />
            </div>
            <div className="text-2xl font-bold">{stats.pendingTransfers}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">{t(warehouseTransferKeys.completedTransfers)}</span>
              <ChevronRight className="h-4 w-4 text-green-500" />
            </div>
            <div className="text-2xl font-bold">{stats.completedTransfers}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">{t(warehouseTransferKeys.totalWeight)}</span>
              <Package className="h-4 w-4 text-gray-500" />
            </div>
            <div className="text-2xl font-bold">{stats.totalWeight.toFixed(2)} kg</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">{t(warehouseTransferKeys.totalVolume)}</span>
              <Package className="h-4 w-4 text-gray-500" />
            </div>
            <div className="text-2xl font-bold">{stats.totalVolume.toFixed(2)} m³</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">{t(warehouseTransferKeys.recent)}</span>
              <TrendingUp className="h-4 w-4 text-blue-500" />
            </div>
            <div className="text-2xl font-bold">{stats.recentTransfers}</div>
          </CardContent>
        </Card>
      </div>
    );
  };
  
  return (
    <div className="container py-8">
      {/* 页面标题和操作 */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold mb-1">{t(warehouseTransferKeys.title)}</h1>
          <p className="text-sm text-gray-500">{t('manage_warehouse_transfers_description')}</p>
        </div>
        
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <Button onClick={handleNewTransfer}>
            <Plus className="h-4 w-4 mr-2" />
            {t(warehouseTransferKeys.newTransfer)}
          </Button>
        </div>
      </div>
      
      {/* 语言状态显示 */}
      <div className="mb-6">
        <LanguageStatusBadge />
      </div>
      
      {/* 统计卡片 */}
      {renderStatsCards()}
      
      {/* 过滤和搜索 */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex flex-1 gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder={t('search_transfers_placeholder')}
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <Button variant="outline" onClick={handleExportAll} className="whitespace-nowrap">
            <FileDown className="h-4 w-4 mr-2" />
            {t(warehouseTransferKeys.exportExcel)}
          </Button>
        </div>
        
        <div className="flex gap-2">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <Select
              value={statusFilter}
              onValueChange={setStatusFilter}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t(warehouseTransferKeys.filterByStatus)} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t(warehouseTransferKeys.allStatuses)}</SelectItem>
                <SelectItem value="pending">{t(warehouseTransferKeys.statusPending)}</SelectItem>
                <SelectItem value="in_transit">{t(warehouseTransferKeys.statusInTransit)}</SelectItem>
                <SelectItem value="completed">{t(warehouseTransferKeys.statusCompleted)}</SelectItem>
                <SelectItem value="cancelled">{t(warehouseTransferKeys.statusCancelled)}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-gray-500" />
            <Select
              value={warehouseFilter}
              onValueChange={setWarehouseFilter}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t(warehouseTransferKeys.filterByWarehouse)} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t(warehouseTransferKeys.allWarehouses)}</SelectItem>
                {warehouses.map((warehouse: any) => (
                  <SelectItem key={warehouse.id} value={warehouse.id.toString()}>
                    {warehouse.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      
      {/* 调拨单表格 */}
      <Card>
        <CardHeader>
          <CardTitle>{t(warehouseTransferKeys.title)}</CardTitle>
          <CardDescription>
            {isLoadingTransfers
              ? t('loading_transfers')
              : t('total_transfers_count', { count: transfers.length })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingTransfers ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : isErrorTransfers ? (
            <div className="text-center p-8 text-gray-500">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
              <h3 className="text-lg font-medium mb-2">{t('error_loading_data')}</h3>
              <p>{t('try_refreshing_page')}</p>
            </div>
          ) : transfers.length === 0 ? (
            <div className="text-center p-8 text-gray-500">
              <Package className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium mb-2">{t(warehouseTransferKeys.noTransfersFound)}</h3>
              <p>{t('create_your_first_transfer')}</p>
              <Button onClick={handleNewTransfer} className="mt-4">
                {t(warehouseTransferKeys.newTransfer)}
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t(warehouseTransferKeys.referenceNumber)}</TableHead>
                    <TableHead>{t(warehouseTransferKeys.fromWarehouse)}</TableHead>
                    <TableHead>{t(warehouseTransferKeys.toWarehouse)}</TableHead>
                    <TableHead>{t(warehouseTransferKeys.status)}</TableHead>
                    <TableHead className="text-right">{t(warehouseTransferKeys.totalItems)}</TableHead>
                    <TableHead className="text-right">{t(warehouseTransferKeys.totalWeight)}</TableHead>
                    <TableHead>{t(warehouseTransferKeys.createdAt)}</TableHead>
                    <TableHead className="text-right">{t(warehouseTransferKeys.actions)}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedTransfers.map((transfer: WarehouseTransfer) => (
                    <TableRow key={transfer.id} className="cursor-pointer hover:bg-gray-50" onClick={() => handleViewTransfer(transfer.id)}>
                      <TableCell className="font-medium">{transfer.referenceNumber}</TableCell>
                      <TableCell>{transfer.sourceWarehouse?.name}</TableCell>
                      <TableCell>{transfer.targetWarehouse?.name}</TableCell>
                      <TableCell>{getStatusBadge(transfer.status)}</TableCell>
                      <TableCell className="text-right">{transfer.totalItems}</TableCell>
                      <TableCell className="text-right">{Number(transfer.totalWeight).toFixed(2)} kg</TableCell>
                      <TableCell>{formatDate(transfer.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewTransfer(transfer.id);
                          }}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {renderPagination()}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}