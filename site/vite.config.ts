import { ideasPlugin } from './scripts/ideas.mjs';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/postcss';
import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [react(), ideasPlugin(fileURLToPath(new URL('../ideas', import.meta.url)))],
  css: { postcss: { plugins: [tailwindcss()] } },
  resolve: { alias: { '@': fileURLToPath(new URL('.', import.meta.url)) } },
  server: { port: 3000, strictPort: true, watch: { usePolling: true } },
});
