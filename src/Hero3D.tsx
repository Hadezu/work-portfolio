import {useEffect,useRef,useState} from 'react';
import {useSearchParams} from 'react-router-dom';
import {useLocale} from './locale';
import {useMotionPreferences} from './SiteBehavior';
import {taskIndex} from './task-fit';
import type {createScene} from './hero3d-scene';
import './hero3d.css';
export default function Hero3D(){
 const en=useLocale()==='en',{available,paused}=useMotionPreferences(),[params]=useSearchParams();
 const host=useRef<HTMLDivElement>(null),runtime=useRef<ReturnType<typeof createScene>|null>(null),manualStatic=useRef(false),pauseRef=useRef(paused);
 const [requested,setRequested]=useState(false),[state,setState]=useState<'pending'|'static'|'loading'|'ready'|'error'>('pending');
 const [desktop,setDesktop]=useState(false);
 useEffect(()=>{const query=matchMedia('(min-width:761px) and (pointer:fine)');const update=()=>{setDesktop(query.matches);if(!query.matches){setRequested(false);setState('static');}};update();query.addEventListener('change',update);return()=>query.removeEventListener('change',update);},[]);
 const index=taskIndex(params.get('task')),mode=params.get('task')==='other'?0:[0,1,1,2,0,2][index]??0;const modeRef=useRef(mode);modeRef.current=mode;pauseRef.current=paused;
 useEffect(()=>{
  if(!desktop||manualStatic.current||requested)return;
  if(!available){if(matchMedia('(prefers-reduced-motion: reduce)').matches)setState('static');return;}
  if(paused){setState('static');return;}
  const nav=navigator as Navigator&{deviceMemory?:number;connection?:{saveData?:boolean}};
  if(matchMedia('(max-width:760px)').matches||nav.connection?.saveData||(nav.deviceMemory??8)<4){setState('static');return;}
  setState('pending');
  let timer:ReturnType<typeof setTimeout>|undefined;
  const io=new IntersectionObserver(([entry])=>{clearTimeout(timer);if(entry.isIntersecting)timer=setTimeout(()=>{if(!document.hidden&&!manualStatic.current)setRequested(true);},100);});if(host.current)io.observe(host.current);
  return()=>{io.disconnect();clearTimeout(timer);};
 },[available,paused,requested,desktop]);
 useEffect(()=>{
  if(!available){if(requested)setState('static');return;}if(!requested)return;
  let cancelled=false;setState('loading');
  void Promise.all([import('./hero3d-scene'),import('./hero3d-name')]).then(([{createScene},{createName}])=>{if(cancelled||!host.current)return;runtime.current=createScene(host.current,()=>{runtime.current?.dispose();runtime.current=null;host.current?.parentElement?.classList.remove('ready');manualStatic.current=true;setRequested(false);setState('error');},{expressive:true,sculpture:createName,mobile:!desktop});runtime.current.setMode(modeRef.current);runtime.current.setPaused(pauseRef.current);setState('ready');}).catch(()=>{if(!cancelled){manualStatic.current=true;setRequested(false);setState('error');}});
  return()=>{cancelled=true;runtime.current?.dispose();runtime.current=null;host.current?.replaceChildren();host.current?.parentElement?.classList.remove('ready');};
 },[available,requested,desktop]);
 useEffect(()=>{runtime.current?.setPaused(paused);},[paused]);
 useEffect(()=>{runtime.current?.setMode(mode);},[mode]);
 const interactive=desktop&&state==='ready'&&!paused;
 return <><div className="hero-stage field-stage" data-state={state}><picture><source type="image/avif" srcSet="/editorial/name-iridescent-640.avif 640w, /editorial/name-iridescent-1200.avif 1200w" sizes="(max-width:700px) 100vw, 58vw"/><img src="/editorial/name-iridescent-1200.webp" srcSet="/editorial/name-iridescent-640.webp 640w, /editorial/name-iridescent-1200.webp 1200w" sizes="(max-width:700px) 100vw, 58vw" width="1200" height="800" alt="" fetchPriority="high"/></picture><div ref={host} className="hero-webgl" aria-hidden={interactive?undefined:true} role={interactive?"group":undefined} tabIndex={interactive?0:undefined} aria-label={interactive?(en?"Interactive fragment sculpture":"Interaktywna rzeźba z fragmentów"):undefined} aria-describedby={interactive?"hero-assembly-help":undefined}/></div><div className="hero-3d-controls">{available&&(state==='static'||state==='error')&&<button type="button" onClick={()=>{manualStatic.current=false;setRequested(true);}}>{desktop?(en?'Explore in 3D':'Zobacz w 3D'):(en?'Play 3D animation':'Włącz animację 3D')}</button>}{state==='ready'&&<button type="button" onClick={()=>{manualStatic.current=true;setRequested(false);setState('static');}}>{en?'Static image':'Obraz statyczny'}</button>}{desktop&&state==='ready'&&!paused&&<span className="hero-assembly-hint" aria-hidden="true">{en?'Hold a fragment — watch the rest assemble':'Przytrzymaj fragment — reszta się składa'}</span>}{!desktop&&state==='ready'&&<span className="hero-touch-hint">{en?'Swipe sideways to rotate':'Przesuń w bok, aby obrócić'}</span>}{interactive&&<span id="hero-assembly-help" className="hero-assembly-help">{en?'Hold a fragment while the others assemble without it. Keyboard: Enter to grab, arrows to move, Enter to release, Escape to restore.':'Przytrzymaj fragment, a pozostałe złożą się bez niego. Klawiatura: Enter chwyta, strzałki przesuwają, Enter puszcza, Escape przywraca.'}</span>}<span role="status">{(state==='loading'||(desktop&&state==='pending'))?(en?'Loading 3D…':'Ładowanie 3D…'):state==='error'?(en?'3D unavailable. Static image retained.':'3D niedostępne. Pozostaje obraz statyczny.'):''}</span></div></>;
}
