import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          include: ['tests/**/*.test.ts'],
          exclude: ['tests/**/bench/**'],
        },
      },
      {
        test: {
          name: 'bench',
          include: [],
          benchmark: { include: ['tests/**/bench/**/*.bench.ts'] },
        },
      },
    ],
  },
});
