import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string }

export default defineConfig({
  plugins: [react()],
  // scripts/live.ts bumps package.json before building, so this is the Capgo bundle version.
  define: { __APP_VERSION__: JSON.stringify(version) },
  build: { outDir: 'dist', target: 'es2022' },
})
