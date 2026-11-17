import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/scheduler/')) return 'vendor-react'
          if (id.includes('/@supabase/')) return 'vendor-supabase'
          if (id.includes('/lucide-react/')) return 'vendor-icons'
          if (id.includes('/qrcode/')) return 'vendor-qrcode'
          if (id.includes('/@zxing/')) return 'vendor-qr-scanner'
        }
      }
    }
  }
})
