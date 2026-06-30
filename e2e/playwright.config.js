import { defineConfig, devices } from '@playwright/test';

/**
 * Config E2E para GEA_FRONT.
 *
 * Requiere (ver e2e/README.md):
 *   1. Backend corriendo en http://localhost:8083 (con TUS cambios compilados)
 *   2. Frontend dev server (Playwright lo arranca solo vía webServer, o úsalo ya levantado)
 *
 * Variables de entorno:
 *   E2E_BASE_URL   URL del frontend (default http://localhost:5173)
 */
const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:5173';

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  expect: { timeout: 7_000 },
  fullyParallel: false,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'e2e/report' }]],
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  // Arranca el dev server automáticamente; reutiliza uno ya abierto si existe.
  webServer: {
    command: 'npm run dev',
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
