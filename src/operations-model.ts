export type OpFile={name:string;table:string;format:'csv'|'json';content:string};
export type OpInput={files:OpFile[]};
export type OpSource={file:string;row:number;format:string;raw:Record<string,unknown>;fields:Record<string,unknown>};
export type OpException={exception_id:string;entity:string;entity_id:string;rule:string;severity:string;reason:string;source:OpSource;expected:string;actual:string;evidence:Record<string,unknown>;recommended_action:string;status:string;deadline:string};
export type OpScenario={id:string;record:string;name:string;expected:string;actual:string;result:string;evidence:{exceptions:OpException[];[key:string]:unknown}};
export type OpRule={id:string;category:string;description:string;severity:string;input_fields:string[];expected_condition:string;action:string};
export type OpReport={run_id:string;timestamp:string;ruleset:string;input_sha256:string;records_checked:number;controls_executed:number;scenario_count:number;passed_scenarios:number;failed_scenarios:number;overall_status:string;exceptions_detected:number;high:number;medium:number;low:number;resolved:number;unresolved:number;artifacts:{input:OpInput;configuration:string;tables:Record<string,Record<string,unknown>[]>;rules:OpRule[];scenarios:OpScenario[];exceptions:OpException[]}};
export const opFilters={severity:'ALL',rule:'ALL',entity:'ALL',search:''};
export function filterExceptions(rows:OpException[],f:typeof opFilters){return rows.filter(r=>(f.severity==='ALL'||r.severity===f.severity)&&(f.rule==='ALL'||r.rule===f.rule)&&(f.entity==='ALL'||r.entity===f.entity)&&JSON.stringify(r).toLocaleLowerCase('pl').includes(f.search.toLocaleLowerCase('pl')));}
