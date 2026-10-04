/** Exact dimension filters shared by diagnostic tables and BI facts. */
export function matchesDimensions<T>(row:T,filters:Record<string,string>,value:(row:T,key:string)=>string){
  return Object.entries(filters).every(([key,selected])=>!selected||selected==='ALL'||value(row,key)===selected);
}
