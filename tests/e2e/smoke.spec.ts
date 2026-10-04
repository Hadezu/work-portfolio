import { expect, test } from '@playwright/test';

test('portfolio and direct reconciliation route work without console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Integracje systemów, migracje danych/ })).toBeVisible();
  await expect(page.getByText('Demonstracje techniczne').first()).toBeVisible();
  await expect(page.locator('.proof-card.active')).toHaveCount(9);
  await expect(page.locator('a[href^="mailto:ivan@matiushkin.com"]')).not.toHaveCount(0);
  await page.goto('/reconciliation');
  await expect(page.getByRole('heading', { name: /Uzgodnienie danych/ })).toBeVisible();
  await page.getByRole('button', { name: 'Uruchom dane demonstracyjne' }).click();
  await expect(page.getByTestId('issue-count')).toHaveText('18');
  await expect(page.getByText('120', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /Szczegóły:/ }).first()).toBeVisible();
  expect(errors).toEqual([]);
});

test('data bridge filters, searches, exports and opens exception details', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('/data-bridge');
  await expect(page.getByRole('heading', { name: /Most danych tylko do odczytu/ })).toBeVisible();
  await page.getByRole('button', { name: 'Uruchom dane demonstracyjne' }).click();
  await expect(page.getByTestId('bridge-count')).toHaveText('11');
  await page.getByLabel('Filtr ważności').selectOption('średni');
  await expect(page.getByTestId('bridge-filter-count')).toContainText('3 z 11');
  await page.getByLabel('Filtr ważności').selectOption('Wszystkie');
  await page.getByLabel('Szukaj wyjątków').fill('ORD-010');
  await expect(page.getByTestId('bridge-filter-count')).toContainText('1 z 11');
  await page.getByLabel('Szukaj wyjątków').fill('');
  await page.getByRole('button', { name: /Szczegóły/ }).first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Zamknij' }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Eksportuj CSV' }).click();
  expect((await download).suggestedFilename()).toBe('data-bridge-wyjatki.csv');
  expect(errors).toEqual([]);
});

test('data bridge works on a mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/data-bridge');
  await page.getByRole('button', { name: 'Uruchom dane demonstracyjne' }).click();
  await expect(page.getByTestId('bridge-results')).toBeVisible();
  await expect(page.getByText('Pokaż tylko sprawy wymagające działania')).toBeVisible();
});

test('data bridge exposes checkpoint, retry, webhook and execution report evidence', async ({ page }) => {
  await page.goto('/data-bridge');
  await expect(page.getByTestId('bridge-execution-status')).toContainText('PASS · RUN-DB-INCREMENTAL_BASELINE');
  await page.getByRole('button', { name: 'Nowe rekordy po checkpoint' }).click();
  await expect(page.getByText(/checkpoint: 2026-09-16T09:05:00Z/)).toBeVisible();
  await page.getByRole('button', { name: 'Replay', exact: true }).click();
  await expect(page.getByTestId('bridge-duplicates')).toHaveText('2');
  await page.getByRole('button', { name: '429 / retry' }).click();
  await expect(page.getByText('RATE_LIMITED')).toBeVisible();
  await page.getByRole('button', { name: 'Błędny podpis' }).click();
  await expect(page.getByText('WEBHOOK_SIGNATURE_VALID')).toBeVisible();
  await page.getByRole('button', { name: 'Nieaktualne zdarzenie' }).click();
  await expect(page.getByText('EVENT_VERSION_NEWER_THAN_TARGET')).toBeVisible();
  await page.getByRole('button', { name: 'Dwa zapisy migawki' }).click();
  await expect(page.getByText('migawka 2 dopisana')).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Pobierz raport wykonania' }).click();
  expect((await download).suggestedFilename()).toBe('data-bridge-execution-run-db-snapshot.json');
});

test('filter and details interaction work', async ({ page }) => {
  await page.goto('/reconciliation');
  await page.getByRole('button', { name: 'Uruchom dane demonstracyjne' }).click();
  await page.getByLabel('Filtr ważności').selectOption('wysoki');
  await expect(page.locator('tbody tr')).toHaveCount(11);
  await page.getByRole('button', { name: /Szczegóły:/ }).first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByText('Zalecane następne działanie', { exact: true })).toBeVisible();
});

test('API test pack runs all deterministic scenarios and exposes failure details', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', message => { if (message.type() === 'error' && !/status of (422|503|504)/.test(message.text())) errors.push(message.text()); });
  await page.goto('/api-tests');
  await expect(page.getByRole('heading', { name: /Testy integracji API/ })).toBeVisible();
  await page.getByRole('button', { name: 'Uruchom pakiet testów' }).click();
  await expect(page.getByTestId('api-total')).toHaveText('12');
  await expect(page.getByTestId('api-pass')).toHaveText('6');
  await expect(page.getByTestId('api-fail')).toHaveText('4');
  await expect(page.getByTestId('api-warning')).toHaveText('2');
  await page.getByRole('button', { name: /^FAIL/ }).click();
  await expect(page.locator('.test-row')).toHaveCount(4);
  await page.getByRole('button', { name: 'JSON diff' }).first().click();
  await expect(page.getByTestId('json-diff')).toBeVisible();
  await expect(page.getByTestId('contract-version')).toHaveText('target-order-response/1.2');
  await expect(page.getByText('CONTRACT-MISSING')).toBeVisible();
  await expect(page.getByText('CONTRACT-ADDITIVE')).toBeVisible();
  await expect(page.getByText('CONTRACT-BREAKING')).toBeVisible();
  expect(errors).toEqual([]);
});
