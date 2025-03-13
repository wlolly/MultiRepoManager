import React, { useState } from "react";
import { Layout } from "@/components/layout/layout";
import { StatsCard } from "@/components/dashboard/stats-card";
import { LanguageDistribution } from "@/components/dashboard/language-distribution";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { RepositoryList } from "@/components/repositories/repository-list";
import { RepositoryGrid } from "@/components/repositories/repository-grid";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { CreateRepositoryDialog } from "@/components/repositories/create-repository-dialog";
import { useTranslation } from "react-i18next";

export default function Dashboard() {
  const { t } = useTranslation();
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [languageFilter, setLanguageFilter] = useState<string>("all");
  const [userFilter, setUserFilter] = useState<string>("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // 定义接口类型
  interface Repository {
    id: number;
    name: string;
    description: string;
    visibility: string;
    language: string;
    branchCount: number;
    contributorCount: number;
    viewCount: number;
    updatedAt: string;
    owner: {
      id: number;
      username: string;
      fullName: string;
      avatarUrl: string;
    };
    contributors?: {
      id: number;
      username: string;
      fullName?: string;
      avatarUrl?: string;
    }[];
  }

  interface Stats {
    totalRepositories: number;
    totalUsers: number;
    languagesCount: number;
    recentCommits: number;
  }

  // Fetch repositories with filters
  const { data: repositories, isLoading: isLoadingRepositories } = useQuery<Repository[]>({
    queryKey: ["/api/repositories", languageFilter, userFilter],
  });

  // Fetch repository stats
  const { data: stats, isLoading: isLoadingStats } = useQuery<Stats>({
    queryKey: ["/api/stats"],
  });

  // Fetch current user (hardcoded for now)
  const currentUserId = 1;

  return (
    <Layout>
      <div className="pb-5 border-b border-gray-200 mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">管理面板</h1>
          <p className="mt-1 text-gray-500 text-sm">欢迎使用 ELEMENT-5 系统</p>
        </div>
        <div className="mt-4 sm:mt-0 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
          <Select value={languageFilter} onValueChange={setLanguageFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="所有语言" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">所有语言</SelectItem>
              <SelectItem value="javascript">JavaScript</SelectItem>
              <SelectItem value="python">Python</SelectItem>
              <SelectItem value="java">Java</SelectItem>
              <SelectItem value="go">Go</SelectItem>
              <SelectItem value="rust">Rust</SelectItem>
            </SelectContent>
          </Select>

          <Select value={userFilter} onValueChange={setUserFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="所有用户" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">所有用户</SelectItem>
              <SelectItem value="me">我的</SelectItem>
              <SelectItem value="team">团队</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatsCard 
          title="仓库总数" 
          value={isLoadingStats ? "..." : stats?.totalRepositories || 0} 
          icon="ri-git-repository-line" 
          color="blue" 
        />
        <StatsCard 
          title="用户总数" 
          value={isLoadingStats ? "..." : stats?.totalUsers || 0} 
          icon="ri-team-line" 
          color="green" 
        />
        <StatsCard 
          title="支持语言数" 
          value={isLoadingStats ? "..." : stats?.languagesCount || 0} 
          icon="ri-code-s-slash-line" 
          color="purple" 
        />
        <StatsCard 
          title="最近提交" 
          value={isLoadingStats ? "..." : stats?.recentCommits || 0} 
          icon="ri-git-commit-line" 
          color="yellow" 
        />
      </div>

      {viewMode === "list" ? (
        <RepositoryList 
          repositories={repositories || []} 
          isLoading={isLoadingRepositories} 
        />
      ) : null}

      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg leading-6 font-medium text-gray-900">仓库概览</h3>
          <div className="flex space-x-3">
            <Button
              variant={viewMode === "list" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("list")}
              className="flex items-center"
            >
              <i className="ri-list-check-2 mr-1.5"></i> 列表视图
            </Button>
            <Button
              variant={viewMode === "grid" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("grid")}
              className="flex items-center"
            >
              <i className="ri-grid-line mr-1.5"></i> 网格视图
            </Button>
            <Button
              onClick={() => setCreateDialogOpen(true)}
              className="flex items-center"
            >
              <i className="ri-add-line mr-1.5"></i> 新建仓库
            </Button>
          </div>
        </div>
        
        {viewMode === "grid" ? (
          <RepositoryGrid 
            repositories={repositories || []} 
            isLoading={isLoadingRepositories} 
          />
        ) : null}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LanguageDistribution />
        <RecentActivity />
      </div>

      <CreateRepositoryDialog 
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        currentUserId={currentUserId}
      />
    </Layout>
  );
}
