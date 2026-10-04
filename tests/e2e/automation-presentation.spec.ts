import {test,expect} from '@playwright/test';
import {automationCopy} from '../../src/automation/copy';

for(const locale of ['pl','en'] as const){
 test(`${locale}: result history opens by keyboard and reset clears visual progress`,async({page})=>{
  await page.setViewportSize({width:320,height:900});
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto(`${locale==='en'?'/en':''}/automation?pattern=reconciliation&industry=finance`);
  const c=automationCopy[locale];
  await page.getByRole('button',{name:c.run,exact:true}).click();
  await expect(page.getByTestId('automation-metrics')).toBeVisible();
  await expect(page.getByTestId('process-flow')).toHaveAttribute('data-phase','6');
  await expect(page.locator('.audit-log')).toBeHidden();
  await page.locator('.result-details > summary').click();
  const disclosure=page.locator('.audit-disclosure summary');
  await disclosure.focus();await page.keyboard.press('Enter');
  await expect(page.locator('.audit-log')).toBeVisible();
  await expect(page.locator('.audit-log')).toContainText(c.reportRow);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
  await page.getByRole('button',{name:c.reset,exact:true}).click();
  await expect(page.getByTestId('process-flow')).not.toHaveAttribute('data-phase');
  await expect(page.locator('.audit-disclosure')).toHaveCount(0);
 });
}
