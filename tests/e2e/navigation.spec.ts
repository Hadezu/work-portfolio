import { expect, test, type Page } from '@playwright/test';

const scrollY = (page: Page) => page.evaluate(() => window.scrollY);
const scrollTo = async (page: Page, top: number) => {
  await page.evaluate(() => document.fonts.ready);
  // Establish a saved starting position after late layout shifts. Assertions
  // after Back/Forward below never reapply the requested scroll position.
  await expect.poll(async () => {
    await page.evaluate(value => window.scrollTo({top:value,behavior:'instant'}), top);
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    return page.evaluate(expected => {
      const key = history.state?.key ?? 'default';
      const stored = sessionStorage.getItem(`scroll:${key}`);
      return stored ? Math.max(Math.abs(window.scrollY - expected), Math.abs(JSON.parse(stored).top - expected)) : Infinity;
    }, top);
  }).toBeLessThanOrEqual(2);
};
const navigateHomeWithoutChangingScroll = (page: Page) => page
  .getByRole('navigation', { name: 'Główna nawigacja' })
  .getByRole('link', { name: '← Wszystkie przykłady' })
  .click();

test('internal navigation resets scroll while hash and history navigation remain natural', async ({ page }) => {
  await page.goto('/#przyklady');
  await expect(page.locator('#przyklady')).toBeInViewport();
  expect(await scrollY(page)).toBeGreaterThan(300);

  await page.locator('a.proof-card[href="/api-tests"]').click();
  await expect(page).toHaveURL(/\/api-tests$/);
  await expect(page.locator('main h1')).toContainText('Testy integracji API');
  await expect.poll(() => scrollY(page)).toBeLessThanOrEqual(1);

  await scrollTo(page, 1200);
  expect(await scrollY(page)).toBeGreaterThan(500);
  await navigateHomeWithoutChangingScroll(page);
  await expect(page).toHaveURL(/\/$/);
  await expect.poll(() => scrollY(page)).toBeLessThanOrEqual(1);

  await page.getByRole('navigation', {name:'Główna nawigacja'}).getByRole('link', { name: 'Usługi', exact: true }).click();
  await expect(page).toHaveURL(/\/#pomoc$/);
  await expect(page.locator('#pomoc')).toBeInViewport();

  await page.locator('a.proof-card[href="/api-tests"]').click();
  await expect(page).toHaveURL(/\/api-tests$/);
  await expect(page.locator('main h1')).toContainText('Testy integracji API');
  await scrollTo(page, 1100);
  const proofPosition = await scrollY(page);
  expect(proofPosition).toBeGreaterThan(500);
  await page.goBack();
  await expect(page).toHaveURL(/\/#pomoc$/);
  await expect(page.locator('#pomoc')).toBeInViewport();
  await page.goForward();
  await expect(page).toHaveURL(/\/api-tests$/);
  await expect.poll(() => scrollY(page)).toBeGreaterThan(500);
});

test('Back and Forward restore the scroll position of an existing proof history entry', async ({ page }) => {
  await page.goto('/api-tests');
  await expect(page.locator('main h1')).toContainText('Testy integracji API');
  await scrollTo(page, 800);
  const proofBeforeLeave = await scrollY(page);
  expect(proofBeforeLeave).toBeGreaterThan(600);

  await navigateHomeWithoutChangingScroll(page);
  await expect(page).toHaveURL(/\/$/);
  await expect.poll(() => scrollY(page)).toBeLessThanOrEqual(1);
  const homeAfterPush = await scrollY(page);
  expect(homeAfterPush).toBeLessThanOrEqual(1);

  await page.goBack();
  await expect(page).toHaveURL(/\/api-tests$/);
  await expect.poll(() => scrollY(page)).toBeGreaterThanOrEqual(780);
  const proofAfterBack = await scrollY(page);
  expect(proofAfterBack).toBeLessThanOrEqual(820);

  await page.goForward();
  await expect(page).toHaveURL(/\/$/);
  await expect.poll(() => scrollY(page)).toBeLessThanOrEqual(1);
  const homeAfterForward = await scrollY(page);

  console.log(JSON.stringify({ proofBeforeLeave, homeAfterPush, proofAfterBack, homeAfterForward }));
});

test('mobile multi-entry Back and Forward navigation restores each history entry', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#przyklady');
  await expect.poll(() => scrollY(page)).toBeGreaterThan(500);
  const homeHash = await scrollY(page);

  await page.locator('a.proof-card[href="/api-tests"]').click();
  await expect.poll(() => scrollY(page)).toBeLessThanOrEqual(1);
  await scrollTo(page, 800);
  const apiPosition = await scrollY(page);
  await navigateHomeWithoutChangingScroll(page);

  const workflowCard = page.locator('a.proof-card[href="/workflow-access"]');
  await workflowCard.scrollIntoViewIfNeeded();
  const homeCardsPosition = await scrollY(page);
  await workflowCard.click();
  await expect.poll(() => scrollY(page)).toBeLessThanOrEqual(1);
  await scrollTo(page, 700);
  const workflowPosition = await scrollY(page);
  await navigateHomeWithoutChangingScroll(page);

  await page.goBack();
  await expect(page).toHaveURL(/\/workflow-access$/);
  await expect.poll(() => scrollY(page)).toBeGreaterThan(500);
  const workflowBack = await scrollY(page);
  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
  await expect.poll(() => scrollY(page)).toBeGreaterThan(500);
  const homeCardsBack = await scrollY(page);
  await page.goBack();
  await expect(page).toHaveURL(/\/api-tests$/);
  await expect.poll(() => scrollY(page)).toBeGreaterThan(600);
  const apiBack = await scrollY(page);
  await page.goBack();
  await expect(page).toHaveURL(/\/#przyklady$/);
  await expect.poll(() => scrollY(page)).toBeGreaterThan(500);
  const homeHashBack = await scrollY(page);

  await page.goForward();
  await expect(page).toHaveURL(/\/api-tests$/);
  await expect.poll(() => scrollY(page)).toBeGreaterThan(600);
  await page.goForward();
  await expect(page).toHaveURL(/\/$/);
  await expect.poll(() => scrollY(page)).toBeGreaterThan(500);
  await page.goForward();
  await expect(page).toHaveURL(/\/workflow-access$/);
  await expect.poll(() => scrollY(page)).toBeGreaterThan(500);

  console.log(JSON.stringify({ homeHash, apiPosition, homeCardsPosition, workflowPosition, workflowBack, homeCardsBack, apiBack, homeHashBack }));
});

test('direct and mobile route navigation open at the top', async ({ page }) => {
  await page.goto('/api-tests');
  expect(await scrollY(page)).toBe(0);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#przyklady');
  await expect(page.locator('#przyklady')).toBeInViewport();
  await page.locator('a.proof-card[href="/workflow-access"]').click();
  await expect(page).toHaveURL(/\/workflow-access$/);
  await expect.poll(() => scrollY(page)).toBeLessThanOrEqual(1);
  await expect(page.getByRole('heading', { name: 'Walidacja uprawnień i przepływu pracy' })).toBeVisible();
});

test('reduced motion keeps content and controls usable', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/data-quality');
  await expect(page.getByRole('heading', { name: 'Kontrola jakości danych w potoku' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Uruchom pakiet referencyjny' })).toBeEnabled();
  await page.getByRole('button', { name: 'Uruchom pakiet referencyjny' }).click();
  await expect(page.getByTestId('quality-overall')).toHaveText('PASS');
  expect(await page.locator('main').evaluate(element => getComputedStyle(element).animationName)).toBe('none');
});
