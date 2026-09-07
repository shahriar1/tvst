import { defineConfig } from 'vitest/config';

const env = {
  TZ: 'America/New_York',
  NO_COLOR: '1',
  CI: '1',
  TVST_NOW: '2016-02-01T12:00:00-05:00',
};

export default defineConfig({
  test: {
    env,
    projects: [
      {
        test: {
          name: 'unit',
          include: ['tests/unit/**/*.test.ts'],
          env,
        },
      },
      {
        test: {
          name: 'e2e',
          include: ['tests/e2e/**/*.test.ts'],
          testTimeout: 30_000,
          hookTimeout: 30_000,
          env,
        },
      },
      {
        test: {
          name: 'live',
          include: ['tests/live/**/*.test.ts'],
          testTimeout: 30_000,
        },
      },
    ],
  },
});
