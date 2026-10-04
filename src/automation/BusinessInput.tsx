import type {Locale} from '../locale';
import type {DemoRecord,ReferenceRecord,Run} from './engine';
import {businessCopy,businessRecord,financeStatus} from './business';

/** Domain views use the same records consumed by the simulator. No successful result is invented here. */
export function BusinessInput({locale,industry,input,reference,run}:{locale:Locale;industry:string;input:DemoRecord[];reference:ReferenceRecord[];run:Run|null}){
 const c=businessCopy[locale],headers=industry==='finance'?c.financeHeaders:industry==='services'?c.servicesHeaders:c.logisticsHeaders;
 return <table><thead><tr>{headers.map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{input.map(r=>{
 const payment=reference.find(b=>b.reference===r.reference),accepted=run?.accepted.some(a=>a.id===r.id);
 const cells=industry==='finance'?[r.reference,`DEMO ${r.reference.slice(-3)}`,r.value.toFixed(2),payment?.value.toFixed(2)??'—','PLN',payment?'2026-09-15':'—',financeStatus(locale,r,run)]:industry==='services'?[businessRecord(r,industry),r.reference||c.missing,c.enquiry,r.approved?c.yes:c.no,r.valid?c.owner:c.missing]:[businessRecord(r,industry),r.reference||c.missing,r.status==='delivered'?c.delivered:r.status==='missing'?c.missing:c.deliveryException,`${r.value} / ${r.expected}`,run?(accepted?`${c.dispatched} → ${c.orderDelivered}`:c.held):c.dispatched];
 return <tr key={r.id}>{cells.map((value,i)=>i===0?<th scope="row" key={i}>{value}</th>:<td key={i}>{value}</td>)}</tr>;
 })}</tbody></table>;
}
