/// <reference types="vitest" />
import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    // 确保测试串行执行
    sequence: {
      concurrent: false,
      shuffle: false,
      seed: 1000,
    },
    // 设置测试环境
    environment: 'node',
    // 覆盖率配置
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        'scripts/',
        'dist/',
      ],
    },
  },
});