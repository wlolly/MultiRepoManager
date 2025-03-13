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

  // Fetch repositories with filters
  const { data: repositories, isLoading: isLoadingRepositories } = useQuery({
    queryKey: ["/api/repositories", languageFilter, userFilter],
  });

  // Fetch repository stats
  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ["/api/stats"],
  });

  // Fetch current user (hardcoded for now)
  const currentUserId = 1;

  return (
    <Layout>
      <div className="pb-5 border-b border-gray-200 mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('dashboard.title')}</h1>
          <p className="mt-1 text-gray-500 text-sm">{t('dashboard.welcome')}</p>
        </div>
        <div className="mt-4 sm:mt-0 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
          <Select value={languageFilter} onValueChange={setLanguageFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t('repositories.all_languages')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('repositories.all_languages')}</SelectItem>
              <SelectItem value="javascript">JavaScript</SelectItem>
              <SelectItem value="python">Python</SelectItem>
              <SelectItem value="java">Java</SelectItem>
              <SelectItem value="go">Go</SelectItem>
              <SelectItem value="rust">Rust</SelectItem>
            </SelectContent>
          </Select>

          <Select value={userFilter} onValueChange={setUserFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t('repositories.all_users')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('repositories.all_users')}</SelectItem>
              <SelectItem value="me">{t('repositories.my')}</SelectItem>
              <SelectItem value="team">{t('repositories.team')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatsCard 
          title={t('dashboard.stats.totalRepositories')} 
          value={isLoadingStats ? "..." : stats?.totalRepositories || 0} 
          icon="ri-git-repository-line" 
          color="blue" 
        />
        <StatsCard 
          title={t('dashboard.stats.totalUsers')} 
          value={isLoadingStats ? "..." : stats?.totalUsers || 0} 
          icon="ri-team-line" 
          color="green" 
        />
        <StatsCard 
          title={t('dashboard.stats.totalLanguages')} 
          value={isLoadingStats ? "..." : stats?.languagesCount || 0} 
          icon="ri-code-s-slash-line" 
          color="purple" 
        />
        <StatsCard 
          title={t('dashboard.stats.recentCommits')} 
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
          <h3 className="text-lg leading-6 font-medium text-gray-900">{t('dashboard.overview')}</h3>
          <div className="flex space-x-3">
            <Button
              variant={viewMode === "list" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("list")}
              className="flex items-center"
            >
              <i className="ri-list-check-2 mr-1.5"></i> {t('list_view')}
            </Button>
            <Button
              variant={viewMode === "grid" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("grid")}
              className="flex items-center"
            >
              <i className="ri-grid-line mr-1.5"></i> {t('grid_view')}
            </Button>
            <Button
              onClick={() => setCreateDialogOpen(true)}
              className="flex items-center"
            >
              <i className="ri-add-line mr-1.5"></i> {t('repositories.newRepository')}
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
