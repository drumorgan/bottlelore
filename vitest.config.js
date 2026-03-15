import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: 'coverage',
      include: ['assets/js/**/*.js'],
      exclude: ['node_modules/', 'assets/dist/'],
      thresholds: {
        statements: 40,
        branches: 80,
        functions: 70,
        lines: 40,
      },
    },
  },
});
