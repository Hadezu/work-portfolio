import {dumps,hash} from './common';
export function sourceEvidence(raw:Record<string,unknown>,file:string,row:number,recordId:string,positionKind:string){
  return {file,row,position_kind:positionKind,record_id:recordId,input_hash:hash(dumps(raw,true))};
}
export function identifierCounts<T>(rows:T[],identifier:(row:T)=>string){
  const counts=new Map<string,number>();
  for(const row of rows){const id=identifier(row);counts.set(id,(counts.get(id)??0)+1);}
  return counts;
}
