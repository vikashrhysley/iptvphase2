import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://iptvapp.studyineurope.xyz',
        changeOrigin: true,
        secure: false,
      },
      '/health': {
        target: 'https://iptvapp.studyineurope.xyz',
        changeOrigin: true,
        secure: false,
      },
      '/metrics': {
        target: 'https://iptvapp.studyineurope.xyz',
        changeOrigin: true,
        secure: false,
      },
      '/version': {
        target: 'https://iptvapp.studyineurope.xyz',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
