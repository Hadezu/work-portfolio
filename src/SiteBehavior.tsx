import {createContext,useContext,useEffect,useState,type ReactNode} from 'react';
import {useLocation} from 'react-router-dom';
import {useLocale} from './locale';

const MotionContext=createContext({available:false,paused:false,toggle:()=>{},setPaused:(_value:boolean)=>{}});
export const useMotionPreferences=()=>useContext(MotionContext);

export function MotionProvider({children}:{children:ReactNode}){
 const [available,setAvailable]=useState(false),[paused,setPaused]=useState(false);
 useEffect(()=>{const media=matchMedia('(prefers-reduced-motion: reduce)');const update=()=>setAvailable(!media.matches);update();media.addEventListener('change',update);return()=>media.removeEventListener('change',update);},[]);
 useEffect(()=>{if(available&&!paused)void import('./site-behavior.css').catch(()=>setPaused(true));},[available,paused]);
 return <MotionContext.Provider value={{available,paused,setPaused,toggle:()=>setPaused(value=>!value)}}>{children}</MotionContext.Provider>;
}

export function MotionToggle(){
 const {available,paused,toggle}=useMotionPreferences(),en=useLocale()==='en';
 return available?<button className="button secondary site-motion-toggle" type="button" onClick={toggle}>{en?(paused?'Resume motion':'Pause motion'):(paused?'Wznów ruch':'Wstrzymaj ruch')}</button>:null;
}

/** Presentation only: no intercepted navigation, request state, or business verdicts. */
export default function SiteBehavior(){
 const {pathname}=useLocation(),{available,paused}=useMotionPreferences(),enabled=available&&!paused;
 useEffect(()=>{
  document.body.dataset.behavior=enabled?'on':'off';
  let main:HTMLElement|null=null;
  const animations=new Set<Animation>();let observed=new WeakSet<Element>();
  const play=(node:Element,distance:number,duration:number,delay=0)=>{
   if(!enabled||document.hidden)return;
   const animation=node.animate([{opacity:.94,transform:`translateY(${distance}px)`},{opacity:1,transform:'translateY(0)'}],{duration,delay,easing:'cubic-bezier(.22,1,.36,1)'});
   animations.add(animation);animation.onfinish=()=>animations.delete(animation);
  };
  const entry=new IntersectionObserver(entries=>{for(const item of entries){if(!item.isIntersecting)continue;const node=item.target as HTMLElement;node.dataset.entered='true';entry.unobserve(node);
   // Screenshots, portrait, tables, statuses and inputs never receive physical entry movement.
   if(node.matches('.proof-feature,.compact-proofs article')){node.querySelectorAll('.proof-heading,.proof-description').forEach((child,i)=>play(child,8,650,i*70));}
   else if(node.matches('.home-start,.contractor-facts,.editorial-contact')){const text=node.querySelector('.about-copy,h2');if(text)play(text,8,650);}
   else if(node.dataset.behaviorSection){const heading=node.querySelector('h2');if(heading)play(heading,6,420);}
  }},{threshold:.12});
  const chapter=new IntersectionObserver(entries=>{for(const item of entries){if(!item.isIntersecting)continue;const node=item.target as HTMLElement;document.body.dataset.chapter=node.dataset.chapter??'page';
   for(const link of document.querySelectorAll('.site-home-anchor,.site-contact')){const current=(link.classList.contains('site-home-anchor')&&node.dataset.chapter==='problem')||(link.classList.contains('site-contact')&&node.dataset.chapter==='contact');if(current)link.setAttribute('aria-current','location');else if(link.getAttribute('aria-current')==='location')link.removeAttribute('aria-current');}
  }},{rootMargin:'-15% 0px -65% 0px'});
  const observe=(node:HTMLElement,name?:string)=>{if(observed.has(node))return;observed.add(node);entry.observe(node);if(name){node.dataset.chapter=name;chapter.observe(node);}};
  const scan=()=>{
   const next=document.querySelector<HTMLElement>('main');if(!next||next===main||next.getAttribute('role')==='status')return;
   main=next;entry.disconnect();chapter.disconnect();observed=new WeakSet();document.body.dataset.chapter=next.classList.contains('portfolio-home')?'intro':'page';
   if(!next.classList.contains('portfolio-home')){
    const heading=next.querySelector('h1');if(heading){const eyebrow=heading.parentElement?.querySelector('.eyebrow');if(eyebrow)play(eyebrow,4,220);play(heading,6,240,40);}
    next.querySelectorAll<HTMLElement>(':scope > section').forEach((node,i)=>{node.dataset.behaviorSection='true';observe(node,node.id||`section-${i+1}`);});
   }
   const sections:Record<string,string>={'.portfolio-hero':'intro','.task-fit':'problem','.buyer-examples':'proof','.home-start':'process','.contractor-facts':'about','.contact-page':'contact'};
   for(const [selector,name]of Object.entries(sections)){if(next.matches(selector))observe(next,name);next.querySelectorAll<HTMLElement>(selector).forEach(node=>observe(node,name));}
   next.querySelectorAll<HTMLElement>('.proof-feature,.compact-proofs article').forEach(node=>observe(node));
   const footer=document.querySelector<HTMLElement>('footer');if(footer)observe(footer,'end');
  };
  scan();const mutation=new MutationObserver(scan);mutation.observe(document.getElementById('root')??document.body,{childList:true,subtree:true});
  const hidden=()=>{if(document.hidden)animations.forEach(animation=>animation.finish());};document.addEventListener('visibilitychange',hidden);
  return()=>{entry.disconnect();chapter.disconnect();mutation.disconnect();animations.forEach(animation=>animation.cancel());document.removeEventListener('visibilitychange',hidden);document.querySelectorAll('[aria-current="location"]').forEach(node=>node.removeAttribute('aria-current'));};
 },[pathname,enabled]);
 return null;
}
