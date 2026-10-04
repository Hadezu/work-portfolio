import { test, expect } from '@playwright/test';
import { labs } from '../../src/labs';
test('lab API uses Worker routing, preserves JSON errors and report query strings', async ({ request }) => {
  const health = await request.get('/lab-api/health');
  expect(health.headers()['content-type']).toContain('application/json');
  expect((await health.json()).status).toBe('ok');
  const schema = await request.get('/lab-api/openapi.json');
  expect((await schema.json()).openapi).toBeTruthy();
  const fixture = await (await request.get('/lab-api/transit-validation/fixture')).json();
  const response = await request.post('/lab-api/transit-validation/validate', { data: { data: fixture } });
  expect(response.status()).toBe(200);
  const run = await response.json();
  expect(run.overall_status).toBe('PASS');
  const csv = await request.get(`/lab-api/transit-validation/runs/${run.run_id}/report?format=csv`);
  expect(csv.headers()['content-type']).toContain('text/csv');
  expect((await csv.text()).trim().split('\n')).toHaveLength(run.checks_executed + 1);
  expect((await request.post('/lab-api/transit-validation/validate', { data: { data: [] } })).status()).toBe(422);
  const missing = await request.get('/lab-api/not-a-route');
  expect(missing.status()).toBe(404);
  expect(missing.headers()['content-type']).toContain('application/json');
});
for (const [slug, lab] of Object.entries(labs)) {
  if (['workflow-access','healthcare-integration','erp-sync','operations-exceptions','data-quality'].includes(slug)) continue; // dedicated acceptance flows
  test(`${slug}: fixture, negative regression, evidence and reports`, async ({ page }) => {
    const errors: string[]=[]; page.on('pageerror',e=>errors.push(e.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.goto(`/${slug}`); await page.reload();
    await expect(page.getByRole('heading',{name:lab.title,exact:true})).toBeVisible();
    await page.getByRole('button',{name:'Waliduj wejście',exact:true}).click();
    await expect(page.getByTestId('lab-overall')).toHaveText('PASS');
    await page.getByRole('button',{name:'Uruchom scenariusze',exact:true}).click();
    await expect(page.getByTestId('scenario-row').first()).toBeVisible();
    expect(await page.getByTestId('scenario-row').count()).toBeGreaterThan(4);
    await expect(page.getByTestId('scenario-row').locator('td:nth-child(4)')).not.toContainText(['FAIL']);
    await page.getByTestId('scenario-row').nth(1).getByRole('button').click();
    await expect(page.getByTestId('lab-overall')).toHaveText('FAIL');
    if (slug === 'transit-validation') {
      await expect(page.getByRole('cell', { name: '4812 s', exact: true })).toBeVisible();
      await expect(page.locator('.exception-value')).toContainText('1 błąd');
    }
    await page.getByRole('button',{name:'Szczegóły',exact:true}).first().click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('button',{name:'Zamknij dowód'}).click();
    await page.getByRole('button',{name:'Raport',exact:true}).click();
    const [download] = await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:'Pobierz CSV'}).click()]);
    expect(download.suggestedFilename()).toBe('acceptance.csv');
    await page.setViewportSize({width:390,height:844});
    await page.getByRole('button',{name:'Wyniki',exact:true}).click();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
    expect(errors).toEqual([]);
  });
}
