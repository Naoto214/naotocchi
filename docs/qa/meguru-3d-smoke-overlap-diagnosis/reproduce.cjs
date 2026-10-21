// Read-only diagnostic; synthetic simulation timing, not browser/iPhone performance.
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const {createHash}=require('node:crypto'),{execFileSync}=require('node:child_process');
const digest=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const root=path.resolve(process.argv[2]||'.');process.chdir(root);
const {harness}=require(path.join(root,'tests/helpers/runtime-harness.cjs'));
function run(ms){
 const h=harness({deterministic:true,fullDisplay:true,pinDate:true}),M=h.api.meguruMod,s=h.api.state();
 Object.assign(s,{stage:'growing',speciesLine:'dog',ageTicks:600,isSleeping:false,isSick:false,energy:100,health:100,hunger:85,happiness:90,regionId:'jungle'});
 const cs=Array.from(h.api.normalCompanions).concat(Array.from(h.api.rareCompanions)).slice(0,26);s.companions=cs.map(c=>({id:c.id,bond:100}));s.lifetime.companionsRecruited=cs.map(c=>c.id);
 const pc=Array.from(h.api.partnerCandidates)[0];s.partner={id:pc.id,label:pc.label||pc.name,emoji:pc.emoji,affection:100};s.lifetime.partnersRecorded=[pc.id];
 const S=M.createSimulation({regionId:'jungle',world3d:true,env:{time:'day',weather:'sunny',season:'spring',region:'jungle'}});
 let max=0,witness=null,t=0,f=0;
 const circle=S.world.obstacles.filter(o=>(o.role==='solid'||o.role==='boundary')&&o.shape==='circle');
 function step(v,sample=true){S.step(Math.min(.05,ms/1000),v);t+=ms;f++;if(!sample)return;for(const [i,a] of S.party.entries())for(const o of circle){const p=Math.max(0,o.hw+17.6-Math.hypot(a.x-o.x,a.z-o.z));if(p>max){max=p;witness={f,t,actor:i,key:a.key,x:a.x,z:a.z,obstacle:o,productionPen:M.penetrationAt(S.world,a.x,a.z,17.6),contacts:Array.from(M.collidersAt(S.world,a.x,a.z)).filter(o=>M.colliderPenetration(o,a.x,a.z,17.6)>0).map(o=>({o,pen:M.colliderPenetration(o,a.x,a.z,17.6)})),extraResolve:(()=>{const p={x:a.x,z:a.z},out=[];for(let n=0;n<4;n++){M.resolveObstacles(p,S.world,17.6);out.push({x:p.x,z:p.z,pen:M.penetrationAt(S.world,p.x,p.z,17.6)})}return out})()};}}}
 for(let i=0;i<Math.round(2500/ms);i++)step({x:0,y:0},false);
 for(const [x,y] of [[0,-1],[.7,-.7],[-1,0],[0,-1]]){for(let i=0;i<Math.round(1200/ms);i++)step({x,y});step({x:0,y:0});}
 return {ms,party:S.party.length,max,witness,player:{x:S.player.x,z:S.player.z}};
}
const cases=[50,80,80,100,120].map(run);
assert.equal(JSON.stringify(cases[1]),JSON.stringify(cases[2]),'same schedule: exact serialized numeric/structural equality across distinct VM realms');
assert.ok(cases[1].max>0.003&&cases[1].max<0.01,'80ms schedule has a small non-roundoff residual');
assert.ok(cases[3].max<1e-9,'100ms schedule control lacks that residual');
assert.ok(cases[4].max>0.003&&cases[4].max<0.01,'120ms schedule also reaches the contact');
assert.ok(cases.every(r=>r.party===27),'27 actors');
for(const r of [cases[1],cases[4]]) {
 assert.deepEqual(r.witness.contacts.map(x=>x.o.pi),[37,1133],'palm/log joint contact');
 assert.ok(r.witness.extraResolve[0].pen<r.max/1000,'more unchanged resolver calls on a COPY reduce residual');
 assert.ok(r.witness.extraResolve[3].pen<1e-10,'copy converges near rounding precision');
}
const product=['meguru.js','meguru-3d.mjs','index.html'];
console.log(JSON.stringify({source:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),node:process.version,sourceSHA256:Object.fromEntries(product.map(p=>[p,digest(p)])),diagnosticSHA256:digest(__filename),fixture:{region:'jungle',world3d:true,party:27,seed:20260923,clock:'2026-09-16T12:00:00Z',environment:'day/sunny/spring',idleWallMs:2500,holds:[[0,-1],[0.7,-0.7],[-1,0],[0,-1]],holdWallMs:1200,framesPerInterval:'round(duration/wallFrameMs)',release:'one idle step after each hold',dt:'min(0.05, wallFrameMs/1000)',sampling:'after every simulation step during holds/releases; not actual setInterval(50)'},cases,checks:'PASS',limitations:['Synthetic pad vectors and uniform frame schedules; not original browser event trace.','No actual render/FPS/iPhone measurement.','Read-only production functions; extra solver calls operate on copied points only.','Historical CI omitted actor/obstacle/timestamp witnesses; exact old maxima cannot be attributed conclusively.']},null,2));
