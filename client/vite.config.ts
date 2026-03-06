import { defineConfig, Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

function versionPlugin(): Plugin {
  return {
    name: 'version-json',
    closeBundle() {
      const version = { v: Date.now().toString() };
      const outDir = path.resolve(__dirname, 'dist');
      fs.mkdirSync(outDir, { recursive: true });
      fs.writeFileSync(
        path.join(outDir, 'version.json'),
        JSON.stringify(version)
      );
    }
  };
}

// Rollup 4 Linux da chunk fayllarga extra hash qo'shadi,
// lekin entry bundle (index-*.js) eski short-hash nomlarni saqlaydi.
// Bu plugin entry bundle ichidagi short-hash reflarni to'g'ri long-hash bilan almashtiradi.
function fixChunkRefsPlugin(): Plugin {
  return {
    name: 'fix-chunk-refs',
    apply: 'build',
    closeBundle() {
      const distAssets = path.resolve(__dirname, 'dist/assets');
      if (!fs.existsSync(distAssets)) return;

      const files = fs.readdirSync(distAssets);
      const entryFile = files.find(f => /^index-[^.]+\.js$/.test(f));
      if (!entryFile) return;

      const entryPath = path.join(distAssets, entryFile);
      let entry = fs.readFileSync(entryPath, 'utf-8');
      const fileSet = new Set(files);
      const toFix = new Map<string, string>();

      // Entry bundle ichidagi barcha JS va CSS referenslarini topamiz
      const re = /assets\/([\w-]+)\.(js|css)\b/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(entry)) !== null) {
        const ref = m[1];
        const ext = m[2];
        const key = `${ref}.${ext}`;
        if (!fileSet.has(key) && !toFix.has(key)) {
          // Mos keluvchi uzun nomli faylni topamiz
          const actual = files.find(f => f.startsWith(`${ref}-`) && f.endsWith(`.${ext}`));
          if (actual) {
            toFix.set(key, actual.slice(0, -(ext.length + 1)));
          } else if (ext === 'css') {
            // Mos CSS yo'q — asosiy CSS faylga yo'naltiramiz
            const mainCss = files.find(f => f.startsWith('index-') && f.endsWith('.css'));
            if (mainCss) toFix.set(key, mainCss.slice(0, -4));
          }
        }
      }

      if (toFix.size === 0) return;

      for (const [key, actual] of toFix) {
        const ext = key.split('.').pop()!;
        entry = entry.replaceAll(key, `${actual}.${ext}`);
      }
      fs.writeFileSync(entryPath, entry);
    }
  };
}

export default defineConfig({
  plugins: [
    react({
      // Fast Refresh optimizatsiyasi
      fastRefresh: true
    }),
    versionPlugin(),
    fixChunkRefsPlugin()
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
            if (id.includes('d3')) {
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
