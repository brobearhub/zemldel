import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['**/*.{test,spec}.{ts,tsx}'],
    exclude: ['.next/**', 'node_modules/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'app/api/**/*.{ts,tsx}',
        'app/admin/services/**/*.{ts,tsx}',
        'widgets/services/**/*.{ts,tsx}',
      ],
      exclude: ['**/*.d.ts', '**/generated/**'],
    },
  },
});

