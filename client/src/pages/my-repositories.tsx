import React, { useState } from "react";
import { useTranslation } from "react-i18next";
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
import { CreateRepositoryDialog } from "@/components/repositories/create-repository-dialog";

export default function MyRepositories() {
  const { t } = useTranslation();
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [languageFilter, setLanguageFilter] = useState<string>("all");
  const [visibilityFilter, setVisibilityFilter] = useState<string>("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // Hardcoded current user ID (in a real app, this would come from authentication)
  const currentUserId = 1;

  // Fetch user's repositories with filters
  const { data: repositories = [], isLoading } = useQuery({
    queryKey: [`/api/repositories?ownerId=${currentUserId}${languageFilter !== "all" ? `&language=${languageFilter}` : ""}${visibilityFilter !== "all" ? `&visibility=${visibilityFilter}` : ""}`],
  });

  return (
    <Layout>
      <div className="pb-5 border-b border-gray-200 mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('repositories.my', 'My Repositories')}</h1>
          <p className="mt-1 text-gray-500 text-sm">{t('repositories.recentDescription', 'Manage your personal repositories')}</p>
        </div>
        <div className="mt-4 sm:mt-0 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
          <Select value={languageFilter} onValueChange={setLanguageFilter}>
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

          <Select value={visibilityFilter} onValueChange={setVisibilityFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t('repositories.all_visibility', 'All Visibility')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('repositories.all_visibility', 'All Visibility')}</SelectItem>
              <SelectItem value="public">Public</SelectItem>
              <SelectItem value="private">Private</SelectItem>
              <SelectItem value="internal">Internal</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg leading-6 font-medium text-gray-900">{t('repositories.my', 'My Repositories')}</h3>
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
            <Button
              onClick={() => setCreateDialogOpen(true)}
              className="flex items-center"
            >
              <i className="ri-add-line mr-1.5"></i> {t('repositories.newRepository', 'New Repository')}
            </Button>
          </div>
        </div>
        
        {viewMode === "list" ? (
          <RepositoryList 
            repositories={repositories || []} 
            isLoading={isLoading}
            title={t('repositories.my', 'My Repositories')}
            subtitle={t('repositories.recentDescription', 'Your personal repositories')}
          />
        ) : (
          <RepositoryGrid 
            repositories={repositories || []} 
            isLoading={isLoading} 
          />
        )}
      </div>

      <CreateRepositoryDialog 
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        currentUserId={currentUserId}
      />
    </Layout>
  );
}
