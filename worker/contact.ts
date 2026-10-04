import {EmailMessage} from 'cloudflare:email';
import {pages} from '../src/metadata';
import {inquiryServices} from '../src/inquiry-copy';

const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{'cache-control':'no-store'}});
export type Inquiry={id:string;name:string;email:string;service:string;message:string;website:string;locale:string;path:string};
export function validInquiry(b:unknown):b is Inquiry{
 if(!b||typeof b!=='object')return false;
 const p=b as Inquiry;
 return ['id','name','email','service','message','website','locale','path'].every(k=>typeof p[k as keyof Inquiry]==='string')&&
 /^[a-f0-9-]{36}$/i.test(p.id)&&p.name.length<=100&&p.email.length<=254&&/^[A-Za-z0-9.!#$%&'*+\-/=?^_`{|}~]+@[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?\.[A-Za-z]{2,}$/.test(p.email)&&
 p.message.trim().length>=20&&p.message.length<=4000&&p.website===''&&['pl','en'].includes(p.locale)&&
 inquiryServices.includes(p.service as typeof inquiryServices[number])&&['/contact','/en/contact'].includes(p.path)&&!/[\r\n\0]/.test(p.name);
}
async function boundedJson(request:Request,max:number){
 const reader=request.body?.getReader();if(!reader)throw new Error('empty');
 const chunks:Uint8Array[]=[];let size=0;
 while(true){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>max){await reader.cancel();throw new Error('large');}chunks.push(part.value);}
 const body=new Uint8Array(size);let offset=0;for(const part of chunks){body.set(part,offset);offset+=part.length;}
 return JSON.parse(new TextDecoder().decode(body)) as unknown;
}
export async function recordMetric(db:D1Database,path:string,event:string){
 await db.prepare('INSERT INTO site_metrics(day,path,event,count) VALUES(?,?,?,1) ON CONFLICT(day,path,event) DO UPDATE SET count=count+1').bind(new Date().toISOString().slice(0,10),path,event).run();
}
export async function contactApi(request:Request,env:ReferenceEnv,ctx:ExecutionContext){
 const url=new URL(request.url);
 if(request.method!=='POST')return json({error:'method_not_allowed'},405);
 if(request.headers.get('origin')!==url.origin)return json({error:'cross_origin_rejected'},403);
 if(!request.headers.get('content-type')?.startsWith('application/json'))return new Response('Please use the website form with JavaScript enabled, or email ivan@matiushkin.com.',{status:415,headers:{'content-type':'text/plain; charset=utf-8','cache-control':'no-store'}});
 const contact=url.pathname==='/api/contact';
 const limiter=contact?env.CONTACT_LIMIT:env.METRICS_LIMIT;
 if(!(await limiter.limit({key:request.headers.get('cf-connecting-ip')??'local'})).success)return json({error:'rate_limited'},429);
 let body:unknown;try{body=await boundedJson(request,contact?16384:512);}catch{return json({error:'invalid_body'},400);}
 if(!contact){
  const b=body as {path?:string;event?:string};
  if(!b||Object.keys(b).some(key=>!['path','event'].includes(key))||typeof b.path!=='string'||!pages[b.path]||!['page_view','contact_click','form_view','form_start','form_error'].includes(b.event??''))return json({error:'invalid_metric'},422);
  if(request.headers.get('dnt')!=='1')await recordMetric(env.DB,b.path,b.event!);
  return new Response(null,{status:204,headers:{'cache-control':'no-store'}});
 }
 if(!validInquiry(body))return json({error:'invalid_inquiry'},422);
 const fingerprint=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(body))))).map(v=>v.toString(16).padStart(2,'0')).join('');
 const result=await env.DB.prepare("INSERT OR IGNORE INTO contact_receipts(id,fingerprint,status,created_at) VALUES(?,?,'pending',?)").bind(body.id,fingerprint,Date.now()).run();
 if(!result.meta.changes){
  const prior=await env.DB.prepare('SELECT fingerprint,status FROM contact_receipts WHERE id=?').bind(body.id).first<{fingerprint:string;status:string}>();
  if(prior?.fingerprint!==fingerprint)return json({error:'submission_changed'},409);
  return prior.status==='sent'?json({id:body.id}):json({error:'delivery_unconfirmed'},503);
 }
 // A global daily cap also bounds distributed spam. No message or email address is stored in D1.
 const total=await env.DB.prepare('SELECT count(*) AS n FROM contact_receipts WHERE created_at>?').bind(Date.now()-86400000).first<{n:number}>();
 if((total?.n??0)>50)return json({error:'daily_limit'},429);
 const text=`Website enquiry ${body.id}\nService: ${body.service}\nName / company: ${body.name}\nReply to: ${body.email}\nLanguage: ${body.locale}\n\n${body.message}`;
 const base64=btoa(String.fromCharCode(...new TextEncoder().encode(text))).match(/.{1,76}/g)!.join('\r\n');
 const from='contact@forms.matiushkin.com',to='ivan@matiushkin.com';
 const raw=[`From: Website <${from}>`,`To: ${to}`,`Reply-To: ${body.email}`,`Subject: Website enquiry: ${body.service} [${body.id}]`,'MIME-Version: 1.0','Content-Type: text/plain; charset=UTF-8','Content-Transfer-Encoding: base64','',base64].join('\r\n');
 try{
  await env.CONTACT_EMAIL.send(new EmailMessage(from,to,raw));
  await env.DB.prepare("UPDATE contact_receipts SET status='sent' WHERE id=?").bind(body.id).run();
 }catch{
  // Keep the receipt pending: an ambiguous delivery failure must not cause duplicate mail on retry.
  console.error('contact_delivery_unconfirmed',{id:body.id});
  return json({error:'delivery_unconfirmed'},503);
 }
 ctx.waitUntil(recordMetric(env.DB,body.path,'contact_submit').catch(()=>console.error('contact_metric_failed')));
 return json({id:body.id},202);
}
export async function cleanupContact(db:D1Database){
 await db.batch([db.prepare('DELETE FROM contact_receipts WHERE created_at<?').bind(Date.now()-86400000),db.prepare('DELETE FROM site_metrics WHERE day<?').bind(new Date(Date.now()-90*86400000).toISOString().slice(0,10))]);
}
