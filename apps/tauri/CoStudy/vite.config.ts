/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path"
const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    // 关键修复：确保 workspace 与依赖中的 React 使用同一份实例
    dedupe: ["react", "react-dom"],
  },

  // 关键修复：避免 Vite 预打包处理 PGlite 导致 FS bundle 变形
  optimizeDeps: {
    exclude: ["@electric-sql/pglite", "@electric-sql/pglite-sync"],
  },

  // 确保 wasm 资产可被正确加载（开发环境）
  assetsInclude: ["**/*.wasm"],

  // 针对 Node.js v17+ OpenSSL 兼容性问题的配置
  define: {
    global: "globalThis",
  },

  esbuild: {
    // 修复 OpenSSL 兼容性问题，并添加 iOS 14 兼容性支持
    target: ["es2020", "ios14"],
    // 添加 polyfills 以支持旧版浏览器
    supported: {
      "bigint": true,
      "object-rest-spread": true,
    },
  },

  // 添加构建优化配置
  build: {
    target: ["es2020", "ios14"],
    cssTarget: "ios14",
    rollupOptions: {
      output: {
        manualChunks: {
          // 将第三方库分离到单独的 chunk 中
          vendor: ["react", "react-dom"],
          radix: ["@radix-ui/react-avatar", "@radix-ui/react-dialog", "@radix-ui/react-dropdown-menu"],
          utils: ["clsx", "tailwind-merge", "class-variance-authority"],
        },
      },
    },
    // 确保public目录中的文件被复制到dist目录
    copyPublicDir: true,
  },

  test: {
    environment: "jsdom",
    globals: true,
  },

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1024,
    strictPort: false,
    host: host || false,
    fs: {
      allow: [path.resolve(__dirname, "..", "..", "..")],
    },
    hmr: host
      ? {
        protocol: "ws",
        host,
        port: 1421,
      }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
}));
