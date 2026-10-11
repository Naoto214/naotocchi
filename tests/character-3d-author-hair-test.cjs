const test=require('node:test'),assert=require('node:assert/strict');
const {components}=require('./helpers/character-3d-volume-contact.cjs');
async function make(){const {THREE}=await import('../character-3d/geometry.mjs'),{BUILDERS}=await import('../character-3d/archetypes.mjs'),sp=require('../character-3d/nonplayer-spec.js')()['author:naoto'].spec,r=BUILDERS.humanoid(sp,'author:naoto:0');r.root.updateMatrixWorld(true);return {THREE,sp,r,head:r.parts.find(p=>p.bone==='head').mesh};}
// Test the visible assembled indexed surface. Hidden source paths cannot satisfy this.
function assertSourceHair({THREE,sp,head}){
 const c=head.geometry.attributes.color,center=sp.head.r*.92,ray=new THREE.Raycaster();
 const shoot=(x,y,z,dir)=>{ray.set(new THREE.Vector3(x,center+y,z).applyMatrix4(head.matrixWorld),new THREE.Vector3(0,0,dir).transformDirection(head.matrixWorld));return ray.intersectObject(head)[0];};
 const hair=h=>h&&c.getX(h.face.a)<.09&&c.getY(h.face.a)<.06&&c.getZ(h.face.a)<.06;
 for(const x of [-.16,0,.16])for(const y of [-.13,0,.13])assert.ok(hair(shoot(x,y,-2,1)),'rear scalp covered');
 assert.ok(hair(shoot(0,.22,2,-1)),'downward central fringe');
 for(const x of [-.18,.18])assert.ok(hair(shoot(x,.10,2,-1)),'descending temple fringe');
 assert.ok(!hair(shoot(0,.04,2,-1)),'lower forehead remains clear');
}
test('author assembled hair follows revised Human QA forehead and rear coverage',async()=>assertSourceHair(await make()));
module.exports={assertSourceHair};
const {joined}=require('./helpers/character-3d-volume-contact.cjs');
test('author every produced hair constituent reaches skull through actual closed-volume contacts',async()=>{const {THREE,head}=await make(),shells=components(THREE,head.geometry),seen=new Set([0]),queue=[0];for(const i of queue)for(let j=1;j<shells.length;j++)if(!seen.has(j)&&joined(THREE,head,head,i,j)){seen.add(j);queue.push(j);}assert.equal(seen.size,shells.length,'every hair and ear shell reaches actual skull');});
