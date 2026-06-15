import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'build' ? '/party/' : '/',
  server: {
    port: 5175,
    host: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
}))
