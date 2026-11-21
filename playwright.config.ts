import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['html', { open: 'never' }], ['github']] : 'list',
  use: { baseURL: process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  webServer: process.env.E2E_BASE_URL ? undefined : { command: 'npm exec vite -- --host 127.0.0.1 --port 4173', url: 'http://127.0.0.1:4173', reuseExistingServer: !process.env.CI, timeout: 120_000 },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chromium', use: { ...devices['Pixel 5'] } },
  ],
});
