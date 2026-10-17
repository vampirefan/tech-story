import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  // Electron 以 file:// 加载 dist，资源路径必须相对
  base: './',
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  server: {
    port: 5173
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  }
})
