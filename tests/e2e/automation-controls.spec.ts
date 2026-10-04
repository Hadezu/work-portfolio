import {test,expect} from '@playwright/test';
import {automationCopy} from '../../src/automation/copy';
for(const locale of ['pl','en'] as const){
 const c=automationCopy[locale],path=(locale==='en'?'/en':'')+'/automation';
 test(`${locale}: no-JavaScript advice does not flash while JavaScript is loading`,async({page})=>{
  await page.route(/\.(?:tsx?|m?js)(?:\?|$)|\/@vite\//,route=>route.abort());
  await page.goto(path);
  await expect(page.locator('noscript')).toBeAttached();
  await expect(page.locator('noscript')).toBeHidden();
  expect(await page.locator('body').innerText()).not.toContain(c.fallback);
 });
 test(`${locale}: keyboard operation and changing configuration during a run`,async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(path);
  await expect(page.locator('main h1')).toHaveText(c.product);
  await expect(page.locator('.automation-page-intro .kicker')).toHaveText(`Ivan Matiushkin · ${c.identity}`);
  await page.getByText(c.engine,{exact:true}).click();await expect(page.locator('.automation-engine [data-flow-branch=normal]')).toBeVisible();await expect(page.locator('.automation-engine [data-flow-branch=exceptions]')).toContainText(c.exceptionBranch);await expect(page.locator('.automation-engine .flow-audit')).toHaveText(c.auditBoth);
  expect(await page.locator('body').innerText()).not.toMatch(/Â·|\uFFFD/);
  const before=page.getByRole('button',{name:c.before,exact:true});await before.focus();await page.keyboard.press('Space');await expect(before).toHaveAttribute('aria-pressed','true');
  await page.getByRole('button',{name:c.run,exact:true}).click();await page.getByTestId('industry').selectOption('finance');await expect(page.getByRole('button',{name:c.run,exact:true})).toBeEnabled();await expect(page.getByTestId('automation-metrics')).toHaveCount(0);
  await page.getByRole('button',{name:c.run,exact:true}).click();await expect(page.getByTestId('automation-metrics')).toBeVisible();await page.getByTestId('pattern').selectOption('reporting');await expect(page.getByTestId('automation-metrics')).toHaveCount(0);
  for(let task=0;task<c.tasks.length;task++){await page.getByTestId('builder-1').selectOption(String(task));await expect(page.getByTestId('first-scope')).not.toContainText('{');await expect(page.locator('.automation-builder .branch-flow')).toContainText(c.builderActions[task]);}
  expect(errors).toEqual([]);
 });
 test(`${locale}: email copy success and graceful clipboard failure`,async({page})=>{
  await page.goto(path);await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async(text:string)=>{(window as unknown as {copied:string}).copied=text;}}}));
  await page.getByRole('button',{name:c.copy,exact:true}).click();await expect(page.getByText(c.copied,{exact:true})).toBeVisible();expect(await page.evaluate(()=>(window as unknown as {copied:string}).copied)).toBe('ivan@matiushkin.com');
  await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw new Error('Permission denied');}}}));await page.getByRole('button',{name:c.copy,exact:true}).click();await expect(page.getByText(c.copyFailed,{exact:true})).toBeVisible();
 });
}
