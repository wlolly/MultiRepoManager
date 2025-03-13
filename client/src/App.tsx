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
import { useEffect } from "react";
import { I18nextProvider } from "react-i18next";
import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import { Layout } from "@/components/layout/layout";

// 扩展翻译内容，包含右侧的英文内容
const resources = {
  zh: {
    translation: {
      app: {
        name: "ELEMENT-5 SYSTEM",
        version: "版本 1.0.0"
      },
      sidebar: {
        navigation: "导航",
        recentActivity: "最近活动",
        noActivity: "暂无活动",
        newRepository: "新建仓库", 
        navigation_items: {
          dashboard: "仪表盘",
          myRepositories: "我的仓库",
          teamRepositories: "团队仓库",
          usersAndTeams: "用户和团队",
          settings: "系统设置"
        }
      },
      header: {
        searchPlaceholder: "搜索",
        language: {
          title: "切换语言",
          zh: "中文",
          en: "英文",
          ru: "俄文",
          kk: "哈萨克文",
          uz: "乌兹别克文"
        },
        account: {
          myAccount: "我的账号",
          profile: "个人资料",
          settings: "设置",
          logout: "退出登录"
        }
      },
      dashboard: {
        title: "仪表盘",
        welcome: "欢迎使用仓储管理系统",
        overview: "系统概览",
        stats: {
          totalRepositories: "仓库总数",
          totalUsers: "用户总数",
          totalLanguages: "支持语言数",
          recentCommits: "最近提交"
        },
        languageDistribution: "语言分布",
        recentActivity: "最近活动",
        noActivity: "暂无活动"
      },
      repositories: {
        title: "仓库",
        my: "我的仓库",
        team: "团队仓库",
        newRepository: "新建仓库",
        empty: "暂无仓库",
        createFirst: "创建第一个仓库",
        search: "搜索仓库",
        all_languages: "所有语言",
        all_users: "所有用户"
      },
      list_view: "列表视图",
      grid_view: "网格视图"
    }
  },
  en: {
    translation: {
      app: {
        name: "ELEMENT-5 SYSTEM",
        version: "Version 1.0.0"
      },
      sidebar: {
        navigation: "Navigation",
        recentActivity: "Recent Activity",
        noActivity: "No Activity",
        newRepository: "New Repository",
        navigation_items: {
          dashboard: "Dashboard",
          myRepositories: "My Repositories",
          teamRepositories: "Team Repositories",
          usersAndTeams: "Users & Teams",
          settings: "Settings"
        }
      },
      header: {
        searchPlaceholder: "Search",
        language: {
          title: "Switch Language",
          zh: "Chinese",
          en: "English",
          ru: "Russian",
          kk: "Kazakh",
          uz: "Uzbek"
        },
        account: {
          myAccount: "My Account",
          profile: "Profile",
          settings: "Settings",
          logout: "Logout"
        }
      },
      dashboard: {
        title: "Dashboard",
        welcome: "Welcome to Warehouse Management System",
        overview: "System Overview",
        stats: {
          totalRepositories: "Total Repositories",
          totalUsers: "Total Users",
          totalLanguages: "Supported Languages",
          recentCommits: "Recent Commits"
        },
        languageDistribution: "Language Distribution",
        recentActivity: "Recent Activity",
        noActivity: "No Activity"
      },
      repositories: {
        title: "Repositories",
        my: "My Repositories",
        team: "Team Repositories",
        newRepository: "New Repository",
        empty: "No repositories",
        createFirst: "Create your first repository",
        search: "Search repositories",
        all_languages: "All Languages",
        all_users: "All Users"
      },
      list_view: "List View",
      grid_view: "Grid View"
    }
  }
};

// 创建我们自己的i18n实例
const i18n = i18next.createInstance();
i18n.use(initReactI18next).init({
  resources,
  lng: 'zh', // 默认中文
  fallbackLng: 'zh',
  interpolation: {
    escapeValue: false
  }
});

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
  // 强制设置为中文
  useEffect(() => {
    // 清除localStorage中可能存在的语言设置
    localStorage.removeItem('i18nextLng');
    // 设置为中文
    i18n.changeLanguage('zh');
    // 确保设置生效
    document.documentElement.lang = 'zh';
    console.log('语言已设置为中文', i18n.language);
  }, []);

  return (
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={queryClient}>
        <Layout>
          <Router />
        </Layout>
        <Toaster />
      </QueryClientProvider>
    </I18nextProvider>
  );
}

export default App;
