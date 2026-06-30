# E2E (Playwright) — GEA_FRONT

Smoke E2E en navegador real. **No está instalado por defecto** para no inflar dependencias.

## Requisitos previos

1. **Backend corriendo con tus cambios** en `http://localhost:8083`:
   ```bash
   cd ../../test/GEA_BACKEND
   # con las env vars requeridas (JWT_SECRET, DB_*, etc.)
   ./mvnw spring-boot:run
   ```
   ⚠️ Corre contra la BD real (`gea_db`). Los datos que cree el E2E quedan ahí.
   Para aislar, apunta el backend a un schema/BD de pruebas.

2. **Apuntar el frontend a TU backend.** Ojo: el `.env` actual tiene
   `VITE_API_URL=http://192.168.8.83:8083`. Si corres el backend con tus cambios en **local**,
   levanta el dev server forzando localhost para que el E2E pruebe tu instancia:
   ```bash
   # Windows PowerShell
   $env:VITE_API_URL="http://localhost:8083"; npm run dev
   # bash
   VITE_API_URL=http://localhost:8083 npm run dev
   ```
   (O deja que Playwright arranque el dev server y exporta `VITE_API_URL` antes de correrlo.)

3. **Instalar Playwright** (una sola vez):
   ```bash
   npm install -D @playwright/test
   npx playwright install chromium
   ```

## Correr

```bash
# Playwright arranca el dev server (vite) automáticamente.
npx playwright test --config e2e/playwright.config.js

# Ver el reporte HTML
npx playwright show-report e2e/report
```

Si tu dev server usa otro puerto:
```bash
E2E_BASE_URL=http://localhost:5174 npx playwright test --config e2e/playwright.config.js
```

## Qué cubre `tests/smoke.spec.js`

- Login válido → redirige a `/calendario`.
- Login inválido → no entra y muestra error.
- **Ruta protegida sin sesión → redirige a `/login`** (valida el fix de `ProtectedRoute`).
- Admin entra a `/eventos` y ve el listado.

## Notas

- Credenciales semilla: `Cesar@gmail.com / 1234` (SuperAdmin), `Comunicaciones@gmail.com / 1234`, `oficina@gmail.com / 1234`.
- Los selectores de login son estables (`#login-correo`, `#login-password`). Si extiendes a flujos
  de creación/edición de eventos, conviene añadir `data-testid` a los botones/modales clave para
  que los specs sean robustos ante cambios de estilo/idioma.
