import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => id.includes('@tiptap') || id.includes('prosemirror') ? 'editor' : undefined,
      },
    },
  },
  server: {
    proxy: {
      '/api': process.env.VITE_API_PROXY_TARGET ?? 'http://localhost:8080',
      '/healthz': process.env.VITE_API_PROXY_TARGET ?? 'http://localhost:8080',
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    globals: true,
  },
})
