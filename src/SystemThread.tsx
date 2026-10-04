import {useLocale} from './locale';
import {editorialCopy} from './editorial-copy';

/** Narrative position, never a claim that a demo or enquiry has passed. */
export function SystemThread({stage}:{stage:'structure'|'verify'}){
 const c=editorialCopy[useLocale()];
 return <div className="system-thread" data-stage={stage} aria-hidden="true">{[c.source,c.structure,c.verify].map((label,i)=><span key={label} data-active={i===(stage==='structure'?1:2)}>{String(i+1).padStart(2,'0')} / {label}</span>)}</div>;
}
