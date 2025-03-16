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
import { usePermissions } from "./hooks/use-permissions";
import { useAuthStatus } from "./hooks/use-auth-status";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./contexts/AuthContext";

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
import TeamPermissions from "./pages/team-permissions";
import LoginPage from "./pages/login";
import LoginRedirect from "./pages/login-redirect"; // 新增登录重定向页面
import RegisterPage from "./pages/register";
import AdminSocialAuthConfig from "./pages/admin-social-auth";

// 仓库系统页面
import WarehouseProducts from "./pages/warehouse-products";
import NewWarehouseProduct from "./pages/warehouse-products/new";
import Warehouses from "./pages/warehouses";
import InboundOrders from "./pages/inbound-orders";
import OutboundOrders from "./pages/outbound-orders";
import WarehouseTransfers from "./pages/warehouse-transfers/index";
import NewWarehouseTransfer from "./pages/warehouse-transfers/new";
import WarehouseTransferImport from "./pages/warehouse-transfers/import";
import OutboundOrder from "./pages/outbound-order/[id]";
import InboundOrder from "./pages/inbound-order/[id]";
import AdvancedOutboundOrder from "./pages/outbound-orders/advanced";
import NewMultiInboundOrder from "./pages/inbound-orders/new-multi";
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
  { icon: "ri-shield-keyhole-line", keyName: "team_permissions", href: "/team-permissions" },
  // 移除系统设置菜单项
];

// 侧边栏组件
function Sidebar() {
  const [pathname] = useLocation();
  const { t } = useTranslation();
  const { hasPagePermission, isLoading: isLoadingPermissions } = usePermissions();
  const { isAuthenticated, realAuthenticated, user } = useAuthStatus();

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

  // 根据页面名称判断是否有权限访问
  const pagePermissionMap = {
    '/': 'dashboard',
    '/warehouses': 'warehouses',
    '/products': 'products',
    '/warehouse-products': 'warehouse_products',
    '/inbound-orders': 'inbound_orders',
    '/outbound-orders': 'outbound_orders',
    '/warehouse-transfers': 'warehouse_transfers',
    '/api-configurations': 'api_configurations',
    '/users': 'users_teams',
    '/team-permissions': 'team_permissions',
    '/settings': 'settings'
  };
  
  // 判断哪些菜单项需要真实登录
  const requiresAuth = (href: string): boolean => {
    // 首页和仪表盘总是可以访问
    if (href === '/') return false;
    
    // 指定哪些页面只有真实登录用户才能看到
    const authOnlyPages = [
      '/products',            // 我的商品（仅登录用户可见）
      '/warehouse-products',  // 仓库商品
      '/inbound-orders',      // 入库单
      '/outbound-orders',     // 出库单
      '/warehouse-transfers', // 仓库调拨
      '/api-configurations',  // API配置
      '/users',               // 用户和团队
      '/team-permissions',    // 团队权限
      '/settings'             // 设置
    ];
    
    return authOnlyPages.includes(href);
  };

  return (
    <div className="h-full bg-gray-900 text-white w-full md:w-64 overflow-y-auto">
      <div className="p-4 flex items-center border-b border-gray-800">
        <i className="ri-archive-drawer-line text-2xl mr-2 text-blue-500"></i>
        <h1 className="text-xl font-semibold truncate">{t('app_name')}</h1>
      </div>
      
      {/* 移除添加商品按钮 */}
      
      <nav className="mt-2">
        <div className="px-4 py-2 text-gray-400 text-sm font-medium">{t('navigation')}</div>
        {isLoadingPermissions ? (
          // 权限加载中的骨架屏
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4, 5].map(n => (
              <div key={n} className="h-8 bg-gray-800 animate-pulse rounded-md"></div>
            ))}
          </div>
        ) : (
          // 根据权限渲染菜单项
          navItems.map((item) => {
            // 安全获取页面名称，如果不存在则返回undefined
            const pageName = pagePermissionMap[item.href as keyof typeof pagePermissionMap];
            const needsAuth = requiresAuth(item.href);
            
            // 三种情况下显示菜单项：
            // 1. 不需要认证的页面
            // 2. 需要认证的页面，且用户已真实认证
            // 3. 用户有该页面权限
            if ((!needsAuth || realAuthenticated) && (!pageName || hasPagePermission(pageName))) {
              return (
                <Link key={item.href} to={item.href} className={cn(
                  "flex items-center py-2 px-4 transition whitespace-nowrap overflow-hidden",
                  pathname === item.href
                    ? "bg-gray-800 text-blue-500" 
                    : "text-gray-300 hover:bg-gray-800 hover:text-white"
                )}>
                  <i className={`${item.icon} mr-3 flex-shrink-0`}></i> 
                  <span className="truncate">{t(item.keyName)}</span>
                </Link>
              );
            }
            return null; // 没有权限则不显示
          })
        )}
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
  const { isAuthenticated, user, logout } = useAuthStatus();
  
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
            
            {isAuthenticated ? (
              <div className="flex items-center">
                <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white">
                  <span>{user?.username?.charAt(0).toUpperCase() || 'U'}</span>
                </div>
                <span className="ml-2 text-sm font-medium text-gray-700 hidden md:inline-block">
                  {user?.fullName || user?.username || '用户'}
                </span>
                <button 
                  onClick={() => {
                    if (window.confirm("确定要退出登录吗？")) {
                      fetch('/api/auth/logout', {
                        method: 'POST',
                        credentials: 'include'
                      }).then(() => {
                        localStorage.removeItem('currentUser');
                        window.location.href = '/login';
                      });
                    }
                  }}
                  className="ml-3 text-sm text-red-500 hidden md:inline-block"
                >
                  退出
                </button>
              </div>
            ) : (
              <Link to="/login" className="flex items-center text-blue-600 hover:text-blue-800 font-medium">
                <i className="ri-login-box-line mr-1"></i>
                <span>登录</span>
              </Link>
            )}
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
  const [authenticated, setAuthenticated] = useState(false);
  const [pathname] = useLocation();
  // 无需布局的路径（登录、重定向和注册页面）
  const noLayoutPaths = ['/login', '/login-redirect', '/register'];
  
  // 从本地存储加载用户首选语言
  useEffect(() => {
    console.log("App组件已加载");
    // 加载开始时间
    const loadStartTime = performance.now();
    
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
    
    // 使用会话检查API检查认证状态
    console.log("开始检查认证状态...");
    fetch('/api/auth/current-user', {
      credentials: 'include'  // 包含会话cookie
    })
    .then(async response => {
      console.log("认证检查响应状态:", response.status, response.statusText);
      
      let data;
      try {
        data = await response.json();
        console.log("认证检查响应数据:", data);
      } catch (e) {
        console.log("解析响应JSON出错:", e);
      }
      
      if (response.ok) {
        console.log("认证成功，用户已登录");
        setAuthenticated(true);
        
        // 检查用户是否需要绑定社交账号
        if (data?.requiresBinding === true) {
          console.log("用户需要绑定社交账号，跳转到设置页面");
          setTimeout(() => {
            window.location.href = '/settings?needBind=true';
          }, 100);
        }
      } else {
        console.log("认证已过期，请重新登录");
        setAuthenticated(false);
      }
      
      // 计算加载时间
      const loadTime = ((performance.now() - loadStartTime) / 1000).toFixed(2);
      console.log(`认证状态检查完成，耗时 ${loadTime} 秒`);
      
      // 触发应用加载完成事件
      window.dispatchEvent(new Event('app-loaded'));
      
      // 隐藏加载提示
      const loadingIndicator = document.getElementById('loading-indicator');
      if (loadingIndicator) {
        loadingIndicator.style.display = 'none';
      }
    })
    .catch(error => {
      console.error("检查认证状态时出错:", error);
      setAuthenticated(false);
      
      // 即使出错也要触发加载完成
      window.dispatchEvent(new Event('app-loaded'));
      
      // 隐藏加载提示
      const loadingIndicator = document.getElementById('loading-indicator');
      if (loadingIndicator) {
        loadingIndicator.style.display = 'none';
      }
    });
  }, []);
  
  // 用于权限检查组件的认证状态更新
  const updateAuthState = (state: boolean) => {
    setAuthenticated(state);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthProvider>
          {noLayoutPaths.includes(pathname) ? (
            <Switch>
              <Route path="/login">
                <LoginPage onLoginSuccess={() => updateAuthState(true)} />
              </Route>
              <Route path="/login-redirect">
                <LoginRedirect />
            </Route>
            <Route path="/register" component={RegisterPage} />
            <Route>
              <NotFound />
            </Route>
          </Switch>
        ) : (
          <AppLayout>
            <Switch>
              {/* 测试页面 */}
              <Route path="/test-toast" component={TestToast} />
              
              {/* 主页与通用页面 */}
              <ProtectedRoute exact path="/" component={Dashboard} pageName="dashboard" requireAuth={false} publicContent={true} />
              <Route path="/search" component={Search} />
              <ProtectedRoute path="/settings" component={Settings} pageName="settings" />
              <ProtectedRoute path="/users" component={Users} pageName="users_teams" />
              
              {/* 代码仓库相关页面 */}
              <Route path="/my-repositories" component={MyRepositories} />
              <Route path="/team-repositories" component={TeamRepositories} />
              <Route path="/new-repository" component={NewRepository} />
              <Route path="/repository-view/:id" component={RepositoryView} />
              <Route path="/repository/:id" component={Repository} />
              
              {/* 仓库管理系统页面 - 只有管理员才能访问 */}
              <ProtectedRoute path="/warehouses" component={Warehouses} pageName="warehouses" />
              <ProtectedRoute path="/warehouse-products" component={WarehouseProducts} pageName="warehouse_products" />
              <ProtectedRoute path="/warehouse-products/new" component={NewWarehouseProduct} pageName="warehouse_products" />
              <ProtectedRoute path="/products" component={ProductsPage} pageName="products" requireAuth={true} publicContent={false} />
              <ProtectedRoute path="/products/product-detail/:id" component={ProductDetail} pageName="products" requireAuth={true} publicContent={false} />
              <Route path="/product-search" component={ProductSearch} />
              
              {/* 入库单页面 */}
              <ProtectedRoute path="/inbound-orders" component={InboundOrders} pageName="inbound_orders" />
              <ProtectedRoute path="/inbound-order/:id" component={InboundOrder} pageName="inbound_orders" />
              <ProtectedRoute path="/inbound-orders/new-multi" component={NewMultiInboundOrder} pageName="inbound_orders" />
              
              {/* 出库单页面 */}
              <ProtectedRoute path="/outbound-orders" component={OutboundOrders} pageName="outbound_orders" />
              <ProtectedRoute path="/outbound-order/:id" component={OutboundOrder} pageName="outbound_orders" />
              <ProtectedRoute path="/outbound-orders/advanced" component={AdvancedOutboundOrder} pageName="outbound_orders" />
              
              {/* 仓库调拨单页面 */}
              <ProtectedRoute path="/warehouse-transfers" component={WarehouseTransfers} pageName="warehouse_transfers" />
              <ProtectedRoute path="/warehouse-transfers/new" component={NewWarehouseTransfer} pageName="warehouse_transfers" />
              <ProtectedRoute path="/warehouse-transfers/import" component={WarehouseTransferImport} pageName="warehouse_transfers" />
              
              {/* API配置页面 */}
              <ProtectedRoute path="/api-configurations" component={ApiConfigurations} pageName="api_configurations" />
              <ProtectedRoute path="/admin/social-auth" component={AdminSocialAuthConfig} pageName="admin" />
              
              {/* 团队权限管理页面 */}
              <ProtectedRoute path="/team-permissions" component={TeamPermissions} pageName="team_permissions" />
              
              {/* 404页面必须放在最后 */}
              <Route component={NotFound} />
            </Switch>
          </AppLayout>
        )}
        <Toaster />
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}