import React from "react";
import { RepositoryListItem } from "./repository-list-item";
import { Skeleton } from "@/components/ui/skeleton";

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

interface RepositoryListProps {
  repositories: Repository[];
  isLoading: boolean;
  title?: string;
  subtitle?: string;
}

export function RepositoryList({ repositories, isLoading, title = "Recent Repositories", subtitle = "Your most recently updated repositories" }: RepositoryListProps) {
  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-md mb-6">
      <div className="px-4 py-5 border-b border-gray-200 sm:px-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900">
          {title}
        </h3>
        <p className="mt-1 max-w-2xl text-sm text-gray-500">
          {subtitle}
        </p>
      </div>
      
      {isLoading ? (
        <div className="divide-y divide-gray-200">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <Skeleton className="h-5 w-1/3" />
                  <Skeleton className="h-5 w-16" />
                </div>
                <div className="flex justify-between">
                  <div className="flex space-x-4">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <Skeleton className="h-4 w-24" />
                </div>
                <div className="flex justify-between items-center">
                  <Skeleton className="h-4 w-2/3" />
                  <div className="flex space-x-2">
                    <Skeleton className="h-8 w-16" />
                    <Skeleton className="h-8 w-16" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : repositories.length > 0 ? (
        <ul className="divide-y divide-gray-200">
          {repositories.map((repository) => (
            <li key={repository.id}>
              <RepositoryListItem repository={repository} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="p-4 text-center text-gray-500">
          No repositories found
        </div>
      )}
    </div>
  );
}
