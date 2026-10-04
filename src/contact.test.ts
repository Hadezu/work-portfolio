import {describe,it,expect,vi} from 'vitest';
vi.mock('cloudflare:email',()=>({EmailMessage:class {constructor(public from:string,public to:string,public raw:string){}}}));
import {contactApi,validInquiry} from '../worker/contact';
const inquiry={id:'63e6bb7a-11fe-4d03-8cc0-2b07eb851438',name:'Test Company',email:'test@example.com',service:'api-integration',message:'A synthetic enquiry for delivery validation.',website:'',locale:'en',path:'/en/contact'};
describe('contact validation',()=>{
 it('accepts a bounded enquiry',()=>expect(validInquiry(inquiry)).toBe(true));
 for(const patch of [{email:'a@example.com\r\nBcc: x@evil.com'},{name:'x\nHeader: value'},{website:'https://spam.test'},{message:'short'},{message:'x'.repeat(4001)},{service:'relay'},{path:'/unknown'},{locale:'xx'}])it('rejects '+JSON.stringify(patch).slice(0,70),()=>expect(validInquiry({...inquiry,...patch})).toBe(false));
});
function setup(fail=false){
 const receipts=new Map<string,{fingerprint:string;status:string}>();
 const send=vi.fn(async()=>{if(fail)throw Error('mail unavailable')});
 const db={prepare:(sql:string)=>({bind:(...v:unknown[])=>({run:async()=>{
  if(sql.startsWith('INSERT OR IGNORE')){if(receipts.has(v[0] as string))return {meta:{changes:0}};receipts.set(v[0] as string,{fingerprint:v[1] as string,status:'pending'});}
  if(sql.startsWith('UPDATE contact'))receipts.get(v[0] as string)!.status='sent';
  return {meta:{changes:1}};
 },first:async()=>sql.includes('count(*)')?{n:receipts.size}:receipts.get(v[0] as string)})})};
 const env={DB:db,CONTACT_EMAIL:{send},CONTACT_LIMIT:{limit:async()=>({success:true})},METRICS_LIMIT:{limit:async()=>({success:true})}} as unknown as ReferenceEnv;
 const request=(body:unknown=inquiry,origin='https://work.matiushkin.com')=>new Request('https://work.matiushkin.com/api/contact',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify(body)});
 const ctx={waitUntil:vi.fn()} as unknown as ExecutionContext;
 return {env,ctx,send,request};
}
describe('contact delivery',()=>{
 it('sends once and replays the receipt',async()=>{const s=setup();expect((await contactApi(s.request(),s.env,s.ctx)).status).toBe(202);expect((await contactApi(s.request(),s.env,s.ctx)).status).toBe(200);expect(s.send).toHaveBeenCalledTimes(1)});
 it('does not claim success or resend after an ambiguous failure',async()=>{const s=setup(true);expect((await contactApi(s.request(),s.env,s.ctx)).status).toBe(503);expect((await contactApi(s.request(),s.env,s.ctx)).status).toBe(503);expect(s.send).toHaveBeenCalledTimes(1)});
 it('rejects changed content under the same id',async()=>{const s=setup();await contactApi(s.request(),s.env,s.ctx);expect((await contactApi(s.request({...inquiry,message:'A changed enquiry after original send.'}),s.env,s.ctx)).status).toBe(409);expect(s.send).toHaveBeenCalledTimes(1)});
 it('rejects cross-origin submissions before sending',async()=>{const s=setup();expect((await contactApi(s.request(inquiry,'https://evil.example'),s.env,s.ctx)).status).toBe(403);expect(s.send).not.toHaveBeenCalled()});
 it('rejects oversized requests',async()=>{const s=setup();expect((await contactApi(s.request({...inquiry,message:'a'.repeat(20000)}),s.env,s.ctx)).status).toBe(400);expect(s.send).not.toHaveBeenCalled()});
});

describe('aggregate funnel privacy boundary',()=>{
 const metric=(body:unknown,dnt=false)=>new Request('https://work.matiushkin.com/api/metrics',{method:'POST',headers:{origin:'https://work.matiushkin.com','content-type':'application/json',...(dnt?{dnt:'1'}:{})},body:JSON.stringify(body)});
 for(const event of ['page_view','contact_click','form_view','form_start','form_error'])it('accepts '+event+' without sending mail',async()=>{
  const s=setup();expect((await contactApi(metric({path:'/en',event}),s.env,s.ctx)).status).toBe(204);expect(s.send).not.toHaveBeenCalled();
 });
 for(const body of [{path:'/en',event:'contact_submit'},{path:'/en?email=person@example.com',event:'form_start'},{path:'/en',event:'form_start',email:'person@example.com'},{path:'/en',event:'form_error',message:'Private content'}])it('rejects client success claims or sensitive payload '+JSON.stringify(body),async()=>{
  const s=setup();expect((await contactApi(metric(body),s.env,s.ctx)).status).toBe(422);expect(s.send).not.toHaveBeenCalled();
 });
 it('respects DNT without writing statistics',async()=>{
  const s=setup();s.env.DB={prepare:()=>{throw Error('Must not write')}} as unknown as D1Database;
  expect((await contactApi(metric({path:'/en',event:'form_start'},true),s.env,s.ctx)).status).toBe(204);
 });
});
