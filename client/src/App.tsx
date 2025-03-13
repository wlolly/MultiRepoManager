import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import MyRepositories from "@/pages/my-repositories";
import TeamRepositories from "@/pages/team-repositories";
import Users from "@/pages/users";
import Settings from "@/pages/settings";
import Repository from "@/pages/repository/[id]";
import NewRepository from "@/pages/new-repository";
import Search from "@/pages/search";
import Warehouses from "@/pages/warehouses";
import { useEffect } from "react";
import { Layout } from "@/components/layout/layout";
// 引入预先配置好的i18n实例
import "./i18n";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/my-repositories" component={MyRepositories} />
      <Route path="/team-repositories" component={TeamRepositories} />
      <Route path="/users" component={Users} />
      <Route path="/settings" component={Settings} />
      <Route path="/repository/:id" component={Repository} />
      <Route path="/new-repository" component={NewRepository} />
      <Route path="/search" component={Search} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
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
      <Layout>
        <Router />
      </Layout>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
