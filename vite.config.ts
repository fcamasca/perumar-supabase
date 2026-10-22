import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { loadEnv } from 'vite'
import { validateEnv } from './src/lib/env.ts'

export default defineConfig(({ command, mode }) => {
  if (command === 'build') validateEnv({ ...loadEnv(mode, process.cwd(), 'VITE_'), ...process.env })
  return {
  plugins: [react()],
  server: { host: '127.0.0.1', port: 5173, strictPort: true },
  preview: { host: '127.0.0.1', port: 4173, strictPort: true },
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
  },
  }
})
