import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectTrigger, 
  SelectValue, 
  SelectContent, 
  SelectItem 
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

// 页面定义
const availablePages = [
  { id: 'dashboard', name: '首页', description: '系统首页和概览数据' },
  { id: 'products', name: '产品管理', description: '产品信息查看和编辑' },
  { id: 'warehouses', name: '仓库管理', description: '仓库信息查看和编辑' },
  { id: 'inbound_orders', name: '入库单管理', description: '入库单创建和处理' },
  { id: 'outbound_orders', name: '出库单管理', description: '出库单创建和处理' },
  { id: 'warehouse_transfers', name: '仓库调拨单', description: '调拨单创建和处理' },
  { id: 'users_teams', name: '用户与团队', description: '用户和团队管理' },
  { id: 'settings', name: '系统设置', description: '系统配置选项' },
  { id: 'api_configurations', name: 'API配置', description: '第三方API连接设置' },
  { id: 'reports', name: '报表中心', description: '数据报表和分析' },
  { id: 'team_permissions', name: '权限管理', description: '团队和用户权限管理' },
];

// 团队类型定义
interface Team {
  id: number;
  name: string;
  description: string;
  isActive: boolean;
  createdAt: string;
}

// 用户类型定义
interface User {
  id: number;
  username: string;
  fullName: string;
  avatarUrl?: string;
  role: string;
}

// 团队成员类型定义
interface TeamMember {
  id: number;
  teamId: number;
  userId: number;
  isAdmin: boolean;
  user?: User;
}

// 仓库类型定义
interface Warehouse {
  id: number;
  name: string;
  location: string;
}

// 页面权限类型定义
interface PagePermission {
  id: number;
  teamId: number;
  pageName: string;
  canAccess: boolean;
}

// 仓库权限类型定义
interface WarehousePermission {
  id: number;
  teamId: number;
  warehouseId: number;
  canView: boolean;
  canManage: boolean;
  warehouse?: Warehouse;
}

/**
 * 团队权限管理页面
 * 用于管理团队的页面访问权限和仓库操作权限
 */
export default function TeamPermissions() {
  const [activeTab, setActiveTab] = useState('teams');
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // 获取团队列表
  const { data: teams, isLoading: isTeamsLoading } = useQuery({
    queryKey: ['/api/teams'],
    queryFn: async () => {
      const response = await fetch('/api/teams');
      if (!response.ok) {
        throw new Error('无法获取团队列表');
      }
      return response.json();
    }
  });

  // 获取团队成员
  const { data: teamMembers, isLoading: isTeamMembersLoading } = useQuery({
    queryKey: ['/api/teams/members', selectedTeamId],
    queryFn: async () => {
      if (!selectedTeamId) return [];
      const response = await fetch(`/api/teams/${selectedTeamId}/members`);
      if (!response.ok) {
        throw new Error('无法获取团队成员');
      }
      return response.json();
    },
    enabled: !!selectedTeamId
  });

  // 获取页面权限
  const { data: pagePermissions, isLoading: isPagePermissionsLoading } = useQuery({
    queryKey: ['/api/teams/page-permissions', selectedTeamId],
    queryFn: async () => {
      if (!selectedTeamId) return [];
      const response = await fetch(`/api/teams/${selectedTeamId}/page-permissions`);
      if (!response.ok) {
        throw new Error('无法获取页面权限');
      }
      return response.json();
    },
    enabled: !!selectedTeamId
  });

  // 获取仓库权限
  const { data: warehousePermissions, isLoading: isWarehousePermissionsLoading } = useQuery({
    queryKey: ['/api/teams/warehouse-permissions', selectedTeamId],
    queryFn: async () => {
      if (!selectedTeamId) return [];
      const response = await fetch(`/api/teams/${selectedTeamId}/warehouse-permissions`);
      if (!response.ok) {
        throw new Error('无法获取仓库权限');
      }
      return response.json();
    },
    enabled: !!selectedTeamId
  });

  // 获取仓库列表
  const { data: warehouses, isLoading: isWarehousesLoading } = useQuery({
    queryKey: ['/api/warehouses'],
    queryFn: async () => {
      const response = await fetch('/api/warehouses');
      if (!response.ok) {
        throw new Error('无法获取仓库列表');
      }
      return response.json();
    }
  });

  // 获取用户列表
  const { data: users, isLoading: isUsersLoading } = useQuery({
    queryKey: ['/api/users'],
    queryFn: async () => {
      const response = await fetch('/api/users');
      if (!response.ok) {
        throw new Error('无法获取用户列表');
      }
      return response.json();
    }
  });

  // 更新页面权限
  const updatePagePermission = useMutation({
    mutationFn: async ({ teamId, pageName, canAccess }: { teamId: number, pageName: string, canAccess: boolean }) => {
      return apiRequest(`/api/teams/${teamId}/page-permissions`, {
        method: 'PUT',
        body: JSON.stringify({ pageName, canAccess }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/teams/page-permissions', selectedTeamId] });
      toast.success('页面权限设置已成功更新');
    },
    onError: (error) => {
      toast.error(`无法更新页面权限: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  });

  // 更新仓库权限
  const updateWarehousePermission = useMutation({
    mutationFn: async ({ teamId, warehouseId, canView, canManage }: { teamId: number, warehouseId: number, canView: boolean, canManage: boolean }) => {
      return apiRequest(`/api/teams/${teamId}/warehouse-permissions`, {
        method: 'PUT',
        body: JSON.stringify({ warehouseId, canView, canManage }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/teams/warehouse-permissions', selectedTeamId] });
      toast({
        title: '权限已更新',
        description: '仓库权限设置已成功更新',
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: '更新失败',
        description: `无法更新仓库权限: ${error instanceof Error ? error.message : '未知错误'}`,
      });
    }
  });

  // 添加团队成员
  const addTeamMember = useMutation({
    mutationFn: async ({ teamId, userId, isAdmin }: { teamId: number, userId: number, isAdmin: boolean }) => {
      return apiRequest(`/api/teams/${teamId}/members`, {
        method: 'POST',
        body: JSON.stringify({ userId, isAdmin }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/teams/members', selectedTeamId] });
      toast({
        title: '成员已添加',
        description: '团队成员已成功添加',
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: '添加失败',
        description: `无法添加团队成员: ${error instanceof Error ? error.message : '未知错误'}`,
      });
    }
  });

  // 移除团队成员
  const removeTeamMember = useMutation({
    mutationFn: async ({ teamId, userId }: { teamId: number, userId: number }) => {
      return apiRequest(`/api/teams/${teamId}/members/${userId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/teams/members', selectedTeamId] });
      toast({
        title: '成员已移除',
        description: '团队成员已成功移除',
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: '移除失败',
        description: `无法移除团队成员: ${error instanceof Error ? error.message : '未知错误'}`,
      });
    }
  });

  // 创建新团队
  const createTeam = useMutation({
    mutationFn: async ({ name, description }: { name: string, description: string }) => {
      return apiRequest('/api/teams', {
        method: 'POST',
        body: JSON.stringify({ name, description, isActive: true }),
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/teams'] });
      setSelectedTeamId(data.id);
      toast({
        title: '团队已创建',
        description: '新团队已成功创建',
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: '创建失败',
        description: `无法创建团队: ${error instanceof Error ? error.message : '未知错误'}`,
      });
    }
  });

  // 当选中团队更改时
  useEffect(() => {
    if (teams && teams.length > 0 && !selectedTeamId) {
      setSelectedTeamId(teams[0].id);
    }
  }, [teams, selectedTeamId]);

  // 检查页面是否有权限
  const hasPagePermission = (pageName: string) => {
    if (!pagePermissions) return false;
    const permission = pagePermissions.find((p: PagePermission) => p.pageName === pageName);
    return permission ? permission.canAccess : false;
  };

  // 检查仓库权限
  const getWarehousePermission = (warehouseId: number) => {
    if (!warehousePermissions) return { canView: false, canManage: false };
    const permission = warehousePermissions.find((p: WarehousePermission) => p.warehouseId === warehouseId);
    return permission ? { canView: permission.canView, canManage: permission.canManage } : { canView: false, canManage: false };
  };

  // 处理页面权限变更
  const handlePagePermissionChange = (pageName: string, checked: boolean) => {
    if (!selectedTeamId) return;
    
    updatePagePermission.mutate({
      teamId: selectedTeamId,
      pageName,
      canAccess: checked
    });
  };

  // 处理仓库查看权限变更
  const handleWarehouseViewChange = (warehouseId: number, checked: boolean) => {
    if (!selectedTeamId) return;
    const currentPermission = getWarehousePermission(warehouseId);
    
    updateWarehousePermission.mutate({
      teamId: selectedTeamId,
      warehouseId,
      canView: checked,
      canManage: checked ? currentPermission.canManage : false // 如果取消查看权限，同时取消管理权限
    });
  };

  // 处理仓库管理权限变更
  const handleWarehouseManageChange = (warehouseId: number, checked: boolean) => {
    if (!selectedTeamId) return;
    const currentPermission = getWarehousePermission(warehouseId);
    
    updateWarehousePermission.mutate({
      teamId: selectedTeamId,
      warehouseId,
      canView: checked ? true : currentPermission.canView, // 如果授予管理权限，必须同时授予查看权限
      canManage: checked
    });
  };

  // 团队列表过滤
  const filteredTeams = teams ? teams.filter((team: Team) => 
    team.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (team.description && team.description.toLowerCase().includes(searchTerm.toLowerCase()))
  ) : [];

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">团队权限管理</h1>
        <div className="flex gap-4">
          <Button variant="outline" onClick={() => {
            // 实现创建团队逻辑
            const name = prompt('请输入团队名称');
            const description = prompt('请输入团队描述');
            if (name) {
              createTeam.mutate({ name, description: description || '' });
            }
          }}>
            创建团队
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* 左侧团队列表 */}
        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>团队列表</CardTitle>
              <div className="mt-2">
                <Input 
                  placeholder="搜索团队..." 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent>
              {isTeamsLoading ? (
                <div className="text-center py-4">加载中...</div>
              ) : filteredTeams.length === 0 ? (
                <div className="text-center py-4 text-gray-500">未找到团队</div>
              ) : (
                <div className="space-y-2">
                  {filteredTeams.map((team: Team) => (
                    <div 
                      key={team.id} 
                      className={`p-3 rounded-md cursor-pointer ${selectedTeamId === team.id ? 'bg-primary/10' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                      onClick={() => setSelectedTeamId(team.id)}
                    >
                      <div className="font-medium">{team.name}</div>
                      {team.description && (
                        <div className="text-sm text-gray-500 dark:text-gray-400 truncate">{team.description}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 右侧权限管理 */}
        <div className="md:col-span-3">
          {!selectedTeamId ? (
            <Card>
              <CardContent className="p-6 text-center text-gray-500">
                请选择一个团队来管理权限
              </CardContent>
            </Card>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="members">团队成员</TabsTrigger>
                <TabsTrigger value="pages">页面权限</TabsTrigger>
                <TabsTrigger value="warehouses">仓库权限</TabsTrigger>
              </TabsList>

              {/* 团队成员管理 */}
              <TabsContent value="members">
                <Card>
                  <CardHeader>
                    <CardTitle>团队成员管理</CardTitle>
                    <div className="flex mt-2">
                      <div className="flex-1 mr-4">
                        <Select onValueChange={(value) => {
                          // 处理添加成员
                          const userId = parseInt(value);
                          if (userId && selectedTeamId) {
                            addTeamMember.mutate({
                              teamId: selectedTeamId,
                              userId,
                              isAdmin: false
                            });
                          }
                        }}>
                          <SelectTrigger>
                            <SelectValue placeholder="添加成员..." />
                          </SelectTrigger>
                          <SelectContent>
                            {users && users
                              .filter((user: User) => 
                                !teamMembers || !teamMembers.some((member: TeamMember) => member.userId === user.id))
                              .map((user: User) => (
                                <SelectItem key={user.id} value={user.id.toString()}>
                                  {user.fullName || user.username}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {isTeamMembersLoading ? (
                      <div className="text-center py-4">加载中...</div>
                    ) : !teamMembers || teamMembers.length === 0 ? (
                      <div className="text-center py-4 text-gray-500">该团队暂无成员</div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>用户名</TableHead>
                            <TableHead>姓名</TableHead>
                            <TableHead>管理员</TableHead>
                            <TableHead className="text-right">操作</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {teamMembers.map((member: TeamMember) => (
                            <TableRow key={member.id}>
                              <TableCell>{member.user?.username}</TableCell>
                              <TableCell>{member.user?.fullName}</TableCell>
                              <TableCell>
                                <Switch 
                                  checked={member.isAdmin} 
                                  onCheckedChange={(checked) => {
                                    // 更新团队成员权限
                                    if (selectedTeamId) {
                                      updatePagePermission.mutate({
                                        teamId: selectedTeamId,
                                        pageName: `member_${member.userId}_admin`,
                                        canAccess: checked
                                      });
                                    }
                                  }} 
                                />
                              </TableCell>
                              <TableCell className="text-right">
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => {
                                    if (selectedTeamId && window.confirm('确定要移除此成员吗？')) {
                                      removeTeamMember.mutate({
                                        teamId: selectedTeamId,
                                        userId: member.userId
                                      });
                                    }
                                  }}
                                >
                                  移除
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* 页面权限管理 */}
              <TabsContent value="pages">
                <Card>
                  <CardHeader>
                    <CardTitle>页面访问权限</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isPagePermissionsLoading ? (
                      <div className="text-center py-4">加载中...</div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>页面名称</TableHead>
                            <TableHead>描述</TableHead>
                            <TableHead className="text-right">访问权限</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {availablePages.map((page) => (
                            <TableRow key={page.id}>
                              <TableCell className="font-medium">{page.name}</TableCell>
                              <TableCell>{page.description}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end space-x-2">
                                  <Checkbox 
                                    id={`page-${page.id}`}
                                    checked={hasPagePermission(page.id)}
                                    onCheckedChange={(checked) => 
                                      handlePagePermissionChange(page.id, checked === true)
                                    }
                                  />
                                  <Label htmlFor={`page-${page.id}`} className="cursor-pointer">
                                    允许访问
                                  </Label>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* 仓库权限管理 */}
              <TabsContent value="warehouses">
                <Card>
                  <CardHeader>
                    <CardTitle>仓库操作权限</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isWarehousePermissionsLoading || isWarehousesLoading ? (
                      <div className="text-center py-4">加载中...</div>
                    ) : !warehouses || warehouses.length === 0 ? (
                      <div className="text-center py-4 text-gray-500">系统中暂无仓库</div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>仓库名称</TableHead>
                            <TableHead>位置</TableHead>
                            <TableHead>查看权限</TableHead>
                            <TableHead>管理权限</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {warehouses.map((warehouse: Warehouse) => {
                            const permission = getWarehousePermission(warehouse.id);
                            return (
                              <TableRow key={warehouse.id}>
                                <TableCell className="font-medium">{warehouse.name}</TableCell>
                                <TableCell>{warehouse.location}</TableCell>
                                <TableCell>
                                  <div className="flex items-center space-x-2">
                                    <Checkbox 
                                      id={`warehouse-view-${warehouse.id}`}
                                      checked={permission.canView}
                                      onCheckedChange={(checked) => 
                                        handleWarehouseViewChange(warehouse.id, checked === true)
                                      }
                                    />
                                    <Label htmlFor={`warehouse-view-${warehouse.id}`} className="cursor-pointer">
                                      允许查看
                                    </Label>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center space-x-2">
                                    <Checkbox 
                                      id={`warehouse-manage-${warehouse.id}`}
                                      checked={permission.canManage}
                                      disabled={!permission.canView}
                                      onCheckedChange={(checked) => 
                                        handleWarehouseManageChange(warehouse.id, checked === true)
                                      }
                                    />
                                    <Label htmlFor={`warehouse-manage-${warehouse.id}`} className="cursor-pointer">
                                      允许管理
                                    </Label>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </div>
  );
}