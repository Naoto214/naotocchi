const test=require('node:test'),assert=require('node:assert/strict');
async function make(key){const sp=require('../character-3d/nonplayer-spec.js')()[key].spec,{BUILDERS}=await import('../character-3d/archetypes.mjs'),{THREE}=await import('../character-3d/geometry.mjs'),r=BUILDERS[sp.archetype](sp,key+':0');r.root.updateMatrixWorld(true);return {sp,r,THREE};}
test('deer retains slender proportions with shorter shafts and connected tapered upper legs and joints',async()=>{
 const {sp,r,THREE}=await make('partner:grove_deer'),{joined}=require('./helpers/character-3d-volume-contact.cjs');
 for(const name of ['legFL','legFR','legBL','legBR']){
  const shaft=r.root.getObjectByName(name+':opaque'),g=shaft.geometry;g.computeBoundingBox();
  const length=-g.boundingBox.min.y;assert.ok(length>.40&&length<.52,'deer leg length retains elegance without old stilt proportions');
  const upper=r.root.getObjectByName(name+'Shape:opaque');assert.ok(upper,'anatomical upper leg and joint present');
  assert.ok(joined(THREE,upper,shaft,1),'upper taper joins animated shaft');assert.ok(joined(THREE,upper,shaft,0),'joint joins animated shaft');
  assert.ok(joined(THREE,upper,r.root.getObjectByName('body:opaque'),1),'upper taper embedded in torso');
  upper.geometry.computeBoundingBox();assert.ok(upper.geometry.boundingBox.max.x-upper.geometry.boundingBox.min.x>sp.legs.r*2.4,'upper leg visibly fuller than shin');
  assert.ok(upper.geometry.boundingBox.max.x-upper.geometry.boundingBox.min.x<.13,'not a dog-like thick leg');
 }
});
test('author hair covers rear scalp and forms downward forehead locks without a wide bald center wedge',async()=>{
 const {sp,r,THREE}=await make('author:naoto'),head=r.root.getObjectByName('head:opaque'),c=head.geometry.attributes.color,ray=new THREE.Raycaster(),cy=sp.head.r*.92;
 const hair=hit=>hit&&c.getX(hit.face.a)<.09&&c.getY(hit.face.a)<.06&&c.getZ(hit.face.a)<.06;
 function shoot(x,y,z,dir){ray.set(new THREE.Vector3(x,cy+y,z).applyMatrix4(head.matrixWorld),new THREE.Vector3(0,0,dir).transformDirection(head.matrixWorld));return ray.intersectObject(head)[0];}
 for(const x of [-.16,0,.16])for(const y of [-.13,0,.13])assert.ok(hair(shoot(x,y,-2,1)),'rear scalp covered by assembled hair');
 assert.ok(hair(shoot(0,.22,2,-1)),'central upper forehead has descending hair rather than old wide center wedge');
 // Approved E has a shorter fringe on the part side; exact full-row hash is frozen separately.
 for(const [x,y] of [[-.18,.14],[.18,.10]])assert.ok(hair(shoot(x,y,2,-1)),'forehead locks descend towards temples');
 assert.ok(!hair(shoot(0,.04,2,-1)),'lower forehead/face remains clear');
});
