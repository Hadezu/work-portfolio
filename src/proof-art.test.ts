import {test,expect} from 'vitest';
import {proofArtData as d} from './proof-art-data';
import {startMigration,migrationFixture,advanceMigration} from '../worker/native/migration';
import {startRevenue,advanceRevenue} from '../worker/native/revenue';
import {metricTrace} from './revenue-model';
test('migration artwork remains tied to the real synthetic recovery scenario',()=>{
 let r=startMigration(migrationFixture(),'synthetic.csv');r=advanceMigration(r,'validate');r=advanceMigration(r,'mapping',true);r=advanceMigration(r,'migrate');
 expect(r.rows.length).toBe(d.migration.source);expect(r.target.length).toBe(d.migration.before);expect(r.exceptions.map(e=>e.record)).toEqual(d.migration.replayed);
 r=advanceMigration(r,'reconcile');r=advanceMigration(r,'correct');r=advanceMigration(r,'replay');r=advanceMigration(r,'reconcile');expect(r.target.length).toBe(d.migration.after);expect(r.totals?.source_gross).toBe(d.migration.total);expect(r.totals?.target_gross).toBe(d.migration.total);expect(r.overall_status).toBe('PASS');
});
test('revenue artwork shows a mapping correction, calculated by the revenue engine',()=>{
 const before=startRevenue(),after=advanceRevenue(advanceRevenue(before,'map_customer'),'reconcile');
 expect(Number(metricTrace(before.facts,'reported').cents)).toBe(d.revenue.before);expect(Number(metricTrace(after.facts,'reported').cents)).toBe(d.revenue.after);expect(d.revenue.after-d.revenue.before).toBe(d.revenue.delta);
});
