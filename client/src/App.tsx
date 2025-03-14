import React from 'react';
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { Route, Switch } from "wouter";
import "./i18n";
import { ToastProvider } from "./components/ui/toast-provider";
import { Toaster } from "./components/ui/toaster";
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
          <Route path="/products/product-detail/:id" component={ProductDetail} />
          
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
        <Toaster />
      </ToastProvider>
    </QueryClientProvider>
  );
}