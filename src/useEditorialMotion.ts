import {useMotionPreferences} from './SiteBehavior';
import {useEffect,type RefObject} from 'react';

/** Progressive enhancement: readable static DOM is always the fallback. */
export function useEditorialMotion(root:RefObject<HTMLElement|null>){
 const {available,paused,toggle,setPaused}=useMotionPreferences();
 useEffect(()=>{
  const el=root.current;if(!el)return;
  const stages=['.portfolio-hero','.task-fit','.buyer-examples'].map(selector=>el.querySelector(selector)!);
  const observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting)el.dataset.phase=['source','structure','verify'][stages.indexOf(entry.target)];},{rootMargin:'-20% 0px -60% 0px'});
  stages.forEach(node=>observer.observe(node));return()=>observer.disconnect();
 },[root]);
 useEffect(()=>{
  const el=root.current;if(!el||!available||paused)return;
  void import('./editorial-motion.css').catch(()=>setPaused(true));
  const hero=el.querySelector<HTMLElement>('.portfolio-hero')!,picture=el.querySelector<HTMLElement>('.hero-material picture')!;
  const fine=matchMedia('(hover:hover) and (pointer:fine)');let visible=false,frame=0;
  const running=()=>{el.dataset.ambient=visible&&!document.hidden?'on':'off';};
  const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;running();},{threshold:.05});observer.observe(hero);
  document.addEventListener('visibilitychange',running);
  const reset=()=>{picture.style.removeProperty('--mx');picture.style.removeProperty('--my');};
  const pointer=(event:PointerEvent)=>{if(!fine.matches||!visible||document.hidden)return;cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{const r=hero.getBoundingClientRect();picture.style.setProperty('--mx',`${Math.max(-4,Math.min(4,(event.clientX-r.left)/r.width*8-4))}px`);picture.style.setProperty('--my',`${Math.max(-3,Math.min(3,(event.clientY-r.top)/r.height*6-3))}px`);});};
  hero.addEventListener('pointermove',pointer);hero.addEventListener('pointerleave',reset);fine.addEventListener('change',reset);
  const index=el.querySelector<HTMLElement>('.task-fit')!;
  const activate=(event:Event)=>{const button=(event.target as HTMLElement).closest<HTMLButtonElement>('.task-options button');if(!button)return;const buttons=[...index.querySelectorAll('.task-options button')];el.style.setProperty('--signal',String(buttons.indexOf(button)/Math.max(1,buttons.length-1)));};
  const selected=()=>{const buttons=[...index.querySelectorAll('.task-options button')];el.style.setProperty('--signal',String(Math.max(0,buttons.findIndex(b=>b.getAttribute('aria-pressed')==='true'))/Math.max(1,buttons.length-1)));};selected();index.addEventListener('pointerleave',selected);
  index.addEventListener('pointerover',activate);index.addEventListener('focusin',activate);index.addEventListener('click',activate);
  return()=>{observer.disconnect();cancelAnimationFrame(frame);document.removeEventListener('visibilitychange',running);hero.removeEventListener('pointermove',pointer);hero.removeEventListener('pointerleave',reset);fine.removeEventListener('change',reset);index.removeEventListener('pointerleave',selected);index.removeEventListener('pointerover',activate);index.removeEventListener('focusin',activate);index.removeEventListener('click',activate);el.getAnimations({subtree:true}).forEach(animation=>animation.cancel());delete el.dataset.ambient;el.style.removeProperty('--signal');reset();};
 },[root,available,paused]);
 return {available,paused,toggle};
}
