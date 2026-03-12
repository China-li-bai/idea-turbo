import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  build: {
    outDir: 'dist',
    target: 'esnext',
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          transformers: ['@huggingface/transformers'],
          edgevec: ['edgevec']
        }
      }
    }
  },
  optimizeDeps: {
    exclude: ['@huggingface/transformers', 'edgevec'],
    include: []
  },
  server: {
    port: 3000,
    open: false
  },
  preview: {
    port: 4173
  }
});
