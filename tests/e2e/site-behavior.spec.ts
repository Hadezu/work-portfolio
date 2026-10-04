import {test,expect} from '@playwright/test';
test('mobile AI tabs fit before JavaScript and route CSS load',async({browser,baseURL})=>{
 const context=await browser.newContext({baseURL,javaScriptEnabled:false,viewport:{width:390,height:900}});
 const page=await context.newPage();await page.goto('/en/proof/ai-automation');
 await expect(page.locator('.ai-tabs')).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 await context.close();
});
for(const locale of ['en','pl'] as const){
 const base=locale==='en'?'/en':'';
 test(`${locale}: chapter state, route motion pause and unchanged screenshots`,async({page})=>{
  await page.route('**/api/metrics',r=>r.fulfill({status:204}));await page.route('**/api/contact',r=>r.abort());await page.emulateMedia({reducedMotion:'no-preference'});await page.goto(base+'/');
  await expect(page.locator('body')).toHaveAttribute('data-behavior','on');
  for(const [selector,chapter]of [['.task-fit','problem'],['.buyer-examples','proof'],['.home-start','process'],['.contractor-facts','about'],['.editorial-contact','contact']]){
   await page.locator(selector).evaluate(el=>scrollTo(0,el.getBoundingClientRect().top+scrollY-100));await expect(page.locator('body')).toHaveAttribute('data-chapter',chapter);
  }
  await expect(page.locator('.site-contact')).toHaveAttribute('aria-current','location');
  expect(await page.locator('.proof-media img').first().evaluate(el=>el.getAnimations().length)).toBe(0);
  await page.locator('.motion-toggle').click();await expect(page.locator('body')).toHaveAttribute('data-behavior','off');
  await page.locator(`.buyer-examples a[href="${base}/proof/migration"]`).click();await expect(page.locator('main h1')).toBeVisible();await expect(page.locator('body')).toHaveAttribute('data-behavior','off');
  await page.locator('.site-motion-toggle').click();await expect(page.locator('body')).toHaveAttribute('data-behavior','on');
  await page.emulateMedia({reducedMotion:'reduce'});await expect(page.locator('body')).toHaveAttribute('data-behavior','off');await expect(page.locator('.site-motion-toggle')).toHaveCount(0);
  expect(await page.locator('main').evaluate(el=>el.getAnimations({subtree:true}).length)).toBe(0);
 });
 test(`${locale}: contact lifecycle reflects only backend acceptance`,async({page})=>{
  await page.route('**/api/metrics',r=>r.fulfill({status:204}));await page.goto(base+'/contact');
  let release:(()=>void)|undefined;await page.route('**/api/contact',async route=>{await new Promise<void>(resolve=>{release=resolve;});await route.fulfill({status:503,json:{error:'synthetic_failure'}});});
  await page.locator('[name=email]').fill('test@example.com');await page.locator('[name=message]').fill('Synthetic request for presentation lifecycle verification.');const fieldBefore=await page.locator('[name=email]').boundingBox();await page.locator('button[type=submit]').click();
  await expect(page.locator('.contact-page')).toHaveAttribute('data-state','sending');await expect(page.locator('form')).toHaveAttribute('aria-busy','true');await expect(page.locator('.contact-status')).toHaveCount(0);await expect.poll(()=>Boolean(release)).toBe(true);release!();
  await expect(page.locator('.contact-page')).toHaveAttribute('data-state','error');await expect(page.locator('[role=alert]')).toBeVisible();await expect(page.locator('[name=message]')).toHaveValue('Synthetic request for presentation lifecycle verification.');
  const fieldAfter=await page.locator('[name=email]').boundingBox();expect(fieldAfter!.x).toBeCloseTo(fieldBefore!.x,0);expect(fieldAfter!.width).toBeCloseTo(fieldBefore!.width,0);
  await page.unroute('**/api/contact');await page.route('**/api/contact',r=>r.fulfill({status:202,json:{id:'synthetic-review-receipt'}}));await page.locator('button[type=submit]').click();await expect(page.locator('.contact-page')).toHaveAttribute('data-state','success');await expect(page.locator('.contact-status')).toContainText('synthetic-review-receipt');
 });
}

