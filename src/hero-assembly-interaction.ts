import * as T from 'three';
import {AssemblyPhysics} from './hero-assembly-physics';
import {assemblyStoryAt} from './hero-assembly-story';
import {neighbourResponse,spareReturn,completionGlint} from './hero-assembly-response';

type Fragment={mesh:T.Mesh;source:{anchor:T.Vector3};target:{anchor:T.Vector3}};
type Pose={position:T.Vector3;rotation:T.Quaternion;scale:T.Vector3;morph:number};
/** Desktop constraint on a continuously advancing ambient score. */
export function createAssemblyInteraction(host:HTMLElement,assembly:T.Group,camera:T.PerspectiveCamera,parts:Fragment[]) {
  const meshes=parts.map(p=>p.mesh),ray=new T.Raycaster(),pointer=new T.Vector2();
  const plane=new T.Plane(),hit=new T.Vector3(),offset=new T.Vector3();
  const originals=meshes.map(m=>m.material as T.MeshPhysicalMaterial);
  const materials=meshes.map(m=>{const material=(m.material as T.MeshPhysicalMaterial).clone();m.material=material;return material;});
  let rotations:T.Quaternion[]=[];
  let physics:AssemblyPhysics|null=null,poses:Pose[]=[],held=-1,hover=-1,pointerId:number|null=null;
  let paused=false,disposed=false,lastTime=0,scoreTime=0;
  let lastMove=0,returning=false,returnProgress=0;
  let lastPointer:{x:number;y:number}|null=null;
  const returnPoses:Pose[]=[];
  let parked:{index:number;pose:Pose;until:number;since:number;rejoinAt:number|null}|null=null;
  let completionAt:number|null=null,settledFor=0;
  const completionLight=new T.SpotLight(0xffead0,0,12,.11,.8,1.5),completionAim=new T.Object3D(),completionCenter=new T.Vector3();
  assembly.add(completionLight,completionAim);completionLight.target=completionAim;
  const rotation=new T.Quaternion(),tiltRotation=new T.Quaternion(),tilt=new T.Euler();
  const fine=matchMedia('(hover:hover) and (pointer:fine)');
  const capturePose=(mesh:T.Mesh):Pose=>({position:mesh.position.clone(),rotation:mesh.quaternion.clone(),scale:mesh.scale.clone(),morph:mesh.morphTargetInfluences?.[0]??0});
  const captureView=()=>({position:assembly.position.clone(),rotation:assembly.quaternion.clone(),scale:assembly.scale.clone(),cameraPosition:camera.position.clone(),cameraRotation:camera.quaternion.clone()});
  const frontPosition=new T.Vector3(0,.2,11.3),frontRotation=new T.Quaternion().setFromRotationMatrix(new T.Matrix4().lookAt(frontPosition,new T.Vector3(),new T.Vector3(0,1,0)));
  const frontAssemblyRotation=new T.Quaternion(),frontScale=new T.Vector3(.91,.91,.91);

  function setHover(i:number){hover=i;host.dataset.fragmentHover=String(i);host.style.cursor=i>=0?'grab':'';}
  function setRay(x:number,y:number){const b=host.getBoundingClientRect();pointer.set((x-b.left)/b.width*2-1,-(y-b.top)/b.height*2+1);ray.setFromCamera(pointer,camera);}
  function pick(x:number,y:number){
    setRay(x,y);assembly.updateWorldMatrix(true,true);
    const intersections=ray.intersectObjects(meshes,false);
    return intersections.length?meshes.indexOf(intersections[0].object as T.Mesh):-1;
  }
  let capturedView:{position:T.Vector3;rotation:T.Quaternion;scale:T.Vector3;cameraPosition:T.Vector3;cameraRotation:T.Quaternion}|null=null;
  const previousPositions=meshes.map(m=>m.position.clone());
  function applyParked(time:number){
    if(!parked)return;
    if(scoreTime>=parked.until&&parked.rejoinAt===null){
      // Begin from the visible bob/rotation, not the original release snapshot.
      const elapsed=time-parked.since;
      parked.pose.position.y+=Math.sin(elapsed*1.3)*.035;
      parked.pose.rotation.multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),Math.sin(elapsed*.8)*.025));
      parked.rejoinAt=time;
    }
    const progress=parked.rejoinAt===null?{position:0,rotation:0}:spareReturn(time-parked.rejoinAt);
    const a=progress.position;
    const mesh=meshes[parked.index],pose=parked.pose;
    mesh.position.lerp(pose.position,1-a);mesh.quaternion.slerp(pose.rotation,1-progress.rotation);mesh.scale.lerp(pose.scale,1-a);
    if(parked.rejoinAt===null){mesh.position.y+=Math.sin((time-parked.since)*1.3)*.035;mesh.rotateY(Math.sin((time-parked.since)*.8)*.025);}
    if(mesh.morphTargetInfluences)mesh.morphTargetInfluences[0]=T.MathUtils.lerp(pose.morph,mesh.morphTargetInfluences[0],a);
    host.dataset.fragmentParked=String(parked.index);host.dataset.fragmentParkedState=parked.rejoinAt===null?'waiting':'rejoining';
    if(a===1){parked=null;host.dataset.fragmentParked='-1';host.dataset.fragmentParkedState='none';}
  }
  function begin(index:number){
    if(index<0||paused)return false;
    if(!physics||returning){
      poses=meshes.map(capturePose);rotations=poses.map(p=>p.rotation.clone());
      const rest=parts.map((p,i)=>p.source.anchor.clone().lerp(p.target.anchor,poses[i].morph));
      physics=new AssemblyPhysics(poses.map(p=>p.position),rest,assemblyStoryAt(scoreTime));
      capturedView=captureView();
      // A new intervention starts from every currently visible pose, including a spare.
      parked=null;host.dataset.fragmentParked='-1';host.dataset.fragmentParkedState='none';
    }
    returning=false;returnProgress=0;physics.grab(index);held=index;
    completionAt=null;settledFor=0;completionLight.intensity=0;host.dataset.assemblyGlint='0';host.dataset.assemblyCompletion='adapting';
    host.dataset.assemblyInteraction='held';host.dataset.fragmentHeld=String(index);
    host.dataset.fragmentGrabs=String(Number(host.dataset.fragmentGrabs??0)+1);
    host.style.cursor='grabbing';host.dataset.interactionUsed='true';
    return true;
  }
  function release(cancelled=false){
    if(held<0)return;
    const phase=((scoreTime%96)+96)%96;
    // Only a completed name/work hold can leave a spare piece until the next build.
    const next=phase>=34&&phase<44?44:phase>=65&&phase<73?73:null;
    if(!cancelled&&physics&&physics.age>=5&&next!==null){
      parked={index:held,pose:capturePose(meshes[held]),until:scoreTime-phase+next,since:lastTime,rejoinAt:null};
    }
    physics?.release(cancelled);held=-1;
    const id=pointerId;pointerId=null;
    if(id!==null&&host.hasPointerCapture(id))host.releasePointerCapture(id);
    host.dataset.fragmentHeld='-1';setHover(-1);
    startReturn();
  }
  function startReturn(){
    if(!physics||returning)return;
    returning=true;returnProgress=0;
    returnPoses.splice(0,returnPoses.length,...meshes.map(capturePose));
    // Release can happen halfway through centering. Return from the visible view.
    capturedView=captureView();
    host.dataset.assemblyInteraction='returning';
  }
  function restore(){if(parked)parked.until=scoreTime;if(held>=0)release(true);else startReturn();}
  const down=(event:PointerEvent)=>{
    if(!fine.matches||event.pointerType==='touch'||!event.isPrimary||event.button!==0||paused||held>=0)return;
    const index=pick(event.clientX,event.clientY);if(!begin(index))return;
    event.preventDefault();event.stopImmediatePropagation();host.focus({preventScroll:true});
    pointerId=event.pointerId;host.setPointerCapture(pointerId);lastMove=performance.now();
    lastPointer={x:event.clientX,y:event.clientY};
    const world=meshes[index].getWorldPosition(new T.Vector3());
    plane.setFromNormalAndCoplanarPoint(camera.getWorldDirection(new T.Vector3()),world);
    if(ray.ray.intersectPlane(plane,hit))offset.copy(world).sub(hit);else offset.set(0,0,0);
  };
  const move=(event:PointerEvent)=>{
    if(!fine.matches||event.pointerType==='touch'||paused)return;
    lastPointer={x:event.clientX,y:event.clientY};
    if(pointerId===event.pointerId&&physics&&held>=0){
      event.preventDefault();event.stopImmediatePropagation();setRay(event.clientX,event.clientY);
      if(ray.ray.intersectPlane(plane,hit)){
        const now=performance.now();physics.move(assembly.worldToLocal(hit.add(offset)),(now-lastMove)/1000);lastMove=now;
      }
    }else if(held<0&&!returning)setHover(pick(event.clientX,event.clientY));
  };
  const up=(event:PointerEvent)=>{if(event.pointerId===pointerId){event.stopImmediatePropagation();release(event.type!=='pointerup');}};
  const leave=()=>{lastPointer=null;if(held<0)setHover(-1);};
  const key=(event:KeyboardEvent)=>{
    if(paused||event.altKey||event.ctrlKey||event.metaKey)return;
    if(event.key==='Escape'){if(physics||parked){event.preventDefault();restore();}return;}
    if(event.key==='Enter'||event.key===' '){
      event.preventDefault();if(held>=0){release();return;}
      const b=host.getBoundingClientRect();
      let index=lastPointer?pick(lastPointer.x,lastPointer.y):-1;
      if(index<0){let best=Infinity;meshes.forEach((mesh,i)=>{const p=mesh.getWorldPosition(new T.Vector3()).project(camera);const d=p.x*p.x+p.y*p.y;if(Math.abs(p.x)<.9&&Math.abs(p.y)<.9&&d<best){best=d;index=i;}});}
      if(index>=0&&begin(index)){lastPointer={x:b.x+b.width/2,y:b.y+b.height/2};}
    }else if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)&&physics&&held>=0){
      event.preventDefault();
      // Keyboard movement uses the same camera-facing plane as mouse movement.
      const direction=new T.Vector3(event.key==='ArrowRight'?.24:event.key==='ArrowLeft'?-.24:0,event.key==='ArrowUp'?.24:event.key==='ArrowDown'?-.24:0,0).applyQuaternion(camera.quaternion);
      const world=meshes[held].getWorldPosition(new T.Vector3()).add(direction);
      physics.move(assembly.worldToLocal(world),.09);
    }
  };
  const blur=()=>release(true);
  const hidden=()=>{if(document.hidden)release(true);};
  host.addEventListener('pointerdown',down,true);host.addEventListener('pointermove',move,true);
  for(const type of ['pointerup','pointercancel','lostpointercapture'])host.addEventListener(type,up as EventListener,true);
  host.addEventListener('pointerleave',leave);host.addEventListener('keydown',key);host.addEventListener('blur',blur);
  window.addEventListener('blur',blur);document.addEventListener('visibilitychange',hidden);
  host.dataset.assemblyInteraction='ambient';host.dataset.fragmentHeld='-1';
  return {
    frame(time:number,x:number,y:number){
      scoreTime=time;
      return{time,x,y};
    },
    apply(time:number){
      const dt=paused?0:Math.min(Math.max(time-lastTime,0),.08);lastTime=time;
      materials.forEach((m,i)=>{m.color.copy(originals[i].color);m.emissive.setHex(0xe8b88d);m.emissiveIntensity=T.MathUtils.damp(m.emissiveIntensity,i===held?.32:i===hover?.18:0,18,dt);});
      const glint=completionAt===null?0:completionGlint(time-completionAt);
      completionLight.intensity=glint*32;
      if(completionAt!==null){const sweep=(time-completionAt)/.85;completionLight.position.set(completionCenter.x-.6+sweep*1.2,completionCenter.y+.3,4.5);completionAim.position.set(completionLight.position.x,completionCenter.y,completionCenter.z);}
      host.dataset.assemblyGlint=glint.toFixed(3);
      if(!physics){applyParked(time);meshes.forEach((m,i)=>previousPositions[i].copy(m.position));return;}
      let viewBlend=0;
      if(returning){
        returnProgress=Math.min(1,returnProgress+dt/.85);
        const a=T.MathUtils.smoothstep(returnProgress,0,1);viewBlend=a;
        meshes.forEach((mesh,i)=>{
          if(i===parked?.index)return;
          // The target is this frame's live ambient pose, including morph and scale.
          mesh.position.lerp(returnPoses[i].position,1-a);
          mesh.quaternion.slerp(returnPoses[i].rotation,1-a);
          mesh.scale.lerp(returnPoses[i].scale,1-a);
          if(mesh.morphTargetInfluences)mesh.morphTargetInfluences[0]=T.MathUtils.lerp(returnPoses[i].morph,mesh.morphTargetInfluences[0],a);
        });
        host.dataset.assemblyInteraction=returnProgress===1?'ambient':'returning';
        if(returnProgress===1){physics=null;returning=false;hover=-1;host.dataset.assemblyEnergy='0.0000';}
      }else{
        // Follow this frame's unfolding sculpture, never jump to final glyph anchors.
        physics.followTargets(meshes.map(mesh=>mesh.position));
        physics.step(dt);
        let deviation=0,error=0,nearCount=0;
        meshes.forEach((mesh,i)=>{
          const node=physics!.nodes[i];mesh.position.copy(node.position);
          if(i!==held)deviation=Math.max(deviation,node.position.distanceTo(node.rest));
          tilt.set(T.MathUtils.clamp(node.velocity.y*.012,-.025,.025),T.MathUtils.clamp(-node.velocity.x*.012,-.025,.025),T.MathUtils.clamp(physics!.twist*.04,-.025,.025));
          const missing=physics!.nodes[physics!.anchor].rest,distance=node.rest.distanceTo(missing);
          if(i!==held){
            const notice=neighbourResponse(physics!.age,distance).notice;
            tilt.y+=T.MathUtils.clamp(missing.x-node.rest.x,-1,1)*notice*.045;
            tilt.x-=T.MathUtils.clamp(missing.y-node.rest.y,-1,1)*notice*.045;
            if(distance<1.4){nearCount++;error+=node.position.distanceTo(node.target)+node.velocity.length()*.1;}
          }
          rotation.copy(mesh.quaternion).multiply(tiltRotation.setFromEuler(tilt));
          if(i===held)rotation.copy(poses[i].rotation);
          // Preserve the ambient fragment rotation; only the small response tilts it.
          rotations[i].copy(rotation);mesh.quaternion.copy(rotation);
          if(i===held){mesh.scale.copy(poses[i].scale);if(mesh.morphTargetInfluences)mesh.morphTargetInfluences[0]=poses[i].morph;}
        });
        if(completionAt===null&&physics.age>=5){
          settledFor=error/Math.max(1,nearCount)<.075?settledFor+dt:0;
          if(settledFor>.16){completionAt=time;completionCenter.copy(physics.nodes[physics.anchor].rest);host.dataset.assemblyCompletion='resolved';}
        }
        host.dataset.assemblyInteraction='held';
        host.dataset.assemblyStory=physics.story??'';host.dataset.assemblyAge=physics.age.toFixed(3);
        host.dataset.assemblyRecovery=physics.age<5?'adapting':'resolved';
        host.dataset.assemblyDeviation=deviation.toFixed(4);
        host.dataset.assemblyLiveMorph=(meshes.find((_,i)=>i!==held)?.morphTargetInfluences?.[0]??0).toFixed(3);
        host.dataset.assemblyForm=physics.form;host.dataset.assemblyEnergy=physics.energy.toFixed(4);
        host.dataset.bondsBroken=String(physics.broken);host.dataset.bondsReconnected=String(physics.reconnected);
        host.dataset.assemblyBonds=String(physics.bonds.length);
        const anchor=physics.nodes[physics.anchor].position;host.dataset.anchorPosition=[anchor.x,anchor.y,anchor.z].map(n=>n.toFixed(3)).join(',');
      }
      applyParked(time);
      if(capturedView){
        if(held>=0&&physics){
          const a=T.MathUtils.smoothstep(physics.age,0,.7);
          assembly.position.copy(capturedView.position).multiplyScalar(1-a);
          assembly.quaternion.copy(capturedView.rotation).slerp(frontAssemblyRotation,a);
          assembly.scale.copy(capturedView.scale).lerp(frontScale,a);
          camera.position.copy(capturedView.cameraPosition).lerp(frontPosition,a);
          camera.quaternion.copy(capturedView.cameraRotation).slerp(frontRotation,a);
          host.dataset.assemblyCentering=a.toFixed(3);
        }else{
          assembly.position.lerp(capturedView.position,1-viewBlend);assembly.quaternion.slerp(capturedView.rotation,1-viewBlend);assembly.scale.lerp(capturedView.scale,1-viewBlend);
          camera.position.lerp(capturedView.cameraPosition,1-viewBlend);camera.quaternion.slerp(capturedView.cameraRotation,1-viewBlend);
        }
        camera.updateMatrixWorld();
        host.dataset.orbitYaw=(Math.atan2(camera.position.x,camera.position.z)*180/Math.PI).toFixed(1);
      }
      let step=0;meshes.forEach((m,i)=>{step=Math.max(step,m.position.distanceTo(previousPositions[i]));previousPositions[i].copy(m.position);});
      host.dataset.assemblyPoseStep=step.toFixed(4);
      host.dataset.assemblyReturnProgress=returnProgress.toFixed(3);
      assembly.updateWorldMatrix(true,true);
      if(pointerId!==null&&held>=0&&lastPointer){
        // Rebase dragging as the view centers, without treating camera motion as input.
        const world=meshes[held].getWorldPosition(new T.Vector3());
        plane.setFromNormalAndCoplanarPoint(camera.getWorldDirection(new T.Vector3()),world);
        setRay(lastPointer.x,lastPointer.y);
        if(ray.ray.intersectPlane(plane,hit))offset.copy(world).sub(hit);
      }
    },
    setPaused(value:boolean){paused=value;if(value){release(true);setHover(-1);}},
    dispose(){
      if(disposed)return;disposed=true;release(true);
      host.removeEventListener('pointerdown',down,true);host.removeEventListener('pointermove',move,true);
      for(const type of ['pointerup','pointercancel','lostpointercapture'])host.removeEventListener(type,up as EventListener,true);
      host.removeEventListener('pointerleave',leave);host.removeEventListener('keydown',key);host.removeEventListener('blur',blur);
      window.removeEventListener('blur',blur);document.removeEventListener('visibilitychange',hidden);
      materials.forEach(m=>m.dispose());host.style.cursor='';
      assembly.remove(completionLight,completionAim);completionLight.dispose();
      for(const name of ['assemblyInteraction','fragmentHover','fragmentHeld','fragmentGrabs','interactionUsed','assemblyForm','assemblyEnergy','bondsBroken','bondsReconnected','assemblyBonds','anchorPosition','assemblyPoseStep','assemblyReturnProgress','assemblyStory','assemblyAge','assemblyCentering','assemblyRecovery','assemblyLiveMorph','assemblyDeviation','assemblyCompletion','assemblyGlint','fragmentParked','fragmentParkedState'])delete host.dataset[name];
    }
  };
}
