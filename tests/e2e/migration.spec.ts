import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {migrationCopy} from '../../src/migration-copy';

for(const locale of ['en','pl'] as const)test(`migration buyer journey, recovery, persistence and evidence: ${locale}`,async({page},info)=>{
  const c=migrationCopy[locale],prefix=locale==='en'?'/en':'';
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(prefix+'/proof/migration');
  await expect(page.locator('h1')).toHaveText(c.title);
  await page.getByRole('button',{name:c.sample,exact:true}).click();
  await page.getByRole('button',{name:c.validate,exact:true}).click();
  await expect(page.getByTestId('migration-validation')).toContainText('6 '+c.valid);
  await page.getByRole('button',{name:c.continueMapping,exact:true}).click();
  await page.getByRole('button',{name:c.breakMapping,exact:true}).click();
  await expect(page.getByText(c.missing,{exact:true})).toBeVisible();
  await page.getByRole('button',{name:c.migrate,exact:true}).click();
  await expect(page.locator('.migration-counts')).toContainText(c.target+'4');
  await page.getByRole('button',{name:c.check,exact:true}).click();
  await expect(page.getByTestId('migration-verdict')).toContainText('FAIL');
  await page.getByRole('button',{name:c.correct,exact:true}).click();
  await expect(page.getByText(c.corrected,{exact:true})).toBeVisible();
  await expect(page.locator('.migration-counts')).toContainText(c.target+'4');
  await page.reload();await expect(page.getByText(c.corrected,{exact:true})).toBeVisible();
  await page.getByRole('button',{name:c.replay,exact:true}).click();
  await expect(page.locator('.migration-counts')).toContainText(c.target+'6');
  await page.getByRole('button',{name:c.replay,exact:true}).click(); // Empty queue = zero writes.
  await page.getByRole('button',{name:c.check,exact:true}).click();
  await expect(page.getByTestId('migration-verdict')).toContainText('PASS');
  const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('link',{name:c.json,exact:true}).click()]);
  const report=JSON.parse(await readFile((await download.path())!,'utf8'));
  expect(report.overall_status).toBe('PASS');expect(report.totals.target_gross).toBe('1534.50');
  expect(report.attempts[1]).toMatchObject({selected:['TX-104','TX-106'],skipped:['TX-101','TX-102','TX-103','TX-105'],writes:2});
  expect(report.attempts[2].writes).toBe(0);
  const [html]=await Promise.all([page.waitForEvent('download'),page.getByRole('link',{name:c.html,exact:true}).click()]);
  expect(await readFile((await html.path())!,'utf8')).toContain('Migration evidence — PASS');
  await page.screenshot({path:info.outputPath('migration-evidence-desktop.png'),fullPage:true});
  await page.setViewportSize({width:390,height:844});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:info.outputPath('migration-evidence-mobile.png'),fullPage:true});
  await expect(page.getByRole('link',{name:'ERP Sync →',exact:true})).toHaveAttribute('href',prefix+'/erp-sync');
  expect(errors).toEqual([]);
});

test('uploaded synthetic CSV is validated, corrected and actually changes the migrated totals',async({page})=>{
  const c=migrationCopy.en;await page.goto('/en/proof/migration');
  const fixture=await (await page.request.get('/lab-api/migration/fixture')).json();
  // The first row has gross 100 / net 80 / tax 20. Introduce a real mismatch.
  const invalid=fixture.content.replace('"100,00"','"99,00"');expect(invalid).not.toBe(fixture.content);
  await page.getByLabel(c.confirm,{exact:true}).check();
  await page.getByLabel(c.upload,{exact:true}).setInputFiles({name:'synthetic-edited.csv',mimeType:'text/csv',buffer:Buffer.from(invalid)});
  await page.getByRole('button',{name:c.validate,exact:true}).click();
  await expect(page.getByTestId('migration-validation')).toContainText('1 '+c.rejected);
  await expect(page.getByRole('button',{name:c.continueMapping,exact:true})).toHaveCount(0);
  await page.getByText(c.editor,{exact:true}).click();
  const corrected=fixture.content.replace('"100,00"','"110,00"').replace('"80,00"','"90,00"');
  await page.getByLabel(c.dataset,{exact:true}).fill(corrected);
  await page.getByRole('button',{name:c.loadEdited,exact:true}).click();
  await page.getByRole('button',{name:c.validate,exact:true}).click();
  await page.getByRole('button',{name:c.continueMapping,exact:true}).click();
  await page.getByRole('button',{name:c.migrate,exact:true}).click();
  await page.getByRole('button',{name:c.check,exact:true}).click();
  await expect(page.getByTestId('migration-verdict')).toContainText('PASS');
  await expect(page.getByRole('cell',{name:'1544.50',exact:true})).toHaveCount(2);
});

test('failed network response preserves current run and supports retry',async({page})=>{
  const c=migrationCopy.en;await page.goto('/en/proof/migration');
  await page.getByRole('button',{name:c.sample,exact:true}).click();
  await page.route('**/lab-api/migration/advance',r=>r.fulfill({status:503,json:{error:'test_unavailable'}}),{times:1});
  await page.getByRole('button',{name:c.validate,exact:true}).click();
  await expect(page.getByRole('alert')).toContainText(c.error);
  await page.getByRole('button',{name:c.validate,exact:true}).click();
  await expect(page.getByTestId('migration-validation')).toContainText('6 '+c.valid);
});

test('homepage and migration service feature the workflow; routes have SSR and alternate metadata',async({page,request})=>{
  for(const prefix of ['','/en']){
    await page.goto(prefix||'/');await expect(page.locator('main a[href="'+prefix+'/proof/migration"]').first()).toBeVisible();
    await page.goto(prefix+'/services/data-migration');await expect(page.locator('main a[href="'+prefix+'/proof/migration"]')).toBeVisible();
    const html=await (await request.get(prefix+'/proof/migration')).text();expect(html).toContain('data-ssr="true"');expect(html).toContain('<h1');
    expect(html).toContain('https://work.matiushkin.com'+prefix+'/proof/migration');
    expect(html).toContain('hreflang="en"');expect(html).toContain('hreflang="pl"');
  }
});
