import {executionKind} from './semantics';
import {patterns, presets, type PatternId, type Preset, type RuleKind} from './config';
import type {Locale} from '../locale';
export type DemoRecord={id:string;reference:string;value:number;expected:number;valid:boolean;stock:number;delay:number;status:string;expectedStatus:string;approved:boolean};
export type Finding={record:string;rule:string};
export type AuditEvent={time:string;event:0|1|2|3|4|5|6|7|8;record:string;destination?:number};
export type Run={input:DemoRecord[];accepted:DemoRecord[];findings:Finding[];reviewCount:number;actions:{record:string;pattern:PatternId;destination:string}[];audit:AuditEvent[]};
const checks:Record<RuleKind,(record:DemoRecord,seen:Set<string>)=>boolean>={
 missing:r=>!r.reference, mismatch:r=>r.value!==r.expected,invalid:r=>!r.valid,
 overdue:r=>r.delay>24,stock:r=>r.stock<r.value,duplicate:(r,seen)=>seen.has(r.reference),status:r=>r.status!==r.expectedStatus,approval:r=>!r.approved,
};
export function createInput(preset:Preset):DemoRecord[]{
 const normal=(i:number):DemoRecord=>({id:`DEMO-${1040+i}`,reference:`REF-${i}`,value:10,expected:10,valid:true,stock:20,delay:0,status:'ready',expectedStatus:'ready',approved:true});
 const rows=Array.from({length:6},(_,i)=>normal(i));
 preset.rules.forEach((rule,i)=>{const r=normal(i+6);switch(rule.kind){case'missing':r.reference='';break;case'mismatch':r.value=12;break;case'invalid':r.valid=false;break;case'overdue':r.delay=48;break;case'stock':r.stock=0;break;case'duplicate':r.reference=rows[0].reference;break;case'status':r.status='pending';break;case'approval':r.approved=false;break;}rows.push(r);});return rows.map(r=>preset.id==='services'?{...r,reference:r.reference?`COMP-${r.reference.slice(4)}`:''}:preset.id==='logistics'?{...r,reference:r.reference?`EVT-${r.reference.slice(4)}`:'',status:r.reference?(r.valid?'delivered':'delivery-exception'):'missing',expectedStatus:'delivered'}:r);
}
/** Pure deterministic simulation: no network, clocks, randomness or writes. */
export function simulate(preset:Preset,pattern:PatternId,input=pattern==='reconciliation'?createComparison(preset.id==='finance').input:createInput(preset)):Run{
 if(executionKind(preset,pattern)==='outline')throw new Error('Scenario requires an agreed configuration');
 if(pattern==='reconciliation')return compareRecords(input,createComparison(preset.id==='finance').reference);
 const seen=new Set<string>(),accepted:DemoRecord[]=[],findings:Finding[]=[],audit:AuditEvent[]=[],actions:Run['actions']=[];
 const append=(event:AuditEvent['event'],record:string,destination?:number)=>audit.push({destination,time:`13:${String(42+Math.floor(audit.length/60)).padStart(2,'0')}:${String(audit.length%60).padStart(2,'0')}`,event,record});
 for(const record of input){append(0,record.id);const issues=preset.rules.filter(r=>checks[r.kind](record,seen));append(1,record.id);append(2,record.id);if(record.reference)seen.add(record.reference);
  if(issues.length){append(7,record.id);issues.forEach(rule=>findings.push({record:record.id,rule:rule.id}));append(4,record.id);append(5,record.id);}
  else{accepted.push({...record});const destinations=patterns.find(p=>p.id===pattern)!.destinations;for(const destination of destinations){actions.push({record:record.id,pattern,destination:String(destination)});append(3,record.id,destination);}}
 }
 append(6,'DEMO');return {input:input.map(r=>({...r})),accepted,findings,reviewCount:new Set(findings.map(f=>f.record)).size,actions,audit};
}
export function resolveSelection(search:string){
 const params=new URLSearchParams(search);const rawPattern=params.get('pattern');const key=rawPattern?.toLowerCase().replaceAll('_','-');const canonical=key==='exceptions'?'exception-handling':key;
 const pattern=patterns.find(p=>p.id===canonical);const requested=presets.find(p=>p.id===params.get('industry'));
 const preset=requested??presets.find(p=>pattern&&p.defaultPattern===pattern.id)??presets[1];
 return {preset,pattern:pattern??patterns.find(p=>p.id===preset.defaultPattern)!,invalid:!!((rawPattern&&!pattern)||(params.has('industry')&&!requested))};
}
export function automationHref(locale:Locale,industry:string,pattern:PatternId){return `${locale==='en'?'/en':''}/automation?${new URLSearchParams({industry,pattern})}`;}
export function briefHref(subject:string,questions:string[],answers:string[]){return `mailto:ivan@matiushkin.com?subject=${encodeURIComponent(subject.replace(/[\r\n]/g,' '))}&body=${encodeURIComponent(questions.map((q,i)=>`${q}\r\n${answers[i].trim()}`).join('\r\n\r\n'))}`;}

export type ReferenceRecord={reference:string;value:number};
export function createComparison(finance=false){
 const row=(i:number):DemoRecord=>({id:`DEMO-${1040+i}`,reference:`REF-${i}`,value:10,expected:10,valid:true,stock:20,delay:0,status:'ready',expectedStatus:'ready',approved:true});
 const input=Array.from({length:10},(_,i)=>row(i));
 input[7].value=12;input[9].reference='REF-8';
 const reference:ReferenceRecord[]=Array.from({length:9},(_,i)=>({reference:`REF-${i}`,value:10})).filter(r=>r.reference!=='REF-6');
 if(finance){const invoice=(key:string)=>`FV/2026/${String(Number(key.slice(4))+1).padStart(3,'0')}`;for(const r of input){r.value=1200+Number(r.reference.slice(4))*100+(r.id==='DEMO-1047'?50:0);r.expected=r.value;r.reference=invoice(r.reference);}for(const r of reference){r.value=1200+Number(r.reference.slice(4))*100;r.reference=invoice(r.reference);}}
 return {input,reference};
}
/** Explicit one-way A -> B exact-key comparison. Never produces system actions. */
export function compareRecords(input:DemoRecord[],reference:ReferenceRecord[]):Run{
 const findings:Finding[]=[],accepted:DemoRecord[]=[],audit:AuditEvent[]=[];
 const count=(rows:readonly {reference:string}[],key:string)=>rows.filter(r=>r.reference===key).length;
 const append=(event:AuditEvent['event'],record:string)=>audit.push({event,record,time:`13:${42+Math.floor(audit.length/60)}:${String(audit.length%60).padStart(2,'0')}`});
 for(const row of input){
  append(0,row.id);append(1,row.id);append(2,row.id);
  const matches=reference.filter(r=>r.reference===row.reference);
  const rule=count(input,row.reference)>1||matches.length>1?'comparison-duplicate':!row.reference||!matches.length?'comparison-missing':row.value!==matches[0].value?'comparison-mismatch':null;
  if(rule){findings.push({record:row.id,rule});append(7,row.id);append(4,row.id);append(5,row.id);}else accepted.push({...row});
  append(8,row.id);
 }
 append(6,'DEMO');return {input:input.map(r=>({...r})),accepted,findings,reviewCount:findings.length,actions:[],audit};
}
