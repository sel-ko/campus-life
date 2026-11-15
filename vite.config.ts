import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// One config for both the app build (Vite) and the tests (Vitest).
export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    // Engine tests are plain TypeScript, so no browser environment is needed.
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
