import { expect, test } from '@playwright/test';

const plRoutes = ['/', '/en', '/reconciliation', '/api-tests', '/data-bridge', '/transit-validation', '/workflow-access', '/healthcare-integration', '/erp-sync', '/operations-exceptions', '/data-quality'];
const enProofRoutes = plRoutes.slice(2).map(route => `/en${route}`);
const validRoutes = [...plRoutes, ...enProofRoutes];

test('unknown frontend routes return a branded HTTP 404 instead of the SPA homepage', async ({ page }) => {
  for (const route of ['/this-route-should-not-exist-qa-20260919', '/api-tests/not-a-real-child-route']) {
    const response = await page.goto(route);
    expect(response?.status()).toBe(404);
    await expect(page.getByRole('heading', { name: 'Nie znaleziono strony' })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Wydzielony zakres techniczny/ })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Wróć do strony głównej' })).toHaveAttribute('href', '/');
  }
});

test('valid SPA routes remain direct-loadable and API misses remain JSON 404', async ({ request }) => {
  for (const route of validRoutes) expect((await request.get(route)).status(), route).toBe(200);
  const missing = await request.get('/lab-api/this-does-not-exist');
  expect(missing.status()).toBe(404);
  expect(missing.headers()['content-type']).toContain('application/json');
  const body = await missing.json() as { error?: string; detail?: string };
  expect(body.error ?? body.detail).toMatch(/not.?found|unknown lab/i);
});
