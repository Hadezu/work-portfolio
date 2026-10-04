import {homeCopy} from '../../src/home-copy';
import {expect,test} from '@playwright/test';
import {mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {languageLeaks} from '../../src/language-audit';

const slugs=['proof/ai-automation','erp-sync','data-bridge','operations-exceptions','reconciliation','data-quality','api-tests','workflow-access','transit-validation','healthcare-integration'];
// Browser QA must not count as prospect activity.
test.beforeEach(async({page})=>{await page.route('**/api/metrics',r=>r.fulfill({status:204}));});

for(const locale of ['pl','en'] as const){
 const home=locale==='pl'?'/':'/en';
 test(`${locale}: contractor outcomes, email contact and complete proof navigation`,async({page})=>{
  await page.goto(home);
  const hero=page.locator('.portfolio-hero');
  await expect(hero.locator('.button.secondary')).toHaveAttribute('href','#'+homeCopy[locale].ids.proofs);
  await expect(hero.locator('.button.primary')).toHaveAttribute('href','#send-task');
  await expect(page.locator('.commercial-services article')).toHaveCount(1);
  await expect(page.locator('.task-options button')).toHaveCount(7);
  await expect(page.locator('.home-start li')).toHaveCount(4);
  await expect(page.locator('.automation-playground,.automation-builder,.automation-brief')).toHaveCount(0);
  await expect(page.locator('main > section')).toHaveCount(6);
  await expect(page.locator('main form')).toHaveCount(1);
  await expect(page.locator('main form [required]')).toHaveCount(2);
  await expect(page.locator('.buyer-examples article')).toHaveCount(4);
  await expect(page.locator('.contractor-facts')).toContainText('Ivan Matiushkin');
  await expect(page.locator('.guide-disclosure')).toContainText(locale==='pl'?'danych syntetycznych':'synthetic data');
  await expect(page.locator('a[href^="tel:"]')).toHaveCount(0);
  await page.getByRole('button',{name:'Menu',exact:true}).click();
  for(const slug of slugs)await expect(page.locator('dialog a[href="'+(locale==='en'?'/en':'')+'/'+slug+'"]').first()).toHaveCount(1);
  await page.keyboard.press('Escape');
  expect(languageLeaks(await page.locator('main').innerText(),locale)).toEqual([]);
  const brokenAnchors=await page.locator('a[href*="#"]').evaluateAll(links=>links.flatMap(el=>{
   const href=new URL((el as HTMLAnchorElement).href);return href.pathname===location.pathname&&href.hash&&!document.getElementById(decodeURIComponent(href.hash.slice(1)))?[href.hash]:[];
  }));
  expect(brokenAnchors).toEqual([]);
  const ids=await page.locator('[id]').evaluateAll(nodes=>nodes.map(el=>el.id));
  expect(new Set(ids).size).toBe(ids.length);
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content',locale==='pl'?/Niezależny wykonawca integracji API/:/Independent API integration and data migration contractor/);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content',`https://work.matiushkin.com/og/${locale==='pl'?'home':'home-en'}.png`);
 });
 test(`${locale}: all buyer routes load on desktop and mobile`,async({page})=>{
  test.setTimeout(180_000);
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  for(const width of [1440,390])for(const slug of ['','automation',...slugs]){
   await page.setViewportSize({width,height:900});
   const route=slug?(locale==='en'?'/en':'')+'/'+slug:home;
   const response=await page.goto(route);
   expect(response?.status(),route).toBe(200);
   await expect(page.locator('html')).toHaveAttribute('lang',locale);
   await expect(page.locator('main h1')).toBeVisible();
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),route).toBe(true);
   if(!slug&&process.env.POSITIONING_ARTIFACTS){
    const directory=process.env.POSITIONING_ARTIFACTS;mkdirSync(directory,{recursive:true});
    await page.emulateMedia({reducedMotion:'reduce'});
    for(const img of await page.locator('img').all()) {await img.scrollIntoViewIfNeeded();await expect.poll(()=>img.evaluate((el:HTMLImageElement)=>el.complete&&el.naturalWidth>0)).toBe(true);}
    await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
    await page.screenshot({path:join(directory,`${locale}-${width}-hero.png`)});
    for(const selector of ['.task-fit','.buyer-examples','.home-start','.contractor-facts','.contact-page']){
     const area=page.locator(selector).first();await area.screenshot({path:join(directory,`${locale}-${width}-${selector.slice(1)}.png`)});
    }
   }
  }
  expect(errors).toEqual([]);
 });
}
