import { defineConfig } from 'vitest/config'
import viteReact from '@vitejs/plugin-react'
import { resolve } from 'node:path'

export default defineConfig({
  plugins: [viteReact()],
  resolve: {
    alias: {
      '@': resolve(import.meta.dirname, 'src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/shared/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'dist', '.output', 'tests/e2e/**'],
  },
})
