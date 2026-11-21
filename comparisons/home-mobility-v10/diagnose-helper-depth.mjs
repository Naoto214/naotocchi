import fs from 'node:fs';
import assert from 'node:assert/strict';
import zlib from 'node:zlib';
import {createHash} from 'node:crypto';
import {restoreEpisode,complete,source,sx,sy} from './episode-scene.mjs';

// Offline, single-pose geometry. Optional archive independently verifies all 21
// stored request identities and runs the released two-helper planner on each.
const report=JSON.parse(fs.readFileSync(new URL('./evidence/forest-helper-depth.json',import.meta.url)));
const input=report.input, r=input.restoredPose;
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
assert.equal(digest(source),input.nativeSHA256);
if(process.argv[2]&&process.argv[2]!=='--verify-only'){
 const bytes=fs.readFileSync(process.argv[2]);
 assert.equal(digest(bytes),input.archiveSHA256);
 const archive=JSON.parse(zlib.gunzipSync(bytes));
 const archiveRow=archive.log.requests[r.index];
 for(const key of ['key','clock','goal','from','peers','selected','scale'])assert.deepEqual(r[key],archiveRow[key]);
 for(const i of input.requestIndices){
   const row=archive.log.requests[i];
   assert.equal(row.key,input.subject);assert.deepEqual(row.from,r.from);
   assert.equal(row.planned,true);assert.equal(row.accepted,false);
   const trial=restoreEpisode(row);
   assert.equal(complete(trial.model.probe.intentPlan(trial.a,trial.goal)).plan,null);
 }
}
const {model,a,goal,scene}=restoreEpisode(r),p=model.probe,actors=p.actors(),owner=actors.indexOf(a);
const N=actors.length,bit=k=>1<<k;
const dist=(u,v)=>Math.hypot((u.x-v.x)*sx,(u.y-v.y)*sy),length=dist(a,goal),pc=m=>{let n=0;while(m){m&=m-1;n++;}return n;};
function ok(b,from,to,j,z){const peer=actors[j];return p.contactSegmentSafe(from,to,z,(b.w+peer.w)*.5+10,(b.h+peer.h)*.38+10);}
function choices(i,headings,lengths,mustApproach=false){
 const b=actors[i],box=model.bounds(b),ink=scene.planVisibility(b),choices=[];for(const d of lengths)for(let j=0;j<headings+(mustApproach?1:0);j++){
  const exact=j===headings;
  const theta=exact?Math.atan2((goal.y-b.y)*sy,(goal.x-b.x)*sx):j*2*Math.PI/headings,q={x:b.x+d*Math.cos(theta)/sx,y:b.y+d*Math.sin(theta)/sy};
  if(q.x<box.left||q.x>box.right||q.y<box.top||q.y>box.bottom||mustApproach&&length-dist(q,goal)<.75||!scene.navigation.segmentSafe(b,q,ink))continue;
  let blockers=0;for(let k=0;k<N;k++)if(i!==k&&!ok(b,b,q,k,actors[k]))blockers|=bit(k);
  if(!mustApproach&&(blockers&bit(owner)))continue;choices.push({d,deg:theta*180/Math.PI,exact,q,blockers});
 }return choices;
}
const everyone=actors.map((b,i)=>i).filter(i=>i!==owner&&p.canHelpAmbient(actors[i]));
const allowed=everyone.reduce((m,i)=>m|bit(i),0);
const helpers=actors.map((b,i)=>everyone.includes(i)?choices(i,72,[4,8,12,16,20,24]).filter(c=>(c.blockers&~allowed)===0):[]);
// If one initial obstacle set contains another, it cannot make this optimistic
// reachability test easier. Keep the smallest dependency sets; actual endpoints
// are retained separately for the exact check.
function minimalMasks(choices){
 const masks=[];for(const m of new Set(choices.map(z=>z.blockers)))if(!masks.some(n=>(m&n)===n)){
  for(let i=masks.length-1;i>=0;i--)if((masks[i]&m)===m)masks.splice(i,1);
  masks.push(m);
 }return masks;
}
const general=helpers.map(minimalMasks);
const bits=m=>everyone.filter(i=>m&bit(i));
const hist={},directCounts={},certificates=[],exactGoalHeading=[],total={orders:0,triples:0,validRays:0},orderedRoles={},vetoedBy={};
let firstPhysical=null;
for(const o of choices(owner,720,[8,12,18,24],true)){
 let best=Infinity;const left=o.blockers,direct=bits(left);
 const masks=general.slice();
 for(const i of direct){masks[i]=minimalMasks(helpers[i].filter(c=>ok(a,a,o.q,i,c.q)));}
 // A mask represents peers whose original feet have already been vacated.
 // This intentionally ignores where they landed, so failure is a lower bound.
 function search(m,remaining){
  if((m&left)===left)return true;
  if(!remaining||pc(left&~m)>remaining)return false;
  for(const i of everyone){
   const k=bit(i);if(m&k||(!((left&~m)&k)&&pc(left&~m)===remaining))continue;
   if(masks[i].some(mask=>(mask&~m)===0)&&search(m|k,remaining-1))return true;
  }return false;
 }
 if((left&~allowed)===0){
  for(let k=pc(left);k<=3;k++)if(search(0,k)){best=k;break;}
 }
 const name=Number.isFinite(best)?String(best):'moreThan3';
 assert.ok(best>=3,'This certificate is specialized to a pose whose optimistic minimum is three');
 if(o.exact)exactGoalHeading.push({range:o.d,heading:o.deg,direct:pc(left),necessary:name});
 else{
  hist[o.d]??={};hist[o.d][name]=(hist[o.d][name]||0)+1;
  directCounts[o.d]??={};directCounts[o.d][pc(left)]=(directCounts[o.d][pc(left)]||0)+1;
 }
 // For each surviving order put every moved actor back at its actual candidate
 // endpoint, then check the next entire segment. No resident is removed.
 if(name==='3'){
  const orders=[];
  function ordersAt(mask,path){
   if(path.length===3){if((left&mask)===left)orders.push(path);return;}
   for(const i of everyone){
    const k=bit(i);if(mask&k||(!(left&~mask&k)&&pc(left&~mask)===3-path.length))continue;
    if(masks[i].some(m=>(m&~mask)===0))ordersAt(mask|k,[...path,i]);
   }
  }
  ordersAt(0,[]);total.orders+=orders.length;
  let solution=null,triples=0;
  for(const ids of orders){
   const seq=ids.map(id=>actors[id].key).join(' > ');orderedRoles[seq]=(orderedRoles[seq]||0)+1;
   const candidates=ids.map((id,n)=>{
    const pre=ids.slice(0,n).reduce((m,j)=>m|bit(j),0);
    return helpers[id].filter(c=>(c.blockers&~pre)===0&&ok(a,a,o.q,id,c.q));
   });
   for(const one of candidates[0])for(const two of candidates[1]){
    if(!ok(actors[ids[1]],actors[ids[1]],two.q,ids[0],one.q))continue;
    for(const three of candidates[2]){
     triples++;const actor=actors[ids[2]];
     const veto=[!ok(actor,actor,three.q,ids[0],one.q)?actors[ids[0]].key:null,!ok(actor,actor,three.q,ids[1],two.q)?actors[ids[1]].key:null].filter(Boolean).join('|');
     if(veto){vetoedBy[veto]=(vetoedBy[veto]||0)+1;continue;}
     solution=ids.map((id,index)=>({id:actors[id].key,...[one,two,three][index]}));break;
    }
    if(solution)break;
   }
   if(solution)break;
  }
  total.triples+=triples;if(solution){total.validRays++;firstPhysical??={owner:o,helpers:solution};}
  certificates.push({range:o.d,heading:o.deg,orders:orders.length,triples,valid:!!solution});
 }

}

const box=model.bounds(a),near=actors.filter(b=>b!==a).map(b=>({
 key:b.key,gap:Math.hypot((a.x-b.x)/((a.w+b.w)*.5+10),(a.y-b.y)/((a.h+b.h)*.38+10))
})).sort((l,r)=>l.gap-r.gap);
const terrainHeadings=choices(owner,720,[8]).length;
const proof={
 normalOwnProgressFloorCss:.75,ownerRadiiCss:[8,12,18,24],ownerHeadingIncrementDegrees:.5,
 helperRadiiCss:[4,8,12,16,20,24],helperHeadingIncrementDegrees:5,eligibleHelpers:everyone.length,
 normalizedContacts:near.filter(b=>b.gap<1).length,nearestNormalizedGaps:near.slice(0,5),
 roomBounds:box,roomEdgeCss:Math.min((a.x-box.left)*sx,(box.right-a.x)*sx,(a.y-box.top)*sy,(box.bottom-a.y)*sy),
 terrainVisibleBounded8pxDirections:terrainHeadings,
 directBlockerCountsByRadius:directCounts,minimumMoverLowerBoundByRadius:hist,additionalExactGoalRays:exactGoalHeading,
 relaxedSurvivingOrders:orderedRoles,physicalVetoesOfThirdLeg:vetoedBy,firstPhysicalWitness:firstPhysical,
 candidateCounts:total,
 method:'For each goal-progress ray, count its initial blocking ellipses. Enumerate distinct, initially eligible mover orders up to length three; each foot may take one checked straight leg, and the owner must stay still until its final leg. The optimistic bound treats earlier moved feet as gone but preserves every body that has yet to move. Each direct blocker must have an endpoint clear of the owner segment. Exhaustively recombine the retained endpoints of every surviving order. Require continuous clearance from the earlier helpers at their actual destinations before accepting each later leg.',
 scope:'Fixed archived feet, availability and terrain. Native helper radii and 5-degree directions; 0.5-degree owner grid plus the exact raw goal direction at four radii. Different radii, other directions, bent or repeated moves, later independent motion and different rosters are untested. A negative finite result does not establish impossibility for arbitrary continuous paths.'};
assert.equal(total.orders,57);assert.equal(total.triples,465);assert.equal(terrainHeadings,720);assert.equal(total.validRays,0);assert.equal(firstPhysical,null);
if(process.argv.includes('--verify-only')) assert.deepEqual(proof,report.proof);
else console.log(JSON.stringify({input,proof},null,2));
