import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react({
      // Fast Refresh optimizatsiyasi
      fastRefresh: true
    })
  ],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true
      },
      '/uploads': {
        target: 'http://localhost:8000',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'esbuild',
    // CSS code splitting
    cssCodeSplit: true,
    // Chunk size optimizatsiyasi
    chunkSizeWarningLimit: 1000,
    target: 'es2015',
    rollupOptions: {
      output: {
        // Optimal chunk strategiyasi
        manualChunks: (id) => {
          // node_modules dan kelgan paketlar
          if (id.includes('node_modules')) {
            // React asosiy kutubxonalari
            if (id.includes('react') || id.includes('react-dom')) {
              return 'react-vendor';
            }
            // React Router
            if (id.includes('react-router')) {
              return 'router-vendor';
            }
            // Lucide icons
            if (id.includes('lucide-react')) {
              return 'icons-vendor';
            }
            // Axios
            if (id.includes('axios')) {
              return 'http-vendor';
            }
            // QR code kutubxonalari
            if (id.includes('qrcode') || id.includes('html5-qrcode')) {
              return 'qrcode-vendor';
            }
            // Chart kutubxonalari
            if (id.includes('recharts') || id.includes('d3')) {
              return 'chart-vendor';
            }
            // Socket.io
            if (id.includes('socket.io')) {
              return 'socket-vendor';
            }
            // Boshqa barcha vendor fayllar
            return 'vendor';
          }
          
          // Admin sahifalar
          if (id.includes('/pages/admin/')) {
            return 'admin-pages';
          }
          
          // Kassa sahifalar
          if (id.includes('/pages/kassa/')) {
            return 'kassa-pages';
          }
          
          // Components
          if (id.includes('/components/')) {
            return 'components';
          }
        },
        // Fayl nomlari optimizatsiyasi
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    }
  },
  // Optimizatsiya sozlamalari
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'axios',
      'lucide-react'
    ],
    exclude: ['@vite/client', '@vite/env']
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production')
  },
  esbuild: {
    logOverride: { 'this-is-undefined-in-esm': 'silent' },
    // Production da console.log ni olib tashlash
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : []
  }
})
