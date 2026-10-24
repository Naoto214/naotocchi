// Shared, opt-in environmental presentation. No world or gameplay mutations.
export function installWind(material,clock,amplitude=3){
 material.userData.livingWind={clock,amplitude};
 const prior=material.onBeforeCompile;
 material.onBeforeCompile=function(shader,...rest){prior.call(this,shader,...rest);shader.uniforms.livingTime=clock;shader.uniforms.livingWind={value:amplitude};
  shader.vertexShader='uniform float livingTime; uniform float livingWind;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`#include <project_vertex>
    #ifdef USE_INSTANCING
      float phase = instanceMatrix[3].x * .012 + instanceMatrix[3].z * .008;
      float wave = sin(livingTime * .85 + phase) + .35 * sin(livingTime * 1.43 + phase * .7);
      mvPosition.x += wave * livingWind * clamp(position.y + .55, 0., 1.);
      gl_Position = projectionMatrix * mvPosition;
    #endif`);
 };
 material.customProgramCacheKey=()=> 'living-wind-v1';material.needsUpdate=true;
}
export function drawProjectedLife(ctx,actors,project,time){
 for(const a of actors||[]){if(a.kind==='car'||a.kind==='fish')continue;const p=project(a.x,a.y,a.z);if(!p)continue;const q=project(a.x,a.y+60,a.z);const k=Math.max(.35,Math.min(1.6,q?Math.abs(q.sy-p.sy)/25:.7));
  ctx.save();ctx.translate(p.sx,p.sy);ctx.scale(k*a.direction,k);const flap=Math.sin(time*.012+a.phase);
  if(a.kind==='bird'){ctx.strokeStyle='#344c4c';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-13,-5-flap*6);ctx.quadraticCurveTo(-6,-7,0,0);ctx.quadraticCurveTo(6,-7,13,-5-flap*6);ctx.stroke();}
  if(a.kind==='butterfly'){ctx.fillStyle='#eac279';ctx.beginPath();ctx.ellipse(-3,0,2+Math.abs(flap)*4,5,-.3,0,Math.PI*2);ctx.ellipse(3,0,2+Math.abs(flap)*4,5,.3,0,Math.PI*2);ctx.fill();}
  if(a.kind==='pedestrian'){ctx.fillStyle='#d9b89c';ctx.beginPath();ctx.arc(0,-27,4,0,Math.PI*2);ctx.fill();ctx.fillStyle=a.id%2?'#597b91':'#bb886b';ctx.fillRect(-5,-22,10,14);ctx.strokeStyle='#43535d';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-2,-8);ctx.lineTo(-3-flap*3,0);ctx.moveTo(2,-8);ctx.lineTo(3+flap*3,0);ctx.stroke();}
  ctx.restore();
 }
}

// Fixed-size 3D pool: fish participate in terrain depth and are tinted by the
// translucent shared water above them. No Canvas overlay can draw over a bank.
export function createAquaticLife(THREE,scene,keep){
 const bodyGeo=keep(new THREE.SphereGeometry(1,8,4));
 const tailGeo=keep(new THREE.BufferGeometry());tailGeo.setAttribute('position',new THREE.Float32BufferAttribute([-19,0,0,-35,0,-10,-35,0,10],3));tailGeo.computeVertexNormals();
 const ringGeo=keep(new THREE.RingGeometry(.9,1,24));ringGeo.rotateX(-Math.PI/2);
 const bodyMat=keep(new THREE.MeshLambertMaterial({color:'#244e57',side:THREE.DoubleSide}));
 const shadowMat=keep(new THREE.MeshBasicMaterial({color:'#233e42',transparent:true,opacity:.18,depthWrite:false}));
 const pool=Array.from({length:8},()=>{
  const fish=Array.from({length:3},()=>{
   const body=new THREE.Mesh(bodyGeo,bodyMat),tail=new THREE.Mesh(tailGeo,bodyMat),shadow=new THREE.Mesh(bodyGeo,shadowMat);
   body.name='home-fish-body';tail.name='home-fish-tail';shadow.name='home-fish-shadow';
   for(const m of [body,tail,shadow]){m.visible=false;m.frustumCulled=false;m.userData.softwareSurface=-1.5;scene.add(m);}
   return {body,tail,shadow};
  });
  const mat=keep(new THREE.MeshBasicMaterial({color:'#d4f1e9',transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide}));
  const ripple=new THREE.Mesh(ringGeo,mat);ripple.name='home-fish-ripple';ripple.visible=false;ripple.userData.softwareSurface=-.9;scene.add(ripple);
  return {fish,ripple};
 });
 return {update(actors,time){
  const list=(actors||[]).filter(a=>a.kind==='fish');
  pool.forEach((group,i)=>{const a=list[i];
   group.fish.forEach(({body,tail,shadow},j)=>{
    for(const m of [body,tail,shadow])m.visible=!!a;if(!a)return;
    const x=a.x-j*52*a.direction,z=a.z+(j===1?-30:j===2?32:0),size=1-j*.12;
    body.position.set(x,a.y,-z);body.scale.set(24*size,1.6*size,7*size);
    tail.position.copy(body.position);tail.scale.set(size,size,size);tail.rotation.y=(a.direction<0?Math.PI:0)+Math.sin(time*7+a.phase+j)*.22;
    shadow.position.set(x+4,-22.2,-z+4);shadow.scale.set(26*size,.14,9*size);
   });
   const ripple=group.ripple,cycle=a?(time*.27+a.phase)%1:0;
   ripple.visible=!!a&&cycle<.7;
   if(a){ripple.position.set(a.x,-10.65,-a.z);ripple.scale.setScalar(10+cycle*58);ripple.material.opacity=.2*(1-cycle/.7);}
  });
 }};
}
