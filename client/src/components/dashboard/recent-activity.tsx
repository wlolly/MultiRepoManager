import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "react-i18next";

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

export function RecentActivity() {
  const { t } = useTranslation();
  const { data: activities, isLoading } = useQuery<Activity[]>({
    queryKey: ["/api/activities?limit=4"],
  });

  if (isLoading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">最近活动</h3>
        <div className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    );
  }

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
        return 'bg-blue-500';
      case 'branch':
        return 'bg-green-500';
      case 'pull_request':
        return 'bg-purple-500';
      case 'update':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">{t('recentActivity_title')}</h3>
      <div className="flow-root">
        <ul className="-mb-8">
          {activities && activities.length > 0 ? (
            activities.map((activity, index) => (
              <li key={activity.id} className={`relative ${index < activities.length - 1 ? 'pb-8' : ''}`}>
                <div className="relative flex space-x-3">
                  <div>
                    <span className={`h-8 w-8 rounded-full ${getActivityColor(activity.type)} flex items-center justify-center ring-8 ring-white`}>
                      <i className={`${getActivityIcon(activity.type)} text-white`}></i>
                    </span>
                  </div>
                  <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                    <div>
                      <p className="text-sm text-gray-500">
                        <Link href={`/users/${activity.user.id}`}>
                          <a className="font-medium text-gray-900">{activity.user.fullName || activity.user.username}</a>
                        </Link>{' '}
                        {activity.summary.indexOf(' in ') > -1 ? (
                          <>
                            {activity.summary.split(' in ')[0]}{' '}
                            {t('in')}{' '}
                            <Link href={`/repository/${activity.repository.id}`}>
                              <a className="font-medium text-blue-600">{activity.repository.name}</a>
                            </Link>
                          </>
                        ) : activity.summary}
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
            ))
          ) : (
            <div className="text-gray-500 text-center py-4">{t('recentActivity_noData')}</div>
          )}
        </ul>
      </div>
    </div>
  );
}
