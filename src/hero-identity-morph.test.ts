import{describe,it,expect}from'vitest';import{equalizeTriangles,identityEase,fragmentTiming}from'./hero-identity-morph';
describe('identity geometry',()=>{
 it('subdivision preserves triangle surface area',()=>{const a=[0,0,0,2,0,0,0,2,0],out=equalizeTriangles(a,13);let area=0;for(let i=0;i<out.length;i+=9)area+=Math.abs((out[i+3]-out[i])*(out[i+7]-out[i+1])-(out[i+4]-out[i+1])*(out[i+6]-out[i]))/2;expect(out.length).toBe(117);expect(area).toBeCloseTo(2);});
 it('rejects empty topology instead of fabricating a fragment',()=>expect(()=>equalizeTriangles([],1)).toThrow());
 it('holds exact endpoint poses with bounded interpolation',()=>{expect(identityEase(34,50,33)).toBe(0);expect(identityEase(34,50,51)).toBe(1);expect(identityEase(34,50,42)).toBe(.5);});
});

it('arrival waves are staggered and preserve three late pieces',()=>{const timings=Array.from({length:107},(_,i)=>fragmentTiming(i,107));expect(timings.filter(t=>t.late)).toHaveLength(3);expect(Math.max(...timings.map(t=>t.buildStart))-Math.min(...timings.map(t=>t.buildStart))).toBeGreaterThan(12);expect(timings.every(t=>t.alignEnd<=34&&t.transitEnd<65)).toBe(true);});
