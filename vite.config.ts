import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? '/compiler/' : '/',
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler']],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@compiler': path.resolve(__dirname, './src/compiler'),
      '@components': path.resolve(__dirname, './src/components'),
      '@workers': path.resolve(__dirname, './src/workers'),
    },
  },
  worker: {
    format: 'es',
  },
})
