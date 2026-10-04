import { expect, test } from '@playwright/test';

const plProofRoutes = ['/reconciliation', '/api-tests', '/data-bridge', '/transit-validation', '/workflow-access', '/healthcare-integration', '/erp-sync', '/operations-exceptions', '/data-quality'];
const enProofRoutes = plProofRoutes.map(route => `/en${route}`);
const internalRoutes = ['/', '/en', '/automation','/en/automation', ...plProofRoutes, ...enProofRoutes];
const proofRoutes = plProofRoutes;

function expectedAlternates(path: string) {
  const isEn = path === '/en' || path.startsWith('/en/');
  const base = isEn && path !== '/en' ? path.slice(3) : path;
  const pl = base === '/en' ? '/' : base;
  const en = pl === '/' ? '/en' : `/en${pl}`;
  return new Map([
    ['pl', `https://work.matiushkin.com${pl}`],
    ['en', `https://work.matiushkin.com${en}`],
    ['x-default', `https://work.matiushkin.com${pl}`],
  ]);
}

async function expectSeo(page: import('@playwright/test').Page, path: string) {
  const canonical = `https://work.matiushkin.com${path}`;
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', canonical);
  await expect(page.locator('link[rel="alternate"]')).toHaveCount(3);
  const alternates = await page.locator('link[rel="alternate"]').evaluateAll(links => links.map(link => ({ lang: (link as HTMLLinkElement).hreflang, href: (link as HTMLLinkElement).href })));
  expect(new Set(alternates.map(link => link.lang)).size).toBe(3);
  for (const [lang, href] of expectedAlternates(path)) expect(alternates.find(link => link.lang === lang)?.href).toBe(href);
}

const polishDenylist = [
  'Wszystkie przykłady','Demonstracja techniczna','Dane syntetyczne','niezależna implementacja','Integracje i odbiór','Testy integracji','Walidacja','Zobacz działający przykład','Wynik dla odbiorcy','Pierwszy zakres','Wejście','Sprawdź sam','Uruchom','Wprowadź','Przywróć','Dla osoby technicznej','Co możesz tutaj','Kryteria odbioru','Parametry publicznego scenariusza','Opisać zakres','Mapowanie','Synchronizacja','Wyjątki','Uzgodnienie','Raport','Architektura','Wydzielone zakresy techniczne',
];
const expectedEnglishHeadings = new Map<string, RegExp>([
  ['/en/reconciliation', /Data reconciliation/i],
  ['/en/api-tests', /API integration tests|API contract/i],
  ['/en/data-bridge', /Data Bridge/i],
  ['/en/transit-validation', /Transit integration validation/i],
  ['/en/workflow-access', /Access and workflow validation/i],
  ['/en/healthcare-integration', /Healthcare system integration validation/i],
  ['/en/erp-sync', /System-to-system data synchronization/i],
  ['/en/operations-exceptions', /Operations exception control/i],
  ['/en/data-quality', /Data pipeline quality control|Data quality/i],
]);


async function expectNoPolishLeakage(page: import('@playwright/test').Page, context: string) {
  await page.waitForTimeout(80);
  const text = await visibleBuyerText(page);
  for (const phrase of polishDenylist) expect(text, context + ' leaks ' + phrase).not.toContain(phrase);
}

const interactiveMatrix: Record<string, { buttons: RegExp[]; tabs: string[] }> = {
  '/en/reconciliation': { buttons: [/Run reference/i, /Introduce.*controlled discrepancy/i, /Restore configuration/i], tabs: [] },
  '/en/api-tests': { buttons: [/Run test package/i], tabs: [] },
  '/en/data-bridge': { buttons: [/Run reference/i, /Introduce.*controlled discrepancy/i, /Restore configuration/i, /Baseline import/i, /New records after checkpoint/i, /Interrupted run/i, /Resume/i, /Replay same input/i, /Simulate 429/i, /Valid event/i, /Duplicate event/i, /Invalid signature/i, /Stale event/i, /Repair and replay/i, /Append snapshot/i], tabs: [] },
  '/en/transit-validation': { buttons: [/Run reference/i, /Introduce.*controlled discrepancy/i, /Restore configuration/i, /Validate input/i, /Run scenarios/i, /^Reset$/i], tabs: ['Input','Results','Scenario','Model and mapping','Report','Architecture'] },
  '/en/workflow-access': { buttons: [/Run package/i, /Introduce.*controlled discrepancy/i, /Restore reference configuration/i], tabs: ['Input','Results','Scenarios','Permission matrix','Workflow','Report','Architecture'] },
  '/en/healthcare-integration': { buttons: [/Run the reference package/i, /Introduce.*controlled discrepancy/i, /Restore reference configuration/i], tabs: ['Input','Results','Scenarios','Interfaces','References','Report','Architecture'] },
  '/en/erp-sync': { buttons: [/Run the reference package/i, /Introduce.*controlled discrepancy/i, /Restore reference configuration/i], tabs: ['Input','Results','Mapping','Synchronization','Exceptions','Reconciliation','Report','Architecture'] },
  '/en/operations-exceptions': { buttons: [/Run the reference package/i, /Introduce.*controlled discrepancy/i, /Restore reference configuration/i], tabs: ['Input','Results','Rules','Exceptions','Orders','Documents','Report','Architecture'] },
  '/en/data-quality': { buttons: [/Run the reference package/i, /Introduce.*controlled discrepancy/i, /Restore reference configuration/i], tabs: ['Input','Results','Data contract','Schema drift','Transformations','Rejected','Lineage','Runs','Regression','Report','Architecture'] },
};

async function visibleBuyerText(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const clone = document.body.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('script,style,code,pre,textarea,option').forEach(node => node.remove());
    return clone.innerText;
  });
}

test('Polish and English homepages present commercial positioning and switch languages', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'pl');
  await expect(page.getByRole('heading', { name: 'Integracje systemów, migracje danych i narzędzia dla Twojej firmy.' })).toBeVisible();
  await expectSeo(page, '/');
  await page.getByRole('link', { name: 'EN', exact: true }).click();
  await expect(page).toHaveURL(/\/en$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('heading', { name: 'System integrations, data migrations and tools for your business.' })).toBeVisible();
  await expect(page.getByText('integration tails')).toHaveCount(0);
  await expectSeo(page, '/en');
  await page.getByRole('link', { name: 'PL', exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'pl');
});

test('English proof routes are localized, direct-loadable and free of known Polish UI strings', async ({ page }) => {
  for (const route of enProofRoutes) {
    await page.goto(route);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('main')).toContainText(expectedEnglishHeadings.get(route)!);
    await expect(page.getByRole('main').getByRole('link', { name: /All examples/i })).toBeVisible();
    await expect(page.getByRole('link', { name: 'PL', exact: true })).toHaveAttribute('href', route.slice(3));
    await expect(page.getByRole('link', { name: 'EN', exact: true })).toHaveAttribute('href', route);
    await expectSeo(page, route);
    const text = await visibleBuyerText(page);
    for (const phrase of polishDenylist) expect(text, `${route} leaks ${phrase}`).not.toContain(phrase);
  }
});


test('English proof interactive states have no Polish buyer-visible leakage', async ({ page }) => {
  test.setTimeout(120_000);
  for (const route of enProofRoutes) {
    await page.goto(route);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expectNoPolishLeakage(page, route + ' initial');
    const config = interactiveMatrix[route];
    for (const tab of config.tabs) {
      const tabButton = page.getByRole('button', { name: tab, exact: true });
      if (await tabButton.count()) {
        await tabButton.first().click();
        await expectNoPolishLeakage(page, route + ' tab ' + tab);
      }
    }
    for (const pattern of config.buttons) {
      const button = page.getByRole('button', { name: pattern }).first();
      if (!(await button.count())) continue;
      if (!(await button.isEnabled())) continue;
      await button.click();
      await expectNoPolishLeakage(page, route + ' action ' + pattern);
    }
  }
});

test('English transit proof uses complete English labels in dynamic controls and empty states', async ({ page }) => {
  await page.goto('/en/transit-validation');
  await expect(page.getByRole('button', { name: 'Run reference', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Introduce controlled discrepancy', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Restore configuration', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Validate input', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Run scenarios', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Results', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Run validation or scenarios' })).toBeVisible();
  await expectNoPolishLeakage(page, 'transit empty state');
  await page.getByRole('button', { name: 'Run reference', exact: true }).click();
  await expect(page.getByTestId('lab-overall')).toContainText('PASS');
  await expectNoPolishLeakage(page, 'transit reference');
  await page.getByRole('button', { name: 'Introduce controlled discrepancy', exact: true }).click();
  await expect(page.getByTestId('lab-overall')).toContainText('FAIL');
  await expectNoPolishLeakage(page, 'transit defect');
  await page.getByRole('button', { name: 'Run scenarios', exact: true }).click();
  await expectNoPolishLeakage(page, 'transit scenarios');
  await page.getByRole('button', { name: 'Restore configuration', exact: true }).click();
  await expectNoPolishLeakage(page, 'transit restore');
});

test('English homepage proof cards keep the English journey inside localized proof routes', async ({ page }) => {
  await page.goto('/en');
  const firstProof = page.locator('#technical-proofs a.proof-card').first();
  await expect(firstProof).toHaveAttribute('href', '/en/erp-sync');
  await firstProof.click();
  await expect(page).toHaveURL(/\/en\/erp-sync$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('main').getByRole('link', { name: /All examples/i })).toHaveAttribute('href', '/en');
});

test('Polish proof routes remain Polish', async ({ page }) => {
  await page.goto('/erp-sync');
  await expect(page.locator('html')).toHaveAttribute('lang', 'pl');
  await expect(page.getByRole('main').getByRole('link', { name: /Wszystkie przykłady/i })).toBeVisible();
  await expect(page.locator('main')).toContainText('Wynik dla odbiorcy');
});

test('initial HTML has correct lang, canonical and hreflang without duplicates', async ({ request }) => {
  for (const path of ['/', '/en', ...plProofRoutes, ...enProofRoutes]) {
    const lang = path === '/en' || path.startsWith('/en/') ? 'en' : 'pl';
    const response = await request.get(path);
    expect(response.status()).toBe(200);
    const html = await response.text();
    expect(html).toContain(`<html lang="${lang}">`);
    expect((html.match(/rel="canonical"/g) ?? []).length).toBe(1);
    expect(html).toContain(`rel="canonical" href="https://work.matiushkin.com${path}"`);
    expect((html.match(/rel="alternate"/g) ?? []).length).toBe(3);
    for (const [alternateLang, href] of expectedAlternates(path)) expect(html).toContain(`rel="alternate" hreflang="${alternateLang}" href="${href}"`);
  }
});

test('internal links, contact and public route inventory are valid', async ({ request, page }) => {
  for (const route of internalRoutes) expect((await request.get(route)).status(), route).toBe(200);
  expect(proofRoutes).toHaveLength(9);
  expect(enProofRoutes).toHaveLength(9);
  await page.goto('/en');
  for (const href of await page.locator('a[href^="/"]').evaluateAll(links => [...new Set(links.map(link => (link as HTMLAnchorElement).getAttribute('href')!).filter(href => !href.startsWith('/#') && !href.startsWith('/en#')))])) {
    expect((await request.get(href)).status(), href).toBe(200);
  }
  await expect(page.locator('a[href^="mailto:ivan@matiushkin.com"]')).not.toHaveCount(0);
  await expect(page.locator('a[href^="tel:"]')).toHaveCount(0);
  await expect(page.getByText(/gmail\.com|\+\d{2,}|\b\d{3}[-\s]\d{3}[-\s]\d{3}\b/)).toHaveCount(0);
});

test('unknown frontend routes are hard 404 noindex pages', async ({ request }) => {
  for (const route of ['/this-route-does-not-exist', '/en/this-route-does-not-exist', '/erp-syncc']) {
    const response = await request.get(route);
    expect(response.status(), route).toBe(404);
    const html = await response.text();
    expect(html).toContain('name="robots" content="noindex"');
    expect(html).toContain(route.startsWith('/en/') ? 'Page not found' : 'Nie znaleziono strony');
    expect(html).not.toContain('Małe integracje, przepływy danych');
    expect(html).toContain(`lang="${route.startsWith('/en/') ? 'en' : 'pl'}"`);
  }
});

test('sitemap and robots expose real public localized routes', async ({ request }) => {
  const sitemap = await request.get('/sitemap.xml');
  expect(sitemap.status()).toBe(200);
  expect(sitemap.headers()['content-type']).toMatch(/application\/xml|text\/xml/);
  const xml = await sitemap.text();
  for (const route of internalRoutes) expect(xml).toContain(`https://work.matiushkin.com${route === '/' ? '/' : route}`);
  expect((xml.match(/<loc>/g) ?? []).length).toBe(22);
  const robots = await request.get('/robots.txt');
  expect(robots.status()).toBe(200);
  const robotsText = await robots.text();
  expect(robotsText).toContain('Allow: /');
  expect(robotsText).toContain('Sitemap: https://work.matiushkin.com/sitemap.xml');
});

test('mobile homepages and representative English proof have no horizontal overflow at narrow viewports', async ({ page }) => {
  for (const width of [360, 390]) {
    for (const route of ['/', '/en', '/en/erp-sync']) {
      await page.setViewportSize({ width, height: width === 360 ? 800 : 844 });
      await page.goto(route, { waitUntil: 'networkidle' });
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
      await expect(page.getByRole('link', { name: route.startsWith('/en') ? 'PL' : 'EN', exact: true })).toBeVisible();
    }
  }
});

