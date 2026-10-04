type Limiter={limit(options:{key:string}):Promise<{success:boolean}>};
type Gateway={LAB_API:{fetch(request:Request):Promise<Response>};LAB_MUTATIONS:Limiter;LAB_READS:Limiter};
const json=(error:string,status:number)=>new Response(JSON.stringify({error}),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store',...(status===429?{'retry-after':'60'}:{})}});
async function bounded(stream:ReadableStream<Uint8Array>|null,max:number){
 const parts:Uint8Array[]=[];let size=0;
 if(stream){const reader=stream.getReader();try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>max){await reader.cancel();throw new RangeError('size');}parts.push(value);}}finally{reader.releaseLock();}}
 const result=new Uint8Array(size);let offset=0;for(const part of parts){result.set(part,offset);offset+=part.length;}return result;
}
export async function labGateway(request:Request,env:Gateway,localDevelopment=false):Promise<Response>{
 const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return json('cross_origin_rejected',403);
 const localSession=localDevelopment||new URL(request.url).protocol!=='https:';
 const cookieName=localSession?'lab_native_local_session':'__Host-lab_session';
 const existing=request.headers.get('cookie')?.match(new RegExp('(?:^|;\\s*)'+cookieName+'=([a-f0-9]{64})(?:;|$)'))?.[1];
 const session=existing??Array.from(crypto.getRandomValues(new Uint8Array(32)),n=>n.toString(16).padStart(2,'0')).join('');
 const finish=(response:Response)=>{const headers=new Headers(response.headers);headers.set('cache-control','no-store');if(!existing)headers.append('set-cookie',`${cookieName}=${session}; Path=/; ${localSession?'':'Secure; '}HttpOnly; SameSite=Strict; Max-Age=86400`);return new Response(response.body,{status:response.status,headers});};
 try{
  const mutation=!['GET','HEAD'].includes(request.method);const limiter=mutation?env.LAB_MUTATIONS:env.LAB_READS;
  // IP is used only as an in-platform limiter key; not written to demo reports.
  if(!(await limiter.limit({key:'session:'+session})).success||!(await limiter.limit({key:'ip:'+(request.headers.get('cf-connecting-ip')??'local')})).success)return finish(json('rate_limited',429));
  if(Number(request.headers.get('content-length')??0)>1_000_000)return finish(json('payload_too_large',413));
  const body=await bounded(request.body,1_000_000);
  const headers=new Headers(request.headers);headers.delete('cookie');headers.delete('authorization');headers.set('x-lab-session',session);
  const result=await env.LAB_API.fetch(new Request(request.url,{method:request.method,headers,body:body.length?body:undefined}));
  const content=await bounded(result.body,2_000_000);
  return finish(new Response(content,{status:result.status,headers:result.headers}));
 }catch(error){return finish(json(error instanceof RangeError?'payload_or_report_too_large':'lab_backend_unavailable',error instanceof RangeError?413:503));}
}
