export type SupplementReport={run_id:string;timestamp:string;ruleset:string;status:'PASS'|'FAIL';passed:number;failed:number;checks:{rule:string;expected:string;actual:string;status:'PASS'|'FAIL';evidence:Record<string,unknown>}[]};
export function validateHl7(message:string){const segments=message.split('\r').map(s=>s.split('|'));const msh=segments.find(s=>s[0]==='MSH'),pid=segments.find(s=>s[0]==='PID');return msh?.[8]==='ADT^A01'&&Boolean(msh[9])&&Boolean(pid?.[3])?'ACCEPT':'REJECT';}
export function validateDicom(data:{PatientID?:string;StudyInstanceUID?:string},patients:Set<string>){return Boolean(data.PatientID&&patients.has(data.PatientID)&&data.StudyInstanceUID&&/^\d+(\.\d+)+$/.test(data.StudyInstanceUID))?'ACCEPT':'REJECT';}
export async function supplement(kind:'async'|'healthcare',controlled=false):Promise<SupplementReport>{
 const checks:SupplementReport['checks']=[];
 const check=(rule:string,expected:string,actual:string,evidence:Record<string,unknown>)=>checks.push({rule,expected,actual,status:expected===actual?'PASS':'FAIL',evidence});
 if(kind==='healthcare'){
  const message='MSH|^~\\&|HIS|SYNTHETIC|LAYER|SYNTHETIC|202609170900||ADT^A01|MSG-001|T|2.5\rPID|1||SYN-P001';
  check('hl7.adt.identifiers','ACCEPT',validateHl7(message),{message,fields:['MSH-9','MSH-10','PID-3']});
  check('hl7.patient.required','REJECT',validateHl7(message.replace('SYN-P001','')),{field:'PID-3',value:''});
  check('hl7.message.type','REJECT',validateHl7(message.replace('ADT^A01','UNKNOWN')),{field:'MSH-9',value:'UNKNOWN'});
  const data={PatientID:controlled?'SYN-P999':'SYN-P001',StudyInstanceUID:'2.25.104'};
  check('dicom.patient.reference','ACCEPT',validateDicom(data,new Set(['SYN-P001'])),{input:data,expected_target:'SYN-P001',resolved:!controlled,controlled_change:controlled?'PatientID: SYN-P001 → SYN-P999':null});
  check('dicom.uid.syntax','REJECT',validateDicom({PatientID:'SYN-P001',StudyInstanceUID:'invalid'},new Set(['SYN-P001'])),{field:'StudyInstanceUID',value:'invalid'});
 }else{
  // Public fixture key, deliberately not a production credential. State is scoped to this execution.
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode('synthetic-fixture-key'),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);
  const payload=new TextEncoder().encode('{"event_id":"EVT-104","order":"ORD-104"}');
  const signature=await crypto.subtle.sign('HMAC',key,payload);
  const valid=await crypto.subtle.verify('HMAC',key,signature,payload);
  check('webhook.signature','ACCEPT',valid?'ACCEPT':'REJECT',{algorithm:'HMAC-SHA256',event_id:'EVT-104'});
  check('webhook.signature.invalid','REJECT',await crypto.subtle.verify('HMAC',key,signature,new TextEncoder().encode('tampered'))?'ACCEPT':'REJECT',{payload:'tampered',signature_source:'original payload'});
  const received=new Set<string>();let writes=0;
  function deliver(id:string){if(received.has(id)&&!controlled)return 'NO-OP';received.add(id);writes++;return 'CREATED';}
  check('webhook.first.delivery','CREATED',deliver('EVT-104'),{idempotency_key:'EVT-104'});
  const replay=deliver('EVT-104');
  check('webhook.duplicate.delivery','NO-OP',replay,{idempotency_key:'EVT-104',writes,expected_writes:1,controlled_change:controlled?'deduplication disabled':null});
  const attempts:number[]=[];for(let i=1;i<=2;i++){attempts.push(i===1?504:200);if(attempts.at(-1)===200)break;}
  check('webhook.timeout.retry','504 → 200',attempts.join(' → '),{attempts,maximum_attempts:2,transport:'deterministic timeout simulation; no external queue'});
 }
 const failed=checks.filter(c=>c.status==='FAIL').length;
 return {run_id:crypto.randomUUID(),timestamp:new Date().toISOString(),ruleset:kind+'-subset/1',status:failed?'FAIL':'PASS',passed:checks.length-failed,failed,checks};
}
