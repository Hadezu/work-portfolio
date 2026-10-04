import {test,expect} from '@playwright/test';
import {pages} from '../../src/metadata';
test('all indexable routes contain their visible main content in initial HTML',async({request})=>{
 for(const path of Object.keys(pages)){
  const r=await request.get(path);expect(r.status(),path).toBe(200);const html=await r.text();
  expect(html,path).toContain('data-ssr="true"');expect(html,path).toMatch(/<h1[^>]*>[^<]+/);expect(html,path).toContain('<main');
 }
});
for(const locale of ['pl','en'])test(`service to contact flow and delivery states: ${locale}`,async({page})=>{
 const prefix=locale==='en'?'/en':'';const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 const metrics:{event:string;path:string}[]=[];await page.route('**/api/metrics',r=>{metrics.push(r.request().postDataJSON());return r.fulfill({status:204});});
 let fail=true;let id='';
 await page.route('**/api/contact',async r=>{const body=r.request().postDataJSON();if(id)expect(body.id).toBe(id);id=body.id;expect(body.service).toBe('api-integration');await r.fulfill({status:fail?503:202,json:fail?{error:'unavailable'}:{id}});});
 await page.goto(prefix+'/services/api-integration');await page.locator('main a[href*="contact?"]').click();
 await expect(page.locator('select[name=service]')).toHaveValue('api-integration');
 await expect.poll(()=>metrics.some(m=>m.event==='contact_click'&&m.path===prefix+'/services/api-integration')).toBe(true);
 await page.locator('[name=email]').fill('test@example.com');await page.locator('[name=message]').fill('Synthetic test enquiry. No action required.');
 await page.locator('form button[type=submit]').click();await expect(page.getByRole('alert')).toBeVisible();fail=false;
 await page.locator('form button[type=submit]').click();await expect(page.locator('.contact-status')).toContainText(id);
 expect(errors).toEqual([]);
});
test('mobile contact form fits viewport',async({page})=>{await page.setViewportSize({width:390,height:844});await page.goto('/en/contact');await expect(page.locator('h1')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)});
