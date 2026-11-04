import { defineConfig } from 'vite'
import {userSettingsServer} from './scripts/user-settings-server.mjs'
import react from '@vitejs/plugin-react'
import { exportServer } from './scripts/export-server.mjs'

export default defineConfig({
  plugins: [react(), userSettingsServer(), exportServer()],
  server: { host: '127.0.0.1', watch: { usePolling: true, interval: 500 }, fs: { deny: ['**/exports/**', '**/.git/**', '**/.env*', '**/user-data/**'] } },
  preview: { host: '127.0.0.1' },
})
