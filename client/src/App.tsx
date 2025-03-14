import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Layout } from "@/components/layout/layout";
import { Agent } from './components/Agent';
import { NotFound } from './components/NotFound';
import Dashboard from "@/pages/dashboard";
import MyRepositories from "@/pages/my-repositories";
import TeamRepositories from "@/pages/team-repositories";
import Users from "@/pages/users";
import Settings from "@/pages/settings";
import Repository from "@/pages/repository/[id]";
import NewRepository from "@/pages/new-repository";
import Search from "@/pages/search";
import Warehouses from "@/pages/warehouses";
import ApiConfigurations from "@/pages/api-configurations";
import ProductsPage from "@/pages/products";
import InboundOrders from "@/pages/inbound-orders";
import OutboundOrders from "@/pages/outbound-orders";
import InboundOrderDetail from "@/pages/inbound-order/[id]";
import OutboundOrderDetail from "@/pages/outbound-order/[id]";
import NewInboundOrder from "@/pages/inbound-orders/new";
import NewOutboundOrder from "@/pages/outbound-orders/new";
import NewInboundOrderWithItems from "@/pages/inbound-orders/new-with-items";
import NewOutboundOrderWithItems from "@/pages/outbound-orders/new-with-items";
import { useEffect } from "react";
import "./i18n";

export default function App() {
  // 从本地存储加载用户首选语言
  useEffect(() => {
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
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/my-repositories" element={<MyRepositories />} />
            <Route path="/team-repositories" element={<TeamRepositories />} />
            <Route path="/users" element={<Users />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/repository/:id" element={<Repository />} />
            <Route path="/new-repository" element={<NewRepository />} />
            <Route path="/search" element={<Search />} />
            <Route path="/warehouses" element={<Warehouses />} />
            <Route path="/api-configurations" element={<ApiConfigurations />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/inbound-orders" element={<InboundOrders />} />
            <Route path="/inbound-orders/new" element={<NewInboundOrder />} />
            <Route path="/inbound-orders/new-with-items" element={<NewInboundOrderWithItems />} />
            <Route path="/inbound-order/:id" element={<InboundOrderDetail />} />
            <Route path="/outbound-orders" element={<OutboundOrders />} />
            <Route path="/outbound-orders/new" element={<NewOutboundOrder />} />
            <Route path="/outbound-orders/new-with-items" element={<NewOutboundOrderWithItems />} />
            <Route path="/outbound-order/:id" element={<OutboundOrderDetail />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Layout>
        <Agent />
        <Toaster />
      </Router>
    </QueryClientProvider>
  );
}