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
  { icon: "ri-building-2-line", keyName: "warehouses", href: "/warehouses" },
  { icon: "ri-shopping-bag-line", keyName: "my_products", href: "/products" },
  { icon: "ri-store-line", keyName: "warehouse_products", href: "/warehouse-products" },
  // 订单管理相关导航
  { icon: "ri-arrow-down-circle-line", keyName: "inbound_orders", href: "/inbound-orders" },
  { icon: "ri-arrow-up-circle-line", keyName: "outbound_orders", href: "/outbound-orders" },
  { icon: "ri-exchange-fill", keyName: "warehouse_transfers", href: "/warehouse-transfers" },
  { icon: "ri-cloud-line", keyName: "api_configurations", href: "/api-configurations" },
  { icon: "ri-group-line", keyName: "users_teams", href: "/users" },
  { icon: "ri-settings-line", keyName: "settings", href: "/settings" },
];

export function Sidebar() {
  const [pathname, setLocation] = useLocation();
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
    
    if (diffInSeconds < 60) return t('just_now');
    if (diffInSeconds < 3600) return t('minutes_ago', { value: Math.floor(diffInSeconds / 60) });
    if (diffInSeconds < 86400) return t('hours_ago', { value: Math.floor(diffInSeconds / 3600) });
    if (diffInSeconds < 172800) return t('yesterday');
    return t('days_ago', { value: Math.floor(diffInSeconds / 86400) });
  };
  
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'stock_in':
        return 'ri-arrow-down-circle-line';
      case 'stock_out':
        return 'ri-arrow-up-circle-line';
      case 'inventory_check':
        return 'ri-file-list-3-line';
      case 'update':
        return 'ri-edit-line';
      case 'new_product':
        return 'ri-shopping-bag-line';
      default:
        return 'ri-file-list-3-line';
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'stock_in':
        return 'text-green-400';
      case 'stock_out':
        return 'text-red-400';
      case 'inventory_check':
        return 'text-blue-400';
      case 'update':
        return 'text-yellow-400';
      case 'new_product':
        return 'text-purple-400';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <div className="bg-gray-900 text-white w-64 flex-shrink-0 flex flex-col" style={{display: 'flex'}}>
      <div className="p-4 flex items-center border-b border-gray-800">
        <i className="ri-archive-drawer-line text-2xl mr-2 text-blue-500"></i>
        <h1 className="text-xl font-semibold">{t('app_name')}</h1>
      </div>
      
      <div className="p-4">
        <Link to="/products/new" className="bg-blue-600 hover:bg-blue-700 w-full py-2 px-4 rounded-md flex items-center justify-center transition">
          <i className="ri-add-line mr-2"></i> {t('new_product')}
        </Link>
      </div>
      
      <nav className="mt-2">
        <div className="px-4 py-2 text-gray-400 text-sm font-medium">{t('navigation')}</div>
        {navItems.map((item) => (
          <Link key={item.href} to={item.href} className={cn(
            "flex items-center py-2 px-4 transition",
            pathname === item.href
              ? "bg-gray-800 text-blue-500" 
              : "text-gray-300 hover:bg-gray-800 hover:text-white"
          )}>
            <i className={`${item.icon} mr-3`}></i> {t(item.keyName)}
          </Link>
        ))}
      </nav>
      
      <div className="px-4 py-2 mt-6 text-gray-400 text-sm font-medium">{t('recent_activity')}</div>
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
          <div className="text-gray-500">{t('no_activity')}</div>
        )}
      </div>
      
      <div className="mt-auto p-4 border-t border-gray-800 text-xs text-gray-500">
        <p>{t('app_version')}</p>
      </div>
    </div>
  );
}
