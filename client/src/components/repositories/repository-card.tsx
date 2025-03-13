import React from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { AvatarGroup } from "@/components/avatar-group";

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

interface RepositoryCardProps {
  repository: Repository;
}

export function RepositoryCard({ repository }: RepositoryCardProps) {
  const getVisibilityBadgeColor = (visibility: string) => {
    switch (visibility) {
      case 'public': return 'bg-green-100 text-green-800';
      case 'private': return 'bg-red-100 text-red-800';
      case 'internal': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getLanguageColor = (language: string) => {
    const colors: Record<string, string> = {
      javascript: 'bg-yellow-400',
      typescript: 'bg-blue-400',
      python: 'bg-blue-400',
      java: 'bg-orange-400',
      go: 'bg-green-400',
      rust: 'bg-red-400',
      cpp: 'bg-purple-400',
      other: 'bg-gray-400'
    };
    return colors[language] || colors.other;
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return 'today';
    if (diffInDays === 1) return 'yesterday';
    if (diffInDays < 7) return `${diffInDays}d ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)}w ago`;
    if (diffInDays < 365) return `${Math.floor(diffInDays / 30)}mo ago`;
    return `${Math.floor(diffInDays / 365)}y ago`;
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="p-5">
        <div className="flex justify-between items-start">
          <div className="flex items-center">
            <i className="ri-git-repository-line text-xl text-gray-500 mr-2"></i>
            <Link href={`/repository/${repository.id}`}>
              <a className="text-lg font-medium text-blue-600 truncate hover:underline">
                {repository.name}
              </a>
            </Link>
          </div>
          <span className={`px-2 py-1 text-xs rounded-full ${getVisibilityBadgeColor(repository.visibility)}`}>
            {repository.visibility[0].toUpperCase() + repository.visibility.slice(1)}
          </span>
        </div>
        <p className="mt-2 text-sm text-gray-500 h-10 overflow-hidden">
          {repository.description || "No description provided"}
        </p>
        <div className="mt-4 flex items-center space-x-4">
          <div className="flex items-center">
            <span className={`w-3 h-3 rounded-full ${getLanguageColor(repository.language)}`}></span>
            <span className="ml-1.5 text-xs text-gray-500">
              {repository.language ? repository.language[0].toUpperCase() + repository.language.slice(1) : 'Unknown'}
            </span>
          </div>
          <div className="flex items-center">
            <i className="ri-git-branch-line text-gray-400"></i>
            <span className="ml-1 text-xs text-gray-500">{repository.branchCount} branches</span>
          </div>
          <div className="flex items-center">
            <i className="ri-user-follow-line text-gray-400"></i>
            <span className="ml-1 text-xs text-gray-500">{repository.contributorCount} contributors</span>
          </div>
        </div>
        <div className="mt-5 flex justify-between items-center">
          <div className="flex items-center">
            <Link href={`/users/${repository.owner.id}`}>
              <a className="flex items-center hover:underline">
                <img className="h-6 w-6 rounded-full" src={repository.owner.avatarUrl} alt={repository.owner.fullName || repository.owner.username} />
                <span className="ml-2 text-sm text-gray-500">{repository.owner.fullName || repository.owner.username}</span>
              </a>
            </Link>
          </div>
          <span className="text-xs text-gray-500">Updated {formatTimeAgo(repository.updatedAt)}</span>
        </div>
      </div>
      <div className="bg-gray-50 px-5 py-3 flex justify-between">
        <div className="text-xs flex items-center">
          <i className="ri-eye-line text-gray-400 mr-1"></i>
          <span>{repository.viewCount} views</span>
        </div>
        <div className="flex space-x-2">
          <Link href={`/repository/${repository.id}`}>
            <a className="inline-flex items-center px-2 py-1 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50">
              View
            </a>
          </Link>
          <Button 
            variant="outline"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={() => navigator.clipboard.writeText(`git clone https://github.com/${repository.owner.username}/${repository.name}.git`)}
          >
            Clone
          </Button>
        </div>
      </div>
    </div>
  );
}
