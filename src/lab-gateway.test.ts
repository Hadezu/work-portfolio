import {expect,it} from 'vitest';
import {labGateway} from '../worker/lab-gateway';
const allow={limit:async()=>({success:true})};
it('forwards an opaque session internally and returns API JSON',async()=>{
 let seen:Request|undefined;
 const response=await labGateway(new Request('https://work.matiushkin.com/lab-api/data-quality/fixtures',{headers:{'x-lab-session':'forged'}}),{LAB_API:{fetch:async r=>{seen=r;return Response.json({fixture:true});}},LAB_MUTATIONS:allow,LAB_READS:allow});
 expect(response.status).toBe(200);expect(await response.json()).toEqual({fixture:true});expect(seen?.headers.get('x-lab-session')).toMatch(/^[a-f0-9]{64}$/);expect(response.headers.get('set-cookie')).toContain('Secure; HttpOnly; SameSite=Strict');
});
it('returns deterministic rate limit JSON without calling backend',async()=>{
 const response=await labGateway(new Request('https://work.matiushkin.com/lab-api/run',{method:'POST'}),{LAB_API:{fetch:async()=>{throw Error('must not call');}},LAB_MUTATIONS:{limit:async()=>({success:false})},LAB_READS:allow});
 expect(response.status).toBe(429);expect(await response.json()).toEqual({error:'rate_limited'});
});
it('rejects oversized input and cross-origin mutations',async()=>{
 const env={LAB_API:{fetch:async()=>Response.json({})},LAB_MUTATIONS:allow,LAB_READS:allow};
 expect((await labGateway(new Request('https://work.matiushkin.com/lab-api/run',{method:'POST',body:'x'.repeat(1_000_001)}),env)).status).toBe(413);
 expect((await labGateway(new Request('https://work.matiushkin.com/lab-api/run',{method:'POST',headers:{origin:'https://example.invalid'}}),env)).status).toBe(403);
});
