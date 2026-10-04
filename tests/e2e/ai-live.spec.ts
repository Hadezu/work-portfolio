import {test,expect} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
import {aiCopy} from '../../src/ai-copy';
import type {AiRun} from '../../worker/ai-lab';
test.skip(!process.env.AI_LIVE_QA,'Explicit real provider QA only; consumes the bounded daily inference budget.');
for(const locale of ['en','pl'] as const)test(`AI live provider and browser journey: ${locale}`,async({page},info)=>{
 test.setTimeout(300000);const c=aiCopy[locale],errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 const path=locale==='en'?'/en/proof/ai-automation':'/proof/ai-automation';const response=await page.goto(path);expect(response?.status()).toBe(200);
 await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href','https://work.matiushkin.com'+path);
 await page.getByRole('button',{name:c.run,exact:true}).click();await expect(page.getByTestId('ai-status')).toHaveText('READY',{timeout:60000});
 await page.getByRole('button',{name:'3. '+c.tabs[2],exact:true}).click();await expect(page.locator('.ai-stage')).toContainText('BILL-01');await expect(page.locator('.ai-stage blockquote').last()).toContainText('PASS');
 await page.getByRole('button',{name:'5. '+c.tabs[4],exact:true}).click();await expect(page.getByTestId('ai-approve')).toBeEnabled();await page.getByTestId('ai-approve').click();await expect(page.getByTestId('ai-status')).toHaveText('EXECUTED');
 const before=await (await page.request.get('/lab-api/ai-automation/runs')).json() as AiRun[];const key=before.find(r=>r.preset==='clear')!.action!.idempotency_key;
 await Promise.all([page.waitForResponse(r=>r.url().endsWith('/ai-automation/review')&&r.request().method()==='POST'),page.getByRole('button',{name:c.repeat,exact:true}).last().click()]);await expect(page.getByRole('button',{name:c.repeat,exact:true}).last()).toBeEnabled();await expect(page.getByTestId('ai-status')).toHaveText('EXECUTED');
 await page.getByRole('button',{name:'8. '+c.tabs[7],exact:true}).click();
 for(const format of ['json','html'] as const){const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('link',{name:format==='json'?c.downloadJson:c.downloadHtml,exact:true}).click()]);const data=await readFile((await download.path())!,'utf8');expect(data).toContain(key);expect(data).toContain('SIMULATED_ONLY_NO_EXTERNAL_SIDE_EFFECT');if(format==='json'){const r=JSON.parse(data) as AiRun;expect(r.raw).not.toBeNull();expect(r.parsed).not.toBeNull();expect(r.attempts.some(a=>!a.controlled&&a.status==='RECEIVED')).toBe(true);await writeFile(info.outputPath('real-run.json'),data);}else expect(data).toContain(c.disclosure);}
 if(locale==='en'&&process.env.AI_LIVE_QA==='1'){
  await page.getByRole('button',{name:'7. '+c.tabs[6],exact:true}).click();await page.getByRole('button',{name:c.runSuite,exact:true}).click();await expect(page.getByRole('button',{name:c.runSuite,exact:true})).toBeEnabled({timeout:240000});
  const runs=await (await page.request.get('/lab-api/ai-automation/runs')).json() as AiRun[];expect(runs.filter(r=>r.locale==='en')).toHaveLength(20);await writeFile(info.outputPath('real-evaluation.json'),JSON.stringify(runs,null,2));
  for(const r of runs){expect(r.raw,`real output for ${r.preset}`).not.toBeNull();if(!['clear','duplicate'].includes(r.preset)){expect(r.action).toBeNull();expect(['REVIEW','UNKNOWN']).toContain(r.status);const blocked=await page.request.post('/lab-api/ai-automation/review',{data:{run_id:r.run_id,decision:'approve'}});expect(blocked.status()).toBe(409);}}
  expect(runs.find(r=>r.preset==='transient')!.attempts.map(a=>a.status)).toEqual(['TRANSIENT','RECEIVED']);expect(runs.find(r=>r.preset==='timeout')!.status).toBe('UNKNOWN');expect(runs.find(r=>r.preset==='malformed')!.parsed).toBeNull();
  expect(runs.find(r=>r.preset==='clear')!.action!.idempotency_key).toBe(key);
  await page.screenshot({path:info.outputPath('ai-evaluation-desktop.png'),fullPage:true});
 }
 await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:info.outputPath('ai-live-mobile.png'),fullPage:true});expect(errors).toEqual([]);
});
test('AI live insufficient evidence, clarification and session exports',async({page},info)=>{
 test.setTimeout(90000);const c=aiCopy.en;
 await page.goto('/en/proof/ai-automation');await page.getByRole('combobox',{name:c.select}).selectOption('unsupported');await page.getByRole('button',{name:c.run,exact:true}).click();await expect(page.getByTestId('ai-status')).toHaveText('REVIEW',{timeout:60000});
 await page.getByRole('button',{name:'4. '+c.tabs[3],exact:true}).click();await expect(page.locator('.ai-stage')).toContainText('INSUFFICIENT_EVIDENCE');
 await page.getByRole('button',{name:'5. '+c.tabs[4],exact:true}).click();await expect(page.getByTestId('ai-approve')).toBeDisabled();await page.getByRole('button',{name:c.clarify,exact:true}).click();await expect(page.getByTestId('ai-status')).toHaveText('CLARIFICATION');await expect(page.getByText(c.noAction,{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'7. '+c.tabs[6],exact:true}).click();
 for(const format of ['json','html'] as const){const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('link',{name:format==='json'?c.downloadJson:c.downloadHtml,exact:true}).click()]);const data=await readFile((await download.path())!,'utf8');expect(data).toContain('INSUFFICIENT_EVIDENCE');expect(data).toContain('CLARIFICATION');if(format==='json'){const report=JSON.parse(data);expect(report.cases).toBe(1);expect(report.runs[0].action).toBeNull();await writeFile(info.outputPath('insufficient-evidence.json'),data);}}
});
