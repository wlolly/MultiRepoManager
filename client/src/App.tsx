import { Router, Route, Switch } from 'wouter';
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Layout } from "./components/layout/layout";
import { Agent } from './components/Agent';
import NotFound from './pages/not-found';
import Dashboard from "./pages/dashboard";
import MyRepositories from "./pages/my-repositories";
import TeamRepositories from "./pages/team-repositories";
import Users from "./pages/users";
import Settings from "./pages/settings";
import Repository from "./pages/repository/[id]";
import NewRepository from "./pages/new-repository";
import Search from "./pages/search";
import Warehouses from "./pages/warehouses";
import ApiConfigurations from "./pages/api-configurations";
import ProductsPage from "./pages/products";
import InboundOrders from "./pages/inbound-orders";
import OutboundOrders from "./pages/outbound-orders";
import InboundOrderDetail from "./pages/inbound-order/[id]";
import OutboundOrderDetail from "./pages/outbound-order/[id]";
import NewInboundOrder from "./pages/inbound-orders/new";
import NewOutboundOrder from "./pages/outbound-orders/new";
import NewInboundOrderWithItems from "./pages/inbound-orders/new-with-items";
import NewOutboundOrderWithItems from "./pages/outbound-orders/new-with-items";
import AdvancedOutboundOrder from "./pages/outbound-orders/advanced-fixed";
import WarehouseProducts from './pages/warehouse-products';
import WarehouseTransfers from './pages/warehouse-transfers';
import NewWarehouseTransfer from './pages/warehouse-transfers/new';
import WarehouseTransferImport from './pages/warehouse-transfers/import';
import DebugOutboundOrder from './pages/outbound-orders/debug';
import { useEffect } from "react";
import "./i18n";
import { ToastProvider } from "./components/ui/toast-provider";
import { Toaster } from "./components/ui/toaster";

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
      <ToastProvider>
        <Router>
          <Layout>
            <Switch>
              <Route path="/">{() => <Dashboard />}</Route>
              <Route path="/my-repositories">{() => <MyRepositories />}</Route>
              <Route path="/team-repositories">{() => <TeamRepositories />}</Route>
              <Route path="/users">{() => <Users />}</Route>
              <Route path="/settings">{() => <Settings />}</Route>
              <Route path="/repository/:id">
                {(params) => <Repository id={params.id} />}
              </Route>
              <Route path="/new-repository">
                {() => <NewRepository />}
              </Route>
              <Route path="/search">
                {() => <Search />}
              </Route>
              <Route path="/warehouses">
                {() => <Warehouses />}
              </Route>
              <Route path="/api-configurations">
                {() => <ApiConfigurations />}
              </Route>
              <Route path="/products">
                {() => <ProductsPage />}
              </Route>
              <Route path="/inbound-orders">
                {() => <InboundOrders />}
              </Route>
              <Route path="/inbound-orders/new">
                {() => <NewInboundOrder />}
              </Route>
              <Route path="/inbound-orders/new-with-items">
                {() => <NewInboundOrderWithItems />}
              </Route>
              <Route path="/inbound-order/:id">
                {(params) => <InboundOrderDetail id={params.id} />}
              </Route>
              <Route path="/outbound-orders">
                {() => <OutboundOrders />}
              </Route>
              <Route path="/outbound-orders/new">
                {() => <NewOutboundOrder />}
              </Route>
              <Route path="/outbound-orders/new-with-items">
                {() => <NewOutboundOrderWithItems />}
              </Route>
              <Route path="/outbound-orders/advanced">
                {() => <AdvancedOutboundOrder />}
              </Route>
              <Route path="/outbound-order/:id">
                {(params) => <OutboundOrderDetail id={params.id} />}
              </Route>
              <Route path="/warehouse-products">
                {() => <WarehouseProducts />}
              </Route>
              <Route path="/warehouse-transfers">
                {() => <WarehouseTransfers />}
              </Route>
              <Route path="/warehouse-transfers/new">
                {() => <NewWarehouseTransfer />}
              </Route>
              <Route path="/warehouse-transfers/import">
                {() => <WarehouseTransferImport />}
              </Route>
              <Route path="/outbound-orders/debug">
                {() => <DebugOutboundOrder />}
              </Route>
              <Route>
                {() => <NotFound />}
              </Route>
            </Switch>
          </Layout>
          <Agent />
          <Toaster />
        </Router>
      </ToastProvider>
    </QueryClientProvider>
  );
}