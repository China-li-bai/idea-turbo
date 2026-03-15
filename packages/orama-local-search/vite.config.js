import { defineConfig } from 'vite';

export default defineConfig({
    root: '.',
    publicDir: 'public',
    optimizeDeps: {
        exclude: ['@huggingface/transformers']
    },
    server: {
        port: 5174,
        headers: {
            'Cross-Origin-Opener-Policy': 'same-origin',
            'Cross-Origin-Embedder-Policy': 'require-corp'
        }
    },
    build: {
        target: 'esnext',
        outDir: 'dist'
    }
});
