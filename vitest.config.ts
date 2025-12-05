import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 30000, // 30s para testes de API
    include: ['tests/**/*.test.ts'],
  },
});
