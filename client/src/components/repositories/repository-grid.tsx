import React from "react";
import { RepositoryCard } from "./repository-card";
import { Skeleton } from "@/components/ui/skeleton";

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

interface RepositoryGridProps {
  repositories: Repository[];
  isLoading: boolean;
}

export function RepositoryGrid({ repositories, isLoading }: RepositoryGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {isLoading ? (
        // Skeleton loading state
        Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-5 space-y-4">
              <div className="flex justify-between">
                <Skeleton className="h-6 w-1/2" />
                <Skeleton className="h-6 w-16" />
              </div>
              <Skeleton className="h-10 w-full" />
              <div className="flex justify-between">
                <div className="flex space-x-2">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-16" />
                </div>
              </div>
              <div className="flex justify-between">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-4 w-16" />
              </div>
            </div>
            <div className="bg-gray-50 px-5 py-3 flex justify-between">
              <Skeleton className="h-4 w-16" />
              <div className="flex space-x-2">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-6 w-16" />
              </div>
            </div>
          </div>
        ))
      ) : repositories.length > 0 ? (
        repositories.map((repository) => (
          <RepositoryCard key={repository.id} repository={repository} />
        ))
      ) : (
        <div className="col-span-full p-8 text-center text-gray-500 bg-white rounded-lg shadow">
          <i className="ri-inbox-line text-4xl"></i>
          <p className="mt-2">No repositories found</p>
        </div>
      )}
    </div>
  );
}
