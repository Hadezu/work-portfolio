import * as T from 'three';
import type {SculptureFactory} from './hero3d-scene';
import {fieldScore,agreementScore} from './hero3d-field-score';

/** Three different strata share one elliptical negative space. No business state is inferred. */
function rib(family:number,row:number,side:number){
 const rows=[5,7,4][family],y=(row-(rows-1)/2)*[.62,.44,.78][family];
 const gap=Math.sqrt(Math.max(0,1-y*y/1.65))*.95+.10;
 const outer=2.25+.25*Math.cos(row*1.3+family),height=[.22,.12,.35][family];
 const positions:number[]=[],uvs:number[]=[],indices:number[]=[];const nu=36,nv=12;
 for(let u=0;u<=nu;u++)for(let v=0;v<=nv;v++){
  const t=u/nu,b=v/nv*Math.PI*2,d=(outer-gap)*t;
  positions.push(side*(gap+d),y+.28*t*t+height/2*Math.cos(b),(family-1)*.85+.30*d*d+.08*y+(family===2?.035:.09)*Math.sin(b));uvs.push(t,v/nv);
 }
 for(let u=0;u<nu;u++)for(let v=0;v<nv;v++){
  const a=u*(nv+1)+v,b=a+nv+1;side>0?indices.push(a,a+1,b,b,a+1,b+1):indices.push(a,b,a+1,b,b+1,a+1);
 }
 for(const u of [0,nu])for(let v=1;v<nv-1;v++){const a=u*(nv+1);(u===0)===(side>0)?indices.push(a,a+v,a+v+1):indices.push(a,a+v+1,a+v);}
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));geometry.setIndex(indices);geometry.computeVertexNormals();
 geometry.computeBoundingBox();const pivot=geometry.boundingBox!.getCenter(new T.Vector3());geometry.translate(-pivot.x,-pivot.y,-pivot.z);return{geometry,pivot};
}
export const createField:SculptureFactory=({assembly,camera,key,edge,host})=>{
 const materials=[new T.MeshStandardMaterial({color:0xa4afb6,metalness:.91,roughness:.25}),new T.MeshStandardMaterial({color:0x648394,metalness:.86,roughness:.28}),new T.MeshPhysicalMaterial({color:0xc4d9df,metalness:.3,roughness:.22,clearcoat:1,transparent:true,opacity:.57,depthWrite:false})];
 const items:{mesh:T.Mesh;pivot:T.Vector3;family:number;row:number;side:number;rank:number}[]=[];
 for(let family=0;family<3;family++)for(let row=0;row<[5,7,4][family];row++)for(const side of [-1,1]){
  const{geometry,pivot}=rib(family,row,side),mesh=new T.Mesh(geometry,materials[family]);assembly.add(mesh);items.push({mesh,pivot,family,row,side,rank:family*.3+row*.035});
 }
 // The exception keeps its own place: resolution does not erase difference.
 const exceptionMaterial=new T.MeshStandardMaterial({color:0x91b6c8,metalness:.8,roughness:.22});
 const exception=new T.Mesh(new T.BoxGeometry(.18,.68,.10),exceptionMaterial);assembly.add(exception);
 const traceMaterial=new T.MeshBasicMaterial({color:0x9dc6da,transparent:true,opacity:0,depthWrite:false});
 const trace=new T.Mesh(new T.TorusGeometry(1,.008,4,80),traceMaterial);trace.scale.set(.97,1.28,1);assembly.add(trace);
 const position=new T.Vector3();camera.fov=36;camera.updateProjectionMatrix();key.intensity=2.4;edge.intensity=2.7;edge.position.set(-4,1,-3);
 return{layout(time,x,y){
  const score=fieldScore(time,1),a=agreementScore(time),coherence=fieldScore(time,.5).coherence,loose=1-coherence;
  host.dataset.sculpturePhase=score.phase;host.dataset.coherence=coherence.toFixed(3);host.dataset.cycleTime=score.t.toFixed(3);host.dataset.artwork='agreement';host.dataset.exception='retained';host.dataset.trace=a.trace.toFixed(3);
  for(const {mesh,pivot,family,row,side,rank}of items){
   const s=fieldScore(time,rank),l=1-s.coherence,seed=row*1.73+family*2.4+side;
   position.set(side*(.35+family*.23)+Math.sin(seed+s.arc+a.variation)*.42,Math.sin(seed-s.arc)*.48,Math.cos(seed+s.arc)*1.1);
   mesh.position.copy(pivot).addScaledVector(position,l);mesh.rotation.set(l*Math.sin(seed+s.arc)*.55,l*side*(.4+family*.15),l*(family-1)*.55+l*Math.cos(seed+s.arc)*.22);
  }
  exception.position.set(2.6+.22*loose, -.55+Math.sin(score.arc)*.3*loose,.65);exception.rotation.set(.15,.3,-.25+.5*loose);
  trace.position.z=.9-a.trace*1.8;traceMaterial.opacity=a.traceOpacity;trace.visible=a.traceOpacity>.001;
  assembly.position.set(0,.03,0);assembly.rotation.set(.06*loose+y*.018,.25*loose+x*.035,-.28);assembly.scale.setScalar(.87-.12*loose);
  camera.position.set(1.3+3*loose+x*.10,.55+1.1*loose-y*.08,9.7+loose);camera.lookAt(0,0,0);
  key.position.set(-3+Math.sin(score.arc)*loose,5,6);
 },dispose(){items.forEach(i=>i.mesh.geometry.dispose());materials.forEach(m=>m.dispose());exception.geometry.dispose();exceptionMaterial.dispose();trace.geometry.dispose();traceMaterial.dispose();}};
};
