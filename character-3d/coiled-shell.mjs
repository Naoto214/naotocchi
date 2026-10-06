// Thick coiled tube with a genuine aperture and continuous inner wall.
// Numeric shell profile is source-derived data; no species-name generation.
import {THREE,paint,mix,xform} from './geometry.mjs';
export function coiledShell(e){
 const points=[];
 for(let i=0;i<=40;i++){const t=i/40,a=(t-1)*Math.PI*2*e.turns,r=.025+e.coil*t;points.push(new THREE.Vector3(-e.length*Math.pow(1-t,1.12),Math.sin(a)*r,Math.cos(a)*r));}
 points.push(new THREE.Vector3(0,0,e.mouth[2]-.09),new THREE.Vector3(...e.mouth));
 const curve=new THREE.CatmullRomCurve3(points,false,'centripetal'),steps=100,sides=14,frames=curve.computeFrenetFrames(steps,false),pos=[],idx=[],samples=[];
 for(let layer=0;layer<2;layer++)for(let i=0;i<=steps;i++){
  const t=i/steps,p=curve.getPointAt(t),outer=(.018+(e.radius-.018)*Math.pow(t,1.8))*(1+.035*Math.sin(t*Math.PI*28)),r=layer?Math.max(.004,outer-.025):outer;
  for(let j=0;j<=sides;j++){const a=j/sides*Math.PI*2,v=p.clone().addScaledVector(frames.normals[i],Math.cos(a)*r).addScaledVector(frames.binormals[i],Math.sin(a)*r);pos.push(v.x,v.y,v.z);samples.push({t,inner:!!layer});}
 }
 const stride=sides+1,offset=(steps+1)*stride;
 for(let layer=0;layer<2;layer++)for(let i=0;i<steps;i++)for(let j=0;j<sides;j++){const a=layer*offset+i*stride+j,b=a+stride;const tri=[a,a+1,b,b,a+1,b+1];if(layer)for(let k=0;k<6;k+=3)idx.push(tri[k+2],tri[k+1],tri[k]);else idx.push(...tri);}
 for(const i of [0,steps])for(let j=0;j<sides;j++){const a=i*stride+j,b=a+offset;if(i)idx.push(a,b,a+1,b,b+1,a+1);else idx.push(a,a+1,b,b,a+1,b+1);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();
 paint(g,(x,y,z,nx,ny,nz,i)=>{const s=samples[i];return s.inner?e.colors.inside:mix(e.colors.base,e.colors.band,Math.pow(Math.max(0,Math.cos(s.t*Math.PI*e.bands)),3));});
 return xform(g,{scale:e.scale||1,rot:e.rotation||[0,0,0]});
}
