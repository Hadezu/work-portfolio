import {describe,it,expect} from 'vitest';
import {sculptureCycle} from './hero3d-cycle';
describe('decorative sculpture cycle',()=>{
 it('repeats without a boundary jump',()=>{
  for(let t=0;t<24;t+=.25) expect(sculptureCycle(t+24)).toEqual(sculptureCycle(t));
  expect(sculptureCycle(24-.0001).coherence).toBe(sculptureCycle(24).coherence);
 });
 it('holds a clearly ordered state before releasing',()=>{
  expect(sculptureCycle(0).coherence).toBe(0);
  for(const t of [10,11,12,13.99]) expect(sculptureCycle(t)).toEqual({coherence:1,phase:'ordered'});
  expect(sculptureCycle(18).coherence).toBe(.5);
  expect(sculptureCycle(22).coherence).toBe(0);
 });
 it('stays bounded and continuous across every transition',()=>{
  for(let t=0;t<48;t+=.01){const x=sculptureCycle(t).coherence;expect(x).toBeGreaterThanOrEqual(0);expect(x).toBeLessThanOrEqual(1);}
  for(const t of [3,10,14,22,24]) expect(Math.abs(sculptureCycle(t-.0001).coherence-sculptureCycle(t+.0001).coherence)).toBeLessThan(.00001);
 });
});
