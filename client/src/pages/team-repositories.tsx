import React, { useState } from "react";
import { Layout } from "@/components/layout/layout";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "react-i18next";

// 定义类型接口
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

interface TeamRepository {
  id: number;
  teamId: number;
  repositoryId: number;
  repository: Repository;
}

interface Team {
  id: number;
  name: string;
  description?: string;
  ownerId: number;
  createdAt: string;
}

export default function TeamRepositories() {
  const { t } = useTranslation();
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [selectedTeam, setSelectedTeam] = useState<string>("");
  const [languageFilter, setLanguageFilter] = useState<string>("all");

  // Fetch teams
  const { data: teamsData, isLoading: isLoadingTeams } = useQuery<Team[]>({
    queryKey: ["/api/teams"],
  });
  // 确保teams是一个数组
  const teams: Team[] = Array.isArray(teamsData) ? teamsData : [];

  // Fetch team repositories
  const { data: teamRepositoriesData, isLoading: isLoadingRepositories } = useQuery<TeamRepository[]>({
    queryKey: [`/api/teams/${selectedTeam}/repositories${languageFilter !== "all" ? `?language=${languageFilter}` : ""}`],
    enabled: !!selectedTeam,
  });
  
  // 确保teamRepositories是一个数组
  const teamRepositories: TeamRepository[] = Array.isArray(teamRepositoriesData) ? teamRepositoriesData : [];

  // Extract repositories from the team repositories response
  const repositories: Repository[] = teamRepositories.map((tr) => tr.repository);

  return (
    <Layout>
      <div className="pb-5 border-b border-gray-200 mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('repositories.team', 'Team Repositories')}</h1>
          <p className="mt-1 text-gray-500 text-sm">{t('repositories.teamDescription', 'Collaborate with your team on shared repositories')}</p>
        </div>
        <div className="mt-4 sm:mt-0 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
          <Select value={selectedTeam} onValueChange={setSelectedTeam}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t('repositories.selectTeam', 'Select Team')} />
            </SelectTrigger>
            <SelectContent>
              {isLoadingTeams ? (
                <SelectItem value="loading" disabled>{t('general.loading', 'Loading teams...')}</SelectItem>
              ) : teams && teams.length > 0 ? (
                teams.map((team: Team) => (
                  <SelectItem key={team.id} value={team.id.toString()}>
                    {team.name}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="no-teams" disabled>{t('repositories.noTeams', 'No teams available')}</SelectItem>
              )}
            </SelectContent>
          </Select>

          <Select 
            value={languageFilter} 
            onValueChange={setLanguageFilter}
            disabled={!selectedTeam}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t('dashboard.allLanguages', 'All Languages')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('dashboard.allLanguages', 'All Languages')}</SelectItem>
              <SelectItem value="javascript">JavaScript</SelectItem>
              <SelectItem value="python">Python</SelectItem>
              <SelectItem value="java">Java</SelectItem>
              <SelectItem value="go">Go</SelectItem>
              <SelectItem value="rust">Rust</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectedTeam ? (
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg leading-6 font-medium text-gray-900">{t('repositories.team', 'Team Repositories')}</h3>
            <div className="flex space-x-3">
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("list")}
                className="flex items-center"
              >
                <i className="ri-list-check-2 mr-1.5"></i> {t('dashboard.listView', 'List View')}
              </Button>
              <Button
                variant={viewMode === "grid" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("grid")}
                className="flex items-center"
              >
                <i className="ri-grid-line mr-1.5"></i> {t('dashboard.gridView', 'Grid View')}
              </Button>
            </div>
          </div>
          
          {viewMode === "list" ? (
            <RepositoryList 
              repositories={repositories} 
              isLoading={isLoadingRepositories}
              title={t('repositories.team', 'Team Repositories')}
              subtitle={t('repositories.teamDescription', 'Repositories shared with your team')}
            />
          ) : (
            <RepositoryGrid 
              repositories={repositories} 
              isLoading={isLoadingRepositories} 
            />
          )}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{t('repositories.selectTeam', 'Select a Team')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-500">{t('repositories.teamSelectPrompt', 'Please select a team to view its repositories')}</p>
            
            {isLoadingTeams ? (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="p-4">
                    <Skeleton className="h-5 w-1/2 mb-2" />
                    <Skeleton className="h-4 w-full" />
                  </Card>
                ))}
              </div>
            ) : teams && teams.length > 0 ? (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {teams.map((team: any) => (
                  <Card 
                    key={team.id} 
                    className="p-4 cursor-pointer hover:bg-gray-50"
                    onClick={() => setSelectedTeam(team.id.toString())}
                  >
                    <h4 className="font-medium text-gray-900">{team.name}</h4>
                    <p className="text-sm text-gray-500">{team.description || t('repositories.noDescription', 'No description')}</p>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="mt-4 text-center p-8 border rounded-md">
                <p>{t('repositories.noTeams', 'No teams available')}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </Layout>
  );
}
