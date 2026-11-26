import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { loadEnv } from 'vite'
import { validateEnv } from './src/lib/env.ts'

export default defineConfig(({ command, mode }) => {
  const values = { ...loadEnv(mode, process.cwd(), 'VITE_'), ...process.env }
  const publicConfig = command === 'build' ? validateEnv(values) : undefined
  let outputDirectory = ''
  return {
  plugins: [react(), {
    name: 'perumar-security-headers',
    apply: 'build',
    configResolved(config) { outputDirectory = path.resolve(config.root, config.build.outDir) },
    closeBundle() {
      if (!publicConfig) return
      const template = readFileSync('public/_headers', 'utf8')
      writeFileSync(path.join(outputDirectory, '_headers'), template.replaceAll('https://perumar-supabase.invalid', publicConfig.url))
    },
  }],
  // PDF export is loaded on demand; prebundle it before the first browser request.
  optimizeDeps: { include: ['pdf-lib'] },
  server: { host: '127.0.0.1', port: 5173, strictPort: true },
  preview: { host: '127.0.0.1', port: 4173, strictPort: true },
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
  },
  }
})
