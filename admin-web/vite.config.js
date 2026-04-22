import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    AutoImport({
      resolvers: [ElementPlusResolver()],
      imports: ['vue', 'vue-router', 'pinia'],
      dts: 'src/auto-imports.d.ts'
    }),
    Components({
      resolvers: [ElementPlusResolver()],
      dts: 'src/components.d.ts'
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/uploads': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  },
  build: {
    charset: 'utf-8',
    // 代码分割
    rollupOptions: {
      output: {
        // 手动分割代码块
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Vue 核心
            if (id.includes('vue') || id.includes('vue-router') || id.includes('pinia')) {
              return 'vue-vendor'
            }
            // Element Plus 组件（不含图标）
            if (id.includes('element-plus') && !id.includes('icons')) {
              return 'element-plus'
            }
            // Element Plus 图标
            if (id.includes('@element-plus/icons-vue')) {
              return 'element-icons'
            }
            // ECharts
            if (id.includes('echarts')) {
              return 'echarts'
            }
            // 工具库
            if (id.includes('axios') || id.includes('dayjs')) {
              return 'utils'
            }
          }
        },
        // 文件命名
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]'
      }
    },
    // 压缩配置（使用 esbuild，比 terser 更快）
    minify: 'esbuild',
    // 分块大小警告阈值
    chunkSizeWarningLimit: 1000,
    // CSS 代码分割
    cssCodeSplit: true,
    // 启用 source map（生产环境可关闭）
    sourcemap: false
  },
  // 优化依赖预构建
  optimizeDeps: {
    include: [
      'vue',
      'vue-router',
      'pinia',
      'axios',
      'dayjs'
    ]
  }
})