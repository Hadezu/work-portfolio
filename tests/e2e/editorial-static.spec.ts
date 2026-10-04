import {test,expect} from '@playwright/test';
for(const locale of ['en','pl'] as const){
 test(`${locale}: static foundation stays accessible at narrow widths and reduced motion`,async({page})=>{
  await page.route('**/api/metrics',r=>r.fulfill({status:204}));
  await page.route('**/api/contact',r=>r.abort());
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto(locale==='en'?'/en':'/');
  await expect(page.locator('main h1')).toHaveCount(1);
  await expect(page.locator('.primary-proofs article')).toHaveCount(2);
  await expect(page.locator('.compact-proofs article')).toHaveCount(2);
  await expect(page.locator('.about-portrait img')).toHaveAttribute('src','/editorial/ivan-portrait.jpg');
  for(const width of [320,390,768,1440]){
   await page.setViewportSize({width,height:900});
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
   expect(await page.locator('.about-portrait img').evaluate(el=>getComputedStyle(el).filter)).toBe('none');
  }
  expect(await page.locator('.portfolio-home').evaluate(el=>el.getAnimations({subtree:true}).length)).toBe(0);
  const resources=await page.evaluate(()=>performance.getEntriesByType('resource').map(r=>r.name));
  expect(resources.filter(r=>/fonts\.(googleapis|gstatic)\.com/.test(r))).toEqual([]);
 });
 test(`${locale}: homepage proof links load split routes and preserve enquiry context`,async({page})=>{
  await page.route('**/api/metrics',r=>r.fulfill({status:204}));
  await page.route('**/api/contact',r=>r.abort());
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  const home=locale==='en'?'/en':'/';
  for(const route of ['proof/migration','proof/revenue-bi','reconciliation','operations-exceptions']){
   await page.goto(home);
   await page.locator('.buyer-examples .proof-description a[href="'+(locale==='en'?'/en':'')+'/'+route+'"]').click();
   await expect(page.locator('main h1')).toBeVisible();
   await page.locator('.proof-next-step a.button').click();
   await expect(page).toHaveURL(new RegExp('example='+encodeURIComponent(route)));
   await expect(page.locator('.buyer-context')).toBeVisible();
  }
  expect(errors).toEqual([]);
 });
}
