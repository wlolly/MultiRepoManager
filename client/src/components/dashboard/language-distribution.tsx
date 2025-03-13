import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";

interface LanguageDistribution {
  language: string;
  count: number;
  percentage: number;
}

export function LanguageDistribution() {
  const { data: distribution, isLoading } = useQuery<LanguageDistribution[]>({
    queryKey: ["/api/stats/language-distribution"],
  });

  if (isLoading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Language Distribution</h3>
        <div className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
          </div>
        </div>
      </div>
    );
  }

  // Color mapping for languages
  const languageColors: Record<string, string> = {
    javascript: "bg-yellow-500",
    typescript: "bg-blue-400",
    python: "bg-blue-500",
    java: "bg-orange-500",
    go: "bg-green-500",
    rust: "bg-red-500",
    cpp: "bg-purple-500",
    csharp: "bg-green-600",
    ruby: "bg-red-600",
    php: "bg-indigo-500",
    kotlin: "bg-purple-400",
    swift: "bg-orange-400",
    other: "bg-gray-500"
  };

  // Get top 5 languages
  const topLanguages = distribution ? distribution.slice(0, 5) : [];

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Language Distribution</h3>
      <div className="relative">
        <div className="flex h-4 mb-6 overflow-hidden rounded-full bg-gray-200">
          {topLanguages.map((lang, index) => (
            <div 
              key={index} 
              className={`h-4 ${languageColors[lang.language] || "bg-gray-500"}`} 
              style={{ width: `${lang.percentage}%` }}
            ></div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-4">
          {topLanguages.map((lang, index) => (
            <div key={index} className="flex items-center">
              <span className={`w-3 h-3 rounded-full ${languageColors[lang.language] || "bg-gray-500"} mr-2`}></span>
              <span className="text-sm text-gray-600">{lang.language} ({lang.percentage}%)</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
