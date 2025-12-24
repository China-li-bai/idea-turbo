import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "@make-gold/lib/i18n"; // Initialize i18n

// 移动端调试工具 - 在开发环境或测试时启用
if (import.meta.env.DEV || window.location.search.includes('debug=true')) {
  import('eruda').then(eruda => eruda.default.init());
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
   <BrowserRouter>
      <App />
    </BrowserRouter>
);
