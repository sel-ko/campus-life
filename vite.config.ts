import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// One config for both the app build (Vite) and the tests (Vitest).
export default defineConfig({
  // Served from a domain root by default; GitHub Pages serves the game from
  // /<repo>/, so its build sets BASE_PATH (see .github/workflows/deploy.yml).
  base: process.env.BASE_PATH ?? '/',
  plugins: [react(), tailwindcss()],
  build: {
    // three.js alone is ~700 kB before gzip. It sits in its own lazy-loaded
    // chunk (downloaded after the start screen), so the warning is expected.
    chunkSizeWarningLimit: 1100,
  },
  test: {
    // Engine tests are plain TypeScript, so no browser environment is needed.
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
