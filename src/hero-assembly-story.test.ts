import {it,expect} from 'vitest';
import {Vector3} from 'three';
import {assemblyStoryAt,storyTarget,type AssemblyStory} from './hero-assembly-story';
import {AssemblyPhysics} from './hero-assembly-physics';
import {identityPlaybackTime} from './hero-identity-score';

it('accelerates desktop consistently and preserves the mobile clock',()=>{
  expect(identityPlaybackTime(40,true)).toBe(96);
  expect(identityPlaybackTime(40,false)).toBe(40);
});
for(const story of ['recover','bridge','relay'] as AssemblyStory[])it(`${story}: extreme dragging preserves the live text silhouette`,()=>{
  const rest=Array.from({length:64},(_,i)=>new Vector3((i%16-7.5)*.35,(Math.floor(i/16)-1.5)*.45,Math.sin(i)*.15));
  const p=new AssemblyPhysics(rest,rest,story);p.grab(12);
  let worst=0;
  for(let frame=0;frame<600;frame++){
    const live=rest.map(v=>v.clone().add(new Vector3(Math.sin(frame/90)*.4,0,Math.cos(frame/100)*.3)));
    p.followTargets(live);p.move(new Vector3(Math.sin(frame/30)*10,Math.cos(frame/30)*10,0),1/60);p.step(1/60);
    if(frame>30)for(let i=0;i<rest.length;i++)if(i!==12)worst=Math.max(worst,p.nodes[i].position.distanceTo(live[i]));
  }
  expect(worst).toBeLessThan(.24);
});
it('tracks live scattered goals without jumping to a finished glyph, then follows new goals',()=>{
  const rest=Array.from({length:32},(_,i)=>new Vector3((i%8-3.5)*.5,(Math.floor(i/8)-1.5)*.5,Math.sin(i)*2));
  const p=new AssemblyPhysics(rest,rest.map(v=>new Vector3(v.x,v.y,0)),'recover');p.grab(12);
  for(let i=0;i<30;i++){p.followTargets(rest);p.step(1/60);}
  expect(p.nodes.reduce((s,n,i)=>s+n.position.distanceTo(rest[i]),0)/32).toBeLessThan(.18);
  for(let i=0;i<720;i++){
    p.followTargets(rest.map(v=>v.clone().add(new Vector3(0,Math.sin(i/120)*.6,0))));p.step(1/60);
  }
  const targets=rest.map(v=>v.clone().add(new Vector3(0,Math.sin(719/120)*.6,0)));
  const error=p.nodes.reduce((s,n,i)=>s+(i===12?0:n.position.distanceTo(targets[i])),0)/31;
  expect(error).toBeLessThan(.15);
  expect(p.nodes[12].position.equals(rest[12])).toBe(true);
});

it('branches on the captured ambient phase including the loop seam',()=>{
  expect([0,23.9,24,43.9,44,72.9,73,96,120].map(assemblyStoryAt)).toEqual(['recover','recover','bridge','bridge','relay','relay','recover','recover','bridge']);
});
for(const story of ['recover','bridge','relay'] as AssemblyStory[]) {
  it(`${story}: continues changing after multiple cycles while the hand stays still`,()=>{
    const rest=Array.from({length:32},(_,i)=>new Vector3((i%8-3.5)*.5,(Math.floor(i/8)-1.5)*.5,0));
    const p=new AssemblyPhysics(rest,rest,story);p.grab(12);
    const advance=(t:number)=>{for(let i=0;i<t*60;i++)p.step(1/60);};
    advance(12);const before=p.nodes.map(n=>n.position.clone());advance(1);
    expect(p.nodes.filter((n,i)=>i!==12&&n.position.distanceTo(before[i])>.15).length).toBeGreaterThan(12);
    expect(p.nodes[12].position.equals(rest[12])).toBe(true);
    expect(p.bonds.every(b=>b.a!==12&&b.b!==12)).toBe(true);
    for(const t of [0,5.6,11.2]) {
      const a=storyTarget(story,Math.max(0,t-.001),3,rest[3],rest[3].clone());
      const b=storyTarget(story,t+.001,3,rest[3],rest[3].clone());
      expect(a.distanceTo(b)).toBeLessThan(.005);
    }
  });
}
it('the three branches produce distinct visible arrangements',()=>{
  const p=new Vector3(1,.6,0);
  const poses=(['recover','bridge','relay'] as AssemblyStory[]).map(s=>storyTarget(s,2,4,p,p.clone()));
  expect(poses[0].distanceTo(poses[1])).toBeGreaterThan(.3);
  expect(poses[1].distanceTo(poses[2])).toBeGreaterThan(.3);
});
