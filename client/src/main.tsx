import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import "./checkLoading.js";
import { getSessionId, attachSessionToRequest } from './lib/sessionManager';

// 渲染应用，确保加载指示器显示足够的时间
console.log("main.tsx is running, 准备渲染App");

// 使用全局接口类型，支持window.hideLoadingIndicator
declare global {
  interface Window {
    hideLoadingIndicator: () => void;
  }
}

// 渲染函数
function renderApp() {
  const rootElement = document.getElementById("root");
  console.log("Root element found:", rootElement);

  if (rootElement) {
    try {
      // 立即渲染React应用
      ReactDOM.createRoot(rootElement).render(
        <React.StrictMode>
          <App />
        </React.StrictMode>
      );
      console.log("React应用已渲染");
      
      // 使用HTML中定义的全局函数隐藏加载指示器
      // 该函数会确保加载指示器至少显示5秒
      if (typeof window.hideLoadingIndicator === 'function') {
        // 在应用渲染完成后隐藏加载指示器
        setTimeout(() => {
          window.hideLoadingIndicator();
          // 触发应用加载完成事件
          window.dispatchEvent(new Event('app-loaded'));
        }, 500); // 给React应用渲染一些时间
      } else {
        console.error("未找到hideLoadingIndicator函数，无法隐藏加载指示器");
        
        // 如果全局函数不存在，使用备用方法
        setTimeout(() => {
          const loadingIndicator = document.getElementById("loading-indicator");
          if (loadingIndicator) {
            loadingIndicator.style.display = "none";
          }
          // 触发应用加载完成事件
          window.dispatchEvent(new Event('app-loaded'));
        }, 5000); // 5秒后隐藏
      }
    } catch (error) {
      console.error("React渲染出错:", error);
      // 显示错误信息
      const loadingStatus = document.getElementById("loading-status");
      if (loadingStatus) {
        loadingStatus.textContent = "加载失败，请查看控制台错误";
        loadingStatus.style.color = "red";
      }
    }
  } else {
    console.error("找不到Root元素，无法渲染React应用");
  }
}

// 延迟一小段时间再开始渲染，确保HTML中的计时器已启动
setTimeout(renderApp, 500);
