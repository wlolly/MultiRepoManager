import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
// 导入 i18n 配置
import "./i18n";

createRoot(document.getElementById("root")!).render(<App />);
