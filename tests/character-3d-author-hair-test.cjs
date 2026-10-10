const test=require('node:test'),assert=require('node:assert/strict');
const {components}=require('./helpers/character-3d-volume-contact.cjs');
async function make(){const {THREE}=await import('../character-3d/geometry.mjs'),{BUILDERS}=await import('../character-3d/archetypes.mjs'),sp=require('../character-3d/nonplayer-spec.js')()['author:naoto'].spec,r=BUILDERS.humanoid(sp,'author:naoto:0');r.root.updateMatrixWorld(true);return {THREE,sp,r,head:r.parts.find(p=>p.bone==='head').mesh};}
// Test the visible assembled indexed surface. Hidden source paths cannot satisfy this.
function assertSourceHair({THREE,sp,head}){
 const g=head.geometry,p=g.attributes.position,c=g.attributes.color,shells=components(THREE,g),waveOfVertex=new Map();assert.equal(shells.length,12,'closed skull ears rear crown and eight source waves');
 for(let n=4;n<shells.length;n++)for(const i of shells[n].geometry.index.array)waveOfVertex.set(i,n-4);
 const center=sp.head.r*.92,z0=.02,ray=new THREE.Raycaster(),shoot=(x,y)=>{const local=new THREE.Vector3(x,center+y,2),dir=new THREE.Vector3(0,0,-1).transformDirection(head.matrixWorld);ray.set(local.applyMatrix4(head.matrixWorld),dir);return ray.intersectObject(head)[0];},isHair=h=>c.getX(h.face.a)<.09&&c.getY(h.face.a)<.06&&c.getZ(h.face.a)<.06;
 for(const y of [.16,.19,.22])for(const x of [-.025,0,.025]){const hit=shoot(x,y);assert.ok(hit&&!isHair(hit),'center-part exposes central forehead on assembled front surface');}
 const visible=new Set();for(const side of [-1,1]){let low=Infinity,high=-Infinity,outer=0;for(let x=.08;x<=.36;x+=.008)for(let y=-.10;y<=.32;y+=.008){const hit=shoot(side*x,y);if(!hit||!isHair(hit))continue;const wave=waveOfVertex.get(hit.face.a);if(wave===undefined)continue;visible.add(wave);low=Math.min(low,y);high=Math.max(high,y);outer=Math.max(outer,x);}assert.ok(low<-.025&&high>.245,'visible side-swept locks descend from crown to ear level');assert.ok(outer>.30,'visible wavy side silhouette extends beyond old smooth cap');}
 assert.ok(visible.size>=6,'at least six individual waves are visible on the assembled surface');
}
test('author assembled hair exposes center part and visible descending layered brunette side sweeps',async()=>assertSourceHair(await make()));
module.exports={assertSourceHair};
const {joined}=require('./helpers/character-3d-volume-contact.cjs');
test('author every produced hair constituent reaches skull through actual closed-volume contacts',async()=>{const {THREE,head}=await make(),shells=components(THREE,head.geometry),seen=new Set([0]),queue=[0];for(const i of queue)for(let j=1;j<shells.length;j++)if(!seen.has(j)&&joined(THREE,head,head,i,j)){seen.add(j);queue.push(j);}assert.equal(seen.size,shells.length,'every hair and ear shell reaches actual skull');});
