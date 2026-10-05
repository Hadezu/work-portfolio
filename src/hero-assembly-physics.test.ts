import {describe,it,expect} from 'vitest';
import {Vector3} from 'three';
import {AssemblyPhysics} from './hero-assembly-physics';

const points=()=>Array.from({length:64},(_,i)=>new Vector3((i%16-7.5)*.35,(Math.floor(i/16)-1.5)*.45,Math.sin(i)*.15));
const advance=(p:AssemblyPhysics,seconds:number,dt=1/60)=>{for(let t=0;t<seconds;t+=dt)p.step(dt);};
describe('adaptive sculpture dynamics',()=>{
  it('rebuilds immediately without a pointer move and excludes the held piece from all bonds',()=>{
    const p=new AssemblyPhysics(points());const before=p.nodes.map(n=>n.position.clone());p.grab(25);
    advance(p,.35);
    expect(p.nodes[25].position.distanceTo(before[25])).toBeLessThan(.00001);
    expect(p.bonds.every(b=>b.a!==25&&b.b!==25)).toBe(true);
    expect(p.nodes.filter((n,i)=>i!==25&&n.position.distanceTo(before[i])>.1).length).toBeGreaterThan(30);
    const later=p.nodes.map(n=>n.position.clone());advance(p,2);
    expect(p.nodes.some((n,i)=>i!==25&&n.position.distanceTo(later[i])>.01)).toBe(true);
    expect(p.bonds.every(b=>b.a!==25&&b.b!==25)).toBe(true);
  });
  it('does not clip an already-visible foreground fragment on the first grab frame',()=>{
    const pts=points();pts[3].set(2,1,4.8);const p=new AssemblyPhysics(pts);p.grab(25);p.step(1/60);
    expect(p.nodes[3].position.distanceTo(pts[3])).toBeLessThan(.16);
  });
  it('assembles toward glyph anchors rather than compressing the captured scattered pose',()=>{
    const rest=points(),scattered=rest.map((p,i)=>p.clone().add(new Vector3(Math.sin(i),Math.cos(i),.8)));
    const p=new AssemblyPhysics(scattered,rest);p.grab(25);advance(p,1);
    const error=p.nodes.reduce((sum,n,i)=>sum+(i===25?0:n.position.distanceTo(rest[i])),0)/63;
    expect(error).toBeLessThan(.22);
    expect(p.nodes[25].position.distanceTo(scattered[25])).toBeLessThan(.00001);
  });
  it('pins the selected particle while neighbours react, then settles after release',()=>{
    const p=new AssemblyPhysics(points());p.grab(25);const start=p.nodes.map(n=>n.position.clone());
    p.move(new Vector3(2.9,.3,0),.1);advance(p,2);
    expect(p.nodes[25].position.distanceTo(new Vector3(2.9,.3,0))).toBeLessThan(.001);
    expect(p.nodes.filter((n,i)=>i!==25&&n.position.distanceTo(start[i])>.1).length).toBeGreaterThan(20);
    p.release();advance(p,15);expect(p.energy).toBeLessThan(.001);
  });
  it('uses hysteresis for four formations rather than boundary chatter',()=>{
    const p=new AssemblyPhysics(points());p.grab(25);
    p.move(new Vector3(0,1.5,0),.1);expect(p.form).toBe('spire');
    p.move(new Vector3(0,1.05,0),.1);expect(p.form).toBe('spire');
    p.move(new Vector3(2.6,0,0),.1);expect(p.form).toBe('chain');
    p.move(new Vector3(0,-1.2,0),.1);expect(p.form).toBe('arc');
    p.move(new Vector3(.2,.2,0),.1);expect(p.form).toBe('core');
  });
  it('breaks stretched anchor bonds and reconnects to nearby fragments',()=>{
    const p=new AssemblyPhysics(points());p.grab(25);p.move(new Vector3(3.4,1.9,1.5),.1);advance(p,.5);
    expect(p.broken).toBeGreaterThan(0);
    const candidate=p.nodes[45].position.clone();p.move(candidate,.1);advance(p,2);
    expect(p.reconnected).toBeGreaterThan(0);
    const keys=p.bonds.map(b=>[b.a,b.b].sort((a,b)=>a-b).join(':'));expect(new Set(keys).size).toBe(keys.length);
  });
  it('bounds extreme input and remains finite across long frame gaps and repeated regrabs',()=>{
    const p=new AssemblyPhysics(points());
    for(let i=0;i<150;i++){
      p.grab(i%64);p.move(new Vector3(Math.sin(i)*200,Math.cos(i)*200,100),.001);p.step(i%2?4:1/30);p.release(i%3===0);
    }
    p.grab(2);const before=p.nodes[2].position.clone();p.move(new Vector3(NaN,0,0),.1);p.step(0);expect(p.nodes[2].position.equals(before)).toBe(true);
    p.release();advance(p,10);
    for(const n of p.nodes){expect([n.position.x,n.position.y,n.position.z,n.velocity.length()].every(Number.isFinite)).toBe(true);expect(Math.abs(n.position.x)).toBeLessThanOrEqual(3.45);expect(Math.abs(n.position.y)).toBeLessThanOrEqual(2.05);expect(Math.abs(n.position.z)).toBeLessThanOrEqual(1.65);}
  });
  it('keeps final forms close at different rendering rates',()=>{
    const a=new AssemblyPhysics(points()),b=new AssemblyPhysics(points());
    for(const p of [a,b]){p.grab(17);p.move(new Vector3(-2.9,.3,0),.1);}
    advance(a,3,1/30);advance(b,3,1/120);a.release(true);b.release(true);advance(a,12,1/30);advance(b,12,1/120);
    const mean=a.nodes.reduce((sum,n,i)=>sum+n.position.distanceTo(b.nodes[i].position),0)/a.nodes.length;
    expect(mean).toBeLessThan(.08);
  });
});
