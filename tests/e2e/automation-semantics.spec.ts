import {businessCopy} from '../../src/automation/business';
import {test,expect} from '@playwright/test';
import {presets,patterns} from '../../src/automation/config';
import {executionKind} from '../../src/automation/semantics';
import {automationCopy} from '../../src/automation/copy';
import {languageLeaks} from '../../src/language-audit';
for(const locale of ['pl','en'] as const){
 const c=automationCopy[locale],prefix=locale==='en'?'/en':'';
 test(`${locale}: every industry/pattern pair has an executable fixture or explicit limitation`,async({page})=>{
  test.setTimeout(180000);await page.goto(prefix+'/automation');
  for(const preset of presets){
   await page.getByTestId('industry').selectOption(preset.id);
   for(const pattern of patterns){
    await page.getByTestId('pattern').selectOption(pattern.id);
    const run=page.getByRole('button',{name:c.run,exact:true});
    if(executionKind(preset,pattern.id)==='outline'){await expect(run).toHaveCount(0);await expect(page.getByText(c.outline,{exact:true})).toBeVisible();await expect(page.getByTestId('automation-metrics')).toHaveCount(0);}
    else await expect(run).toBeEnabled();
   }
  }
  expect(languageLeaks(await page.locator('body').innerText(),locale)).toEqual([]);
 });
 test(`${locale}: compare builder separates second source, key and report destination`,async({page})=>{
  await page.setViewportSize({width:390,height:900});await page.goto(prefix+'/automation?pattern=reconciliation&industry=finance');
  await expect(page.locator('.comparison-contract')).toContainText(businessCopy[locale].financeContract);
  await expect(page.locator('.comparison-contract')).toContainText(presets[3].copy[locale].comparisonSources[1]);
  const split=page.getByTestId('process-flow');await expect(split.locator('[data-flow-branch=normal]')).toContainText(c.matched);await expect(split.locator('.parallel-inputs li')).toHaveCount(2);await expect(split.getByTestId('shared-comparison-report')).toContainText(c.readOnly);await expect(split.locator('[data-flow-branch=exceptions]')).toContainText(c.exceptionBranch);
  await page.getByRole('button',{name:c.run,exact:true}).click();await expect(page.getByTestId('automation-metrics')).toBeVisible();
  await page.locator('.result-details > summary').click();
  const report=page.locator('.result-details > details');await report.locator('summary').click();await expect(report.locator('li')).toHaveCount(10);await expect(report).toContainText('FV/2026/007');await expect(report).toContainText(businessCopy[locale].financeStatuses[0]);
  await page.getByTestId('builder-0').selectOption('6');await page.getByTestId('builder-1').selectOption('2');await page.getByTestId('builder-2').selectOption('2');
  await page.getByTestId('comparison-source').fill('CSV B');await page.getByTestId('comparison-key').fill('order_id');
  const scope=page.getByTestId('first-scope');await expect(scope).toContainText('API');await expect(scope).toContainText('CSV B');await expect(scope).toContainText('order_id');await expect(scope).toContainText(c.destinations[2]);
  await page.getByRole('link',{name:c.useBrief+' →',exact:true}).click();
  const mail=new URL((await page.getByTestId('prepared-mail').getAttribute('href'))!);
  for(const value of ['API','CSV B','order_id',businessCopy[locale].briefResult,c.destinations[2]])expect(mail.searchParams.get('body')).toContain(value);
  await expect(page.getByTestId('prepared-mail')).toContainText(c.send);
  await page.getByTestId('comparison-key').fill('');await page.getByTestId('comparison-source').fill('');await expect(page.getByTestId('first-scope')).toContainText(businessCopy[locale].unknown);await page.getByRole('link',{name:c.useBrief+' →',exact:true}).click();await expect(page.getByTestId('brief-1')).toHaveValue(businessCopy[locale].manualFinance);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
  expect(languageLeaks(await page.locator('body').innerText(),locale)).toEqual([]);
 });
}
