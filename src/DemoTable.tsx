import type {ReactNode} from 'react';
export function DemoTable({heads,rows,caption}:{heads:string[];rows:ReactNode[][];caption?:string}) {
  return <div className="table-scroll" tabIndex={0}><table>{caption&&<caption>{caption}</caption>}<thead><tr>{heads.map((h,i)=><th key={i} scope="col">{h}</th>)}</tr></thead><tbody>{rows.map((row,i)=><tr key={i}>{row.map((v,j)=><td key={j}>{v}</td>)}</tr>)}</tbody></table></div>;
}
