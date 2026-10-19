import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    testTimeout: 120_000,
    globalSetup: ['tests/shell/support/global-setup.ts', 'tests/collection/support/global-setup.ts', 'tests/atlas/support/global-setup.ts', 'tests/bibliography/support/global-setup.ts', 'tests/rooms/support/global-setup.ts'],
  },
});
