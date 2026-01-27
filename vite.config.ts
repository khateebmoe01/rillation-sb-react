import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React - loaded on every page
          'vendor-react': ['react', 'react-dom'],
          'vendor-router': ['react-router-dom'],
          // Charts - large, only needed on dashboard pages
          'vendor-charts': ['recharts'],
          // Animation library
          'vendor-animation': ['framer-motion'],
          // Backend client
          'vendor-supabase': ['@supabase/supabase-js'],
          // Query/caching
          'vendor-query': [
            '@tanstack/react-query',
            '@tanstack/query-sync-storage-persister',
            '@tanstack/react-query-persist-client',
          ],
          // Drag and drop - only needed on specific pages
          'vendor-dnd': ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
        },
      },
    },
    // Warning limit
    chunkSizeWarningLimit: 500,
  },
})

