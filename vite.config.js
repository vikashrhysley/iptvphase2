import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  esbuild: {
    drop: ['console', 'debugger'],
  },
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
  build: {
    chunkSizeWarningLimit: 600,
    modulePreload: { polyfill: false },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/')) {
            return 'vendor-react';
          }
          if (id.includes('node_modules/@reduxjs') || id.includes('node_modules/react-redux') || id.includes('node_modules/redux/')) {
            return 'vendor-redux';
          }
          if (id.includes('node_modules/jspdf') || id.includes('node_modules/jspdf-autotable')) {
            return 'vendor-jspdf';
          }
          if (id.includes('node_modules/xlsx')) {
            return 'vendor-xlsx';
          }
        },
      },
    },
  },
})
