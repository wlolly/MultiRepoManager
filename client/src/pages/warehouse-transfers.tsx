import React, { useState } from "react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";


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
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // 模拟从API获取数据
  const { data: transfers, isLoading: isLoadingTransfers } = useQuery<WarehouseTransfer[]>({
    queryKey: ["/api/warehouse-transfers", statusFilter],
  });

  // 模拟从API获取统计数据
  const { data: stats, isLoading: isLoadingStats } = useQuery<TransferStats>({
    queryKey: ["/api/warehouse-transfers/stats"],
  });

  // 处理调拨单状态样式
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">{t('status_pending')}</Badge>;
      case "in_transit":
        return <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">{t('status_in_transit')}</Badge>;
      case "completed":
        return <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">{t('status_completed')}</Badge>;
      case "cancelled":
        return <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">{t('status_cancelled')}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // 渲染四个统计卡片
  const renderStatsCards = () => {
    if (isLoadingStats) {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {Array(4).fill(0).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24 mb-1" />
                <Skeleton className="h-6 w-16" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-3 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('total_transfers')}</CardDescription>
            <CardTitle>{stats?.totalTransfers || 0}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">{t('all_time_transfers')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('pending_transfers')}</CardDescription>
            <CardTitle>{stats?.pendingTransfers || 0}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">{t('require_attention')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('total_weight')}</CardDescription>
            <CardTitle>{parseFloat(String(stats?.totalWeight)).toFixed(2) || 0} kg</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">{t('past_30_days')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('total_volume')}</CardDescription>
            <CardTitle>{parseFloat(String(stats?.totalVolume)).toFixed(2) || 0} m³</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">{t('past_30_days')}</p>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
      <div className="container mx-auto py-6">
        <div className="pb-5 border-b border-gray-200 mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('warehouse_transfers')}</h1>
            <p className="mt-1 text-gray-500 text-sm">{t('warehouse_transfers_description')}</p>
          </div>
          <div className="mt-4 sm:mt-0">
            <Button asChild>
              <Link to="/warehouse-transfers/new">
                <i className="ri-add-line mr-1"></i> {t('new_transfer')}
              </Link>
            </Button>
          </div>
        </div>

        {renderStatsCards()}

        <div className="mb-4 flex justify-between items-center">
          <div className="flex space-x-2">
            <Button 
              variant={statusFilter === "all" ? "default" : "outline"} 
              size="sm" 
              onClick={() => setStatusFilter("all")}
            >
              {t('all')}
            </Button>
            <Button 
              variant={statusFilter === "pending" ? "default" : "outline"} 
              size="sm" 
              onClick={() => setStatusFilter("pending")}
            >
              {t('pending')}
            </Button>
            <Button 
              variant={statusFilter === "in_transit" ? "default" : "outline"} 
              size="sm" 
              onClick={() => setStatusFilter("in_transit")}
            >
              {t('in_transit')}
            </Button>
            <Button 
              variant={statusFilter === "completed" ? "default" : "outline"} 
              size="sm" 
              onClick={() => setStatusFilter("completed")}
            >
              {t('completed')}
            </Button>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('reference_number')}</TableHead>
                <TableHead>{t('from_warehouse')}</TableHead>
                <TableHead>{t('to_warehouse')}</TableHead>
                <TableHead>{t('items')}</TableHead>
                <TableHead>{t('total_weight')}</TableHead>
                <TableHead>{t('total_volume')}</TableHead>
                <TableHead>{t('status')}</TableHead>
                <TableHead>{t('created_at')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingTransfers ? (
                // 加载中骨架屏
                Array(5).fill(0).map((_, i) => (
                  <TableRow key={i}>
                    {Array(8).fill(0).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : transfers && transfers.length > 0 ? (
                // 有数据
                transfers.map((transfer) => (
                  <TableRow key={transfer.id}>
                    <TableCell className="font-medium">
                      <Link to={`/warehouse-transfers/${transfer.id}`} className="text-blue-600 hover:text-blue-800">
                        {transfer.referenceNumber}
                      </Link>
                    </TableCell>
                    <TableCell>{transfer.sourceWarehouse.name}</TableCell>
                    <TableCell>{transfer.targetWarehouse.name}</TableCell>
                    <TableCell>{transfer.totalItems}</TableCell>
                    <TableCell>{parseFloat(String(transfer.totalWeight)).toFixed(2)} kg</TableCell>
                    <TableCell>{parseFloat(String(transfer.totalVolume)).toFixed(3)} m³</TableCell>
                    <TableCell>{getStatusBadge(transfer.status)}</TableCell>
                    <TableCell className="text-gray-500 text-sm">
                      {new Date(transfer.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                // 无数据
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                    <div className="flex flex-col items-center justify-center">
                      <i className="ri-inbox-line text-4xl mb-2"></i>
                      <p>{t('no_transfers_found')}</p>
                      <p className="text-sm mt-1">{t('create_first_transfer')}</p>
                      <Button asChild className="mt-4">
                        <Link to="/warehouse-transfers/new">{t('create_transfer')}</Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
  );
}