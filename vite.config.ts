import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { exportServer } from './scripts/export-server.mjs'

export default defineConfig({
  plugins: [react(), exportServer()],
  server: { host: '127.0.0.1', fs: { deny: ['**/exports/**', '**/.git/**', '**/.env*'] } },
  preview: { host: '127.0.0.1' },
})
