import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// 最简单的入口，直接渲染应用
createRoot(document.getElementById("root")!).render(<App />);
