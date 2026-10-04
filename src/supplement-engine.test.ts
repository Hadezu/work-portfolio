import {test,expect} from 'vitest';
import {supplement,validateHl7,validateDicom} from './supplement-engine';
for(const kind of ['async','healthcare'] as const){test(kind+' baseline, single regression and restoration',async()=>{expect((await supplement(kind)).failed).toBe(0);const bad=await supplement(kind,true);expect(bad.failed).toBe(1);expect(bad.checks.filter(c=>c.status==='FAIL')[0].evidence).toBeTruthy();expect((await supplement(kind)).status).toBe('PASS');});}
test('malformed healthcare subsets reject',()=>{expect(validateHl7('garbage')).toBe('REJECT');expect(validateDicom({},new Set())).toBe('REJECT');});
