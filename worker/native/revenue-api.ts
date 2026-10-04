import {revenueCopy} from '../../src/revenue-copy';
import {metricTrace,metrics,moneyText,revenueSources,sumCents,type RevenueRun} from '../../src/revenue-model';
import {startRevenue,advanceRevenue,revenueFixtures} from './revenue';
import {requireInput,type Data} from './common';
import {escapeHtml as esc,reportDocument,reportTable} from './report-html';
import type {ReportRepository} from './storage';

export function revenueEvidence(run:RevenueRun,locale:'en'|'pl'){
  const c=revenueCopy[locale];
  return {...run,report_locale:locale,disclosure:c.disclosure,status_definition:c.passMeaning,limitations:c.limits,
    localized_definitions:c.definitionsText,
    source_row_counts:Object.fromEntries(revenueSources.map(s=>[s,run.facts.filter(f=>f.source===s).length])),
    metrics:Object.fromEntries(metrics.map(m=>[m,{currency:'EUR',cents:metricTrace(run.facts,m).cents,definition:c.definitionsText[m]}])),
    exception_explanations:run.findings.map(f=>({...f,explanation:c.issues[f.code][1],impact:c.issues[f.code][2],suggested_action:c.issues[f.code][3]})),
    excluded_duplicates:run.facts.filter(f=>f.exclusion==='EXACT_DUPLICATE'),
    overlap_handling:run.facts.filter(f=>f.exclusion==='CUTOVER_OVERLAP'),
  };
}
export function revenueHtml(run:RevenueRun,locale:'en'|'pl'){
  const c=revenueCopy[locale],evidence=revenueEvidence(run,locale);
  const amount=(value:string,currency='EUR')=>moneyText(value,locale,currency);
  const summaries=revenueSources.flatMap(source=>{
    const rows=run.facts.filter(f=>f.source===source);
    return [...new Set(rows.map(f=>f.currency))].map(currency=>{const bucket=rows.filter(f=>f.currency===currency);return [c.sourceNames[source]+' · '+currency,bucket.length,bucket.filter(f=>f.included).length,bucket.filter(f=>!f.included).length,amount(sumCents(bucket).toString(),currency),amount(sumCents(bucket.filter(f=>f.included)).toString(),currency)];});
  });
  return reportDocument(c.title,`<h1>${esc(c.title)}</h1><p>${esc(c.disclosure)}</p><h2>${esc(c.model)}: ${esc(run.reconciliation_status)} · ${esc(c.quality)}: ${esc(run.source_quality_status)}</h2><p>${esc(c.passMeaning)}</p><p>Run: ${esc(run.run_id)}<br>${esc(run.generated_at)}<br>SHA-256: ${esc(run.source_hash)}<br>${esc(c.version)}: ${esc(run.mapping_version)}</p><p>${esc(c.reconcileIntro)}</p><h2>${esc(c.definitions)}</h2>${reportTable([c.definitions,c.total,c.explanation],metrics.map(m=>[c.metricNames[m],amount(metricTrace(run.facts,m).cents),c.definitionsText[m]]))}<h2>${esc(c.tabs[0])}</h2>${reportTable([c.source,c.rows,c.included,c.excluded,c.total,c.reconciled],summaries)}<h2>${esc(c.tabs[3])}</h2>${reportTable([c.control,c.expected,c.actual,c.status],run.checks.map(check=>[c.checks[check.id as keyof typeof c.checks]??check.id,check.expected,check.actual,check.status]))}<p>Money controls: integer cents / kontrole kwot: całkowite grosze.</p><h2>${esc(c.tabs[2])}</h2>${reportTable([c.code,c.record,c.explanation,c.impact,c.action],evidence.exception_explanations.map(f=>[f.code,f.record,f.explanation,f.impact,f.suggested_action]))}<h2>${esc(c.reportTitle)}</h2><p>${esc(c.reportIntro)}</p><p>${esc(c.limits)}</p><pre>${esc(JSON.stringify(evidence,null,2))}</pre>`,locale);
}
export async function revenueEndpoint(request:Request,repo:ReportRepository,json:(v:unknown,status?:number)=>Response){
  const url=new URL(request.url),path=url.pathname.slice('/lab-api/revenue-bi/'.length);
  if(request.method==='GET'&&path==='fixture')return json(revenueFixtures());
  if(request.method==='POST'&&path==='start'){const run=startRevenue();await repo.put(run);return json(run);}
  if(request.method==='POST'&&path==='advance'){
    const body=await request.json() as Data;
    requireInput(typeof body.parent==='string'&&typeof body.action==='string','Parent run and action are required');
    const parent=await repo.get('revenue-bi',body.parent) as RevenueRun|null;
    if(!parent)return json({error:'run_expired'},404);
    const run=advanceRevenue(parent,body.action),saved=await repo.get('revenue-bi',run.run_id);
    if(saved)return json(saved);await repo.put(run);return json(run);
  }
  const match=/^runs\/(REV-[a-f0-9-]+)(?:\/(report\.json|report\.html))?$/.exec(path);
  if(request.method==='GET'&&match){
    const run=await repo.get('revenue-bi',match[1]) as RevenueRun|null;
    if(!run)return json({error:'run_expired'},404);
    if(!match[2])return json(run);
    if(run.stage!=='reconciled'||run.reconciliation_status!=='PASS')return json({error:'reconciliation_pass_required'},409);
    const locale=url.searchParams.get('lang')==='pl'?'pl':'en',html=match[2].endsWith('html');
    return new Response(html?revenueHtml(run,locale):JSON.stringify(revenueEvidence(run,locale),null,2),{headers:{'content-type':html?'text/html; charset=utf-8':'application/json; charset=utf-8','content-disposition':`attachment; filename="${run.run_id}-${locale}.${html?'html':'json'}"`,'cache-control':'no-store','x-content-type-options':'nosniff','content-security-policy':"default-src 'none'; style-src 'unsafe-inline'"}});
  }
  return json({error:'not_found'},404);
}
