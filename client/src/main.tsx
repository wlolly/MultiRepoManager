import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import "./checkLoading.js";

// 直接渲染应用，简化逻辑
console.log("main.tsx is running, attempting to render App");

// 立即尝试渲染
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
    
    // 隐藏加载指示器
    const loadingIndicator = document.getElementById("loading-indicator");
    if (loadingIndicator) {
      loadingIndicator.style.display = "none";
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
