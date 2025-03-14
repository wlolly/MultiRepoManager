/**
 * 前端测试组件
 * 用于验证React和相关库在新环境中是否正确工作
 */

import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import axios from 'axios';

// 创建QueryClient
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

// API请求帮助函数
const apiRequest = async (url, method = 'GET', data = null) => {
  try {
    const response = await axios({
      url,
      method,
      data,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return response.data;
  } catch (error) {
    console.error('API请求错误:', error);
    throw error;
  }
};

// 状态指示器组件
function StatusIndicator({ label, status, details }) {
  return (
    <div className="status-item">
      <span className="label">{label}:</span>
      <span className={`status ${status}`}>
        {status === 'success' ? '✅ 成功' : status === 'error' ? '❌ 失败' : '⏳ 检查中...'}
        {details && <span className="details"> - {details}</span>}
      </span>
    </div>
  );
}

// API测试组件
function ApiTest() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['health'],
    queryFn: () => apiRequest('/api/health'),
  });

  if (isLoading) return <StatusIndicator label="API连接" status="loading" />;
  
  if (isError) {
    return (
      <StatusIndicator 
        label="API连接" 
        status="error" 
        details={error.message} 
      />
    );
  }
  
  return (
    <StatusIndicator 
      label="API连接" 
      status="success" 
      details={`服务器时间: ${new Date(data.serverTime).toLocaleString()}`} 
    />
  );
}

// 主应用组件
function TestApp() {
  const [count, setCount] = useState(0);
  const [isReactWorking, setIsReactWorking] = useState(false);
  const [isHooksWorking, setIsHooksWorking] = useState(false);
  
  useEffect(() => {
    // 验证React和Hook是否工作
    setIsReactWorking(true);
    setIsHooksWorking(true);
  }, []);
  
  return (
    <div className="container">
      <header>
        <h1>仓库管理系统 - 前端测试</h1>
        <p>此页面用于测试React及相关库是否正常工作</p>
      </header>
      
      <div className="card">
        <h2>前端库状态</h2>
        <StatusIndicator 
          label="React" 
          status={isReactWorking ? 'success' : 'loading'} 
        />
        <StatusIndicator 
          label="React Hooks" 
          status={isHooksWorking ? 'success' : 'loading'} 
        />
        <StatusIndicator 
          label="React Query" 
          status={queryClient ? 'success' : 'error'} 
        />
        <ApiTest />
      </div>
      
      <div className="card">
        <h2>交互测试</h2>
        <p>点击按钮测试状态更新:</p>
        <button 
          onClick={() => setCount(prev => prev + 1)}
          className="button"
        >
          点击计数: {count}
        </button>
      </div>
      
      <div className="card">
        <h2>环境信息</h2>
        <p>React版本: {React.version}</p>
        <p>当前时间: {new Date().toLocaleString()}</p>
        <p>浏览器: {navigator.userAgent}</p>
      </div>
      
      <footer>
        测试前端 © 2025 | 仓库管理系统
      </footer>
    </div>
  );
}

// 启动应用
document.addEventListener('DOMContentLoaded', () => {
  const rootElement = document.getElementById('root');
  if (rootElement) {
    ReactDOM.createRoot(rootElement).render(
      <QueryClientProvider client={queryClient}>
        <TestApp />
      </QueryClientProvider>
    );
  } else {
    console.error('找不到根元素 #root');
  }
});

// 为独立测试导出组件
export { TestApp, StatusIndicator, ApiTest };