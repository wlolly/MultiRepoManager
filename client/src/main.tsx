import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./checkLoading.js";

// 最简单的入口，直接渲染应用
console.log("main.tsx is running, attempting to render App");
const rootElement = document.getElementById("root");
console.log("Root element found:", rootElement);
if (rootElement) {
  createRoot(rootElement).render(<App />);
} else {
  console.error("Root element not found");
}
