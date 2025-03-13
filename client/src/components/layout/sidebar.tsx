import React from "react";
import { Link, useLocation } from "wouter";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from 'react-i18next';

interface NavItem {
  icon: string;
  keyName: string;
  href: string;
}

const navItems: NavItem[] = [
  { icon: "ri-dashboard-line", keyName: "dashboard", href: "/" },
  { icon: "ri-folder-line", keyName: "myRepositories", href: "/my-repositories" },
  { icon: "ri-team-line", keyName: "teamRepositories", href: "/team-repositories" },
  { icon: "ri-group-line", keyName: "usersAndTeams", href: "/users" },
  { icon: "ri-settings-line", keyName: "settings", href: "/settings" },
];

export function Sidebar() {
  const [location] = useLocation();
  const { t } = useTranslation();

  interface Activity {
    id: number;
    type: string;
    summary: string;
    createdAt: string;
    user: {
      id: number;
      username: string;
      fullName: string;
    };
    repository: {
      id: number;
      name: string;
    };
  }

  const { data: activities } = useQuery<Activity[]>({
    queryKey: ["/api/activities?limit=2"],
    staleTime: 60000, // 1 minute
  });

  const formatTimeAgo = (date: string) => {
    const now = new Date();
    const activityDate = new Date(date);
    const diffInSeconds = Math.floor((now.getTime() - activityDate.getTime()) / 1000);
    
    if (diffInSeconds < 60) return t('time.justNow');
    if (diffInSeconds < 3600) return t('time.minutesAgo', { value: Math.floor(diffInSeconds / 60) });
    if (diffInSeconds < 86400) return t('time.hoursAgo', { value: Math.floor(diffInSeconds / 3600) });
    if (diffInSeconds < 172800) return t('time.yesterday');
    return t('time.daysAgo', { value: Math.floor(diffInSeconds / 86400) });
  };
  
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'commit':
        return 'ri-git-commit-line';
      case 'branch':
        return 'ri-git-branch-line';
      case 'pull_request':
        return 'ri-git-pull-request-line';
      case 'update':
        return 'ri-edit-line';
      default:
        return 'ri-git-commit-line';
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'commit':
        return 'text-green-400';
      case 'branch':
        return 'text-blue-400';
      case 'pull_request':
        return 'text-purple-400';
      case 'update':
        return 'text-yellow-400';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <div className="bg-gray-900 text-white w-64 flex-shrink-0 hidden md:flex md:flex-col">
      <div className="p-4 flex items-center border-b border-gray-800">
        <i className="ri-git-repository-line text-2xl mr-2 text-blue-500"></i>
        <h1 className="text-xl font-semibold">{t('app.name')}</h1>
      </div>
      
      <div className="p-4">
        <Link href="/new-repository" className="bg-blue-600 hover:bg-blue-700 w-full py-2 px-4 rounded-md flex items-center justify-center transition">
          <i className="ri-add-line mr-2"></i> {t('sidebar.newRepository')}
        </Link>
      </div>
      
      <nav className="mt-2">
        <div className="px-4 py-2 text-gray-400 text-sm font-medium">{t('sidebar.navigation')}</div>
        {navItems.map((item) => (
          <Link key={item.href} href={item.href} className={cn(
            "flex items-center py-2 px-4 transition",
            location === item.href
              ? "bg-gray-800 text-blue-500" 
              : "text-gray-300 hover:bg-gray-800 hover:text-white"
          )}>
            <i className={`${item.icon} mr-3`}></i> {t(`sidebar.navigation_items.${item.keyName}`)}
          </Link>
        ))}
      </nav>
      
      <div className="px-4 py-2 mt-6 text-gray-400 text-sm font-medium">{t('sidebar.recentActivity')}</div>
      <div className="px-4 py-2 text-sm">
        {activities && activities.length > 0 ? (
          activities.map((activity) => (
            <div key={activity.id} className="flex items-start mb-3">
              <span className={`${getActivityColor(activity.type)} mt-1`}>
                <i className={getActivityIcon(activity.type)}></i>
              </span>
              <div className="ml-2">
                <p className="text-gray-300">{activity.summary}</p>
                <p className="text-gray-500 text-xs">{formatTimeAgo(activity.createdAt)}</p>
              </div>
            </div>
          ))
        ) : (
          <div className="text-gray-500">{t('sidebar.noActivity')}</div>
        )}
      </div>
      
      <div className="mt-auto p-4 border-t border-gray-800 text-xs text-gray-500">
        <p>{t('app.version')}</p>
      </div>
    </div>
  );
}
