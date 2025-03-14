import React from 'react';
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import "./i18n";
import { ToastProvider } from "./components/ui/toast-provider";
import { Toaster } from "./components/ui/toaster";
import { ToastExample } from "./components/ToastFix";

// 创建一个简单的应用组件来测试基本渲染
function SimpleApp() {
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleString());
  
  // 每秒更新时间以验证组件是否正常渲染
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleString());
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);
  
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="p-4 border-b">
        <h1 className="text-2xl font-bold">仓库管理系统</h1>
      </header>
      <main className="container mx-auto p-4">
        <div className="p-6 bg-white rounded-lg shadow-sm mb-4">
          <h2 className="text-xl font-semibold mb-4">系统已成功加载</h2>
          <p>如果您能看到这个页面，说明前端React应用已经成功加载。</p>
          <p className="mt-2 text-gray-600">当前时间: {currentTime}</p>
        </div>
        
        {/* 测试Toast组件 */}
        <div className="p-6 bg-white rounded-lg shadow-sm">
          <ToastExample />
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