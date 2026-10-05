import {it,expect} from 'vitest';
import {completionGlint,neighbourResponse,spareReturn} from './hero-assembly-response';

it('acknowledges the nearby gap, then closes it in sequence without moving distant pieces',()=>{
  expect(neighbourResponse(.3,.1).notice).toBeGreaterThan(.8);
  expect(neighbourResponse(.3,3).notice).toBeLessThan(.001);
  expect(neighbourResponse(.8,.1).closure).toBeGreaterThan(neighbourResponse(.8,1).closure);
  expect(neighbourResponse(3,.1).notice).toBe(0);
  expect(neighbourResponse(3,.1).closure).toBeGreaterThan(.9);
});
it('uses one short smooth glint with no repeating pulse',()=>{
  expect([-.1,0,.85,1,10].map(completionGlint)).toEqual([0,0,0,0,0]);
  expect(completionGlint(.425)).toBeCloseTo(1);
  expect(completionGlint(.001)).toBeLessThan(.001);
  expect(completionGlint(.849)).toBeLessThan(.001);
});
it('aligns the spare before translating and ends both blends exactly',()=>{
  const early=spareReturn(.2);expect(early.rotation).toBeGreaterThan(0);expect(early.position).toBe(0);
  expect(spareReturn(.65).rotation).toBe(1);expect(spareReturn(.65).position).toBeLessThan(.5);
  expect(spareReturn(1.2)).toEqual({rotation:1,position:1});
});
