import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  minify: false,
  platform: 'neutral', // Use neutral platform for both Node.js and browser compatibility
  external: ['events'], // Mark events as external to avoid bundling issues
});