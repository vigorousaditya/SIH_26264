import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-to-root-dist',
      closeBundle() {
        try {
          const clientDist = path.resolve(__dirname, 'dist');
          const rootDist = path.resolve(__dirname, '../dist');
          if (fs.existsSync(clientDist)) {
            fs.cpSync(clientDist, rootDist, { recursive: true });
            console.log('✅ Successfully mirrored client/dist to root /dist');
          }
        } catch (err) {
          console.error('Failed to mirror build output:', err);
        }
      }
    }
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
