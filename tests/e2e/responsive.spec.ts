import {expect,test} from '@playwright/test';
for(const width of [1920,1440,1280,1024,900,820,768,600,480,390,320]){
 test(`process diagrams and compact proof links reflow at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:900});await page.goto('/');
  await expect(page.locator('.technical-proof-list')).toBeVisible();
  await page.locator('.automation-engine summary').click();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
  const checks=await page.locator('.proof-card,.automation-flow li').evaluateAll(items=>items.filter(item=>item.checkVisibility()).map(item=>{
   const r=item.getBoundingClientRect();
   // Connectors intentionally extend into the gap between nodes. Text must not.
   const text=[...item.querySelectorAll('strong,.text-link')].every(el=>{const box=el.getBoundingClientRect();return box.width>0&&box.left>=r.left-1&&box.right<=r.right+1&&el.scrollWidth<=el.clientWidth+1;});
   return r.width>0&&r.left>=0&&r.right<=innerWidth+1&&text;
  }));
  expect(checks.every(Boolean)).toBe(true);
 });
}
