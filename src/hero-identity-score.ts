import {identityEase as ease} from './hero-identity-morph';
/** Decorative colour/pose score, in seconds. No business status is encoded here. */
export const IDENTITY_CYCLE_SECONDS=96;
// Desktop completes the same continuous score in 40 s; mobile keeps its original pace.
export const identityPlaybackTime=(seconds:number,interactive:boolean)=>seconds*(interactive?2.4:1);
const colours = [
 {at:0,bg:'#112b2c',halo:'#214547',ink:'#f4f3eb',accent:'#e6b18a',button:'#e4e8da',edge:'#a9c9bf'},
 {at:24,bg:'#20322e',halo:'#3c5146',ink:'#f5f3e9',accent:'#edc6a6',button:'#e7e6d5',edge:'#bdcdb5'},
 {at:34,bg:'#302821',halo:'#504036',ink:'#f5f2ec',accent:'#efc29a',button:'#eaded0',edge:'#dac5ab'},
 {at:44,bg:'#302821',halo:'#504036',ink:'#f5f2ec',accent:'#efc29a',button:'#eaded0',edge:'#dac5ab'},
 {at:65,bg:'#1b3035',halo:'#304950',ink:'#f1f3ed',accent:'#e6bc98',button:'#dbe6de',edge:'#accbc9'},
 {at:73,bg:'#1b3035',halo:'#304950',ink:'#f1f3ed',accent:'#e6bc98',button:'#dbe6de',edge:'#accbc9'},
 {at:96,bg:'#112b2c',halo:'#214547',ink:'#f4f3eb',accent:'#e6b18a',button:'#e4e8da',edge:'#a9c9bf'},
] as const;
function mix(a:string,b:string,p:number){return '#'+[1,3,5].map(i=>Math.round(parseInt(a.slice(i,i+2),16)*(1-p)+parseInt(b.slice(i,i+2),16)*p).toString(16).padStart(2,'0')).join('');}
export function identityScore(seconds:number){
 const t=((seconds%IDENTITY_CYCLE_SECONDS)+IDENTITY_CYCLE_SECONDS)%IDENTITY_CYCLE_SECONDS;
 const end=colours.findIndex(c=>c.at>t),a=colours[end-1],b=colours[end],p=ease(a.at,b.at,t);
 const palette={bg:mix(a.bg,b.bg,p),halo:mix(a.halo,b.halo,p),ink:mix(a.ink,b.ink,p),accent:mix(a.accent,b.accent,p),button:mix(a.button,b.button,p),edge:mix(a.edge,b.edge,p)};
 return {t,palette,
  returning:ease(73,96,t),
  perspective:1-ease(18,33,t)+ease(73,96,t),
  emergence:ease(6,11,t)*(1-ease(17,24,t)),
  unfold:ease(44,50,t)*(1-ease(59,65,t)),
  approach:ease(27,34,t)*(1-ease(44,49,t)),
 };
}

/** Bounded camera orbit, not a screen-space wobble. */
export function identityOrbit(x:number,y:number,radius:number){
 const yaw=Math.max(-1,Math.min(1,x))*Math.PI/3;
 const pitch=-Math.max(-1,Math.min(1,y))*Math.PI/9;
 return {yaw,pitch,x:Math.sin(yaw)*Math.cos(pitch)*radius,y:Math.sin(pitch)*radius+.2,z:Math.cos(yaw)*Math.cos(pitch)*radius};
}
