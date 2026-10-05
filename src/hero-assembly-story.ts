import {MathUtils, Vector3} from 'three';

export type AssemblyStory='recover'|'bridge'|'relay';
/** Branch from the ambient score, not from random numbers or pointer speed. */
export function assemblyStoryAt(time:number):AssemblyStory {
  const t=((time%96)+96)%96;
  return t<24||t>=73?'recover':t<44?'bridge':'relay';
}

/** Continuous choreography: gather, try an alternative route, gather again.
 * A periodic envelope has zero velocity at the seam; there is no timed reset.
 */
export function storyTarget(story:AssemblyStory,age:number,index:number,rest:Vector3,out:Vector3) {
  const entrance=MathUtils.smoothstep(age,0,.45);
  const phase=age*Math.PI*2/5.6;
  const open=(1-Math.cos(phase))*.5*entrance;
  const wave=Math.sin(phase+rest.x*.8);
  if(story==='recover') {
    const angle=wave*.25*open,x=out.x,y=out.y;
    out.x=x*Math.cos(angle)-y*Math.sin(angle);
    out.y=x*Math.sin(angle)+y*Math.cos(angle)+Math.sin(rest.x*1.3+phase)*.35*open;
    out.z+=Math.cos(rest.x+phase)*.8*open;
  }else if(story==='bridge') {
    // Separate upper/lower strokes, then close the gap by a travelling wave.
    const side=rest.y>=0?1:-1;
    out.y+=side*.5*open;
    out.x+=Math.sin(phase+rest.y*2)*.36*open;
    out.z+=Math.sin(rest.x*1.1-phase)*.65*open;
  }else {
    // Four interleaved fragment lanes pass the transformation along the text.
    const lane=index%4-1.5;
    out.y+=Math.sin(rest.x*.9-phase+lane*.6)*.65*open;
    out.z+=lane*.38*open+Math.cos(rest.x-phase)*.35*open;
    out.x+=Math.cos(phase+lane)*.22*open;
  }
  return out;
}
