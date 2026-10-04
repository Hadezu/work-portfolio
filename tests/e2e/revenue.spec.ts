import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {revenueCopy} from '../../src/revenue-copy';
import {moneyText} from '../../src/revenue-model';

for(const locale of ['en','pl'] as const)test(`revenue complete buyer journey, exports and reset: ${locale}`,async({page},info)=>{
  test.setTimeout(90000);
  const c=revenueCopy[locale],prefix=locale==='en'?'/en':'';
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.goto(prefix+'/proof/revenue-bi');
  await expect(page.locator('h1')).toHaveText(c.title);
  await expect(page.getByText(c.disclosure,{exact:true})).toBeVisible();
  await page.getByRole('button',{name:c.load,exact:true}).click();
  await expect(page.locator('.revenue-source-cards article')).toHaveCount(3);
  await page.getByRole('button',{name:c.sample,exact:true}).first().click();
  await expect(page.getByRole('dialog')).toContainText('Northstar Retail Ltd');
  await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'2. '+c.tabs[1],exact:true}).click();
  await expect(page.locator('.revenue-workspace')).toContainText('legacy_customer');
  await page.getByRole('button',{name:'3. '+c.tabs[2],exact:true}).click();
  await expect(page.getByTestId('finding-CUTOVER_OVERLAP')).toHaveCount(2);
  await expect(page.getByTestId('finding-WON_WITHOUT_INVOICE')).toHaveCount(1);
  await page.getByRole('button',{name:c.reconcile,exact:true}).click();
  await expect(page.getByTestId('revenue-status')).toHaveText('WARNING');
  await page.getByRole('button',{name:'5. '+c.tabs[4],exact:true}).click();
  await expect(page.getByTestId('metric-reported')).toContainText(moneyText('10100000',locale));
  await page.getByRole('button',{name:'6. '+c.tabs[5],exact:true}).click();
  await expect(page.getByRole('link',{name:c.downloadJson,exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:'4. '+c.tabs[3],exact:true}).click();
  await page.getByRole('button',{name:c.map,exact:true}).click();
  await expect(page.getByTestId('revenue-status')).toHaveText(c.stale);
  await expect(page.getByRole('button',{name:'5. '+c.tabs[4],exact:true})).toBeDisabled();
  await page.getByRole('button',{name:c.reconcileAgain,exact:true}).click();
  await expect(page.getByTestId('revenue-status')).toHaveText('PASS');
  await expect(page.getByTestId('revenue-quality')).toHaveText('WARNING');
  await page.getByRole('button',{name:'5. '+c.tabs[4],exact:true}).click();
  await expect(page.getByTestId('metric-reported')).toContainText(moneyText('11940000',locale));
  await page.screenshot({path:info.outputPath('revenue-dashboard-desktop.png'),fullPage:true});
  await page.getByRole('combobox',{name:c.period,exact:true}).selectOption('2026-07');
  await expect(page.getByTestId('metric-reported')).toContainText(moneyText('1740000',locale));
  await page.getByTestId('metric-reported').focus();await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toContainText('CUTOVER_OVERLAP');
  await expect(page.getByRole('dialog').locator('tbody tr')).toHaveCount(13); // 8 included ERP; overlap + ERP quarantines/duplicate.
  await page.screenshot({path:info.outputPath('revenue-trace-desktop.png')});
  await page.keyboard.press('Escape');
  await page.getByRole('combobox',{name:c.region,exact:true}).selectOption('West');
  await page.getByRole('combobox',{name:c.customer,exact:true}).selectOption('CUST-1001');
  await expect(page.getByTestId('metric-reported')).toContainText(moneyText('0',locale));
  await page.getByRole('button',{name:c.clearFilters,exact:true}).click();
  await page.setViewportSize({width:390,height:844});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:info.outputPath('revenue-dashboard-mobile.png'),fullPage:true});
  await page.getByRole('button',{name:'6. '+c.tabs[5],exact:true}).click();
  const [jsonDownload]=await Promise.all([page.waitForEvent('download'),page.getByRole('link',{name:c.downloadJson,exact:true}).click()]);
  const report=JSON.parse(await readFile((await jsonDownload.path())!,'utf8'));
  expect(report.reconciliation_status).toBe('PASS');expect(report.source_quality_status).toBe('WARNING');
  expect(report.metrics.reported.cents).toBe('11940000');expect(report.source_row_counts).toEqual({historical:52,crm:19,erp:19});
  expect(report.excluded_duplicates).toHaveLength(1);expect(report.overlap_handling).toHaveLength(2);
  expect(report.checks.find((c:{id:string})=>c.id==='overlap_removed')).toMatchObject({expected:'405000',actual:'405000',status:'PASS'});
  const [htmlDownload]=await Promise.all([page.waitForEvent('download'),page.getByRole('link',{name:c.downloadHtml,exact:true}).click()]);
  const html=await readFile((await htmlDownload.path())!,'utf8');
  expect(html).toContain(c.disclosure);expect(html).toContain(report.run_id);expect(html).toContain('11940000');
  await page.getByRole('button',{name:c.reset,exact:true}).click();
  await expect(page.getByTestId('revenue-status')).toHaveText(c.notRun);
  await page.getByRole('button',{name:'3. '+c.tabs[2],exact:true}).click();
  await expect(page.getByTestId('finding-CUSTOMER_MAPPING_MISSING')).toHaveCount(1);
  await page.getByRole('button',{name:c.reconcile,exact:true}).click();
  await page.getByRole('button',{name:'5. '+c.tabs[4],exact:true}).click();
  await expect(page.getByTestId('metric-reported')).toContainText(moneyText('10100000',locale));
  await page.reload();await expect(page.getByRole('button',{name:c.load,exact:true})).toBeVisible();
  expect(errors).toEqual([]);
});

test('revenue retry preserves snapshot and homepage/service routes link to localized example',async({page,request})=>{
  const c=revenueCopy.en;
  for(const prefix of ['','/en']){
    for(const route of [prefix||'/',prefix+'/services/data-migration']){
      await page.goto(route);await expect(page.locator('main a[href="'+prefix+'/proof/revenue-bi"]')).toBeVisible();
    }
    const response=await request.get(prefix+'/proof/revenue-bi');expect(response.status()).toBe(200);
    const html=await response.text();expect(html).toContain('data-ssr="true"');expect(html).toContain('hreflang="pl"');expect(html).toContain('hreflang="en"');
  }
  await page.goto('/en/proof/revenue-bi');await page.getByRole('button',{name:c.load,exact:true}).click();
  await page.getByRole('button',{name:'4. '+c.tabs[3],exact:true}).click();
  await page.route('**/lab-api/revenue-bi/advance',r=>r.fulfill({status:503,json:{error:'test_unavailable'}}),{times:1});
  await page.getByRole('button',{name:c.reconcile,exact:true}).click();
  await expect(page.getByRole('alert')).toHaveText(c.error);
  await expect(page.getByTestId('revenue-status')).toHaveText(c.notRun);
  await page.getByRole('button',{name:c.reconcile,exact:true}).click();
  await expect(page.getByTestId('revenue-status')).toHaveText('WARNING');
});
