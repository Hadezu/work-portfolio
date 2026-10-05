import * as T from 'three';
import {FontLoader} from 'three/addons/loaders/FontLoader.js';
import {identityScore,identityOrbit,identityPlaybackTime,IDENTITY_CYCLE_SECONDS} from './hero-identity-score';
import fontData from './hero-name-typeface.json';
import type {SculptureFactory} from './hero3d-scene';
import {createAssemblyInteraction} from './hero-assembly-interaction';

import {equalizeTriangles,identityEase as ease,fragmentTiming} from './hero-identity-morph';
/** One continuous score: fragments → letters → name → work. Decorative only. */
export const createName:SculptureFactory=({assembly,camera,key,edge,host,interactive})=>{
 const font=new FontLoader().parse(fontData),pl=document.documentElement.lang==='pl';
 const groups=[['IVAN','MATIUSHKIN'],pl?['OPROGRAMOWANIE','AUTOMATYZACJA']:['CUSTOM SOFTWARE','AUTOMATION']].map((words,gi)=>{
  const group=new T.Group();assembly.add(group);
  const materials=[0xa95737,0x75432f,0xe6b18a].map(color=>new T.MeshPhysicalMaterial({color,metalness:.9,roughness:.24,clearcoat:1,iridescence:.22,iridescenceThicknessRange:[220,340],transparent:true}));
  const parts:{mesh:T.Mesh;home:T.Vector3;pivot:T.Vector3;seed:number;letter:number}[]=[];
  for(const [line,word]of words.entries()){
   const size=gi===0&&line===0?1.5:.9;
   const glyphs=[...word].map(letter=>letter===' '?null:new T.ExtrudeGeometry(font.generateShapes(letter,size),{depth:.55,bevelEnabled:true,bevelThickness:.075,bevelSize:.045,bevelSegments:3,curveSegments:5}));
   const widths=glyphs.map(g=>{if(!g)return .38;g.computeBoundingBox();return g.boundingBox!.max.x-g.boundingBox!.min.x;});
   const total=widths.reduce((a,b)=>a+b,0)+.12*(word.length-1),scale=Math.min(1,6.6/total);let x=-total/2;
   glyphs.forEach((geometry,i)=>{
    if(geometry){geometry.center();const position=geometry.attributes.position,normal=geometry.attributes.normal;
     const bins=Array.from({length:4},()=>({p:[] as number[],n:[] as number[]}));
     // Partition actual glyph triangles into four irregular surface fragments.
     // Each fragment returns to its original coordinates: no replacement text mesh.
     for(let j=0;j<position.count;j+=3){const cx=(position.getX(j)+position.getX(j+1)+position.getX(j+2))/3,cy=(position.getY(j)+position.getY(j+1)+position.getY(j+2))/3;const bin=bins[(cx+cy*.3>0?1:0)+(cy-cx*.2>0?2:0)];for(let k=j;k<j+3;k++){bin.p.push(position.getX(k),position.getY(k),position.getZ(k));bin.n.push(normal.getX(k),normal.getY(k),normal.getZ(k));}}
     bins.forEach((bin,q)=>{if(!bin.p.length)return;const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(bin.p,3));g.setAttribute('normal',new T.Float32BufferAttribute(bin.n,3));g.computeBoundingBox();const pivot=g.boundingBox!.getCenter(new T.Vector3());g.translate(-pivot.x,-pivot.y,-pivot.z);g.scale(scale,scale,scale);pivot.multiplyScalar(scale);const mesh=new T.Mesh(g,materials[(q+line)%3]);group.add(mesh);parts.push({mesh,pivot,home:new T.Vector3((x+widths[i]/2)*scale,line===0?.85:-.60,0),seed:i*1.7+q*2.1+line*3.4,letter:i});});geometry.dispose();
    }x+=widths[i]+.12;
   });
  }return{group,parts,materials};
 });
 // One persistent fragment pool. Name triangles are partitioned, not duplicated,
 // then subdivided to match target topology. The same meshes become the work text.
 groups.forEach(g=>{assembly.remove(g.group);});
 const count=Math.max(...groups.map(g=>g.parts.length));
 function split(gi:number,index:number){
  const parts=groups[gi].parts,k=Math.floor(index*parts.length/count),part=parts[k];
  const start=Math.ceil(k*count/parts.length),end=Math.ceil((k+1)*count/parts.length),ordinal=index-start;
  const pos=part.mesh.geometry.attributes.position,values:number[]=[];
  for(let t=ordinal;t<pos.count/3;t+=end-start)for(let v=t*3;v<t*3+3;v++)values.push(pos.getX(v),pos.getY(v),pos.getZ(v));
  return{values,anchor:part.home.clone().add(part.pivot),seed:part.seed,letter:part.letter};
 }
 const pool=Array.from({length:count},(_,i)=>{
  const source=split(0,i),target=split(1,i),triangles=Math.max(source.values.length,target.values.length)/9;
  const from=equalizeTriangles(source.values,triangles),to=equalizeTriangles(target.values,triangles);
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(from,3));geometry.computeVertexNormals();
  const targetGeometry=new T.BufferGeometry();targetGeometry.setAttribute('position',new T.BufferAttribute(to,3));targetGeometry.computeVertexNormals();
  geometry.morphAttributes.position=[new T.BufferAttribute(to,3)];geometry.morphAttributes.normal=[targetGeometry.attributes.normal.clone()];targetGeometry.dispose();
  const mesh=new T.Mesh(geometry,groups[0].materials[i%3]);mesh.frustumCulled=false;assembly.add(mesh);
  return{mesh,source,target,seed:source.seed+i*.07,rank:i/count,timing:fragmentTiming(i,count),protrudes:i===Math.floor(count*.35)};
 });
 groups.forEach(g=>g.parts.forEach(p=>p.mesh.geometry.dispose()));
 groups[1].materials.forEach(m=>m.dispose());
 // A narrow physical light crosses the assembled name once, not an emissive glow.
 const sweep=new T.SpotLight(0xffe0bf,0,20,.16,.65,1.4),aim=new T.Object3D();
 assembly.add(sweep,aim);sweep.target=aim;
 key.color.set(0xffe4cc);key.intensity=3.8;key.position.set(-3,4,5);edge.color.set(0xe6b18a);edge.intensity=4;edge.position.set(3,1,3);
 camera.fov=36;camera.updateProjectionMatrix();
 const surface=host.closest('.portfolio-hero') as HTMLElement|null;
 const header=surface?document.querySelector<HTMLElement>('.site-header--editorial'):null;
 const properties=['bg','halo','ink','accent','button','edge'];
 const pearl=new T.Color('#fff3e5'),reflection=new T.Color();
 let lastPalette='';
 const interaction=interactive?createAssemblyInteraction(host,assembly,camera,pool):null;
 return{layout(time,x,y){const realTime=time;time=identityPlaybackTime(time,interactive);const frame=interaction?.frame(time,x,y);if(frame){time=frame.time;x=frame.x;y=frame.y;}const score=identityScore(time),{t,palette}=score;
  // The CSS scene and physical lights share the same paused/visibility-aware clock.
  const stamp=Object.values(palette).join('');
  if(stamp!==lastPalette){for(const el of [surface,header])if(el)for(const prop of properties)el.style.setProperty('--scene-'+prop,palette[prop as keyof typeof palette]);lastPalette=stamp;}
  key.color.set(palette.accent).lerp(pearl,.65);edge.color.set(palette.edge);
  groups[0].materials.forEach((m,i)=>{m.color.set([0xa95737,0x75432f,0xe6b18a][i]);m.color.lerp(reflection.set(palette.edge),score.unfold*(i===2?.34:.12));});
  const release=score.returning;
  const fan=score.unfold+Math.sin(release*Math.PI);
  // No fade-out/reset: target geometry returns to the original scattered pose in place.
  groups[0].materials.forEach(m=>{m.opacity=1;m.depthWrite=true;});
  for(const {mesh,source,target,seed,rank,timing,protrudes}of pool){
   // Three late pieces finish after the majority, then the form rests completely.
   const build=timing.late?ease(29,34,t):ease(timing.buildStart,timing.buildEnd,t),align=ease(timing.alignStart,timing.alignEnd,t);
   const shard=1-build+release,loose=1-align+release;
   const transit=ease(timing.transitStart,timing.transitEnd,t)*(1-release),arc=Math.sin(transit*Math.PI);
   const foreground=rank>.90?1:0,depth=foreground?2.5:Math.sin(seed*.7)*1.5;
   const emergence=protrudes?score.emergence:0;
   mesh.position.copy(source.anchor).lerp(target.anchor,transit);
   mesh.position.x+=Math.sin(source.letter*2.6)*.45*loose+Math.sin(seed)*.85*shard+Math.sin(seed)*.8*arc;
   mesh.position.y+=Math.cos(source.letter*1.8)*.45*loose+Math.cos(seed)*.95*shard+Math.cos(seed)*.7*arc;
   mesh.position.z+=depth*shard+Math.sin(seed)*1.7*arc+Math.sin(t/IDENTITY_CYCLE_SECONDS*Math.PI*2*(foreground?1:2)+seed)*.09*shard;
   // Depth-separated layers briefly expose the same geometry before the new words settle.
   mesh.position.z+=Math.sin(rank*Math.PI*4)*2.7*fan;
   // Counter-rotating depth layers: recognisable contours separate into a spatial fan.
   const angle=(rank<.5?1:-1)*fan*.65;
   const px=mesh.position.x,py=mesh.position.y;
   mesh.position.x=px*Math.cos(angle)-py*Math.sin(angle);
   mesh.position.y=px*Math.sin(angle)+py*Math.cos(angle);
   mesh.position.x+=(rank-.5)*1.1*score.unfold;
   mesh.position.z+=emergence*4.5;mesh.position.x+=emergence*(-.65+x*.45)+x*.22*shard;mesh.position.y+=emergence*(-.18-y*.30)-y*.16*shard;
   mesh.rotation.set(Math.sin(seed)*shard*.8+arc*.4,Math.cos(seed)*shard+Math.sin(seed)*arc*1.15,Math.sin(seed*1.2)*shard*.5);
   const scale=(1+foreground*.25*shard+emergence*.3)*(1-.42*arc);mesh.scale.setScalar(scale);
   mesh.morphTargetInfluences![0]=ease(.2,.85,transit);mesh.visible=true;
  }
  const light=ease(36,37,t)*(1-ease(39,40,t));sweep.intensity=light*55;
  const lightX=-4+8*ease(36,40,t);sweep.position.set(lightX,2,4);aim.position.set(lightX,0,0);
  assembly.rotation.set(.05+score.perspective*.14,-.20+score.perspective*.82-score.unfold*.28,-.025-score.perspective*.10);assembly.scale.setScalar(.87+score.approach*.05-fan*.10);
  const orbit=identityOrbit(x,y,11.5-score.approach*.6);camera.position.set(orbit.x,orbit.y,orbit.z);camera.lookAt(0,0,0);
  host.dataset.orbitYaw=(orbit.yaw*180/Math.PI).toFixed(1);host.dataset.orbitPitch=(orbit.pitch*180/Math.PI).toFixed(1);
  host.dataset.artwork='fragmented-identity';host.dataset.cycleTime=t.toFixed(2);host.dataset.sculpturePhase=t<24?'letters':t<34?'name':t<44?'identity':t<65?'transform':t<73?'work-hold':'release';
  host.dataset.scenePalette=palette.bg;host.dataset.emergence=score.emergence.toFixed(3);host.dataset.unfold=score.unfold.toFixed(3);host.dataset.pointerX=x.toFixed(3);host.dataset.pointerY=y.toFixed(3);host.dataset.fragmentCount=String(count);host.dataset.lightSweep=light.toFixed(2);
  interaction?.apply(realTime);
 },setPaused(value){interaction?.setPaused(value);},dispose(){interaction?.dispose();for(const el of [surface,header])if(el)for(const prop of properties)el.style.removeProperty('--scene-'+prop);pool.forEach(p=>p.mesh.geometry.dispose());groups[0].materials.forEach(m=>m.dispose());sweep.dispose();}};
};
