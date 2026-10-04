import * as T from 'three';
import {mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {sculptureCycle} from './hero3d-cycle';
export type SculptureFactory=(context:{assembly:T.Group;camera:T.PerspectiveCamera;key:T.DirectionalLight;edge:T.DirectionalLight;host:HTMLElement})=>{layout:(time:number,x:number,y:number)=>void;dispose:()=>void};
/** Local art study: no network, business facts, or external actions. */
export function createScene(host:HTMLElement,onLost:()=>void,options:{expressive?:boolean;sculpture?:SculptureFactory;mobile?:boolean}={}){
 const expressive=options.expressive===true,count=expressive?16:24;
 const renderer=new T.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});renderer.setPixelRatio(Math.min(devicePixelRatio,options.mobile?2:1.5));renderer.setClearColor(0x202426,0);renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.95;host.appendChild(renderer.domElement);
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(34,1,.1,100);camera.position.set(7,4.2,10);camera.lookAt(0,0,0);if(expressive){camera.fov=46;camera.position.set(5.4,2.4,7.6);camera.lookAt(0,0,0);camera.updateProjectionMatrix();renderer.toneMappingExposure=1.15;}
 const pmrem=new T.PMREMGenerator(renderer),room=new RoomEnvironment(),environment=pmrem.fromScene(room,.04);scene.environment=environment.texture;if(expressive)scene.environmentIntensity=.55;room.dispose();pmrem.dispose();
 const key=new T.DirectionalLight(0xddeeff,1.8);key.position.set(0,5,4);scene.add(key);const edge=new T.DirectionalLight(0x7698aa,2);edge.position.set(-5,-1,-3);scene.add(edge);
 const assembly=new T.Group();assembly.rotation.z=-.18;assembly.rotation.y=-.3;scene.add(assembly);
 // Bevelled, hollow industrial sections; unequal facets avoid a logo-like perfect torus.
 const shape=new T.Shape();const startAngle=.28,endAngle=Math.PI*2-.28;
 for(let i=0;i<=48;i++){const a=startAngle+(endAngle-startAngle)*i/48;const x=Math.cos(a)*(1+.08*Math.sin(a*3)),y=Math.sin(a)*1.35;i?shape.lineTo(x,y):shape.moveTo(x,y);}
 for(let i=48;i>=0;i--){const a=startAngle+(endAngle-startAngle)*i/48;shape.lineTo(Math.cos(a)*.70,Math.sin(a)*1.02);}shape.closePath();
 const geometry=new T.ExtrudeGeometry(shape,{depth:.05,steps:1,bevelEnabled:true,bevelSize:.028,bevelThickness:.025,bevelSegments:3,curveSegments:1});geometry.center();geometry.rotateY(Math.PI/2);
 const vertices=geometry.attributes.position;for(let i=0;i<vertices.count;i++){const y=vertices.getY(i),z=vertices.getZ(i);vertices.setX(i,vertices.getX(i)+.15*y*z+.10*Math.sin(y*2));}geometry.deleteAttribute('normal');geometry.deleteAttribute('uv');const smooth=mergeVertices(geometry);smooth.computeVertexNormals(); const materials=[new T.MeshStandardMaterial({color:0x9eaeb7,metalness:.96,roughness:.17}),new T.MeshStandardMaterial({color:0x465b68,metalness:.9,roughness:.32}),new T.MeshPhysicalMaterial({color:0xa6c5d1,metalness:.25,roughness:.18,clearcoat:1,transparent:true,opacity:.46,depthWrite:false})];
 const plates:T.Mesh[]=[];for(let i=0;i<(options.sculpture?0:count);i++){const plate=new T.Mesh(smooth,materials[i%8===5?2:i%5===0?1:0]);assembly.add(plate);plates.push(plate);}
 const lineGeometry=new T.BufferGeometry().setFromPoints([new T.Vector3(-4,0,0),new T.Vector3(4,0,0)]),lineMaterial=new T.LineBasicMaterial({color:0x759cad,transparent:true,opacity:.22});const axis=new T.Line(lineGeometry,lineMaterial);assembly.add(axis);
 let mode=0,current=0,paused=false,visible=true,disposed=false,raf=0,last=0,phase=0,px=0,py=0,sx=0,sy=0,frames=0,totalCPU=0,maxCPU=0,slow=0;const fine=matchMedia('(hover:hover) and (pointer:fine)');
 const sculpture=options.sculpture?.({assembly,camera,key,edge,host});if(sculpture)axis.visible=false;
 function layout(time:number){
 if(sculpture){sculpture.layout(time,sx,sy);return;}
 if(expressive){
  const progress=T.MathUtils.clamp(time/2.1,0,1),intro=1-Math.pow(1-progress,3),u=T.MathUtils.clamp(current,0,2),part=u<1?u:u-1;
  const cycle=sculptureCycle(Math.max(0,time-2.1)),coherence=cycle.coherence,disorder=1-coherence;
  for(let i=0;i<count;i++){
   const t=i/(count-1),a=t*Math.PI*1.7,plate=plates[i],foreground=Math.pow(t,6);
   const raw=new T.Vector3((t-.5)*6.2,Math.sin(a)*1.05,Math.cos(a)*1.65);
   const aligned=new T.Vector3((t-.5)*5.8,Math.sin(t*Math.PI)*1.25-.5,Math.sin(t*Math.PI)*-.8);
   const structured=new T.Vector3((t-.5)*4.7,Math.sin(t*Math.PI)*.25,0);
   plate.position.copy(u<1?raw:aligned).lerp(u<1?aligned:structured,part);
   // A continuous 24-second material cycle: misalignment resolves into a shared axis.
   // The ordered dwell is intentionally quiet; no model or business state changes.
   plate.position.lerp(structured,coherence);
   plate.position.x+=Math.sin(i*2.7)*.24*disorder*intro;
   plate.position.y+=Math.cos(i*1.9)*.38*disorder*intro;
   plate.position.z+=Math.sin(i*3.1)*.50*disorder*intro;
   plate.position.addScaledVector(new T.Vector3(Math.sin(i*2.7)*1.5,Math.cos(i*1.9)*1.9,Math.sin(i*3.1)*2.5),1-intro);
   // Near sections move independently: occlusion and differential parallax reveal depth.
   plate.position.x+=foreground*(.20+sx*.48)*intro;plate.position.y+=foreground*(.18+sy*.25)*intro;plate.position.z+=foreground*1.05*intro;
   // A travelling mechanical wave adds idle life; it is decorative, not a business status.
   const wave=Math.sin(time*Math.PI/12-t*Math.PI*2),waveWeight=intro*(1-u*.3)*disorder;
   plate.position.z+=wave*.22*waveWeight;plate.position.y+=Math.cos(time*.48-t*Math.PI*2)*.10*waveWeight;
   const rx0=a*.7,rx1=(t-.5)*1.8,rx2=(t-.5)*.8;
   plate.rotation.set(T.MathUtils.lerp(u<1?rx0:rx1,u<1?rx1:rx2,part)+(1-intro)*Math.sin(i)*1.4,Math.sin(t*Math.PI)*.35+(1-intro)*.8,Math.sin(a)*(.38-u*.13)+wave*.09*waveWeight);
   plate.rotation.x=T.MathUtils.lerp(plate.rotation.x+Math.sin(i*2.4)*.38*disorder*intro,0,coherence);
   plate.rotation.y=T.MathUtils.lerp(plate.rotation.y,0,coherence);
   plate.rotation.z=T.MathUtils.lerp(plate.rotation.z,0,coherence);
   const size=.68+Math.sin(t*Math.PI)*.35+t*.28+foreground*.25;plate.scale.set(size,size,size*(1+u*.12));
  }
  assembly.position.y=.8;
  // Keep the released foreground sections inside the canvas throughout the cycle.
  assembly.scale.setScalar(1-disorder*.14);
  assembly.rotation.set(sy*.23+Math.sin(time*Math.PI/12)*.12*disorder,-.35+sx*.38+Math.sin(time*Math.PI/12)*.30*disorder,-.18+Math.sin(time*Math.PI/12)*.07*disorder);
  camera.position.set(5.4+sx*.65,2.4+sy*.4,7.6);camera.lookAt(0,0,0);
  key.position.set(Math.sin(time*.5)*4,4.5,3.5);key.intensity=3.4;edge.intensity=3;
  host.dataset.assembly=progress===1?'settled':'assembling';host.dataset.assemblyProgress=progress.toFixed(3);
  host.dataset.sculpturePhase=cycle.phase;host.dataset.coherence=coherence.toFixed(3);
  return;
 }
 const blend=current/2;for(let i=0;i<24;i++){const t=i/23,raw=(1-blend)*Math.pow(1-t,1.6),plate=plates[i];const spread=mode===1?.18:0;plate.position.set((t-.5)*6.4+Math.sin(i*3.7)*raw*.3,Math.sin(i*2.37)*raw*1.25+Math.sin(t*Math.PI*2)*spread,Math.cos(i*1.91)*raw*.85);plate.rotation.set((Math.sin(i*4.31)*raw*.85)+t*.10,Math.sin(i*2.61)*raw*.65,Math.cos(i*3.24)*raw*.6+Math.sin(t*3.14)*.17);plate.scale.setScalar(.82+.18*Math.sin(t*Math.PI));}assembly.rotation.x=sy*.07+Math.sin(time*.23)*.025;assembly.rotation.y=-.3+sx*.10+Math.sin(time*.18)*.045;key.position.x=Math.sin(time*.20)*1.2;}
 function render(){layout(phase);renderer.render(scene,camera);host.parentElement!.classList.add('ready');host.dataset.frames=String(frames);host.dataset.mode=String(mode);host.dataset.rendering=String(!paused&&visible&&!document.hidden);host.dataset.drawCalls=String(renderer.info.render.calls);host.dataset.triangles=String(renderer.info.render.triangles);}
 function tick(now:number){raf=0;if(disposed||paused||!visible||document.hidden)return;raf=requestAnimationFrame(tick);if(now-last<(options.mobile?50:32))return;const dt=Math.min((now-last)/1000,.1);last=now;phase+=dt;current=T.MathUtils.damp(current,mode,3,dt);sx=T.MathUtils.damp(sx,px,3,dt);sy=T.MathUtils.damp(sy,py,3,dt);const a=performance.now();frames++;render();const cpu=performance.now()-a;totalCPU+=cpu;maxCPU=Math.max(maxCPU,cpu);host.dataset.cpuMean=(totalCPU/frames).toFixed(2);host.dataset.cpuMax=maxCPU.toFixed(2);if(cpu>45)slow++;else slow=Math.max(0,slow-1);if(slow>30){onLost();}}
 function sync(){cancelAnimationFrame(raf);raf=0;host.dataset.rendering=String(!paused&&visible&&!document.hidden);if(!paused&&visible&&!document.hidden&&!disposed){last=performance.now();raf=requestAnimationFrame(tick);}}
 const resize=()=>{const r=host.getBoundingClientRect();renderer.setSize(r.width,r.height);camera.aspect=r.width/Math.max(r.height,1);camera.updateProjectionMatrix();if(paused)render();};const ro=new ResizeObserver(resize);ro.observe(host);resize();render();
 const pointerSurface=options.sculpture?(host.closest<HTMLElement>('.portfolio-hero')??host):host;
 // Touch owns only the artwork. pan-y keeps native page scrolling available.
 let touchId:number|null=null,touchX=0,touchY=0,startX=0;
 const touchStart=(ev:PointerEvent)=>{if(ev.pointerType!=='touch'||!ev.isPrimary)return;touchId=ev.pointerId;touchX=ev.clientX;touchY=ev.clientY;startX=px;const r=host.getBoundingClientRect();px=T.MathUtils.clamp((ev.clientX-r.left)/r.width*2-1,-1,1);};
 const touchMove=(ev:PointerEvent)=>{if(ev.pointerId!==touchId)return;const dx=ev.clientX-touchX,dy=ev.clientY-touchY;if(Math.abs(dy)>Math.abs(dx)&&Math.abs(dy)>8){touchId=null;return;}if(Math.abs(dx)>6){px=T.MathUtils.clamp(startX+dx/(host.clientWidth*.4),-1,1);}};
 const touchEnd=(ev:PointerEvent)=>{if(ev.pointerId===touchId)touchId=null;};
 host.addEventListener('pointerdown',touchStart);host.addEventListener('pointermove',touchMove);host.addEventListener('pointerup',touchEnd);host.addEventListener('pointercancel',touchEnd);
 const io=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;sync();});io.observe(host);const move=(ev:PointerEvent)=>{if(!fine.matches)return;const r=host.getBoundingClientRect();px=T.MathUtils.clamp((ev.clientX-r.left)/r.width*2-1,-1,1);py=T.MathUtils.clamp((ev.clientY-r.top)/r.height*2-1,-1,1);};const leave=(ev:PointerEvent)=>{if(ev.pointerType!=='touch')px=py=0;};pointerSurface.addEventListener('pointermove',move);pointerSurface.addEventListener('pointerleave',leave);document.addEventListener('visibilitychange',sync);const lost=(event:Event)=>{event.preventDefault();onLost();};renderer.domElement.addEventListener('webglcontextlost',lost);sync();
 return {setMode(value:number){mode=value;if(paused){current=value;render();}},setPaused(value:boolean){paused=value;sync();},seek(seconds:number){phase=Math.max(0,seconds);render();},dispose(){if(disposed)return;disposed=true;cancelAnimationFrame(raf);ro.disconnect();io.disconnect();host.removeEventListener('pointerdown',touchStart);host.removeEventListener('pointermove',touchMove);host.removeEventListener('pointerup',touchEnd);host.removeEventListener('pointercancel',touchEnd);document.removeEventListener('visibilitychange',sync);pointerSurface.removeEventListener('pointermove',move);pointerSurface.removeEventListener('pointerleave',leave);renderer.domElement.removeEventListener('webglcontextlost',lost);sculpture?.dispose();geometry.dispose();smooth.dispose();materials.forEach(m=>m.dispose());lineGeometry.dispose();lineMaterial.dispose();environment.dispose();renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();}};
}
