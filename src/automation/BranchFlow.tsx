import {Flow} from './Flow';
import {automationCopy} from './copy';
import {useLocale} from '../locale';
/** Inputs converge on checks; rejected records never pass through target actions. */
export function BranchFlow({input,checks,normal,report}:{input:readonly string[];checks:string;normal:readonly string[];report?:readonly string[]}){
 const c=automationCopy[useLocale()];
 return <div className="branch-flow">
  {input.length>1?<><ul className="parallel-inputs" aria-label={c.stages[0]}>{input.map((source,i)=><li key={i}><strong>{source}</strong></li>)}</ul><div className="input-join" aria-hidden="true">↓</div><Flow label={c.stages[1]} items={[checks]}/></>:<Flow label={c.stages[0]} items={[...input,checks]}/>}
  <div className="flow-branches">
   <section data-flow-branch="normal"><h3>{report?c.matched:c.normalBranch}</h3><Flow label={report?c.matched:c.normalBranch} items={report?[c.matched]:normal}/></section>
   <section data-flow-branch="exceptions"><h3>{c.exceptionBranch}</h3><Flow label={c.exceptionBranch} items={[c.queue,c.human]}/><p>{c.humanReview}</p></section>
  </div>
  {report&&<div className="comparison-report-flow" data-testid="shared-comparison-report"><Flow label={c.readOnly} items={report}/><p>{c.readOnlyNote}</p></div>}
  <p className="flow-audit">{c.auditBoth}</p>
 </div>;
}
