import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Switch,
} from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

// 团队类型定义
interface Team {
  id: number;
  name: string;
  description?: string;
  ownerId: number;
  createdAt: string;
  isActive: boolean;
}

// 页面权限类型定义
interface PagePermission {
  id: number;
  teamId: number;
  pageName: string;
  canAccess: boolean;
  createdAt: string;
  updatedAt: string;
}

// 仓库权限类型定义
interface WarehousePermission {
  id: number;
  teamId: number;
  warehouseId: number;
  canView: boolean;
  canManage: boolean;
  createdAt: string;
  updatedAt: string;
}

// 仓库类型定义
interface Warehouse {
  id: number;
  name: string;
  location: string;
  capacity: string;
  createdAt: string;
}

// 页面配置
const pageConfigs = [
  { id: 'dashboard', nameKey: 'dashboard', description: 'access_dashboard_description' },
  { id: 'warehouses', nameKey: 'warehouses', description: 'access_warehouses_description' },
  { id: 'products', nameKey: 'my_products', description: 'access_products_description' },
  { id: 'warehouse-products', nameKey: 'warehouse_products', description: 'access_warehouse_products_description' },
  { id: 'inbound-orders', nameKey: 'inbound_orders', description: 'access_inbound_orders_description' },
  { id: 'outbound-orders', nameKey: 'outbound_orders', description: 'access_outbound_orders_description' },
  { id: 'warehouse-transfers', nameKey: 'warehouse_transfers', description: 'access_warehouse_transfers_description' },
  { id: 'api-configurations', nameKey: 'api_configurations', description: 'access_api_configurations_description' },
  { id: 'users', nameKey: 'users_teams', description: 'access_users_teams_description' },
  { id: 'teams', nameKey: 'teams', description: 'access_teams_description' },
  { id: 'team-permissions', nameKey: 'team_permissions', description: 'access_team_permissions_description' },
  { id: 'settings', nameKey: 'settings', description: 'access_settings_description' },
];

export default function TeamPermissionsPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('page-permissions');

  // 获取所有团队
  const { data: teams, isLoading: isLoadingTeams } = useQuery<Team[]>({
    queryKey: ['/api/teams'],
    staleTime: 60000,
  });

  // 获取所有仓库
  const { data: warehouses, isLoading: isLoadingWarehouses } = useQuery<Warehouse[]>({
    queryKey: ['/api/warehouses'],
    staleTime: 60000,
  });

  // 获取选中团队的页面权限
  const { data: pagePermissions, isLoading: isLoadingPagePermissions, refetch: refetchPagePermissions } = useQuery<PagePermission[]>({
    queryKey: ['/api/teams', selectedTeam, 'page-permissions'],
    queryFn: () => selectedTeam ? apiRequest(`/api/teams/${selectedTeam}/page-permissions`) : Promise.resolve([]),
    enabled: !!selectedTeam,
    staleTime: 60000,
  });

  // 获取选中团队的仓库权限
  const { data: warehousePermissions, isLoading: isLoadingWarehousePermissions, refetch: refetchWarehousePermissions } = useQuery<WarehousePermission[]>({
    queryKey: ['/api/teams', selectedTeam, 'warehouse-permissions'],
    queryFn: () => selectedTeam ? apiRequest(`/api/teams/${selectedTeam}/warehouse-permissions`) : Promise.resolve([]),
    enabled: !!selectedTeam,
    staleTime: 60000,
  });

  // 更新页面权限的 mutation
  const updatePagePermission = useMutation({
    mutationFn: (params: { teamId: number, pageName: string, canAccess: boolean }) => {
      return apiRequest(`/api/teams/${params.teamId}/page-permissions`, {
        method: 'POST',
        body: { 
          teamId: params.teamId, 
          pageName: params.pageName, 
          canAccess: params.canAccess 
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/teams', selectedTeam, 'page-permissions'] });
      toast({
        title: t('permission_updated'),
        description: t('page_permission_updated_success'),
      });
    },
    onError: (error) => {
      console.error('Error updating page permission:', error);
      toast({
        title: t('error'),
        description: t('page_permission_update_error'),
        variant: 'destructive',
      });
    }
  });

  // 更新仓库权限的 mutation
  const updateWarehousePermission = useMutation({
    mutationFn: (params: { teamId: number, warehouseId: number, canView: boolean, canManage: boolean }) => {
      return apiRequest(`/api/teams/${params.teamId}/warehouse-permissions`, {
        method: 'POST',
        body: { 
          teamId: params.teamId, 
          warehouseId: params.warehouseId, 
          canView: params.canView,
          canManage: params.canManage
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/teams', selectedTeam, 'warehouse-permissions'] });
      toast({
        title: t('permission_updated'),
        description: t('warehouse_permission_updated_success'),
      });
    },
    onError: (error) => {
      console.error('Error updating warehouse permission:', error);
      toast({
        title: t('error'),
        description: t('warehouse_permission_update_error'),
        variant: 'destructive',
      });
    }
  });

  // 处理页面权限变更
  const handlePagePermissionChange = (pageName: string, canAccess: boolean) => {
    if (!selectedTeam) return;

    updatePagePermission.mutate({
      teamId: parseInt(selectedTeam),
      pageName,
      canAccess,
    });
  };

  // 处理仓库查看权限变更
  const handleWarehouseViewPermissionChange = (warehouseId: number, canView: boolean) => {
    if (!selectedTeam) return;
    
    // 获取当前仓库的管理权限
    const currentPermission = warehousePermissions?.find(
      p => p.warehouseId === warehouseId
    );
    
    // 如果取消查看权限，也要取消管理权限
    const canManage = canView ? (currentPermission?.canManage || false) : false;

    updateWarehousePermission.mutate({
      teamId: parseInt(selectedTeam),
      warehouseId,
      canView,
      canManage,
    });
  };

  // 处理仓库管理权限变更
  const handleWarehouseManagePermissionChange = (warehouseId: number, canManage: boolean) => {
    if (!selectedTeam) return;
    
    // 获取当前仓库的查看权限
    const currentPermission = warehousePermissions?.find(
      p => p.warehouseId === warehouseId
    );
    
    // 如果启用管理权限，也要启用查看权限
    const canView = canManage ? true : (currentPermission?.canView || false);

    updateWarehousePermission.mutate({
      teamId: parseInt(selectedTeam),
      warehouseId,
      canView,
      canManage,
    });
  };

  // 获取页面权限状态
  const getPagePermissionStatus = (pageName: string): boolean => {
    if (!pagePermissions) return false;
    const permission = pagePermissions.find(p => p.pageName === pageName);
    return permission ? permission.canAccess : false;
  };

  // 获取仓库查看权限状态
  const getWarehouseViewPermissionStatus = (warehouseId: number): boolean => {
    if (!warehousePermissions) return false;
    const permission = warehousePermissions.find(p => p.warehouseId === warehouseId);
    return permission ? permission.canView : false;
  };

  // 获取仓库管理权限状态
  const getWarehouseManagePermissionStatus = (warehouseId: number): boolean => {
    if (!warehousePermissions) return false;
    const permission = warehousePermissions.find(p => p.warehouseId === warehouseId);
    return permission ? permission.canManage : false;
  };

  return (
    <div className="container py-6">
      <div className="pb-5 border-b border-gray-200 mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('team_permissions')}</h1>
          <p className="mt-1 text-gray-500 text-sm">{t('team_permissions_description')}</p>
        </div>
      </div>

      <div className="mb-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('select_team')}</CardTitle>
            <CardDescription>{t('select_team_description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={selectedTeam} onValueChange={setSelectedTeam}>
              <SelectTrigger className="w-full sm:w-[300px]">
                <SelectValue placeholder={t('select_team_placeholder')} />
              </SelectTrigger>
              <SelectContent>
                {isLoadingTeams ? (
                  <SelectItem value="loading" disabled>{t('loading')}</SelectItem>
                ) : teams && teams.length > 0 ? (
                  teams.map(team => (
                    <SelectItem key={team.id} value={team.id.toString()}>
                      {team.name}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-teams" disabled>{t('no_teams_available')}</SelectItem>
                )}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>

      {selectedTeam && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="page-permissions">{t('page_permissions')}</TabsTrigger>
            <TabsTrigger value="warehouse-permissions">{t('warehouse_permissions')}</TabsTrigger>
          </TabsList>

          <TabsContent value="page-permissions">
            <Card>
              <CardHeader>
                <CardTitle>{t('page_permissions')}</CardTitle>
                <CardDescription>{t('page_permissions_description')}</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingPagePermissions ? (
                  <div className="flex justify-center p-4">
                    <p>{t('loading_permissions')}</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('page')}</TableHead>
                        <TableHead>{t('description')}</TableHead>
                        <TableHead className="text-right">{t('has_access')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pageConfigs.map(page => (
                        <TableRow key={page.id}>
                          <TableCell className="font-medium">{t(page.nameKey)}</TableCell>
                          <TableCell>{t(page.description)}</TableCell>
                          <TableCell className="text-right">
                            <Switch
                              checked={getPagePermissionStatus(page.id)}
                              onCheckedChange={(checked) => handlePagePermissionChange(page.id, checked)}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="warehouse-permissions">
            <Card>
              <CardHeader>
                <CardTitle>{t('warehouse_permissions')}</CardTitle>
                <CardDescription>{t('warehouse_permissions_description')}</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingWarehousePermissions || isLoadingWarehouses ? (
                  <div className="flex justify-center p-4">
                    <p>{t('loading_permissions')}</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('warehouse_name')}</TableHead>
                        <TableHead>{t('location')}</TableHead>
                        <TableHead className="text-center">{t('can_view')}</TableHead>
                        <TableHead className="text-center">{t('can_manage')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {warehouses && warehouses.map(warehouse => (
                        <TableRow key={warehouse.id}>
                          <TableCell className="font-medium">{warehouse.name}</TableCell>
                          <TableCell>{warehouse.location}</TableCell>
                          <TableCell className="text-center">
                            <Switch
                              checked={getWarehouseViewPermissionStatus(warehouse.id)}
                              onCheckedChange={(checked) => handleWarehouseViewPermissionChange(warehouse.id, checked)}
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            <Switch
                              checked={getWarehouseManagePermissionStatus(warehouse.id)}
                              onCheckedChange={(checked) => handleWarehouseManagePermissionChange(warehouse.id, checked)}
                              disabled={!getWarehouseViewPermissionStatus(warehouse.id)}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}