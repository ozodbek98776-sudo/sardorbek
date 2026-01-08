import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3003',
        changeOrigin: true
      }
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // React va React DOM ni alohida chunk'ga ajratish
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // Chart kutubxonasini alohida chunk'ga ajratish
          'chart-vendor': ['recharts'],
          // QR Code kutubxonalarini alohida chunk'ga ajratish
          'qrcode-vendor': ['qrcode', 'qrcode.react', 'html5-qrcode'],
          // Icon kutubxonasini alohida chunk'ga ajratish
          'icons-vendor': ['lucide-react'],
          // Axios ni alohida chunk'ga ajratish
          'http-vendor': ['axios']
        }
      }
    },
    // Chunk size limitini 1000 KB ga oshirish (yoki optimallashtirish orqali kamaytirish)
    chunkSizeWarningLimit: 1000
  }
})
