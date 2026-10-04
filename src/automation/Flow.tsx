export function Flow({items,active=-1,label}:{items:readonly string[];active?:number;label:string}){
 return <ol className="automation-flow" aria-label={label}>{items.map((item,i)=><li className={active>=i?'is-complete':''} key={i}><span className="flow-number" aria-hidden="true">{active>=i?'✓':String(i+1).padStart(2,'0')}</span><strong>{item}</strong>{i<items.length-1&&<span className="flow-arrow" aria-hidden="true">→</span>}</li>)}</ol>;
}
