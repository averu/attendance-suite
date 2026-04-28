import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'node:path'

export default defineConfig({
  // CLAUDE.md: tanstackStart() → viteReact() の順を厳守 (順序逆転で SSR 壊れる)
  // Tailwind v4 の Vite plugin はどの位置でも OK だが、明示的に最後に置く
  plugins: [tanstackStart(), viteReact(), tailwindcss()],
  resolve: {
    alias: {
      '@': resolve(import.meta.dirname, 'src'),
    },
  },
  server: {
    port: 3000,
  },
})
