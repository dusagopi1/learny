import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/openstax': {
        target: 'https://openstax.org',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/openstax/, ''),
      },
      '/openstaxex': {
        target: 'https://exercises.openstax.org',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/openstaxex/, ''),
      },
    },
  },
})
