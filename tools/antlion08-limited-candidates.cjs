// QA-only: generated mouth insert and explicitly reviewed detached-particle removal.
// Originals, production assets, marks and all runtime files are read-only.
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const sharp=require(require.resolve('sharp',{paths:[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES]}));
const R=path.resolve(__dirname,'..'),O=path.join(R,'docs/qa/antlion08-limited-candidates-20260928');
const OLD=path.join(R,'docs/qa/antlion08-method-d-nine-20260928/candidates');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const assert=(x,m)=>{if(!x)throw Error(m)};
function components(a){
 const lab=new Int32Array(16384);let id=0;const groups=[];
 for(let i=0;i<16384;i++)if(a[i*4+3]&&!lab[i]){
  const q=[i];lab[i]=++id;
  for(let j=0;j<q.length;j++){
   const x=q[j]%128,y=q[j]>>7;
   for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
    const xx=x+dx,yy=y+dy,k=yy*128+xx;
    if(xx>=0&&xx<128&&yy>=0&&yy<128&&a[k*4+3]&&!lab[k]){lab[k]=id;q.push(k)}
   }
  }
  groups.push(q);
 }
 return {lab,groups};
}
function changes(a,b){const d=[];for(let i=0;i<16384;i++)if(!a.subarray(i*4,i*4+4).equals(b.subarray(i*4,i*4+4)))d.push({xy:[i%128,i>>7],before:[...a.subarray(i*4,i*4+4)],after:[...b.subarray(i*4,i*4+4)]});return d}
(async()=>{
 fs.mkdirSync(path.join(O,'candidates'),{recursive:true});
 const a=await sharp(path.join(OLD,'strained.png')).ensureAlpha().raw().toBuffer();
 const out=Buffer.from(a);
 // Use only generated downturned mouth. Generated large/sad eyes and changed body are rejected.
 const donorBox={left:982,top:626,width:28,height:14},targetBox={left:100,top:63,width:5,height:3};
 const donor=await sharp(path.join(O,'sources/strained-generated.png')).extract(donorBox).resize(5,3,{kernel:'nearest'}).ensureAlpha().raw().toBuffer();
 const palette=[];
 for(let y=59;y<67;y++)for(let x=94;x<106;x++)palette.push([...a.subarray((y*128+x)*4,(y*128+x)*4+3)]);
 for(let y=0;y<3;y++)for(let x=0;x<5;x++){
  const k=(y*5+x)*4,j=((63+y)*128+100+x)*4,c=[...donor.subarray(k,k+3)];
  const dist=v=>v.reduce((s,z,i)=>s+(z-c[i])**2,0);
  const matched=palette.reduce((best,v)=>dist(v)<dist(best)?v:best,palette[0]);
  for(let q=0;q<3;q++)out[j+q]=matched[q];
 }
 const sd=changes(a,out);assert(sd.length>0&&sd.every(p=>p.xy[0]>=100&&p.xy[0]<105&&p.xy[1]>=63&&p.xy[1]<66),'face mask');
 assert(sd.every(p=>p.before[3]===p.after[3]),'alpha changed');
 await sharp(out,{raw:{width:128,height:128,channels:4}}).png({palette:false}).toFile(path.join(O,'candidates/strained-face.png'));
 const c=await sharp(path.join(OLD,'critical.png')).ensureAlpha().raw().toBuffer(),co=Buffer.from(c),cc=components(c);
 // Visually reviewed small detached fragments around larger flecks and trail.
 // This list is a single artistic selection, not a count/density cap or auto-pruning rule.
 const remove=[26,33,38,43,45,47,51,55,58,60,64,65,72,75,81,83,89,94];
 const removal=[];
 for(const id of remove){const g=cc.groups[id-1];assert(g&&g.length<=5,'not small detached fragment');
  assert(g.every(i=>i%128>=8&&i%128<62&&(i>>7)>=59&&(i>>7)<118),'outside rear ROI');
  removal.push({component:id,pixels:g.map(i=>[i%128,i>>7]),reason:'reviewed secondary speck beside retained larger flecks / exterior trail; preserve irregular gaps'});
  for(const i of g)co[i*4+3]=0; // RGB bytes retained even at deleted pixels; no recoloring.
 }
 const cd=changes(c,co),removedSet=new Set(removal.flatMap(g=>g.pixels.map(([x,y])=>y*128+x)));
 assert(cd.every(p=>p.before.slice(0,3).every((v,i)=>v===p.after[i])&&p.before[3]===255&&p.after[3]===0),'not alpha-only deletion');
 assert(cd.length===removedSet.size,'unexpected changes');
 const largest=cc.groups.reduce((b,g)=>g.length>b.length?g:b,[]);
 assert(largest.every(i=>!removedSet.has(i)),'body/trail changed');
 await sharp(co,{raw:{width:128,height:128,channels:4}}).png({palette:false}).toFile(path.join(O,'candidates/critical-particles.png'));
 const audit={source_head:'9a0ff51d5da45e65b6b21db63320c807350c048d',candidate_count:2,
  strained:{original_sha256:hash(fs.readFileSync(path.join(OLD,'strained.png'))),candidate_sha256:hash(fs.readFileSync(path.join(O,'candidates/strained-face.png'))),donor_box:donorBox,target_box:targetBox,palette:'nearest RGB tuple sampled from existing strained face only',changed_pixels:sd.length,changes:sd,outside_face_changed:0,alpha_changed:0,generated_full_sprite_adopted:false},
  critical:{original_sha256:hash(fs.readFileSync(path.join(OLD,'critical.png'))),candidate_sha256:hash(fs.readFileSync(path.join(O,'candidates/critical-particles.png'))),removed_components:remove.length,removed_pixels:cd.length,removal,changes:cd,nonselected_pixels_changed:0,body_connected_component_changed:0,surviving_particle_rgb_changed:0,trail_changed:0,generated_pixels_used:0,method:'manual visual selection of existing detached fragments; generated full-sprite proposal rejected for invariant drift'},
  production_replacement:false,human_approval:false};
 fs.writeFileSync(path.join(O,'pixel-audit.json'),JSON.stringify(audit,null,2)+'\n');console.log(JSON.stringify({strained:sd.length,critical_removed_components:remove.length,critical_removed_pixels:cd.length}));
})();
