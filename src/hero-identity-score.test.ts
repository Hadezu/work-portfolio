import{describe,it,expect}from'vitest';
import{identityScore,identityOrbit}from'./hero-identity-score';
function luminance(hex:string){const v=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(n=>n<=.04045?n/12.92:((n+.055)/1.055)**2.4);return v[0]*.2126+v[1]*.7152+v[2]*.0722;}
function contrast(a:string,b:string){const x=luminance(a),y=luminance(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
describe('shared identity colour score',()=>{
 it('keeps text and controls readable throughout the whole cycle, even over the brightest halo',()=>{
  for(let t=0;t<96;t+=.25){const {palette:p}=identityScore(t);for(const bg of [p.bg,p.halo])for(const fg of [p.ink,p.accent,p.edge])expect(contrast(fg,bg)).toBeGreaterThanOrEqual(4.5);expect(contrast(p.button,'#10272b')).toBeGreaterThanOrEqual(7);}
 });
 it('returns seamlessly to the opening colour and pose on repeat',()=>{expect(identityScore(96)).toEqual(identityScore(0));expect(identityScore(-1)).toEqual(identityScore(95));const a=identityScore(95.999).palette,b=identityScore(0).palette;expect(a).toEqual(b);});
 it('preserves quiet readable holds between separate depth events',()=>{for(const t of [35,39,43,66,70,72]){const s=identityScore(t);expect(s.emergence).toBe(0);expect(s.unfold).toBe(0);expect(s.perspective).toBe(0);}expect(identityScore(13).emergence).toBe(1);expect(identityScore(54).unfold).toBe(1);});
});

it('return pose and velocity join the opening without a reset',()=>{const before=identityScore(96-.001),after=identityScore(.001);for(const key of ['perspective','emergence','unfold','approach'] as const)expect(Math.abs(before[key]-after[key])).toBeLessThan(.00001);expect(before.returning).toBeCloseTo(1,8);expect(after.returning).toBe(0);expect(identityScore(84).returning).toBeGreaterThan(.3);expect(identityScore(84).returning).toBeLessThan(.7);});

it('orbits sixty degrees to each side with bounded elevation and stable distance',()=>{
 for(const x of [-3,-1,0,1,3])for(const y of [-3,-1,0,1,3]){const p=identityOrbit(x,y,11.5);expect(Math.hypot(p.x,p.y-.2,p.z)).toBeCloseTo(11.5,8);expect(Math.abs(p.yaw)).toBeLessThanOrEqual(Math.PI/3);expect(Math.abs(p.pitch)).toBeLessThanOrEqual(Math.PI/9);expect(p.z).toBeGreaterThan(5);}
 expect(identityOrbit(-1,0,11.5).x).toBeCloseTo(-identityOrbit(1,0,11.5).x);
});
