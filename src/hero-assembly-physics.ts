import {MathUtils, Vector3} from 'three';
import {storyTarget,type AssemblyStory} from './hero-assembly-story';
import {neighbourResponse} from './hero-assembly-response';

export type AssemblyForm = 'core' | 'arc' | 'chain' | 'spire';
export type AssemblyBond = {a:number;b:number;rest:number};
type Particle = {position:Vector3;velocity:Vector3;home:Vector3;rest:Vector3;target:Vector3;mass:number;signal:number};
const bounds = new Vector3(3.45, 2.05, 1.65);
const lowerBounds = bounds.clone().negate();
const delta = new Vector3(), force = new Vector3(), origin = new Vector3();
const storyOrigin=new Vector3();
const clamp = (v:Vector3) => v.clamp(lowerBounds, bounds);

/** Art-directed spring system, not a rigid-body or engineering simulation.
 * Fixed substeps, bounded energy and hysteresis keep pointer input predictable.
 * Bonds are real solver constraints; broken bonds can reconnect to new neighbours.
 */
export class AssemblyPhysics {
  readonly nodes:Particle[];
  readonly bonds:AssemblyBond[]=[];
  held = -1;
  anchor = 0;
  form:AssemblyForm = 'core';
  broken = 0;
  reconnected = 0;
  energy = 0;
  age = 0;
  strength = 0;
  twist = 0;
  private elapsed = 0;
  private topologyTime = 0;
  private inputTime = 0;
  private pointer = new Vector3();
  private grabOrigin = new Vector3();
  private dragVelocity = new Vector3();
  private cooldowns = new Map<string,number>();
  private start = new Vector3();
  private followsLiveScore=false;

  followTargets(points:Vector3[]){
    // Carry the shared choreography forward exactly; springs solve only the
    // interaction offset, so moving glyphs cannot shear through solver lag.
    points.forEach((point,i)=>{
      const node=this.nodes[i];if(!node)return;
      if(this.followsLiveScore&&i!==this.held)node.position.add(delta.copy(point).sub(node.rest));
      node.rest.copy(point);
    });
    this.followsLiveScore=true;
  }

  constructor(points:Vector3[],restPoints?:Vector3[],readonly story:AssemblyStory|null=null) {
    this.nodes=points.map((p,i)=>({position:p.clone(),home:p.clone(),rest:restPoints?.[i]?.clone()??p.clone().multiplyScalar(.62),target:p.clone(),velocity:new Vector3(),mass:i%7===0?1.7:i%3===0?1.2:.85,signal:0}));
    // A sparse nearest-neighbour graph, with a degree bound (no all-to-all forces).
    for(let i=0;i<points.length;i++) {
      const near=points.map((p,j)=>({j,d:p.distanceToSquared(points[i])})).filter(x=>x.j!==i).sort((a,b)=>a.d-b.d);
      for(const {j} of near.slice(0,2)) if(!this.hasBond(i,j)) this.bonds.push({a:i,b:j,rest:Math.max(.12,points[i].distanceTo(points[j]))});
    }
  }
  private hasBond(a:number,b:number){return this.bonds.some(x=>x.a===a&&x.b===b||x.a===b&&x.b===a);}
  private bondKey(a:number,b:number){return `${Math.min(a,b)}:${Math.max(a,b)}`;}
  grab(index:number) {
    if(!this.nodes[index]) return;
    this.held=this.anchor=index;this.age=0;
    this.pointer.copy(this.nodes[index].position);this.grabOrigin.copy(this.pointer);
    this.start.copy(this.pointer);this.dragVelocity.set(0,0,0);
    this.nodes.forEach(n=>{n.signal=0;});this.nodes[index].signal=1;
    // The held fragment is unavailable to the assembly, even before the first move.
    // Bridge its neighbours so the remaining structure can close the missing slot.
    this.strength=1;
    const neighbours=this.bonds.filter(b=>b.a===index||b.b===index).map(b=>b.a===index?b.b:b.a);
    for(let k=this.bonds.length-1;k>=0;k--)if(this.bonds[k].a===index||this.bonds[k].b===index){this.bonds.splice(k,1);this.broken++;}
    for(let k=1;k<neighbours.length;k++){
      const a=neighbours[k-1],b=neighbours[k];
      if(!this.hasBond(a,b)){this.bonds.push({a,b,rest:Math.max(.12,this.nodes[a].position.distanceTo(this.nodes[b].position))});this.reconnected++;}
    }
  }
  move(point:Vector3,dt:number) {
    if(this.held<0||![point.x,point.y,point.z].every(Number.isFinite))return;
    const next=clamp(point.clone());
    this.dragVelocity.copy(next).sub(this.pointer).divideScalar(Math.max(.016,dt)).clampLength(0,5);
    const old=delta.copy(this.pointer).sub(this.start);
    const nextDelta=next.clone().sub(this.start);
    this.twist=MathUtils.clamp(this.twist+(old.x*nextDelta.y-old.y*nextDelta.x)*.16,-.65,.65);
    this.pointer.copy(next);
    this.inputTime=this.elapsed;
    const displacement=next.distanceTo(this.grabOrigin);
    this.strength=Math.max(this.strength,MathUtils.smoothstep(displacement,.12,1.2));
    // Wide enter/exit thresholds avoid flicker around a form boundary.
    if(next.y>1.15)this.form='spire';
    else if(Math.abs(next.x)>2.15)this.form='chain';
    else if(next.y<-.85)this.form='arc';
    else if(Math.abs(next.x)<1.55&&next.y>-.45&&next.y<.65)this.form='core';
  }
  release(cancelled=false) {
    if(this.held<0)return;
    this.nodes[this.held].velocity.copy(cancelled||this.elapsed-this.inputTime>.15?origin:this.dragVelocity).multiplyScalar(.38);
    this.held=-1;this.dragVelocity.set(0,0,0);
  }
  private shape(i:number,out:Vector3) {
    const p=this.nodes[i].rest,rank=this.held>=0&&i>this.held?i-1:i;
    const t=rank/Math.max(1,this.nodes.length-(this.held>=0?2:1)),layer=(rank%4-1.5)*.16;
    if(this.form==='arc'){
      const angle=(p.x/3.6)*1.5;
      out.set(Math.sin(angle)*2.6,Math.cos(angle)*1.35-.65+p.y*.26,layer+p.z*.24);
    } else if(this.form==='chain') out.set(p.x*.88,Math.sin(p.x*1.15)*.42+p.y*.23,p.z*.26+Math.cos(p.x)*.3);
    else if(this.form==='spire')out.set(Math.sin(t*Math.PI*3)*.72+p.y*.35,(t-.5)*3.1,Math.cos(t*Math.PI*3)*.6+p.z*.15);
    else out.copy(p);
    const x=out.x,y=out.y;out.x=x*Math.cos(this.twist)-y*Math.sin(this.twist);out.y=x*Math.sin(this.twist)+y*Math.cos(this.twist);
    // Drag direction changes the response, not the entire word's silhouette.
    if(this.followsLiveScore)out.lerp(p,.92);
    return out;
  }
  step(dt:number) {
    if(!Number.isFinite(dt)||dt<=0)return;
    dt=Math.min(dt,.08);const steps=Math.ceil(dt/(1/120)),h=dt/steps;
    for(let s=0;s<steps;s++)this.integrate(h);
  }
  private integrate(h:number) {
    this.elapsed+=h;this.age+=h;this.twist*=Math.exp(-h*.12);
    // The hand is an excluded piece, not the centre that drags the entire sculpture.
    const missing=this.nodes[this.anchor].rest;
    for(const bond of this.bonds){
      const a=this.nodes[bond.a],b=this.nodes[bond.b];
      const flow=(a.signal-b.signal)*h*5;
      a.signal-=flow;b.signal+=flow;
    }
    if(this.held>=0)this.nodes[this.held].signal=1;
    this.nodes.forEach((node,i)=>{
      const distance=node.rest.distanceTo(missing);
      const arrival=MathUtils.smoothstep(this.age-distance*.018,0,.16);
      const influence=this.strength*arrival;
      this.shape(i,node.target);
      if(this.held>=0&&i!==this.held){
        // Nearby fragments close the gap; a restrained search wave keeps the attempt alive.
        const response=neighbourResponse(this.age,distance);
        node.target.addScaledVector(delta.copy(missing).sub(node.rest),this.followsLiveScore?response.closure*.14+response.notice*.04:Math.exp(-distance*distance)*.16);
        node.target.z+=Math.sin(this.elapsed*3.2+distance*2)*.055*Math.exp(-distance*.3);
        if(this.story){
          // A disturbance gets resolved, not replayed forever. The live score keeps
          // supplying new goals after this short search for an alternative path.
          storyOrigin.copy(node.target);
          storyTarget(this.story,this.age,i,node.rest,node.target);
          if(this.followsLiveScore)node.target.lerp(storyOrigin,1-.18*(1-MathUtils.smoothstep(this.age,2.2,5)));
        }
      }
      node.target.lerp(node.home,1-influence);
      const ripple=Math.sin(this.age*5-node.home.distanceTo(this.nodes[this.anchor].home)*1.4)*Math.exp(-this.age*1.3);
      node.target.z+=ripple*this.strength*.16;
      if(this.followsLiveScore){
        delta.copy(node.target).sub(node.rest).clampLength(0,.16);
        node.target.copy(node.rest).add(delta);
      }
      if(!this.followsLiveScore)clamp(node.target);
      if(i===this.held){node.position.copy(this.pointer);node.velocity.set(0,0,0);return;}
      force.copy(node.target).sub(node.position).multiplyScalar(100/node.mass);
      node.velocity.addScaledVector(force,h);
    });
    for(let k=this.bonds.length-1;k>=0;k--){
      const bond=this.bonds[k],a=this.nodes[bond.a],b=this.nodes[bond.b];
      delta.copy(b.position).sub(a.position);const length=delta.length();
      if(this.held>=0&&(bond.a===this.held||bond.b===this.held)&&length>bond.rest*2+.55&&this.age>.12){
        this.cooldowns.set(this.bondKey(bond.a,bond.b),this.elapsed+1.2);
        this.bonds.splice(k,1);this.broken++;continue;
      }
      // Rest lengths gradually adapt to the selected form; topology has memory.
      bond.rest=MathUtils.damp(bond.rest,Math.max(.12,a.target.distanceTo(b.target)),5,h);
      if(length>.0001){delta.multiplyScalar((length-bond.rest)/length*7*h);
        if(bond.a!==this.held)a.velocity.addScaledVector(delta,1/a.mass);
        if(bond.b!==this.held)b.velocity.addScaledVector(delta,-1/b.mass);
      }
    }
    // Small centre-distance separation, not exact triangle collision detection.
    for(let i=0;i<this.nodes.length;i++)for(let j=i+1;j<this.nodes.length;j++){
      if(i===this.held||j===this.held)continue;
      const a=this.nodes[i],b=this.nodes[j];delta.copy(b.position).sub(a.position);const d2=delta.lengthSq();
      if(d2>.00001&&d2<.035){delta.multiplyScalar((.19-Math.sqrt(d2))/Math.sqrt(d2)*12*h);
        if(i!==this.held)a.velocity.sub(delta);if(j!==this.held)b.velocity.add(delta);
      }
    }
    this.energy=0;
    this.nodes.forEach((n,i)=>{if(i===this.held)return;n.velocity.multiplyScalar(Math.exp(-13*h)).clampLength(0,9);n.position.addScaledVector(n.velocity,h);
      // Preserve a captured foreground pose outside the solver's normal bounds:
      // it moves inward continuously instead of clipping on the first held frame.
      for(const axis of ['x','y','z'] as const)n.position[axis]=MathUtils.clamp(n.position[axis],Math.min(-bounds[axis],n.home[axis],n.target[axis]),Math.max(bounds[axis],n.home[axis],n.target[axis]));
      this.energy+=n.velocity.lengthSq();});
    this.energy/=Math.max(1,this.nodes.length);
    if(this.elapsed-this.topologyTime>.22){this.topologyTime=this.elapsed;this.reconnect();}
  }
  private reconnect(){
    if(!this.broken)return;
    for(const [key,until]of this.cooldowns)if(until<this.elapsed)this.cooldowns.delete(key);
    const i=this.held>=0?(this.anchor+1)%this.nodes.length:this.anchor,degree=this.bonds.filter(b=>b.a===i||b.b===i).length;
    if(degree>=3)return;
    const candidates=this.nodes.map((n,j)=>({j,d:n.position.distanceTo(this.nodes[i].position)})).filter(({j,d})=>j!==i&&j!==this.held&&d<.9&&!this.hasBond(i,j)&&!this.cooldowns.has(this.bondKey(i,j))).sort((a,b)=>a.d-b.d);
    const next=candidates[0];if(next){this.bonds.push({a:i,b:next.j,rest:Math.max(.12,next.d)});this.reconnected++;}
  }
}
