import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { resolve } from 'path';

export default defineConfig({
  plugins: [preact()],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.tsx'),
      name: 'NexvoWidget',
      fileName: () => 'nexvo-widget.js',
      formats: ['iife'],
    },
    rollupOptions: {
      output: {
        // Inline all CSS and assets
        inlineDynamicImports: true,
        assetFileNames: 'nexvo-widget.[ext]',
      },
    },
    cssCodeSplit: false,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
      },
    },
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
  },
});
