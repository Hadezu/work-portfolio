import {expect,test} from 'vitest';
import {taskRoutes,taskIndex,taskFit} from './task-fit';
import {exampleContext} from './BuyerJourney';
import {pages} from './metadata';
test('unknown task parameters select the safe first example',()=>{
 expect(taskIndex(null)).toBe(0);expect(taskIndex('https://evil.test')).toBe(0);
});
test.each(taskRoutes)('$id has a localized proof and preserved contact context',route=>{
 expect(taskRoutes[taskIndex(route.id)]).toEqual(route);
 for(const locale of ['pl','en'] as const){
  const context=exampleContext(route.proof,locale);
  expect(context?.service).toBe(route.service);
  expect(pages[(locale==='en'?'/en':'')+'/'+route.secondary]).toBeDefined();
  expect(taskFit[locale].items[taskIndex(route.id)].limits.length).toBeGreaterThan(50);
 }
});
