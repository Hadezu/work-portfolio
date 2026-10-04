import {businessCopy} from '../../src/automation/business';
import {executionKind} from '../../src/automation/semantics';
import {test,expect} from '@playwright/test';
import {presets,patterns} from '../../src/automation/config';
import {automationCopy} from '../../src/automation/copy';
import {languageLeaks} from '../../src/language-audit';

// Browser QA must not count as prospect activity.
test.beforeEach(async({page})=>{await page.route('**/api/metrics',r=>r.fulfill({status:204}));});

for(const locale of ['pl','en'] as const){
 const c=automationCopy[locale],prefix=locale==='en'?'/en':'';
 test(`${locale}: seven presets produce real metrics, exceptions and clean localized states`,async({page})=>{
  test.setTimeout(120000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto(prefix+'/automation');
  for(const preset of presets){
   await page.getByTestId('industry').selectOption(preset.id);
   await expect(page.getByTestId('pattern')).toHaveValue(preset.defaultPattern);
   await page.getByRole('button',{name:c.before,exact:true}).click();await expect(page.getByTestId('process-flow')).toHaveClass(/before/);
   await expect(page.getByTestId('process-flow')).toContainText(preset.defaultPattern==='reconciliation'?businessCopy[locale].financeManual[0]:preset.copy[locale].manual[0]);
   await page.getByRole('button',{name:c.after,exact:true}).click();
   await page.getByRole('button',{name:c.run,exact:true}).click();
   await expect(page.getByTestId('automation-metrics')).toBeVisible();
   await expect(page.getByTestId('automation-metrics').locator('strong')).toHaveText([String(6+preset.rules.length),'6',String(preset.rules.length)]);
   await expect(page.locator('.exception-list li')).toHaveCount(preset.rules.length);
   await expect(page.locator('.audit-log')).toContainText(c.events[7]);
   await expect(page.locator('.automation-links a').last()).toHaveAttribute('href',prefix+'/'+preset.proof);
   expect(languageLeaks(await page.locator('body').innerText(),locale)).toEqual([]);
   await page.getByTestId('industry').selectOption(preset.id==='other'?'ecommerce':'other');
   await expect(page.getByTestId('automation-metrics')).toHaveCount(0);
   await page.getByTestId('industry').selectOption(preset.id);
   await page.getByRole('button',{name:c.run,exact:true}).click();
   await expect(page.getByTestId('automation-metrics')).toBeVisible();
   await page.getByRole('button',{name:c.reset,exact:true}).click();await expect(page.getByTestId('automation-metrics')).toHaveCount(0);
  }
  expect(errors).toEqual([]);
 });
 test(`${locale}: all canonical patterns direct-load with explicit execution limits and survive language switches`,async({page})=>{
  test.setTimeout(120000);await page.emulateMedia({reducedMotion:'reduce'});
  for(const pattern of patterns){
   await page.goto(`${prefix}/automation?pattern=${pattern.id}&industry=ecommerce`);
   await expect(page.getByTestId('pattern')).toHaveValue(pattern.id);
   if(executionKind(presets[1],pattern.id)==='outline'){await expect(page.getByRole('button',{name:c.run,exact:true})).toHaveCount(0);await expect(page.getByText(c.outline,{exact:true})).toBeVisible();}
   else {await page.getByRole('button',{name:c.run,exact:true}).click();await expect(page.getByTestId('automation-metrics')).toBeVisible();await expect(page.locator('.audit-log')).toContainText(pattern.id==='reconciliation'?c.reportRow:pattern.copy[locale].action);}
   await expect(page.locator('.language-switch a').first()).toHaveAttribute('href',`/automation?pattern=${pattern.id}&industry=ecommerce`);
   await expect(page.locator('.language-switch a').last()).toHaveAttribute('href',`/en/automation?pattern=${pattern.id}&industry=ecommerce`);
  }
  await page.getByRole('link',{name:locale==='pl'?'EN':'PL',exact:true}).click();await expect(page.getByTestId('pattern')).toHaveValue('other');
 });
 test(`${locale}: builder generates scope, fills brief and encodes email without sending`,async({page})=>{
  await page.goto(prefix+'/automation');
  await page.getByTestId('builder-0').selectOption('6');await page.getByTestId('builder-1').selectOption('4');await page.getByTestId('builder-2').selectOption('1');
  await expect(page.getByTestId('first-scope')).toContainText('API');await expect(page.getByTestId('first-scope')).toContainText('CRM');
  await page.getByRole('link',{name:c.useBrief+' →',exact:true}).click();
  await expect(page.getByTestId('brief-0')).toHaveValue('API');await expect(page.getByTestId('brief-1')).toHaveValue(c.tasks[4]);await expect(page.getByTestId('brief-2')).toHaveValue('CRM');
  await page.getByTestId('brief-0').fill('CSV + XML & żółć');
  const href=await page.getByTestId('prepared-mail').getAttribute('href');const parsed=new URL(href!);
  expect(parsed.pathname).toBe('ivan@matiushkin.com');expect(parsed.searchParams.get('body')).toContain('CSV + XML & żółć');expect(parsed.searchParams.get('body')).toContain(c.tasks[4]);
  await page.getByTestId('brief-0').fill('');await page.getByTestId('prepared-mail').click();await expect(page.getByTestId('brief-0')).toBeFocused();
  expect(new URL(page.url()).pathname).toBe(prefix+'/automation');
 });
 test(`${locale}: mobile states, unknown parameters and query changes stay usable`,async({page})=>{
  await page.setViewportSize({width:320,height:850});await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto(prefix+'/automation?industry=bad&pattern=bad');await expect(page.getByText(c.badQuery)).toBeVisible();
  await page.getByTestId('industry').scrollIntoViewIfNeeded();const top=await page.evaluate(()=>scrollY);
  await page.getByTestId('industry').selectOption('finance');await expect(page.getByTestId('pattern')).toHaveValue('reconciliation');
  expect(Math.abs(await page.evaluate(()=>scrollY)-top)).toBeLessThan(100);
  await page.getByRole('button',{name:c.run,exact:true}).click();await expect(page.getByTestId('automation-metrics')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
  await page.getByText(c.input,{exact:true}).click();const table=page.getByRole('region',{name:c.input});await table.focus();await page.keyboard.press('ArrowRight');await expect.poll(()=>table.evaluate(el=>el.scrollLeft)).toBeGreaterThan(0);
 });
 test(`${locale}: server fallback remains useful without JavaScript`,async({browser,baseURL})=>{
  const context=await browser.newContext({javaScriptEnabled:false});const page=await context.newPage();
  for(const path of [prefix||'/',prefix+'/automation']){await page.goto(new URL(path,baseURL).href);await expect(page.locator('html')).toHaveAttribute('lang',locale);await expect(page.locator('main h1')).toBeVisible();await expect(page.getByRole('link',{name:'ivan@matiushkin.com',exact:true}).first()).toHaveAttribute('href','mailto:ivan@matiushkin.com');expect(languageLeaks(await page.locator('main').innerText(),locale)).toEqual([]);}

  await context.close();
 });
}
