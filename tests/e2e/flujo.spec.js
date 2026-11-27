// Pruebas funcionales en el navegador con Playwright.
// Requisitos: la app corriendo (npm run dev) y dos cuentas de prueba confirmadas en Supabase.
// Uso:
//   npx playwright install chromium
//   E2E_URL=http://localhost:3000 E2E_EMAIL=... E2E_PASSWORD=... npx playwright test
const { test, expect } = require('@playwright/test');

const URL = process.env.E2E_URL || 'http://localhost:3000';

test('la página de inicio carga y muestra los contadores', async ({ page }) => {
  await page.goto(URL);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('aparece aquí');
  await expect(page.getByText('Objetos devueltos')).toBeVisible();
});

test('las rutas privadas redirigen al login', async ({ page }) => {
  await page.goto(`${URL}/inicio`);
  await expect(page).toHaveURL(/\/login/);
});

test('el registro rechaza correos no institucionales', async ({ page }) => {
  await page.goto(`${URL}/registro`);
  await page.getByLabel('Nombre').fill('Prueba');
  await page.getByLabel('Correo institucional').fill('alguien@gmail.com');
  await page.getByLabel('Contraseña').fill('Segura123');
  await page.getByRole('button', { name: 'Crear cuenta' }).click();
  await expect(page.getByText(/correo institucional/i)).toBeVisible();
});

test('el sitio envía cabeceras de seguridad', async ({ request }) => {
  const res = await request.get(URL);
  expect(res.headers()['x-frame-options']).toBe('DENY');
  expect(res.headers()['content-security-policy']).toContain("frame-ancestors 'none'");
});

test.describe('con sesión', () => {
  test.skip(!process.env.E2E_EMAIL, 'Define E2E_EMAIL y E2E_PASSWORD');

  test('iniciar sesión y reportar un objeto perdido', async ({ page }) => {
    await page.goto(`${URL}/login`);
    await page.getByLabel('Correo institucional').fill(process.env.E2E_EMAIL);
    await page.getByLabel('Contraseña').fill(process.env.E2E_PASSWORD);
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page).toHaveURL(/\/inicio/);

    await page.goto(`${URL}/reportar?tipo=perdido`);
    await page.getByLabel('Título').fill(`Prueba E2E ${Date.now()}`);
    await page.getByRole('button', { name: 'Llaves' }).click();
    await page.getByRole('button', { name: /negro/i }).click();
    await page.getByRole('button', { name: 'Siguiente' }).click();
    await page.getByLabel('Zona del campus').selectOption('Biblioteca');
    await page.getByRole('button', { name: 'Siguiente' }).click();
    await page.getByRole('button', { name: 'Publicar reporte' }).click();
    await expect(page).toHaveURL(/\/objeto\//);
    await expect(page.getByText('Posibles coincidencias')).toBeVisible();
  });
});
