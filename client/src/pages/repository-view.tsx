import React, { useState } from "react";
import { Layout } from "@/components/layout/layout";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useParams, Link } from "wouter";

export default function RepositoryView() {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState("overview");
  const { toast } = useToast();

  // Fetch repository data
  const { data: repository, isLoading: isLoadingRepo } = useQuery({
    queryKey: [`/api/repositories/${id}`],
    enabled: !!id,
  });

  // Fetch repository owner
  const { data: owner, isLoading: isLoadingOwner } = useQuery({
    queryKey: [`/api/users/${repository?.ownerId}`],
    enabled: !!repository?.ownerId,
  });

  // Fetch repository activities
  const { data: activities, isLoading: isLoadingActivities } = useQuery({
    queryKey: [`/api/activities?repositoryId=${id}&limit=10`],
    enabled: !!id,
  });

  const handleClone = () => {
    if (repository && owner) {
      const cloneUrl = `git clone https://github.com/${owner.username}/${repository.name}.git`;
      navigator.clipboard.writeText(cloneUrl);
      toast({
        title: "Clone URL copied",
        description: "Repository clone URL copied to clipboard",
      });
    }
  };

  const getVisibilityBadge = (visibility: string) => {
    switch (visibility) {
      case "public":
        return <Badge className="bg-green-100 text-green-800">Public</Badge>;
      case "private":
        return <Badge className="bg-red-100 text-red-800">Private</Badge>;
      case "internal":
        return <Badge className="bg-yellow-100 text-yellow-800">Internal</Badge>;
      default:
        return null;
    }
  };

  const getLanguageColor = (language: string) => {
    const colors: Record<string, string> = {
      javascript: "bg-yellow-400",
      typescript: "bg-blue-400",
      python: "bg-blue-400",
      java: "bg-orange-400",
      go: "bg-green-400",
      rust: "bg-red-400",
      cpp: "bg-purple-400",
      other: "bg-gray-400",
    };
    return colors[language] || colors.other;
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return "today";
    if (diffInDays === 1) return "yesterday";
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
    if (diffInDays < 365) return `${Math.floor(diffInDays / 30)} months ago`;
    return `${Math.floor(diffInDays / 365)} years ago`;
  };

  if (isLoadingRepo || isLoadingOwner) {
    return (
      <Layout>
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-6 w-20" />
          </div>
          <Skeleton className="h-4 w-full max-w-md" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
            <div className="lg:col-span-2">
              <Skeleton className="h-64 w-full" />
            </div>
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </Layout>
    );
  }

  if (!repository) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-12">
          <div className="text-4xl text-red-500 mb-4">
            <i className="ri-error-warning-line"></i>
          </div>
          <h3 className="text-xl font-medium mb-2">Repository Not Found</h3>
          <p className="text-gray-500 mb-6">
            The repository you are looking for does not exist or you don't have permission to view it.
          </p>
          <Link href="/">
            <Button>
              <i className="ri-arrow-left-line mr-2"></i>
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="pb-5 border-b border-gray-200 mb-6 flex flex-col md:flex-row justify-between items-start md:items-center">
        <div className="flex items-center flex-wrap">
          <div className="flex items-center">
            <i className="ri-git-repository-line text-2xl mr-3 text-gray-500"></i>
            <h1 className="text-2xl font-bold text-gray-900 mr-2">{repository.name}</h1>
          </div>
          <div className="mt-2 md:mt-0">
            {getVisibilityBadge(repository.visibility)}
          </div>
        </div>
        <div className="mt-4 md:mt-0 flex space-x-2">
          <Button variant="outline" onClick={handleClone}>
            <i className="ri-git-branch-line mr-2"></i>
            Clone
          </Button>
          {owner && repository.ownerId === 1 && (
            <Link href={`/repository/${repository.id}/edit`}>
              <Button variant="outline">
                <i className="ri-edit-line mr-2"></i>
                Edit
              </Button>
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="files">Files</TabsTrigger>
              <TabsTrigger value="branches">Branches</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview">
              <Card>
                <CardHeader>
                  <CardTitle>About</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">{repository.description || "No description provided"}</p>
                  
                  <div className="mt-6 grid grid-cols-2 gap-4">
                    <div className="flex items-center">
                      <span className="text-gray-500 mr-2"><i className="ri-user-line"></i></span>
                      <div>
                        <p className="text-sm text-gray-500">Owner</p>
                        <p className="font-medium">{owner?.fullName || owner?.username || "Unknown"}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center">
                      <span className={`w-3 h-3 rounded-full ${getLanguageColor(repository.language || 'other')} mr-2`}></span>
                      <div>
                        <p className="text-sm text-gray-500">Language</p>
                        <p className="font-medium">
                          {repository.language ? repository.language[0].toUpperCase() + repository.language.slice(1) : 'Unknown'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center">
                      <span className="text-gray-500 mr-2"><i className="ri-git-branch-line"></i></span>
                      <div>
                        <p className="text-sm text-gray-500">Branches</p>
                        <p className="font-medium">{repository.branchCount || 0}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center">
                      <span className="text-gray-500 mr-2"><i className="ri-user-follow-line"></i></span>
                      <div>
                        <p className="text-sm text-gray-500">Contributors</p>
                        <p className="font-medium">{repository.contributorCount || 0}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center">
                      <span className="text-gray-500 mr-2"><i className="ri-time-line"></i></span>
                      <div>
                        <p className="text-sm text-gray-500">Created</p>
                        <p className="font-medium">{new Date(repository.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center">
                      <span className="text-gray-500 mr-2"><i className="ri-eye-line"></i></span>
                      <div>
                        <p className="text-sm text-gray-500">Views</p>
                        <p className="font-medium">{repository.viewCount || 0}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <h3 className="font-medium mb-2">Clone Repository</h3>
                    <div className="bg-gray-100 p-3 rounded-md flex justify-between items-center">
                      <code className="text-xs md:text-sm font-mono text-gray-800 overflow-x-auto">
                        git clone https://github.com/{owner?.username || 'user'}/{repository.name}.git
                      </code>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={handleClone}
                        className="ml-2 flex-shrink-0"
                      >
                        <i className="ri-clipboard-line"></i>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="files">
              <Card>
                <CardHeader>
                  <CardTitle>Repository Files</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-center text-gray-500 py-8">
                    Files browser is not available in this preview
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="branches">
              <Card>
                <CardHeader>
                  <CardTitle>Branches</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-center text-gray-500 py-8">
                    Branch list is not available in this preview
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="activity">
              <Card>
                <CardHeader>
                  <CardTitle>Repository Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingActivities ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="flex gap-3">
                          <Skeleton className="h-8 w-8 rounded-full" />
                          <div className="space-y-2 flex-1">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-3/4" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : activities && activities.length > 0 ? (
                    <div className="flow-root">
                      <ul className="-mb-8">
                        {activities.map((activity: any, index: number) => (
                          <li key={activity.id} className={`relative ${index < activities.length - 1 ? 'pb-8' : ''}`}>
                            <div className="relative flex space-x-3">
                              <div>
                                <span className={`h-8 w-8 rounded-full ${
                                  activity.type === 'commit' ? 'bg-blue-500' :
                                  activity.type === 'branch' ? 'bg-green-500' :
                                  activity.type === 'pull_request' ? 'bg-purple-500' :
                                  'bg-gray-500'
                                } flex items-center justify-center ring-8 ring-white`}>
                                  <i className={`${
                                    activity.type === 'commit' ? 'ri-git-commit-line' :
                                    activity.type === 'branch' ? 'ri-git-branch-line' :
                                    activity.type === 'pull_request' ? 'ri-git-pull-request-line' :
                                    'ri-git-commit-line'
                                  } text-white`}></i>
                                </span>
                              </div>
                              <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                                <div>
                                  <p className="text-sm text-gray-500">
                                    <Link href={`/users/${activity.user.id}`}>
                                      <a className="font-medium text-gray-900">{activity.user.fullName || activity.user.username}</a>
                                    </Link>{' '}
                                    {activity.summary}
                                    {activity.branch && (
                                      <span className="ml-1 text-xs bg-gray-100 px-1.5 py-0.5 rounded">
                                        {activity.branch}
                                      </span>
                                    )}
                                  </p>
                                </div>
                                <div className="text-right text-sm whitespace-nowrap text-gray-500">
                                  {formatTimeAgo(activity.createdAt)}
                                </div>
                              </div>
                            </div>
                            {index < activities.length - 1 && (
                              <div className="absolute left-4 top-8 bottom-0 w-0.5 bg-gray-200"></div>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p className="text-center text-gray-500 py-4">No recent activity found</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>About Owner</CardTitle>
            </CardHeader>
            <CardContent>
              {owner && (
                <div className="flex items-center">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={owner.avatarUrl} alt={owner.fullName || owner.username} />
                    <AvatarFallback>
                      {owner.fullName 
                        ? `${owner.fullName.split(' ')[0][0]}${owner.fullName.split(' ')[1]?.[0] || ''}`
                        : owner.username.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="ml-4">
                    <h4 className="font-medium">{owner.fullName || owner.username}</h4>
                    <p className="text-sm text-gray-500">@{owner.username}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Related Repositories</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-center text-gray-500 py-4">
                No related repositories found
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
