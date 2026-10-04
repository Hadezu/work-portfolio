import {describe,it,expect} from 'vitest';
import {renderToStaticMarkup} from './test-render';
import {ErpMappings,ErpSummary,ErpTable} from './ErpViews';
import {EvidenceView} from './WorkflowViews';
import {filterErp,initialErpFilters,type ErpReport,type ErpScenario} from './erp-model';
const row:ErpScenario={id:'mapping.ord104',name:'Mapowanie',entity:'OrderLine',expected:'created',actual:'missing_mapping',status:'FAIL',severity:'high',evidence:{source_id:'ORD-104/L1',source_value:'SKU-X99'}};
describe('ERP acceptance presentation',()=>{
  it('distinguishes test failure from expected business rejection',()=>{const html=renderToStaticMarkup(<ErpTable rows={[row,{...row,id:'mapping.missing',expected:'missing_mapping',status:'PASS'}]} onEvidence={()=>{}}/>);expect(html).toContain('wf-fail');expect(html).toContain('wf-pass');expect(html).toContain('missing_mapping');});
  it('filters status, entity, rule, severity and evidence',()=>{expect(filterErp([row],{...initialErpFilters,status:'FAIL',entity:'OrderLine',rule:'mapping',severity:'high',search:'sku-x99'})).toHaveLength(1);for(const key of ['status','entity','rule','severity','search'])expect(filterErp([row],{...initialErpFilters,[key]:'unknown'})).toHaveLength(0);});
  it('renders measurable report and Polish singular',()=>{const report={overall_status:'FAIL',scenario_count:16,passed_scenarios:15,failed_scenarios:1,discrepancy_count:1,exceptions:1,reconciliation_differences:1} as ErpReport;const html=renderToStaticMarkup(<ErpSummary report={report}/>);expect(html).toContain('16 scenariuszy');expect(html).toContain('1 rozbieżność');expect(html).toContain('erp-overall');});
  it('identifies the missing lookup instead of hiding the mapping',()=>{const report={artifacts:{mappings:[{kind:'customer',source:'C-001',target:'B-C1'},{kind:'product',source:'SKU-001',target:'B-P1'}],configuration:'controlled'}} as ErpReport;const html=renderToStaticMarkup(<ErpMappings report={report} onEvidence={()=>{}}/>);expect(html).toContain('BRAK MAPOWANIA');expect(html).toContain('SKU-X99');expect(html).toContain('version.conflict');});
  it('escapes evidence and preserves structured detail',()=>{const html=renderToStaticMarkup(<EvidenceView value={{...row.evidence,reason:'<script>alert(1)</script>'}}/>);expect(html).toContain('ORD-104/L1');expect(html).not.toContain('<script>');});
});
