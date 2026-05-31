import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/cse_Attendance/',
  build: {
    sourcemap: false,
  },
  server: {
    port: 5173,
    proxy: {
      '/cseakash': {
        target: 'http://localhost:6000',
        changeOrigin: true,
      },
    },
  },
})
