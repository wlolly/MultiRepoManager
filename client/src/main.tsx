import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import "./checkLoading.js";
import { getSessionId, attachSessionToRequest } from './lib/sessionManager';

// 延迟渲染应用，确保加载指示器显示足够的时间
console.log("main.tsx is running, 准备延迟渲染App");

// 定义最小显示加载指示器的时间（5秒）
const MIN_LOADING_TIME = 5000; // 毫秒
const startTime = Date.now();

// 延迟渲染函数
function renderApp() {
  const rootElement = document.getElementById("root");
  console.log("Root element found:", rootElement);

  if (rootElement) {
    try {
      ReactDOM.createRoot(rootElement).render(
        <React.StrictMode>
          <App />
        </React.StrictMode>
      );
      console.log("React应用已渲染");
      
      // 计算已经过了多少时间
      const elapsedTime = Date.now() - startTime;
      
      // 如果没有达到最小加载时间，继续显示加载指示器直到达到最小时间
      const remainingTime = Math.max(0, MIN_LOADING_TIME - elapsedTime);
      
      // 在最小加载时间后隐藏加载指示器
      setTimeout(() => {
        const loadingIndicator = document.getElementById("loading-indicator");
        if (loadingIndicator) {
          loadingIndicator.style.display = "none";
          
          // 触发应用加载完成事件
          window.dispatchEvent(new Event('app-loaded'));
        }
      }, remainingTime);
      
      console.log(`应用已渲染，加载指示器将在${remainingTime}毫秒后隐藏`);
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

// 在短暂延迟后开始渲染过程
setTimeout(renderApp, 500); // 给加载指示器有时间初始化
