import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
// 导入 i18n 配置
import i18n from "./i18n";

// 强制设置默认语言为中文
if (localStorage.getItem('i18nextLng') !== 'zh') {
  localStorage.setItem('i18nextLng', 'zh');
  i18n.changeLanguage('zh');
}

createRoot(document.getElementById("root")!).render(<App />);
