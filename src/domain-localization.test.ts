import {expect,test} from 'vitest';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {formatDomain} from './domain-copy';
import {languageLeaks} from './language-audit';
import {createDemoDataset,reconcile} from './reconciliation';
import {createBridgeDataset,detectBridgeExceptions,runBridgeExecution,type BridgeRunMode} from './data-bridge';
import {proofLabels} from './proof-labels';

// The parity oracle contains baseline and negative reports for all six native
// engines. Check the fields actually presented as prose, not raw JSON evidence.
const oracle=JSON.parse(gunzipSync(readFileSync(new URL('../tests/native/python-oracle.json.gz',import.meta.url))).toString());
for(const locale of ['pl','en'] as const)test(`${locale}: every reachable report label has a source translation`,()=>{
 const failures=new Set<string>();
 function check(value:unknown,machine=false){
  if(typeof value!=='string')return;
  try{const translated=formatDomain(locale,value,machine);if(languageLeaks(translated,locale).length)failures.add(`wrong language: ${translated}`);}
  catch{failures.add(`missing: ${value}`);}
 }
 for(const [slug,cases]of Object.entries(oracle) as [string,Array<{report:any}>][]){
  for(const {report:r}of cases){
   if(slug==='transit-validation'){for(const c of r.checks){check(c.expected);check(c.severity);}continue;}
   for(const row of r.artifacts.scenarios??[]){
    check(row.name);check(row.category,true);check(row.severity,true);
    if(['erp-sync','operations-exceptions','data-quality'].includes(slug)){check(row.expected,true);check(row.actual,true);}
    for(const issue of row.issues??[])check(issue.actual,true);
   }
  }
 }
 for(const row of reconcile(createDemoDataset()))for(const key of ['type','severity','expected','actual','reason','action'] as const)check(row[key],['expected','actual'].includes(key));
 for(const row of detectBridgeExceptions(createBridgeDataset()))for(const key of ['type','severity','source','issue','detectedValue','recommendedAction'] as const)check(row[key],key==='detectedValue');
 for(const mode of ['incremental-baseline','incremental-new','interrupted','resume','replay','rate-limit','webhook-valid','webhook-duplicate','webhook-invalid-signature','webhook-stale','webhook-repair','snapshot'] as BridgeRunMode[]){
  for(const event of runBridgeExecution(mode).events){
   expect(proofLabels[locale][event.stage],`${locale} stage: ${event.stage}`).toBeTruthy();
   expect(languageLeaks(proofLabels[locale][event.stage],locale)).toEqual([]);
   check(event.message,true);
  }
 }
 expect([...failures].sort()).toEqual([]);
});
test('unknown prose never silently falls back in either direction',()=>{
 for(const locale of ['pl','en'] as const){
  expect(()=>formatDomain(locale,'Unregistered buyer sentence',true)).toThrow('Missing required');
  expect(()=>formatDomain(locale,'Nieznany komunikat dla odbiorcy',true)).toThrow('Missing required');
 }
});
