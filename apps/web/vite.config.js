/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    // 代码分包策略
    rollupOptions: {
      output: {
        manualChunks: {
          // React 核心
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // Ant Design 单独分包（最大头）
          'vendor-antd': ['antd', '@ant-design/icons'],
          // 数据请求
          'vendor-data': ['axios', '@tanstack/react-query'],

          // 状态管理
          'vendor-state': ['zustand'],
        },
      },
    },
    // 压缩
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,   // 移除 console.log
        drop_debugger: true,  // 移除 debugger
        pure_funcs: ['console.log', 'console.info'],
      },
      format: {
        comments: false, // 移除注释
      },
    },
    // chunk 大小警告阈值
    chunkSizeWarningLimit: 500,
    // source map（生产环境关闭减小体积）
    sourcemap: false,
    // CSS 代码分割
    cssCodeSplit: true,
    // 资源内联阈值 4KB
    assetsInlineLimit: 4096,
  },
  // Vitest 配置
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.js'],
    include: ['src/**/*.{test,spec}.{js,jsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: ['node_modules/', 'src/__tests__/setup.js'],
    },
  },
})