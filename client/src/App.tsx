import React, { useState, useEffect } from 'react';
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Route, Switch, Link, useLocation } from "wouter";
import "./i18n";
import { ToastProvider } from "./components/ui/toast-provider";
import { Toaster } from "./components/ui/toaster";
import { cn } from "@/lib/utils";
import { useTranslation } from 'react-i18next';
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useQuery } from "@tanstack/react-query";
import TestToast from "./pages/test-toast";

// 页面导入
import Dashboard from "./pages/dashboard";
import MyRepositories from "./pages/my-repositories";
import TeamRepositories from "./pages/team-repositories";
import NewRepository from "./pages/new-repository";
import RepositoryView from "./pages/repository-view";
import Repository from "./pages/repository/[id]";
import NotFound from "./pages/not-found";
import Search from "./pages/search";
import Settings from "./pages/settings";
import Users from "./pages/users";
import ApiConfigurations from "./pages/api-configurations";

// 仓库系统页面
import WarehouseProducts from "./pages/warehouse-products";
import NewWarehouseProduct from "./pages/warehouse-products/new";
import Warehouses from "./pages/warehouses";
import InboundOrders from "./pages/inbound-orders";
import OutboundOrders from "./pages/outbound-orders";
import WarehouseTransfers from "./pages/warehouse-transfers";
import NewWarehouseTransfer from "./pages/warehouse-transfers/new";
import WarehouseTransferImport from "./pages/warehouse-transfers/import";
import OutboundOrder from "./pages/outbound-order/[id]";
import InboundOrder from "./pages/inbound-order/[id]";
import NewOutboundOrder from "./pages/outbound-orders/new";
import NewOutboundOrderWithItems from "./pages/outbound-orders/new-with-items";
import AdvancedOutboundOrder from "./pages/outbound-orders/advanced";
import NewInboundOrder from "./pages/inbound-orders/new";
import NewInboundOrderWithItems from "./pages/inbound-orders/new-with-items";
import ProductDetail from "./pages/products/product-detail";
import ProductsPage from "./pages/products/index";
import ProductSearch from "./pages/product-search";

// 导航项定义
const navItems = [
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

// 侧边栏组件
function Sidebar() {
  const [pathname] = useLocation();
  const { t } = useTranslation();

  interface Activity {
    id: number;
    type: string;
    summary: string;
    createdAt: string;
    user?: {
      id: number;
      username: string;
      fullName: string;
    };
    repository?: {
      id: number;
      name: string;
    };
  }

  const { data: activities = [] } = useQuery<Activity[]>({
    queryKey: ["/api/activities?limit=5"],
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
    <div className="h-full bg-gray-900 text-white w-full md:w-64 overflow-y-auto">
      <div className="p-4 flex items-center border-b border-gray-800">
        <i className="ri-archive-drawer-line text-2xl mr-2 text-blue-500"></i>
        <h1 className="text-xl font-semibold truncate">{t('app_name')}</h1>
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
            "flex items-center py-2 px-4 transition whitespace-nowrap overflow-hidden",
            pathname === item.href
              ? "bg-gray-800 text-blue-500" 
              : "text-gray-300 hover:bg-gray-800 hover:text-white"
          )}>
            <i className={`${item.icon} mr-3 flex-shrink-0`}></i> 
            <span className="truncate">{t(item.keyName)}</span>
          </Link>
        ))}
      </nav>
      
      <div className="px-4 py-2 mt-6 text-gray-400 text-sm font-medium">{t('recent_activity')}</div>
      <div className="px-4 py-2 text-sm">
        {activities && activities.length > 0 ? (
          activities.map((activity) => (
            <div key={activity.id} className="flex items-start mb-3">
              <span className={`${getActivityColor(activity.type)} mt-1 flex-shrink-0`}>
                <i className={getActivityIcon(activity.type)}></i>
              </span>
              <div className="ml-2 min-w-0">
                <p className="text-gray-300 truncate">{activity.summary}</p>
                <p className="text-gray-500 text-xs">{formatTimeAgo(activity.createdAt)}</p>
              </div>
            </div>
          ))
        ) : (
          <div className="text-gray-500">{t('no_activity')}</div>
        )}
      </div>
    </div>
  );
}

// 页面布局组件
function AppLayout({ children }: { children: React.ReactNode }) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const { t } = useTranslation();
  const [_, navigate] = useLocation();
  
  // 响应式布局处理
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  
  useEffect(() => {
    // 检测当前屏幕尺寸
    const checkScreenSize = () => {
      setIsSmallScreen(window.innerWidth < 768);
    };
    
    // 初始检测
    checkScreenSize();
    
    // 监听窗口尺寸变化
    window.addEventListener('resize', checkScreenSize);
    
    // 组件卸载时移除监听
    return () => {
      window.removeEventListener('resize', checkScreenSize);
    };
  }, []);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* 桌面侧边栏 - 在md以上显示 */}
      <div className={`hidden md:block ${isSmallScreen ? 'w-16' : 'w-64'} transition-all duration-300`}>
        <Sidebar />
      </div>
      
      {/* 移动侧边栏 - 点击菜单按钮时显示 */}
      <Sheet open={isMobileSidebarOpen} onOpenChange={setIsMobileSidebarOpen}>
        <SheetContent side="left" className="p-0 w-full max-w-[280px]">
          <Sidebar />
        </SheetContent>
      </Sheet>
      
      {/* 主内容区域 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 顶部导航栏 */}
        <header className="bg-white border-b border-gray-200 h-16 flex items-center px-4 md:px-6 sticky top-0 z-10">
          <button 
            className="md:hidden mr-4 text-gray-500 hover:text-gray-700"
            onClick={() => setIsMobileSidebarOpen(true)}
          >
            <i className="ri-menu-line text-xl"></i>
          </button>
          
          <div className="flex-1">
            <div className="relative rounded-md shadow-sm max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <i className="ri-search-line text-gray-400"></i>
              </div>
              <input
                type="text"
                className="block w-full rounded-md pl-10 py-2 border-gray-300 
                           focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder={t('search')}
                onClick={() => navigate('/product-search')}
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="relative">
              <button className="text-gray-500 hover:text-gray-700">
                <i className="ri-notification-3-line text-xl"></i>
              </button>
              <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-red-500"></span>
            </div>
            
            <div className="flex items-center">
              <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white">
                <span>U</span>
              </div>
              <span className="ml-2 text-sm font-medium text-gray-700 hidden md:inline-block">
                用户名
              </span>
            </div>
          </div>
        </header>
        
        <main className="flex-1 overflow-y-auto bg-gray-100 p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  // 从本地存储加载用户首选语言
  useEffect(() => {
    console.log("App组件已加载");
    // 导入i18n实例和changeLanguage函数
    import('./i18n').then(({ changeLanguage }) => {
      const savedLanguage = localStorage.getItem('i18nextLng');
      if (savedLanguage && ['zh', 'en', 'ru', 'kk', 'uz'].includes(savedLanguage)) {
        changeLanguage(savedLanguage);
        document.documentElement.lang = savedLanguage;
        console.log('已从本地存储加载语言:', savedLanguage);
      } else {
        // 如果没有保存的语言，默认使用中文
        changeLanguage('zh');
        document.documentElement.lang = 'zh';
        console.log('未找到保存的语言，默认使用中文');
      }
    });
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AppLayout>
          <Switch>
            {/* 测试页面 */}
            <Route path="/test-toast" component={TestToast} />
            
            {/* 主页与通用页面 */}
            <Route path="/" component={Dashboard} />
            <Route path="/search" component={Search} />
            <Route path="/settings" component={Settings} />
            <Route path="/users" component={Users} />
            
            {/* 代码仓库相关页面 */}
            <Route path="/my-repositories" component={MyRepositories} />
            <Route path="/team-repositories" component={TeamRepositories} />
            <Route path="/new-repository" component={NewRepository} />
            <Route path="/repository-view/:id" component={RepositoryView} />
            <Route path="/repository/:id" component={Repository} />
            
            {/* 仓库管理系统页面 */}
            <Route path="/warehouses" component={Warehouses} />
            <Route path="/warehouse-products" component={WarehouseProducts} />
            <Route path="/warehouse-products/new" component={NewWarehouseProduct} />
            <Route path="/products" component={ProductsPage} />
            <Route path="/products/product-detail/:id" component={ProductDetail} />
            <Route path="/product-search" component={ProductSearch} />
            
            {/* 入库单页面 */}
            <Route path="/inbound-orders" component={InboundOrders} />
            <Route path="/inbound-order/:id" component={InboundOrder} />
            <Route path="/inbound-orders/new" component={NewInboundOrder} />
            <Route path="/inbound-orders/new-with-items" component={NewInboundOrderWithItems} />
            
            {/* 出库单页面 */}
            <Route path="/outbound-orders" component={OutboundOrders} />
            <Route path="/outbound-order/:id" component={OutboundOrder} />
            <Route path="/outbound-orders/new" component={NewOutboundOrder} />
            <Route path="/outbound-orders/new-with-items" component={NewOutboundOrderWithItems} />
            <Route path="/outbound-orders/advanced" component={AdvancedOutboundOrder} />
            
            {/* 仓库调拨单页面 */}
            <Route path="/warehouse-transfers" component={WarehouseTransfers} />
            <Route path="/warehouse-transfers/new" component={NewWarehouseTransfer} />
            <Route path="/warehouse-transfers/import" component={WarehouseTransferImport} />
            
            {/* API配置页面 */}
            <Route path="/api-configurations" component={ApiConfigurations} />
            
            {/* 404页面必须放在最后 */}
            <Route component={NotFound} />
          </Switch>
        </AppLayout>
        <Toaster />
      </ToastProvider>
    </QueryClientProvider>
  );
}