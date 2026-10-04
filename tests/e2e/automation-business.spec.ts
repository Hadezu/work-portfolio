import {test,expect} from '@playwright/test';
import {automationCopy} from '../../src/automation/copy';
import {businessCopy} from '../../src/automation/business';
import {languageLeaks} from '../../src/language-audit';
for(const locale of ['pl','en'] as const){
 const c=automationCopy[locale],b=businessCopy[locale],prefix=locale==='en'?'/en':'';
 test(`${locale}: business inputs and outcomes are specific, optional evidence stays accessible`,async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.emulateMedia({reducedMotion:'reduce'});
  for(const [pattern,industry,title]of [['reconciliation','finance',b.financeTitle],['document-flow','services',b.servicesTitle],['status-sync','logistics',b.logisticsTitle]]){
   await page.goto(`${prefix}/automation?pattern=${pattern}&industry=${industry}`);await expect(page.getByRole('heading',{name:title,exact:true})).toBeVisible();
   await page.getByRole('button',{name:c.run,exact:true}).click();await expect(page.getByTestId('business-result')).toBeVisible();await expect(page.locator('.exception-list')).toBeHidden();
   await page.locator('.result-details > summary').click();await expect(page.locator('.exception-list')).toBeVisible();await page.locator('.result-details > details > summary').click();
   if(industry==='finance')await expect(page.locator('.result-details > details')).toContainText('FV/2026/007');
   if(industry==='services')await expect(page.locator('.result-details > details')).toContainText(b.owner);
   if(industry==='logistics'){await expect(page.locator('.result-details > details')).toContainText(`${b.dispatched} → ${b.orderDelivered}`);await expect(page.locator('.result-details > details')).not.toContainText('ORD-1046');}
   await page.locator('.automation-input > summary').click();
   const table=page.locator('.automation-input table');if(industry==='finance'){await expect(table.locator('thead th')).toHaveText(b.financeHeaders);await expect(table).not.toContainText(c.evidence[0]);await expect(table).toContainText(b.financeStatuses[2]);}
   expect(languageLeaks(await page.locator('body').innerText(),locale)).toEqual([]);
  }
  expect(errors).toEqual([]);
 });
 test(`${locale}: compact result precedes diagram at 320px and outline has a working next step`,async({page})=>{
  await page.setViewportSize({width:320,height:900});await page.emulateMedia({reducedMotion:'reduce'});await page.goto(`${prefix}/automation?pattern=order-flow&industry=ecommerce`);
  const run=page.getByRole('button',{name:c.run,exact:true});await run.click();await expect(page.getByTestId('business-result')).toContainText('6');
  expect(await page.getByTestId('business-result').evaluate(el=>el.getBoundingClientRect().bottom)).toBeLessThan(await page.getByTestId('process-flow').evaluate(el=>el.getBoundingClientRect().top));
  expect(await page.getByTestId('automation-metrics').locator('article').evaluateAll(els=>els.every(el=>el.scrollWidth<=el.clientWidth))).toBe(true);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await page.goto(`${prefix}/automation?pattern=end-to-end&industry=manufacturing`);await expect(run).toHaveCount(0);await expect(page.getByText(c.empty,{exact:true})).toHaveCount(0);await page.getByRole('link',{name:b.outlineCta,exact:true}).click();await expect(page.getByTestId('brief-0')).toBeVisible();
 });
}
