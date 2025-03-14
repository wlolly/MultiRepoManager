import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import "./checkLoading.js";

// 使用更直接的方法渲染应用
console.log("main.tsx is running, attempting to render App");

// 确保DOM加载完成后渲染
document.addEventListener('DOMContentLoaded', () => {
  console.log("DOM 加载完成，开始渲染React应用");
  const rootElement = document.getElementById("root");
  console.log("Root element found:", rootElement);
  
  if (rootElement) {
    try {
      const root = ReactDOM.createRoot(rootElement);
      root.render(
        <React.StrictMode>
          <App />
        </React.StrictMode>
      );
      console.log("React应用已渲染");
    } catch (error) {
      console.error("React渲染出错:", error);
    }
  } else {
    console.error("找不到Root元素，无法渲染React应用");
  }
});
