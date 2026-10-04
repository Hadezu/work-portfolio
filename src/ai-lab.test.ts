import {describe,it,expect,vi} from 'vitest';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {presets,documents,parseOutput,validate,retrieve,prompt,score,canApprove,type Output} from './ai-lab-model';
import {aiApi,initialRun,completeRun,decide,applyFault,classifyFailure,exportHtml,evaluationReport,DAILY_CALL_LIMIT} from '../worker/ai-lab';
import {aiCopy} from './ai-copy';
import {assertLocalized} from './localization-contract';

// Explicit deterministic provider double: never used by the production Worker.
function output():Output{return {company_name:'Demo Northstar',contact_name:'Alex Demo',category:'integration',requested_outcome:'Synchronize customers',systems_mentioned:['HubSpot','Demo Billing API'],data_objects:['customers','invoices'],urgency:'normal',constraints:[],missing_information:[],suggested_next_step:'Review',confidence:.9,requires_human_review:false,claims:[{document_id:'API-01',quote:documents[0].text}],proposed_tool:{name:'create_task',arguments:{summary:'Review customer integration'}}};}
function ready(){return completeRun(initialRun('test','clear','en'),JSON.stringify(output()));}
function setup(provider:()=>Promise<unknown>=async()=>({response:JSON.stringify(output())})){
 const sqlite=new DatabaseSync(':memory:');sqlite.exec(readFileSync(new URL('../backend/cloudflare/migrations/0001_demo_runs.sql',import.meta.url),'utf8'));
 const db={prepare(sql:string){let args:unknown[]=[];return {bind(...p:unknown[]){args=p;return this;},async run(){const r=sqlite.prepare(sql).run(...args as never[]);return {meta:{changes:Number(r.changes)}};},async first(){return sqlite.prepare(sql).get(...args as never[])??null;},async all(){return {results:sqlite.prepare(sql).all(...args as never[])};}};}} as unknown as D1Database;
 const model=vi.fn(provider),env={DB:db,AI:{run:model} as unknown as Ai};
 const request=(path:string,body?:unknown,session='test')=>aiApi(new Request('https://test/lab-api/ai-automation/'+path,{method:body===undefined?'GET':'POST',headers:{'x-lab-session':session,'content-type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)}),env);
 return {request,model,sqlite};
}
describe('AI output contract',()=>{
 it('accepts an exact valid object',()=>expect(parseOutput(JSON.stringify(output())).errors).toEqual([]));
 it.each(['not json','```json\n{}\n```','null','[]','1'])('rejects malformed or non-object %s',raw=>expect(parseOutput(raw).value).toBeNull());
 it.each(['confidence','requires_human_review','claims','proposed_tool','systems_mentioned','category'])('never coerces %s',key=>{const o={...output(),[key]:'invalid'};expect(parseOutput(JSON.stringify(o)).value).toBeNull();});
 it('rejects unknown keys including model approval',()=>expect(parseOutput(JSON.stringify({...output(),approved:true})).value).toBeNull());
 it('rejects absent required fields',()=>{const o:Partial<Output>=output();delete o.confidence;expect(parseOutput(JSON.stringify(o)).value).toBeNull();});
 it('rejects oversized model strings',()=>expect(parseOutput(JSON.stringify({...output(),requested_outcome:'x'.repeat(501)})).value).toBeNull());
 it('rejects confidence out of range',()=>expect(parseOutput(JSON.stringify({...output(),confidence:2})).value).toBeNull());
});
describe('retrieval, evidence and business rules',()=>{
 it('retrieves invoice policy with deterministic ranking',()=>{expect(retrieve('invoice billing')[0].doc.id).toBe('BILL-01');expect(retrieve('invoice billing')).toEqual(retrieve('invoice billing'));});
 it('returns no evidence for unknown domain',()=>expect(retrieve(presets.find(p=>p.id==='unsupported')!.input)).toEqual([]));
 it('bounds retrieval to four documents',()=>expect(retrieve(presets[0].input).length).toBeLessThanOrEqual(4));
 it('validates exact cited source and known facts',()=>expect(ready().findings).toEqual([]));
 it('rejects invented business names',()=>{const o=output();o.company_name='Unstated Company';expect(validate(o,presets[0].input,retrieve(presets[0].input))).toContain('UNSUPPORTED_FACT');});
 it('rejects invented systems',()=>{const o=output();o.systems_mentioned.push('Invented ERP');expect(validate(o,presets[0].input,retrieve(presets[0].input))).toContain('UNSUPPORTED_SYSTEM');});
 it('rejects altered citation text',()=>{const o=output();o.claims[0].quote+=' fabricated';expect(validate(o,presets[0].input,retrieve(presets[0].input))).toContain('CITATION_UNSUPPORTED');});
 it('rejects a real document not in retrieved context',()=>expect(validate(output(),presets[0].input,[])).toContain('CITATION_UNSUPPORTED'));
 it('requires review without evidence',()=>expect(validate(output(),presets[0].input,[])).toContain('INSUFFICIENT_EVIDENCE'));
 it('reports missing retrieval evidence even when the model also fails its schema',()=>expect(validate(null,'unknown',[])).toEqual(['INSUFFICIENT_EVIDENCE','SCHEMA_FAILURE']));
 it('routes missing fields to review',()=>{const o=output();o.data_objects=[];expect(validate(o,presets[0].input,retrieve(presets[0].input))).toContain('MISSING_REQUIREMENTS');});
 it('routes low confidence',()=>{const o=output();o.confidence=.2;expect(validate(o,presets[0].input,retrieve(presets[0].input))).toContain('LOW_CONFIDENCE');});
 it.each(['injection','document-injection'])('detects untrusted instructions in %s independently of schema',id=>{const r=initialRun('t',id,'en');expect(validate(null,r.input,r.retrieved)).toContain('UNTRUSTED_INSTRUCTION');const p=prompt(presets.find(p=>p.id===id)!,r.retrieved,'en');expect(p[0].role).toBe('system');expect(p[0].content).not.toContain(r.input);expect(JSON.parse(p[1].content).untrusted_business_input).toBe(r.input);});
 it('blocks conflicting policies',()=>{const r=completeRun(initialRun('t','conflict','en'),JSON.stringify(output()));expect(r.findings).toContain('POLICY_CONFLICT');expect(decide(r,'approve')).toBeNull();});
 it('does not describe lexical retrieval as vector search',()=>expect(aiCopy.en.retrieval).toContain('No embeddings or vector search'));
});
describe('approval and simulated execution',()=>{
 it('does nothing until explicit approval',()=>expect(ready().action).toBeNull());
 it('fulfills a model request for review through explicit human approval, never automatically',()=>{const o=output();o.requires_human_review=true;const r=completeRun(initialRun('t','clear','en'),JSON.stringify(o));expect(r.status).toBe('READY');expect(r.action).toBeNull();expect(r.findings).toContain('MODEL_REQUESTS_REVIEW');expect(decide(r,'approve')?.status).toBe('EXECUTED');});
 it('requires a named contact independently of the model review flag',()=>{const o=output();o.contact_name=null;const r=completeRun(initialRun('t','clear','en'),JSON.stringify(o));expect(r.findings).toContain('MISSING_REVIEW_CONTACT');expect(decide(r,'approve')).toBeNull();});
 it('preserves an absent business outcome as null and blocks action',()=>{const o=output();o.requested_outcome=null;const parsed=parseOutput(JSON.stringify(o));expect(parsed.value?.requested_outcome).toBeNull();expect(validate(parsed.value,presets[0].input,retrieve(presets[0].input))).toContain('MISSING_OUTCOME');});
 it('creates one typed simulated receipt',()=>{const r=decide(ready(),'approve')!;expect(r.status).toBe('EXECUTED');expect(r.action?.result).toBe('SIMULATED_ONLY_NO_EXTERNAL_SIDE_EFFECT');expect(r.action?.idempotency_key).toBe('test:action:1');});
 it('repeated approval returns the same receipt and audit',()=>{const r=decide(ready(),'approve')!;expect(decide(r,'approve')).toBe(r);});
 it.each(['PENDING','REVIEW','UNKNOWN','FAILED','REJECTED','CLARIFICATION'])('cannot approve %s',status=>expect(canApprove(status,[])).toBe(false));
 it('cannot override blocking findings',()=>{const r=ready();r.findings=['MISSING_REQUIREMENTS'];expect(decide(r,'approve')).toBeNull();});
 it.each(['reject','clarify'])('records %s with no action',decision=>{const r=decide(ready(),decision)!;expect(r.action).toBeNull();expect(r.audit.at(-1)?.event).toBe('HUMAN_'+decision.toUpperCase());expect(decide(r,'approve')).toBeNull();});
 it('blocks a forbidden action despite valid schema',()=>{const r=completeRun(initialRun('t','business-invalid','en'),JSON.stringify(output()));expect(r.findings).toContain('ACTION_POLICY');expect(decide(r,'approve')).toBeNull();});
});
describe('controlled evaluation and evidence',()=>{
 it('defines 20 unique controlled scenarios',()=>{expect(presets).toHaveLength(20);expect(new Set(presets.map(p=>p.id)).size).toBe(20);});
 it('reports real quality failure instead of masking it',()=>expect(score(presets[0],null,['SCHEMA_FAILURE']).find(c=>c.metric==='SCHEMA_VALID')?.status).toBe('FAIL'));
 it('scores expected complete fields and citations',()=>expect(ready().checks.every(c=>c.status==='PASS')).toBe(true));
 it('does not treat schema failure as missing information detection',()=>expect(score(presets[1],null,['SCHEMA_FAILURE']).find(c=>c.metric==='MISSING_INFORMATION')?.status).toBe('FAIL'));
 it('preserves actual raw response when injecting a defect',()=>{const raw=JSON.stringify(output());const r=completeRun(initialRun('t','malformed','en'),raw);expect(r.raw).toBe(raw);expect(r.tested_raw).not.toBe(raw);expect(r.parsed).toBeNull();});
 it.each(['low-confidence','citation','business'])('labels and applies %s without mutating source',fault=>{const raw=JSON.stringify(output());expect(applyFault(raw,fault)).not.toBe(raw);expect(JSON.parse(raw)).toEqual(output());});
 it('escapes script-like model content in HTML export',()=>{const r=ready();r.raw='<script>alert(1)</script>';const html=exportHtml(r);expect(html).not.toContain('<script>');expect(html).toContain('&lt;script&gt;');expect(html).toContain(aiCopy.en.disclosure);expect(html).not.toMatch(/oauth_token|authorization|Bearer /);});
 it('exports full reproducible input, versions and evidence',()=>{const r=ready();const copy=JSON.parse(JSON.stringify(r));expect(copy.payload).toHaveLength(2);expect(copy.versions).toHaveProperty('schema');expect(copy.checks).toHaveLength(9);});
 it('derives evaluation totals from recorded cases',()=>{const r=ready(),report=evaluationReport([r]);expect(report).toMatchObject({cases:1,total:9,pass:9,fail:0,warning:0});expect(report.runs[0].raw).toBe(r.raw);});
 it('has equivalent complete locale copy',()=>expect(()=>assertLocalized('AI',aiCopy)).not.toThrow());
});
describe('D1-backed API reliability',()=>{
 it('deduplicates concurrent requests and repeated actions',async()=>{const s=setup();const body={preset:'clear',locale:'en'};await Promise.all([s.request('run',body),s.request('run',body)]);expect(s.model).toHaveBeenCalledTimes(1);const r=await (await s.request('run',body)).json() as {run_id:string};const a=await (await s.request('review',{run_id:r.run_id,decision:'approve'})).json();const b=await (await s.request('review',{run_id:r.run_id,decision:'approve'})).json();expect(a).toEqual(b);s.sqlite.close();});
 it('isolates sessions and exports',async()=>{const s=setup();await s.request('run',{preset:'clear',locale:'en'});expect((await s.request('report/ai-en-clear-v1.json',undefined,'other')).status).toBe(404);const r=await s.request('report/ai-en-clear-v1.html');expect(r.status).toBe(200);expect(r.headers.get('content-security-policy')).toContain('sandbox');s.sqlite.close();});
 it('rejects arbitrary custom prompts without calling provider',async()=>{const s=setup();expect((await s.request('run',{preset:'clear',locale:'en',prompt:'arbitrary'})).status).toBe(422);expect(s.model).not.toHaveBeenCalled();s.sqlite.close();});
 it('exports only current session evaluation',async()=>{const s=setup();await s.request('run',{preset:'clear',locale:'en'});expect(await (await s.request('evaluation.json',undefined,'other')).json()).toMatchObject({cases:0,total:0});expect(await (await s.request('evaluation.json')).json()).toMatchObject({cases:1,total:9});s.sqlite.close();});
 it('rejects oversized requests',async()=>{const s=setup();expect((await s.request('run',{preset:'x'.repeat(2000)})).status).toBe(413);s.sqlite.close();});
 it('accepts provider JSON objects without coercion',async()=>{const s=setup(async()=>({response:output()}));const r=await (await s.request('run',{preset:'clear',locale:'en'})).json() as {status:string};expect(r.status).toBe('READY');s.sqlite.close();});
 it('retries one explicit transient error then records recovery',async()=>{let n=0;const s=setup(async()=>{if(!n++)throw {status:503};return {response:JSON.stringify(output())};});const r=await (await s.request('run',{preset:'clear',locale:'en'})).json() as {attempts:{status:string}[]};expect(s.model).toHaveBeenCalledTimes(2);expect(r.attempts.map(a=>a.status)).toEqual(['TRANSIENT','RECEIVED']);s.sqlite.close();});
 it('bounds retries at two',async()=>{const s=setup(async()=>{throw {status:503};});const r=await (await s.request('run',{preset:'clear',locale:'en'})).json() as {status:string};expect(s.model).toHaveBeenCalledTimes(2);expect(r.status).toBe('FAILED');s.sqlite.close();});
 it('never retries an ambiguous provider timeout',async()=>{const s=setup(async()=>{throw Error('provider timeout');});const r=await (await s.request('run',{preset:'clear',locale:'en'})).json() as {status:string};expect(r.status).toBe('UNKNOWN');await s.request('run',{preset:'clear',locale:'en'});expect(s.model).toHaveBeenCalledTimes(1);s.sqlite.close();});
 it('keeps control faults separate from actual attempts',async()=>{const s=setup();const r=await (await s.request('run',{preset:'transient',locale:'en'})).json() as {attempts:{controlled:boolean}[]};expect(r.attempts.map(a=>a.controlled)).toEqual([true,false]);expect(s.model).toHaveBeenCalledTimes(1);s.sqlite.close();});
 it('enforces global budget across sessions atomically',async()=>{const s=setup();const day=new Date().toISOString().slice(0,10);s.sqlite.prepare('INSERT INTO demo_runs VALUES(?,?,?,?,?)').run('ai-global-budget',day,'ai-budget',JSON.stringify({calls:DAILY_CALL_LIMIT}),Math.floor(Date.now()/1000));const r=await (await s.request('run',{preset:'clear',locale:'en'},'new-session')).json() as {findings:string[]};expect(r.findings).toContain('DAILY_BUDGET_EXHAUSTED');expect(s.model).not.toHaveBeenCalled();s.sqlite.close();});
 it('classifies failures without exposing provider exception messages',()=>{expect(classifyFailure({status:429})).toBe('TRANSIENT');expect(classifyFailure(Error('timed out'))).toBe('UNKNOWN');expect(classifyFailure(Error('secret-text'))).toBe('FAILED');});
});
