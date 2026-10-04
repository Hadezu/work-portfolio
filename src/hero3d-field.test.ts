import {describe,it,expect} from 'vitest';
import {fieldScore} from './hero3d-field-score';
describe('Field of Alignment choreography',()=>{
 it('every fragment reaches the same quiet ordered interval',()=>{
  for(let rank=0;rank<=1;rank+=.1)for(const t of [12,13,14,15])expect(fieldScore(t,rank).coherence).toBe(1);
 });
 it('aligns progressively, and releases in the opposite spatial order',()=>{
  expect(fieldScore(6,0).coherence).toBeGreaterThan(fieldScore(6,1).coherence);
  expect(fieldScore(20,0).coherence).toBeGreaterThan(fieldScore(20,1).coherence);
 });
 it('repeats the score with continuous position inputs at the seam',()=>{
  for(let t=0;t<30;t+=.5)expect(fieldScore(t+30,.4)).toEqual(fieldScore(t,.4));
  expect(fieldScore(29.999,.5).coherence).toBe(0);expect(fieldScore(0,.5).coherence).toBe(0);
  expect(Math.sin(fieldScore(29.999,.5).arc)).toBeCloseTo(Math.sin(fieldScore(0,.5).arc),3);
 });
 it('never exceeds geometric blend limits',()=>{
  for(let t=0;t<30;t+=.1)for(const rank of [0,.5,1]){const s=fieldScore(t,rank);expect(s.coherence).toBeGreaterThanOrEqual(0);expect(s.coherence).toBeLessThanOrEqual(1);}
 });
});

import {agreementScore} from './hero3d-field-score';
describe('Agreement trace and super-cycle',()=>{
 it('traces only after all layers agree, then becomes quiet before release',()=>{
  for(const t of [0,7,11,16,22,29])expect(agreementScore(t).traceOpacity).toBe(0);
  expect(agreementScore(13).traceOpacity).toBeGreaterThan(0);
  expect(agreementScore(14).trace).toBeGreaterThan(agreementScore(13).trace);
 });
 it('varies search smoothly without a jump at the 30-second boundary',()=>{
  expect(agreementScore(29.999).variation).toBeCloseTo(agreementScore(30).variation,3);
  expect(agreementScore(3).variation).not.toBeCloseTo(agreementScore(33).variation,2);
  expect(agreementScore(3).variation).toBeCloseTo(agreementScore(93).variation,8);
 });
});
