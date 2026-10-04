import {test,expect} from '@playwright/test';
for(const locale of ['en','pl'])for(const width of [1440,390])test(`evidence panels navigate to working demos ${locale} ${width}`,async({page})=>{
 await page.setViewportSize({width,height:1000});await page.emulateMedia({reducedMotion:'reduce'});await page.route('**/api/metrics',r=>r.fulfill({status:204}));await page.route('**/api/contact',r=>r.abort());
 const prefix=locale==='en'?'/en':'';
 for(const [i,route] of ['proof/migration','proof/revenue-bi','reconciliation','operations-exceptions'].entries()){
  await page.goto(prefix||'/');const section=page.locator('.buyer-examples');await expect(section.locator('a[href$=".png"]')).toHaveCount(0);
  await expect(section.locator('img')).toHaveCount(0);await expect(section.locator('.support-art')).toHaveCount(2);await expect(section.locator('.proof-art')).toHaveCount(2);
  const panel=section.locator('a.evidence-preview').nth(i);await expect(panel).toHaveAttribute('href',prefix+'/'+route);await expect(panel).not.toHaveAttribute('target','_blank');
  await panel.click();await expect(page).toHaveURL(new RegExp('/'+route+'$'));await expect(page.locator('h1')).toBeVisible();
 }
});
