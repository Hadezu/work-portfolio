export type QualityInput={filename:string;format:'csv'|'json';content:string;configuration:'baseline'|'controlled'};
export type QualitySource={file:string;row:number;record_id:string;input_hash:string;position_kind:string};
export type QualityFailure={root_id:string;record_id:string;field:string;rule:string;category:string;entity:string;severity:string;expected:string;actual:string;source:QualitySource;evidence:Record<string,unknown>;scenario_id?:string;scenario_result?:string;expected_rejection?:boolean};
export type QualityField={source:string;target:string;transformation:string;input_type:string;type:string;required:boolean;allowed_null:boolean;rules:string[];allowed_values:string[]|null};
export type QualityEdge={record_id:string;target_field:string;target_value:unknown;expected_value:unknown;transformation:string;normalized_value:unknown;typed_value:unknown;typed_type:string;source_field:string;raw_value:unknown;source:QualitySource;controlled_change:boolean};
export type QualityScenario={id:string;record_id:string;field:string;expected:string;actual:string;result:string;category:string;entity:string;severity:string;evidence:unknown};
export type QualityAggregate={rule:string;expected:unknown;actual:unknown;status:string;accepted_total?:string;grouped_under:string[]};
export type QualityReport={run_id:string;timestamp:string;ruleset:string;input_sha256:string;records_received:number;records_processed:number;accepted:number;rejected:number;quality_checks:number;quality_failures:number;transformation_failures:number;scenario_count:number;passed_scenarios:number;failed_scenarios:number;overall_status:string;artifacts:{input:QualityInput;configuration:string;staging:unknown[];normalized:Record<string,unknown>[];candidate_target:Record<string,unknown>[];target:Record<string,unknown>[];contract:QualityField[];lineage:QualityEdge[];failures:QualityFailure[];rejected:QualityFailure[];negative_rejected:QualityFailure[];scenarios:QualityScenario[];aggregate_controls:QualityAggregate[];rules:{id:string;category:string;condition:string}[]}};
export type QualityComparison={run_a:string;run_b:string;new_failures:{record_id:string;rule:string}[];resolved_failures:{record_id:string;rule:string}[];changed_records:number;changed_fields:number;changes:{record_id:string;field:string;before:unknown;after:unknown}[];metric_differences:Record<string,number>;comparison_scope:string};
export const qualityFilters={status:'ALL',category:'ALL',entity:'ALL',severity:'ALL',search:''};
export function filterQuality(rows:QualityScenario[],f:typeof qualityFilters){return rows.filter(r=>(f.status==='ALL'||r.result===f.status)&&(f.category==='ALL'||r.category===f.category)&&(f.entity==='ALL'||r.entity===f.entity)&&(f.severity==='ALL'||r.severity===f.severity)&&JSON.stringify(r).toLocaleLowerCase('pl').includes(f.search.toLocaleLowerCase('pl')));}
export const qualityValue=(v:unknown)=>v===null?'null':typeof v==='string'?v:JSON.stringify(v);

export type DriftResult={id:string;name:string;status:'PASS'|'FAIL';sourceSchemaVersion:string;mappingVersion:string;targetSchemaVersion:string;field:string;rule:string;expected:string;actual:string;policy:string;quarantined:number;evidence:Record<string,unknown>};
const requiredDriftFields={customer_id:'string',amount:'number',currency:'string',updated_at:'string'} as const;
const driftRows={
 baseline:{customer_id:'C-001',amount:120.5,currency:'PLN',updated_at:'2026-09-16T09:00:00Z'},
 compatible:{customer_id:'C-001',amount:120.5,currency:'PLN',updated_at:'2026-09-16T09:00:00Z',source_note:'optional value'},
 breaking:{client_id:'C-001',amount:'120.50',currency:'PLN',updated_at:'2026-09-16T09:00:00Z'},
};
function inspectDrift(row:Record<string,unknown>,sourceSchemaVersion:string,name:string):DriftResult{
  for(const [field,type] of Object.entries(requiredDriftFields)){
    if(!(field in row))return {id:'DRIFT-BREAKING',name,status:'FAIL',sourceSchemaVersion,mappingVersion:'mapping/customer-amount/2.1',targetSchemaVersion:'target-transaction/1.0',field,rule:'SCHEMA_REQUIRED_FIELD',expected:'field present',actual:'missing',policy:'Breaking drift blokuje akceptację target i kieruje rekord do kwarantanny.',quarantined:1,evidence:{missing:field,row}};
    if(typeof row[field]!==type)return {id:'DRIFT-BREAKING',name,status:'FAIL',sourceSchemaVersion,mappingVersion:'mapping/customer-amount/2.1',targetSchemaVersion:'target-transaction/1.0',field,rule:'SCHEMA_FIELD_TYPE',expected:type,actual:typeof row[field],policy:'Niezgodny typ blokuje przyjęcie znormalizowanych danych.',quarantined:1,evidence:{field,row}};
  }
  const optional=Object.keys(row).filter(k=>!(k in requiredDriftFields));
  return {id:optional.length?'DRIFT-COMPATIBLE':'DRIFT-BASELINE',name,status:'PASS',sourceSchemaVersion,mappingVersion:'mapping/customer-amount/2.1',targetSchemaVersion:'target-transaction/1.0',field:optional[0]??'schema',rule:optional.length?'SCHEMA_OPTIONAL_ADDED':'SCHEMA_BASELINE',expected:optional.length?'optional fields ignored or mapped by policy':'baseline fields present',actual:optional.length?optional.join(', '):'baseline shape',policy:optional.length?'Nowe pole opcjonalne nie przerywa przetwarzania; zostaje opisane jako extra source field.':'Wersje kontraktu i mapowania są zgodne.',quarantined:0,evidence:{row,optionalFields:optional}};
}
export function schemaDriftScenarios():DriftResult[]{
  return [inspectDrift(driftRows.baseline,'source-customer-export/1.0','Baseline schema'),inspectDrift(driftRows.compatible,'source-customer-export/1.1','Compatible drift: optional field'),inspectDrift(driftRows.breaking,'source-customer-export/2.0','Breaking drift: renamed field and type change')];
}
