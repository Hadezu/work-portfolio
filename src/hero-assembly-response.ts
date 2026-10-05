import {MathUtils} from 'three';

/** A nearby acknowledgement, followed by a staggered, quiet closure. */
export function neighbourResponse(age:number,distance:number){
  const locality=Math.exp(-distance*distance/1.2);
  const localAge=age-distance*.12;
  const notice=MathUtils.smoothstep(localAge,0,.18)*(1-MathUtils.smoothstep(localAge,.3,.85))*locality;
  const closure=MathUtils.smoothstep(localAge,.25,1.8)*locality;
  return {notice,closure};
}

/** Turn into alignment first, then join the moving sculpture. */
export function spareReturn(seconds:number){
  return {rotation:MathUtils.smoothstep(seconds,0,.65),position:MathUtils.smoothstep(seconds,.22,1.2)};
}
export function completionGlint(seconds:number){
  return seconds<=0||seconds>=.85?0:Math.sin(seconds/.85*Math.PI)**2;
}
