import {expect,test} from '@playwright/test';
import {taskFit,taskRoutes} from '../../src/task-fit';
for(const locale of ['pl','en'] as const){
 test(`${locale}: compact task selector preserves proof and enquiry context`,async({page,request})=>{
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/api/metrics',route=>route.fulfill({status:204}));
  const prefix=locale==='en'?'/en':'',c=taskFit[locale];
  await page.goto(prefix+'/?task=unrecognised');
  await expect(page.locator('.task-options button[aria-pressed=true]')).toHaveText(c.items[0].label);
  for(const width of [1440,390]){
   await page.setViewportSize({width,height:900});
   for(const [i,route] of taskRoutes.entries()){
    await page.getByRole('button',{name:c.items[i].label,exact:true}).click();
    await expect(page.locator('#task-evidence h3')).toHaveText(c.items[i].title);
    await expect(page.locator('#task-evidence a.button.secondary')).toHaveAttribute('href',prefix+'/'+route.proof);
    await expect(page.locator('#task-evidence a.button.primary')).toHaveAttribute('href',prefix+'/contact?'+new URLSearchParams({service:route.service,example:route.proof}));
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
   }
  }
  await page.goto(prefix+'/?task=ai');
  await page.locator('#task-evidence a.button.primary').click();
  await expect(page).toHaveURL(/example=proof%2Fai-automation/);
  await expect(page.locator('main')).toContainText(locale==='en'?'AI Automation':'Laboratorium automatyzacji i ewaluacji AI');
  const pdf=await request.get('/profiles/ivan-matiushkin-'+locale+'.pdf');
  expect(pdf.status()).toBe(404);
  expect((await request.head('/profiles/ivan-matiushkin-'+locale+'.pdf')).status()).toBe(404);
  await page.goto(prefix+'/');
  await expect(page.locator('a[href^="/profiles/"]')).toHaveCount(0);
  await page.locator('.collaboration-terms summary').click();
  await expect(page.locator('.collaboration-terms')).toContainText(c.terms);
  expect(errors).toEqual([]);
 });
}
