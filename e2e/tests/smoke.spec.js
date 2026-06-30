import { test, expect } from '@playwright/test';

/**
 * Smoke E2E de los flujos visibles más críticos.
 * Credenciales semilla (DataInitializer del backend):
 *   - Cesar@gmail.com / 1234        (SuperAdmin)
 *   - Comunicaciones@gmail.com / 1234 (Comunicaciones)
 *   - oficina@gmail.com / 1234      (Oficina)
 *
 * NOTA: corre contra la BD real del backend. Lo que crees aquí queda en la BD.
 */

const ADMIN = { correo: 'Cesar@gmail.com', password: '1234' };

async function login(page, { correo, password }) {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: /inicia sesión/i })).toBeVisible();
  await page.locator('#login-correo').fill(correo);
  await page.locator('#login-password').fill(password);
  // El form se envía con submit; press Enter es robusto frente a cambios de texto del botón
  await page.locator('#login-password').press('Enter');
}

test('login válido redirige al calendario', async ({ page }) => {
  await login(page, ADMIN);
  await expect(page).toHaveURL(/\/calendario/, { timeout: 10_000 });
});

test('login inválido no entra y muestra error', async ({ page }) => {
  await login(page, { correo: 'Cesar@gmail.com', password: 'clave-incorrecta' });
  // No debe navegar al calendario
  await expect(page).not.toHaveURL(/\/calendario/);
  // Debe mostrar un mensaje de error (errorBox role=alert o toast)
  await expect(page.getByText(/credenciales|inválid|error/i).first()).toBeVisible();
});

test('ruta protegida sin sesión redirige a /login', async ({ page }) => {
  // Verifica el fix de ProtectedRoute (antes redirigía a /calendario)
  await page.goto('/eventos');
  await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
});

test('admin puede entrar a Eventos y ver el listado', async ({ page }) => {
  await login(page, ADMIN);
  await expect(page).toHaveURL(/\/calendario/, { timeout: 10_000 });
  await page.goto('/eventos');
  // La pantalla de eventos carga (encabezado o tabla). Se valida que no quede en /login.
  await expect(page).not.toHaveURL(/\/login/);
  await expect(page.getByText(/evento/i).first()).toBeVisible({ timeout: 10_000 });
});
