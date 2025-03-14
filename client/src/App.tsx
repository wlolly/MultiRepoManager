import { Router, Route, Switch } from 'wouter';
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Layout } from "@/components/layout/layout";
import { Agent } from './components/Agent';
import NotFound from '@/pages/not-found';
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
import AdvancedOutboundOrder from "@/pages/outbound-orders/advanced-fixed";
import WarehouseProducts from '@/pages/warehouse-products';
import WarehouseTransfers from '@/pages/warehouse-transfers';
import NewWarehouseTransfer from '@/pages/warehouse-transfers/new';
import WarehouseTransferImport from '@/pages/warehouse-transfers/import';
import DebugOutboundOrder from '@/pages/outbound-orders/debug';
import { createContext, useContext, useReducer, useEffect } from "react";
import "./i18n";

// 简单的Toast上下文
type Toast = {
  id: string;
  title?: string;
  description?: string;
  type?: "default" | "success" | "error" | "warning";
};

type ToastState = {
  toasts: Toast[];
};

type ToastAction =
  | { type: "ADD_TOAST"; toast: Toast }
  | { type: "REMOVE_TOAST"; id: string };

const ToastContext = createContext<{
  state: ToastState;
  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
} | undefined>(undefined);

const toastReducer = (state: ToastState, action: ToastAction): ToastState => {
  switch (action.type) {
    case "ADD_TOAST":
      return {
        ...state,
        toasts: [...state.toasts, action.toast],
      };
    case "REMOVE_TOAST":
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.id),
      };
    default:
      return state;
  }
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(toastReducer, { toasts: [] });

  const addToast = (toast: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).substring(2, 9);
    dispatch({ type: "ADD_TOAST", toast: { id, ...toast } });
  };

  const removeToast = (id: string) => {
    dispatch({ type: "REMOVE_TOAST", id });
  };

  return (
    <ToastContext.Provider value={{ state, addToast, removeToast }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

// 将window对象绑定到全局使用的toast函数
if (typeof window !== "undefined") {
  (window as any).toast = {
    success: (message: string) => {
      const context = (window as any).__TOAST_CONTEXT;
      if (context) {
        context.addToast({ title: "成功", description: message, type: "success" });
      }
    },
    error: (message: string) => {
      const context = (window as any).__TOAST_CONTEXT;
      if (context) {
        context.addToast({ title: "错误", description: message, type: "error" });
      }
    },
    warning: (message: string) => {
      const context = (window as any).__TOAST_CONTEXT;
      if (context) {
        context.addToast({ title: "警告", description: message, type: "warning" });
      }
    },
    info: (message: string) => {
      const context = (window as any).__TOAST_CONTEXT;
      if (context) {
        context.addToast({ title: "提示", description: message, type: "default" });
      }
    }
  };
}

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
              <Route path="/" component={Dashboard} />
              <Route path="/my-repositories" component={MyRepositories} />
              <Route path="/team-repositories" component={TeamRepositories} />
              <Route path="/users" component={Users} />
              <Route path="/settings" component={Settings} />
              <Route path="/repository/:id" component={Repository} />
              <Route path="/new-repository" component={NewRepository} />
              <Route path="/search" component={Search} />
              <Route path="/warehouses" component={Warehouses} />
              <Route path="/api-configurations" component={ApiConfigurations} />
              <Route path="/products" component={ProductsPage} />
              <Route path="/inbound-orders" component={InboundOrders} />
              <Route path="/inbound-orders/new" component={NewInboundOrder} />
              <Route path="/inbound-orders/new-with-items" component={NewInboundOrderWithItems} />
              <Route path="/inbound-order/:id" component={InboundOrderDetail} />
              <Route path="/outbound-orders" component={OutboundOrders} />
              <Route path="/outbound-orders/new" component={NewOutboundOrder} />
              <Route path="/outbound-orders/new-with-items" component={NewOutboundOrderWithItems} />
              <Route path="/outbound-orders/advanced" component={AdvancedOutboundOrder} />
              <Route path="/outbound-order/:id" component={OutboundOrderDetail} />
              <Route path="/warehouse-products" component={WarehouseProducts} />
              <Route path="/warehouse-transfers" component={WarehouseTransfers} />
              <Route path="/warehouse-transfers/new" component={NewWarehouseTransfer} />
              <Route path="/warehouse-transfers/import" component={WarehouseTransferImport} />
              <Route path="/outbound-orders/debug" component={DebugOutboundOrder} />
              <Route component={NotFound} />
            </Switch>
          </Layout>
          <Agent />
          <Toaster />
        </Router>
      </ToastProvider>
    </QueryClientProvider>
  );
}