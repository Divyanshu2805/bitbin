import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    exclude: ['node_modules', '.next'],
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'json-summary', 'html'],
      // Server code is what the unit tests cover; components and generated code are checked in the browser
      include: ['src/actions/**/*.ts', 'src/lib/**/*.ts', 'src/app/api/**/*.ts'],
      exclude: ['**/*.test.ts', 'src/generated/**', 'src/lib/constants/**'],
      // The floor sits just under today's numbers so a drop fails CI
      thresholds: { statements: 75, branches: 75, functions: 65, lines: 75 },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
