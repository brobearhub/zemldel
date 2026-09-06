import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: [
      'src/**/*.spec.ts',
      'src/**/*.integration.spec.ts',
      'scripts/**/*.spec.ts',
      'scripts/**/*.integration.spec.ts',
      'test/**/*.e2e-spec.ts',
    ],
  },
});

