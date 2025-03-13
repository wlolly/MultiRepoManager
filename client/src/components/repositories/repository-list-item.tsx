import React from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

interface Repository {
  id: number;
  name: string;
  description: string;
  visibility: string;
  language: string;
  owner: {
    id: number;
    username: string;
    fullName: string;
  };
  updatedAt: string;
}

interface RepositoryListItemProps {
  repository: Repository;
}

export function RepositoryListItem({ repository }: RepositoryListItemProps) {
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
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
    if (diffInDays < 365) return `${Math.floor(diffInDays / 30)} months ago`;
    return `${Math.floor(diffInDays / 365)} years ago`;
  };

  return (
    <div className="px-4 py-4 sm:px-6 hover:bg-gray-50">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <i className="ri-git-repository-line text-xl text-gray-500 mr-3"></i>
          <Link href={`/repository/${repository.id}`}>
            <a className="text-md font-medium text-blue-600 truncate hover:underline">
              {repository.name}
            </a>
          </Link>
        </div>
        <div className="ml-2 flex-shrink-0 flex">
          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getVisibilityBadgeColor(repository.visibility)}`}>
            {repository.visibility[0].toUpperCase() + repository.visibility.slice(1)}
          </span>
        </div>
      </div>
      <div className="mt-2 sm:flex sm:justify-between">
        <div className="sm:flex">
          <p className="flex items-center text-sm text-gray-500">
            <span className={`w-2 h-2 flex-shrink-0 rounded-full ${getLanguageColor(repository.language)} mr-1.5`}></span>
            {repository.language ? repository.language[0].toUpperCase() + repository.language.slice(1) : 'Unknown'}
          </p>
          <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
            <i className="ri-user-line text-gray-400 mr-1.5"></i>
            {repository.owner ? (repository.owner.fullName || repository.owner.username) : 'Unknown User'}
          </p>
        </div>
        <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
          <i className="ri-time-line text-gray-400 mr-1.5"></i>
          <p>
            Updated {formatTimeAgo(repository.updatedAt)}
          </p>
        </div>
      </div>
      <div className="mt-2 flex justify-between items-center">
        <p className="text-sm text-gray-500 truncate">
          {repository.description || "No description provided"}
        </p>
        <div className="flex space-x-2">
          <Link href={`/repository/${repository.id}`}>
            <a className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50">
              <i className="ri-eye-line mr-1"></i> View
            </a>
          </Link>
          <Button 
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => navigator.clipboard.writeText(`git clone https://github.com/${repository.owner ? repository.owner.username : 'unknown'}/${repository.name}.git`)}
          >
            <i className="ri-git-branch-line mr-1"></i> Clone
          </Button>
        </div>
      </div>
    </div>
  );
}
