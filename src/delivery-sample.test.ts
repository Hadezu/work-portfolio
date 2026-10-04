import {test,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {startMigration,advanceMigration,migrationFixture} from '../worker/native/migration';
import summary from './delivery-sample.json';
import {attributionText} from './inquiry-attribution';
import {pages,productionOrigin} from './metadata';

test('published sitemap contains exactly the indexable page registry without duplicates',()=>{
 const sitemap=readFileSync('public/sitemap.xml','utf8');
 const urls=[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]);
 expect(urls.sort()).toEqual(Object.keys(pages).map(p=>productionOrigin+p).sort());
});

test('published sample agrees with current fixture and migration engine, including selective replay',()=>{
 const saved=JSON.parse(readFileSync('public/samples/migration-evidence.json','utf8'));
 expect(saved.synthetic).toBe(true);
 expect(saved.before.content).toBe(migrationFixture());
 expect(readFileSync('public/samples/synthetic-orders.csv','utf8')).toBe(migrationFixture());
 let run=advanceMigration(advanceMigration(startMigration(migrationFixture(),'synthetic-orders.csv'),'validate'),'mapping',true);
 const before=advanceMigration(advanceMigration(run,'migrate'),'reconcile');
 run=advanceMigration(advanceMigration(advanceMigration(before,'correct'),'replay'),'reconcile');
 expect(before.overall_status).toBe('FAIL');expect(run.overall_status).toBe('PASS');
 expect(summary.before).toEqual(before.totals);expect(summary.after).toEqual(run.totals);
 expect(saved.before.comparisons).toEqual(before.comparisons);expect(saved.after.comparisons).toEqual(run.comparisons);
 expect(summary.replay).toEqual(run.attempts.at(-1));expect(summary.checks).toEqual(run.checks);
 expect(saved.after.totals).toEqual(summary.after);expect(summary.source_hash).toBe(run.input_sha256);
 expect(summary.generated_at).toBe(saved.generated_at);
});
test.each(['en','pl'] as const)('attribution is optional and only accepts listed answers in %s',locale=>{
 expect(attributionText(null,locale)).toBe('');expect(attributionText('0',locale)).toBe('');
 expect(attributionText('<script>',locale)).toBe('');expect(attributionText('99',locale)).toBe('');
 expect(attributionText('2',locale)).toContain('LinkedIn');expect(attributionText('6',locale).length).toBeLessThan(100);
});
