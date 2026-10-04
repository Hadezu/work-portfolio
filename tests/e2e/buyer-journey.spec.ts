import {test,expect} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
import {buyerCopy} from '../../src/buyer-copy';
import {migrationCopy} from '../../src/migration-copy';
import {revenueCopy} from '../../src/revenue-copy';
for(const locale of ['en','pl'] as const){
 const prefix=locale==='en'?'/en':'',b=buyerCopy[locale];
 for(const kind of ['migration','revenue-bi'] as const)test(`guided buyer journey ${kind} ${locale}`,async({page})=>{
  test.setTimeout(90000);
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});await page.route('**/api/metrics',r=>r.fulfill({status:204}));
  await page.goto(prefix+'/proof/'+kind);
  await page.getByRole('button',{name:b.start,exact:true}).click();await expect(page.locator(kind==='migration'?'.migration-counts':'.revenue-source-cards')).toBeVisible();
  const guide=page.getByTestId('buyer-guide');
  const next=async()=>{await expect(guide.locator('button.primary')).toBeEnabled();await guide.locator('button.primary').click();};
  if(kind==='migration'){
   for(let i=0;i<5;i++)await next();
   await expect(page.getByTestId('migration-verdict')).toContainText('FAIL');
   for(let i=0;i<3;i++)await next();
   await expect(page.getByTestId('migration-verdict')).toContainText('PASS');
   await expect(page.locator('.buyer-outcome')).toContainText(b.migrationPass);
  }else{
   for(let i=0;i<3;i++)await next();
   await expect(page.getByTestId('revenue-status')).toHaveText('WARNING');
   await expect(page.locator('.buyer-outcome')).toContainText('18');
   await next();await expect(page.getByTestId('revenue-status')).toHaveText(revenueCopy[locale].stale);
   await next();await expect(page.getByTestId('revenue-status')).toHaveText('PASS');
   await next();await expect(page.getByTestId('metric-reported')).toContainText('119');
  }
  if(process.env.CAPTURE_PREVIEWS){
   await page.setViewportSize({width:700,height:960});
   await mkdir('public/previews',{recursive:true});
   const area=page.locator(kind==='migration'?'.buyer-outcome':'.revenue-kpis');
   await page.evaluate(()=>document.fonts.ready);
   await area.scrollIntoViewIfNeeded();
   if(kind==='migration'){
    const first=await area.boundingBox(),last=await page.getByTestId('migration-verdict').boundingBox();
    const scrollY=await page.evaluate(()=>window.scrollY);
    await page.screenshot({path:`public/previews/${kind}-${locale}.png`,fullPage:true,clip:{x:first!.x,y:first!.y+scrollY,width:first!.width,height:last!.y+last!.height-first!.y}});
   }else await area.screenshot({path:`public/previews/${kind}-${locale}.png`});
  }
  if(kind==='revenue-bi'){
   await next();await expect(page.getByRole('dialog')).toBeVisible();
   await expect(page.getByRole('dialog')).toContainText('2026-07');
   await page.keyboard.press('Escape');await next();
  }
  const download=page.waitForEvent('download');await guide.locator('a.primary').click();expect((await download).suggestedFilename()).toMatch(/html$/);await guide.getByRole('button',{name:b.stop,exact:true}).click();await expect(guide).toHaveCount(0);await expect(page.getByTestId(kind==='migration'?'migration-verdict':'revenue-status')).toContainText('PASS');
  await page.getByRole('button',{name:kind==='migration'?migrationCopy[locale].reset:revenueCopy[locale].reset,exact:true}).click();
  await expect(guide).toHaveCount(0);
  await page.locator('main .similar-task').click();
  await expect(page.locator('.buyer-context')).toBeVisible();await page.locator('.language-switch').getByRole('link',{name:locale==='en'?'PL':'EN',exact:true}).click();await expect(page.locator('.buyer-context')).toBeVisible();await page.locator('.language-switch').getByRole('link',{name:locale.toUpperCase(),exact:true}).click();await page.reload();
  await expect(page.locator('.buyer-context')).toBeVisible();
  await page.route('**/api/contact',async r=>{const body=r.request().postDataJSON();expect(body.message).toContain(`https://work.matiushkin.com${prefix}/proof/${kind}`);expect(body.message).toContain('Synthetic enquiry');await r.fulfill({status:202,json:{id:body.id}});});
  await page.locator('[name=email]').fill('test@example.com');await page.locator('[name=message]').fill('Synthetic enquiry for buyer journey verification.');
  await page.locator('button[type=submit]').click();await expect(page.locator('.contact-status')).toBeVisible();
  expect(errors).toEqual([]);
 });
 test(`buyer homepage and removable context ${locale}`,async({page})=>{
  await page.goto(prefix+'/');await expect(page.locator('.buyer-examples article')).toHaveCount(4);
  for(const img of await page.locator('.buyer-examples img').all())expect(await img.evaluate((el:HTMLImageElement)=>el.complete&&el.naturalWidth>0)).toBe(true);
  await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.goto(prefix+'/contact?example=proof%2Frevenue-bi&service=data-migration');await page.locator('[name=message]').fill('My own message must stay here.');await page.getByRole('button',{name:b.remove,exact:true}).click();await expect(page.locator('.buyer-context')).toHaveCount(0);await expect(page.locator('[name=message]')).toHaveValue('My own message must stay here.');
  await page.goto(prefix+'/contact?example=https://untrusted.example');await expect(page.locator('.buyer-context')).toHaveCount(0);
 });
}
