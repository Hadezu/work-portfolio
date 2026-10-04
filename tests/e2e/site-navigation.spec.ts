import {test,expect} from '@playwright/test';

// Browser QA must not count as prospect activity.
test.beforeEach(async({page})=>{await page.route('**/api/metrics',r=>r.fulfill({status:204}));});

for(const locale of ['en','pl'] as const)test(`client task navigation, search, keyboard and mobile: ${locale}`,async({page},info)=>{
  const prefix=locale==='en'?'/en':'',en=locale==='en';
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(prefix||'/');
  const trigger=page.getByRole('button',{name:'Menu',exact:true});
  await trigger.click();
  const panel=page.getByRole('dialog',{name:en?'What do you need to solve?':'Co chcesz usprawnić?'});
  await expect(panel).toBeVisible();
  await expect(panel.getByRole('link',{name:en?/Move data between systems/:/Przenieść dane między systemami/})).toBeVisible();
  for(const group of await panel.locator('details').all())await expect(group).not.toHaveAttribute('open');
  await page.screenshot({path:info.outputPath('client-menu-desktop.png')});
  await panel.getByRole('link',{name:en?/Move data between systems/:/Przenieść dane między systemami/}).click();
  await expect(page).toHaveURL(prefix+'/services/data-migration');await expect(panel).not.toBeVisible();
  // URL changes before a lazy route commits; wait for the destination before its keyboard interaction.
  await expect(page.locator('main.service-page h1')).toBeVisible();
  await expect(page.locator('body')).not.toHaveCSS('overflow','hidden');
  await page.keyboard.press('Control+k');
  const search=panel.getByRole('searchbox');await expect(search).toBeFocused();
  await search.fill('zzzznothing');await expect(panel.locator('.site-nav-empty')).toBeVisible();
  await expect(panel.getByRole('link',{name:en?'Discuss your task →':'Opisz zadanie →',exact:true})).toBeVisible();
  await search.fill('revenue-bi');await search.press('Enter');await expect(page).toHaveURL(prefix+'/proof/revenue-bi');
  await trigger.click();await page.keyboard.press('Escape');await expect(trigger).toBeFocused();
  await page.evaluate(()=>window.scrollTo(0,800));await expect(trigger).toBeInViewport();
  for(const width of [1024,820,768,390,320]){
    await page.setViewportSize({width,height:844});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await trigger.click();await expect(panel).toBeVisible();
    await expect(panel.getByRole('searchbox')).not.toBeFocused();
    expect(await panel.evaluate(el=>el.getBoundingClientRect().right<=innerWidth)).toBe(true);
    await page.screenshot({path:info.outputPath(`client-menu-mobile-${width}.png`)});
    await panel.getByRole('searchbox').fill('erp-sync');await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');
    await expect(page).toHaveURL(prefix+'/erp-sync');await expect(panel).not.toBeVisible();
    await page.goto(prefix+'/proof/revenue-bi');
  }
  await trigger.click();await panel.getByRole('link',{name:en?'Discuss your task →':'Opisz zadanie →',exact:true}).click();
  await expect(page).toHaveURL(prefix+'/contact');expect(errors).toEqual([]);
});
