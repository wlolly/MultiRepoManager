import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuthStatus } from '@/hooks/use-auth-status';

/**
 * 团队权限钩子接口
 */
interface TeamPermissionsHook {
  loading: boolean;
  // 团队相关
  userTeams: Team[];
  activeTeamId: number | null;
  setActiveTeamId: (teamId: number | null) => void;
  isTeamAdmin: boolean;
  // 团队成员相关
  teamMembers: TeamMember[];
  // 权限检查函数
  canManageTeamMembers: () => boolean;
  canManageTeamWarehouses: () => boolean;
  // 刷新数据
  refreshTeamData: () => void;
}

/**
 * 团队信息接口
 */
interface Team {
  id: number;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
}

/**
 * 团队成员信息接口
 */
interface TeamMember {
  id: number;
  teamId: number;
  userId: number;
  isAdmin: boolean;
  user?: {
    id: number;
    username: string;
    fullName: string;
    email?: string;
  };
}

/**
 * 团队权限钩子
 * 用于管理团队相关的权限和数据
 */
export function useTeamPermissions(): TeamPermissionsHook {
  const [loading, setLoading] = useState(true);
  const [userTeams, setUserTeams] = useState<Team[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [activeTeamId, setActiveTeamId] = useState<number | null>(null);
  const [isTeamAdmin, setIsTeamAdmin] = useState(false);
  
  const { toast } = useToast();
  const { realAuthenticated, user } = useAuthStatus();
  
  // 获取用户团队数据
  const fetchTeamData = async () => {
    if (!realAuthenticated) {
      // 未真实登录用户无法获取团队数据
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      
      // 获取用户所在的团队
      const teamsResponse = await fetch('/api/teams/my-teams', {
        credentials: 'include'
      });
      
      if (teamsResponse.ok) {
        const teamsData = await teamsResponse.json();
        setUserTeams(teamsData);
        
        // 如果有主要团队，设置为活动团队
        if (user?.primaryTeamId && teamsData.some((team: Team) => team.id === user.primaryTeamId)) {
          setActiveTeamId(user.primaryTeamId);
        } 
        // 否则使用第一个团队
        else if (teamsData.length > 0) {
          setActiveTeamId(teamsData[0].id);
        }
      } else {
        console.error('获取团队列表失败:', await teamsResponse.text());
        setUserTeams([]);
      }
      
      // 检查活动团队的权限
      await updateActiveTeamData();
      
    } catch (error) {
      console.error('获取团队数据时出错:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // 更新活动团队数据
  const updateActiveTeamData = async () => {
    if (!activeTeamId || !realAuthenticated) {
      // 无活动团队或未登录
      setTeamMembers([]);
      setIsTeamAdmin(false);
      return;
    }
    
    try {
      // 获取团队成员信息
      const membersResponse = await fetch(`/api/teams/${activeTeamId}/members`, {
        credentials: 'include'
      });
      
      if (membersResponse.ok) {
        const membersData = await membersResponse.json();
        setTeamMembers(membersData);
        
        // 检查当前用户是否为团队管理员
        if (user) {
          const currentUserMember = membersData.find((member: TeamMember) => member.userId === user.id);
          setIsTeamAdmin(!!currentUserMember?.isAdmin);
        }
      } else {
        console.error('获取团队成员失败:', await membersResponse.text());
        setTeamMembers([]);
        setIsTeamAdmin(false);
      }
    } catch (error) {
      console.error('获取团队成员数据时出错:', error);
      setTeamMembers([]);
      setIsTeamAdmin(false);
    }
  };
  
  // 当活动团队变更时，更新数据
  useEffect(() => {
    updateActiveTeamData();
  }, [activeTeamId]);
  
  // 组件初始化时获取团队数据
  useEffect(() => {
    if (realAuthenticated) {
      fetchTeamData();
    } else {
      setLoading(false);
    }
  }, [realAuthenticated]);
  
  // 检查是否可以管理团队成员
  const canManageTeamMembers = (): boolean => {
    // 需要是团队管理员或系统管理员
    return isTeamAdmin || user?.role === 'admin' || user?.role === 'super_admin';
  };
  
  // 检查是否可以管理团队仓库
  const canManageTeamWarehouses = (): boolean => {
    // 需要是团队管理员或系统管理员
    return isTeamAdmin || user?.role === 'admin' || user?.role === 'super_admin';
  };
  
  // 刷新团队数据
  const refreshTeamData = () => {
    fetchTeamData();
  };
  
  return {
    loading,
    userTeams,
    activeTeamId,
    setActiveTeamId,
    isTeamAdmin,
    teamMembers,
    canManageTeamMembers,
    canManageTeamWarehouses,
    refreshTeamData
  };
}