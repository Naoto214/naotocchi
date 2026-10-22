// Home-only Canvas fallback: projects the SAME Three geometry when WebGL is unavailable.
// It intentionally omits texture maps / shaders; never report this as GPU QA.
import * as THREE from './vendor/three-0.170.0/three.module.min.js';
export function createSoftwareRenderer(canvas){
 const ctx=canvas.getContext('2d');if(!ctx)throw Error('Canvas unavailable');let W=1,H=1,dpr=1,released=false;const textureColors=new WeakMap();
 function textureColor(texture){if(textureColors.has(texture))return textureColors.get(texture);let c=new THREE.Color(1,1,1);try{const img=texture.image;if(img?.getContext){const d=img.getContext("2d").getImageData(Math.floor(img.width/2),Math.floor(img.height/2),1,1).data;c.setRGB(d[0]/255,d[1]/255,d[2]/255,THREE.SRGBColorSpace);}}catch{}textureColors.set(texture,c);return c;}
 const matrix=new THREE.Matrix4(),model=new THREE.Matrix4(),view=new THREE.Matrix4(),vp=new THREE.Matrix4(),v=new THREE.Vector3(),n=new THREE.Vector3(),baseColor=new THREE.Color();
 const info={render:{calls:0,triangles:0},memory:{textures:0,geometries:0}};
 function render(scene,camera){if(released)return;camera.updateMatrixWorld();scene.updateMatrixWorld();vp.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);
  ctx.clearRect(0,0,W,H);let bg='#bad3c8';if(scene.background?.isColor)bg='#'+scene.background.getHexString();const sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,bg);sky.addColorStop(1,'#e6eddf');ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
  const triangles=[],geometries=new Set();info.render.calls=0;
  scene.traverse(mesh=>{if(!mesh.isMesh||!mesh.visible||!mesh.geometry||!mesh.material)return;const mat=Array.isArray(mesh.material)?mesh.material[0]:mesh.material;if(!mat.visible||mat.opacity===0||mat.map&&!mat.vertexColors&&mesh.geometry.attributes.uv&&mesh.name===''){
    // Mesh textures can be ground/water; only omit transparent actor billboards.
    if(mat.alphaTest>0)return;
   }
   const g=mesh.geometry,pos=g.attributes.position,index=g.index?.array,colors=g.attributes.color,normals=g.attributes.normal;if(!pos)return;geometries.add(g);const count=mesh.isInstancedMesh?mesh.count:1;
   for(let instance=0;instance<count;instance++){
    if(mesh.isInstancedMesh){mesh.getMatrixAt(instance,matrix);model.multiplyMatrices(mesh.matrixWorld,matrix);}else model.copy(mesh.matrixWorld);
    if(Math.abs(model.determinant())<1e-10)continue;
    view.multiplyMatrices(vp,model);baseColor.copy(mat.color||new THREE.Color('#ffffff'));if(mat.map)baseColor.multiply(textureColor(mat.map));if(mesh.instanceColor){const ic=new THREE.Color();mesh.getColorAt(instance,ic);baseColor.multiply(ic);}
    const points=[],worldZ=model.elements[14],wind=mat.userData?.livingWind;
    for(let i=0;i<pos.count;i++){v.fromBufferAttribute(pos,i);if(wind){const phase=model.elements[12]*.012+worldZ*.008;v.x+=(Math.sin(wind.clock.value*.85+phase)+.35*Math.sin(wind.clock.value*1.43+phase*.7))*wind.amplitude/Math.max(1,Math.abs(model.elements[0]))*Math.min(1,Math.max(0,v.y+.55));}v.applyMatrix4(view);points.push([(v.x+1)*W/2,(1-v.y)*H/2,v.z]);}
    const len=index?index.length:pos.count;
    for(let j=0;j<len;j+=3){const ia=index?index[j]:j,ib=index?index[j+1]:j+1,ic=index?index[j+2]:j+2,a=points[ia],b=points[ib],c=points[ic];if(!a||!b||!c||a[2]>1||b[2]>1||c[2]>1||a[2]<-1||b[2]<-1||c[2]<-1)continue;
      if(Math.max(a[0],b[0],c[0])<0||Math.min(a[0],b[0],c[0])>W||Math.max(a[1],b[1],c[1])<0||Math.min(a[1],b[1],c[1])>H)continue;
      const cross=(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);if(mat.side!==THREE.DoubleSide&&cross>=0)continue;
      let light=1;if(!mat.isMeshBasicMaterial&&normals){n.fromBufferAttribute(normals,ia).transformDirection(model);light=.68+.32*Math.max(0,n.dot(new THREE.Vector3(-.35,.85,.4).normalize()));}
      let r=baseColor.r,gg=baseColor.g,bb=baseColor.b;if(mat.vertexColors&&colors){r*=colors.getX(ia);gg*=colors.getY(ia);bb*=colors.getZ(ia);}if(mat.userData.livingWater){light*=1+.08*Math.sin(mat.userData.livingWater.value*1.2+(a[0]+b[0]+c[0])*.008);}
      const col=new THREE.Color(r*light,gg*light,bb*light);
      triangles.push({layer:mesh.userData.softwareSurface??mat.userData.softwareSurface??0,a,b,c,z:(a[2]+b[2]+c[2])/3,color:'#'+col.getHexString(),alpha:mat.transparent?mat.opacity:1});
    }
   }info.render.calls++;
  });
  triangles.sort((a,b)=>a.layer-b.layer||b.z-a.z);for(const t of triangles){ctx.globalAlpha=t.alpha;ctx.fillStyle=t.color;ctx.beginPath();ctx.moveTo(t.a[0],t.a[1]);ctx.lineTo(t.b[0],t.b[1]);ctx.lineTo(t.c[0],t.c[1]);ctx.closePath();ctx.fill();if(t.alpha===1){ctx.strokeStyle=t.color;ctx.lineWidth=.5;ctx.stroke();}}ctx.globalAlpha=1;info.render.triangles=triangles.length;info.memory.geometries=geometries.size;
 }
 return {software:true,domElement:canvas,debug:{},info,capabilities:{isWebGL2:false},renderLists:{dispose(){}},setClearColor(){},setPixelRatio(v){dpr=v;},getPixelRatio:()=>dpr,setSize(w,h){W=w;H=h;canvas.width=w;canvas.height=h;},compile(){},render,clear(){ctx.clearRect(0,0,W,H);},dispose(){released=true;},forceContextLoss(){},getContext:()=>ctx};
}
