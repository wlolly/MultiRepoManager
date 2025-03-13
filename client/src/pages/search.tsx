import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout/layout";
import { RepositoryList } from "@/components/repositories/repository-list";
import { RepositoryGrid } from "@/components/repositories/repository-grid";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";

export default function Search() {
  const [location, setLocation] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const initialQuery = searchParams.get("q") || "";
  
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [activeTab, setActiveTab] = useState("repositories");
  const [languageFilter, setLanguageFilter] = useState<string>("all");
  const [visibilityFilter, setVisibilityFilter] = useState<string>("all");
  
  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    
    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery]);
  
  // Update URL when debounced query changes
  useEffect(() => {
    if (debouncedQuery) {
      setLocation(`/search?q=${encodeURIComponent(debouncedQuery)}`);
    } else {
      setLocation("/search");
    }
  }, [debouncedQuery, setLocation]);
  
  // Submit search form
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDebouncedQuery(searchQuery);
  };
  
  // Fetch repositories based on search query and filters
  const { data: repositories, isLoading: isLoadingRepositories } = useQuery({
    queryKey: [
      "/api/repositories", 
      debouncedQuery, 
      languageFilter, 
      visibilityFilter
    ],
    enabled: debouncedQuery.length > 0,
  });
  
  // Fetch users based on search query
  const { data: users, isLoading: isLoadingUsers } = useQuery({
    queryKey: ["/api/users", debouncedQuery],
    enabled: debouncedQuery.length > 0 && activeTab === "users",
  });
  
  // Filter repositories client-side for demo purposes
  // In a real application, the filtering would be handled by the API
  const filteredRepositories = repositories?.filter((repo: any) => {
    if (languageFilter !== "all" && repo.language !== languageFilter) {
      return false;
    }
    if (visibilityFilter !== "all" && repo.visibility !== visibilityFilter) {
      return false;
    }
    return true;
  });

  return (
    <Layout>
      <div className="pb-5 border-b border-gray-200 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Search</h1>
        <p className="mt-1 text-gray-500 text-sm">Find repositories, users, and more</p>
      </div>
      
      <div className="max-w-3xl mx-auto mb-6">
        <form onSubmit={handleSearchSubmit}>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <i className="ri-search-line text-gray-400"></i>
            </div>
            <Input
              type="text"
              className="pl-10 py-6 text-lg"
              placeholder="Search repositories, users, or code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              {searchQuery && (
                <button
                  type="button"
                  className="text-gray-400 hover:text-gray-500"
                  onClick={() => setSearchQuery("")}
                >
                  <i className="ri-close-line text-xl"></i>
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
      
      <Tabs defaultValue="repositories" value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <TabsList>
            <TabsTrigger value="repositories">Repositories</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="code">Code</TabsTrigger>
          </TabsList>
          
          {activeTab === "repositories" && (
            <div className="flex space-x-3">
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("list")}
                className="flex items-center"
              >
                <i className="ri-list-check-2 mr-1.5"></i> List
              </Button>
              <Button
                variant={viewMode === "grid" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("grid")}
                className="flex items-center"
              >
                <i className="ri-grid-line mr-1.5"></i> Grid
              </Button>
            </div>
          )}
        </div>
        
        <div className="flex space-x-3 mb-4">
          {activeTab === "repositories" && (
            <>
              <Select value={languageFilter} onValueChange={setLanguageFilter}>
                <SelectTrigger className="w-[150px]">
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

              <Select value={visibilityFilter} onValueChange={setVisibilityFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="All Visibility" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Visibility</SelectItem>
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="private">Private</SelectItem>
                  <SelectItem value="internal">Internal</SelectItem>
                </SelectContent>
              </Select>
            </>
          )}
        </div>
        
        <TabsContent value="repositories">
          {debouncedQuery ? (
            <>
              {viewMode === "list" ? (
                <RepositoryList 
                  repositories={filteredRepositories || []} 
                  isLoading={isLoadingRepositories}
                  title={`Search Results for "${debouncedQuery}"`}
                  subtitle={`Found ${filteredRepositories?.length || 0} repositories matching your query`}
                />
              ) : (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Search Results for "{debouncedQuery}"
                  </h3>
                  <RepositoryGrid 
                    repositories={filteredRepositories || []} 
                    isLoading={isLoadingRepositories} 
                  />
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl text-gray-300 mb-4">
                <i className="ri-search-line"></i>
              </div>
              <h3 className="text-lg font-medium text-gray-500">
                Enter a search term to find repositories
              </h3>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="users">
          {debouncedQuery ? (
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <div className="px-4 py-5 border-b border-gray-200 sm:px-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  Users matching "{debouncedQuery}"
                </h3>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">
                  Found {users?.length || 0} users matching your query
                </p>
              </div>
              
              {isLoadingUsers ? (
                <div className="p-4">Loading users...</div>
              ) : users && users.length > 0 ? (
                <ul className="divide-y divide-gray-200">
                  {users.map((user: any) => (
                    <li key={user.id}>
                      <div className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <img
                              className="h-12 w-12 rounded-full"
                              src={user.avatarUrl || "https://via.placeholder.com/40"}
                              alt={user.fullName || user.username}
                            />
                          </div>
                          <div className="ml-4">
                            <h4 className="text-lg font-medium text-gray-900">
                              {user.fullName || user.username}
                            </h4>
                            <p className="text-sm text-gray-500">@{user.username}</p>
                          </div>
                          <div className="ml-auto">
                            <Button variant="outline" size="sm">
                              View Profile
                            </Button>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No users found matching "{debouncedQuery}"
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl text-gray-300 mb-4">
                <i className="ri-user-search-line"></i>
              </div>
              <h3 className="text-lg font-medium text-gray-500">
                Enter a search term to find users
              </h3>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="code">
          <div className="text-center py-12">
            <div className="text-6xl text-gray-300 mb-4">
              <i className="ri-code-line"></i>
            </div>
            <h3 className="text-lg font-medium text-gray-500 mb-2">
              Code search is not available in this preview
            </h3>
            <p className="text-gray-400">
              This feature will allow searching within repository code files
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </Layout>
  );
}
