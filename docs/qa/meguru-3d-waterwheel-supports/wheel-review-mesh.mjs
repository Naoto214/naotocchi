// Narrow geometry verification, not renderer/browser or human visual QA.
// Reproduces the existing production log geometry and pose convention from
// meguru-3d.mjs, using actual production wheel descriptors from meguru.js.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import * as T from '../../../vendor/three-0.170.0/three.module.min.js';
const require=createRequire(import.meta.url);
const {harness}=require('../../../tests/helpers/runtime-harness.cjs');
const M=harness({deterministic:true,fullDisplay:true,pinDate:true}).api.meguruMod;
const reg=M.buildRegistry();
let count=0;
for(const region of ['countryside','river_lake']) {
  const wheel=M.worldObjects3d(M.buildWorld(region,reg,{world3d:true})).objects.find(o=>o.type==='wheel');
  assert.ok(wheel);
  const ring=wheel.parts.find(p=>p.shape==='arch');
  const axle=wheel.parts.find(p=>p.shape==='log');
  const supports=wheel.parts.filter(p=>p.shape==='wpost');
  assert.ok(axle);assert.equal(supports.length,2);
  for(const rotation of [0,.73,Math.PI/2,-2.1]) {
    const delta=rotation-ring.ang;
    // Production GEO.log, then production case 'log' transform.
    const geo=new T.CylinderGeometry(1,1,1,8);
    geo.rotateZ(Math.PI/2);geo.translate(0,1,0);
    const mesh=new T.Mesh(geo,new T.MeshBasicMaterial({side:T.DoubleSide}));
    mesh.position.set(0,axle.y||0,0);
    mesh.rotation.y=Math.PI/2-(axle.ang+delta);
    mesh.scale.set(axle.len,axle.r,axle.r);
    mesh.updateMatrixWorld(true);
    const hits=[];
    for(const support of supports) {
      const dx=support.dx||0,dz=support.dz||0;
      const x=Math.cos(delta)*dx+Math.sin(delta)*dz;
      const z=-Math.sin(delta)*dx+Math.cos(delta)*dz;
      const top=(support.y||0)+support.h;
      const ray=new T.Raycaster(new T.Vector3(x,top-1,-z),new T.Vector3(0,1,0));
      const hit=ray.intersectObject(mesh)[0];
      assert.ok(hit,'ray intersects axle');
      assert.ok(Math.abs(hit.point.y-top)<1e-8,'support meets rendered axle underside');
      assert.ok(Math.hypot(dx,dz)+support.r<=wheel.collision.hd+1e-8,'support fits canonical collider');
      hits.push({supportTop:top,axleUnderside:hit.point.y});
    }
    assert.ok(axle.len/2<=wheel.collision.hd,'axle fits canonical collider');
    console.log(JSON.stringify({wheel:wheel.id,rotation,ringRadius:ring.r,hubHeight:ring.y,axleRadius:axle.r,axleLength:axle.len,colliderHalfDepth:wheel.collision.hd,hits}));
    geo.dispose();mesh.material.dispose();count++;
  }
}
console.log(`PASS: ${count} geometry cases; two support contacts per case. This is narrow mesh verification, not browser/rendered visual QA.`);
