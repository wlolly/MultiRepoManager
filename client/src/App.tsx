import React from 'react';
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import "./i18n";
import { ToastProvider } from "./components/ui/toast-provider";
import { Toaster } from "./components/ui/toaster";

// 创建一个简单的应用组件来测试基本渲染
function SimpleApp() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="p-4 border-b">
        <h1 className="text-2xl font-bold">仓库管理系统</h1>
      </header>
      <main className="container mx-auto p-4">
        <div className="p-6 bg-card rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold mb-4">系统正在加载...</h2>
          <p>如果您能看到这个页面，说明前端React应用已经成功加载。</p>
          <p className="mt-2 text-muted-foreground">时间戳: {new Date().toLocaleString()}</p>
        </div>
      </main>
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
        <SimpleApp />
        <Toaster />
      </ToastProvider>
    </QueryClientProvider>
  );
}