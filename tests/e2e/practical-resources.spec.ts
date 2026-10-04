import {test,expect} from '@playwright/test';
import {practicalCopy,practicalSlugs} from '../../src/practical-copy';
import {inquiryAttribution} from '../../src/inquiry-attribution';
import {languageLeaks} from '../../src/language-audit';

for(const locale of ['pl','en'] as const){
 const prefix=locale==='en'?'/en':'',c=practicalCopy[locale];
 test(`${locale}: practical resources are discoverable, readable on mobile and linked to a scoped enquiry`,async({page,request})=>{
  await page.route('**/api/metrics',r=>r.fulfill({status:204}));
  await page.route('**/api/contact',r=>r.abort());
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(prefix||'/');await page.locator('.home-resources > summary').click();await page.locator('.home-resources .migration-guide-links > summary').click();await expect(page.locator(`main a[href="${prefix}/${practicalSlugs[2]}"]`).first()).toBeVisible();
  const sitemap=await(await request.get('/sitemap.xml')).text();
  for(const [i,slug] of practicalSlugs.entries()){
   expect(sitemap).toContain('https://work.matiushkin.com'+prefix+'/'+slug);
   const response=await page.goto(prefix+'/'+slug);expect(response?.status()).toBe(200);
   await expect(page.locator('h1')).toHaveText(i===2?c.sample.title:c.articles[i].title);
   await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href','https://work.matiushkin.com'+prefix+'/'+slug);
   await expect(page.locator('main')).toContainText(c.disclosure);
   expect(languageLeaks(await page.locator('main').innerText(),locale)).toEqual([]);
   for(const width of [1366,390]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),slug).toBe(true);}
   await page.locator('main .hero-actions a[href*="contact?"]').click();
   await expect(page.locator('select[name=service]')).toHaveValue(i===0?'integration-testing':'data-migration');
   await expect(page.locator('.buyer-context')).toBeVisible();
  }
  expect(errors).toEqual([]);
 });
 test(`${locale}: downloadable sample preserves failure and correction evidence`,async({page,request})=>{
  await page.route('**/api/metrics',r=>r.fulfill({status:204}));
  await page.goto(prefix+'/'+practicalSlugs[2]);
  const downloadPromise=page.waitForEvent('download');await page.getByRole('link',{name:c.sample.json,exact:true}).click();
  expect((await downloadPromise).suggestedFilename()).toBe('migration-evidence.json');
  const jsonResponse=await request.get('/samples/migration-evidence.json');expect(jsonResponse.status()).toBe(200);
  const json=await jsonResponse.json();expect(json.before.overall_status).toBe('FAIL');expect(json.after.overall_status).toBe('PASS');expect(json.after.attempts.at(-1).writes).toBe(2);
  await page.getByRole('link',{name:c.sample.html+' →',exact:true}).click();
  await expect(page.locator('html')).toHaveAttribute('lang',locale);await expect(page.locator('body')).toContainText(c.disclosure);
  await expect(page.locator('body')).toContainText(json.after.input_sha256);
 });
 test(`${locale}: optional discovery answer accompanies the enquiry without external delivery`,async({page})=>{
  await page.route('**/api/metrics',r=>r.fulfill({status:204}));let message='';
  await page.route('**/api/contact',async r=>{message=r.request().postDataJSON().message;await r.fulfill({status:202,json:{id:'TEST-NOT-SENT'}})});
  await page.goto(prefix+'/contact');
  await page.locator('[name=email]').fill('test@example.com');await page.locator('[name=message]').fill('Synthetic enquiry for a controlled browser test.');
  await page.locator('.optional-details > summary').click();await page.locator('summary').filter({hasText:inquiryAttribution[locale].label}).click();
  await page.locator('[name=discovery]').selectOption('2');await page.locator('button[type=submit]').click();
  await expect(page.locator('.contact-status')).toContainText('TEST-NOT-SENT');expect(message).toContain(inquiryAttribution[locale].prefix+': LinkedIn');
 });
}
