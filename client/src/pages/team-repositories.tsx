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

export default function TeamRepositories() {
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [selectedTeam, setSelectedTeam] = useState<string>("");
  const [languageFilter, setLanguageFilter] = useState<string>("all");

  // Fetch teams
  const { data: teams, isLoading: isLoadingTeams } = useQuery({
    queryKey: ["/api/teams"],
  });

  // Fetch team repositories
  const { data: teamRepositories, isLoading: isLoadingRepositories } = useQuery({
    queryKey: [`/api/teams/${selectedTeam}/repositories${languageFilter !== "all" ? `?language=${languageFilter}` : ""}`],
    enabled: !!selectedTeam,
  });

  // Extract repositories from the team repositories response
  const repositories = teamRepositories?.map((tr: any) => tr.repository) || [];

  return (
    <Layout>
      <div className="pb-5 border-b border-gray-200 mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team Repositories</h1>
          <p className="mt-1 text-gray-500 text-sm">Collaborate with your team on shared repositories</p>
        </div>
        <div className="mt-4 sm:mt-0 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
          <Select value={selectedTeam} onValueChange={setSelectedTeam}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select Team" />
            </SelectTrigger>
            <SelectContent>
              {isLoadingTeams ? (
                <SelectItem value="loading" disabled>Loading teams...</SelectItem>
              ) : teams && teams.length > 0 ? (
                teams.map((team: any) => (
                  <SelectItem key={team.id} value={team.id.toString()}>
                    {team.name}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="no-teams" disabled>No teams available</SelectItem>
              )}
            </SelectContent>
          </Select>

          <Select 
            value={languageFilter} 
            onValueChange={setLanguageFilter}
            disabled={!selectedTeam}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Languages" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Languages</SelectItem>
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
            <h3 className="text-lg leading-6 font-medium text-gray-900">Team Repositories</h3>
            <div className="flex space-x-3">
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("list")}
                className="flex items-center"
              >
                <i className="ri-list-check-2 mr-1.5"></i> List View
              </Button>
              <Button
                variant={viewMode === "grid" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("grid")}
                className="flex items-center"
              >
                <i className="ri-grid-line mr-1.5"></i> Grid View
              </Button>
            </div>
          </div>
          
          {viewMode === "list" ? (
            <RepositoryList 
              repositories={repositories} 
              isLoading={isLoadingRepositories}
              title="Team Repositories"
              subtitle="Repositories shared with your team"
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
            <CardTitle>Select a Team</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-500">Please select a team to view its repositories</p>
            
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
                    <p className="text-sm text-gray-500">{team.description || "No description"}</p>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="mt-4 text-center p-8 border rounded-md">
                <p>No teams available</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </Layout>
  );
}
