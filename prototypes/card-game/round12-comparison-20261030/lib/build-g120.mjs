// Builds the A–D conditions of the "12 rounds / growth 120 / 120維持" comparison (PLAN-G120.md) from main 7c1f18c7
// (CPU heuristic-2, the official CPU since PR #493). Official files are only READ with `git show`; the working-tree
// official .mjs files are hashed before and after. Output: build/G-A … build/G-D (+ build/G-D0), build/g120-manifest.json.
// Run after lib/build-variants.mjs (that script clears build/).
//   rounds 10|12  : number of rounds (and time up to the round value). Same 4 engine patches as R12 in build-variants.mjs.
//   cap 100|120   : growth ceiling. Kept SEPARATE from the maintenance-win target below.
//   hold 100|120  : value that must be held for the early (maintenance) win.
//   cpuCap        : the growth ceiling the CPU uses in its "room left to grow" terms (5 sites in cpu-policy.mjs). This is a
//                   rule constant inside the CPU, not a decision rule; D0 keeps the official 100 as a sensitivity check.
import {readdirSync,readFileSync,writeFileSync,mkdirSync,rmSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
const HERE=dirname(fileURLToPath(import.meta.url)),SRC=join(HERE,'..','..'),OUT=join(HERE,'..','build');
const BASE=process.argv[2]??'7c1f18c7';
const sha=t=>createHash('sha256').update(t).digest('hex');
const git=(...a)=>execFileSync('git',a,{cwd:SRC,maxBuffer:1<<28}).toString();
const commit=git('rev-parse',BASE).trim();
const files=git('ls-tree','--name-only',commit,'./').split('\n').map(f=>f.split('/').pop()).filter(f=>f.endsWith('.mjs')).sort();
const source=f=>git('show',`${commit}:./${f}`);
const tree=()=>Object.fromEntries(readdirSync(SRC).filter(f=>f.endsWith('.mjs')).sort().map(f=>[f,sha(readFileSync(join(SRC,f)))]));
const treeBefore=tree();
const before=Object.fromEntries(files.map(f=>[f,sha(source(f))]));
function patch(text,from,to,label){const n=text.split(from).length-1;if(n!==1)throw Error(`patch ${label}: expected 1 match, found ${n}`);return text.replace(from,()=>to);}
function patchAll(text,from,to,label,count){const n=text.split(from).length-1;if(n!==count)throw Error(`patch ${label}: expected ${count} matches, found ${n}`);return text.split(from).join(to);}

const HOOKS=[ // state-neutral logging (same as build-variants.mjs)
 ['reset',"p.time=s.round;p.personUsed=false;","globalThis.__rLog?.({kind:'reset',actor:s.turn,expired:p.time,granted:s.round,round:s.round,growth:{A:s.players.A.growth,B:s.players.B.growth}});p.time=s.round;p.personUsed=false;"],
 ['leave',"if(key==='partner'){p.relationship=null;grow(s,a,-10);}","if(key==='partner'){globalThis.__rLog?.({kind:'leave',actor:a,stage:p.relationship,round:s.round,effectActor:context.effectActor??null,cause:context.cause??'cost'});p.relationship=null;grow(s,a,-10);}"],
];
const ROUNDS12=[
 ['early-window',"if(s.round<10){const winner=","if(s.round<12){const winner="],
 ['final',"if(s.round===10&&s.turn==='B'){const a=s.players.A.growth,b=s.players.B.growth;finish(s,a===b?null:a>b?'A':'B','R10最終比較');return;}","if(s.round===12&&s.turn==='B'){const a=s.players.A.growth,b=s.players.B.growth;finish(s,a===b?null:a>b?'A':'B','R12最終比較');return;}"],
 ['validate-round',"s.round<1||s.round>10)throw Error(","s.round<1||s.round>12)throw Error("],
 ['validate-time',"p.time<0||p.time>10||","p.time<0||p.time>12||"],
];
// Growth ceiling (cap) and maintenance target (hold) are separate engine sites:
//   grow(): clamp to cap; the "reached" clock starts when growth reaches HOLD and stops below HOLD.
//   endTurn(): early win when growth===HOLD and the clock has run; validate(): growth<=cap.
const capPatches=(cap,hold)=>[
 ['grow-clamp',"p.growth=Math.max(0,Math.min(100,old+n));",`p.growth=Math.max(0,Math.min(${cap},old+n));`],
 ['grow-reached',"if(p.growth<100)p.reached=null;else if(old<100)p.reached=",`if(p.growth<${hold})p.reached=null;else if(old<${hold})p.reached=`],
 ['hold-win',"const winner=['A','B'].find(a=>s.players[a].growth===100&&",`const winner=['A','B'].find(a=>s.players[a].growth>=${hold}&&`],
 ['hold-reason',"if(winner){finish(s,winner,'100維持');return;}",`if(winner){finish(s,winner,'${hold}維持');return;}`],
 ['validate-growth',"p.growth<0||p.growth>100||",`p.growth<0||p.growth>${cap}||`],
];
const VARIANTS={
 'G-A':{rounds:10,cap:100,hold:100,cpuCap:100,note:'A 現行：10R・上限100・100維持（main 7c1f18c7 そのもの＋記録フック）'},
 'G-B':{rounds:12,cap:100,hold:100,cpuCap:100,note:'B ラウンド延長のみ：12R・上限100・100維持'},
 'G-C':{rounds:10,cap:120,hold:120,cpuCap:120,note:'C そだち拡張のみ：10R・上限120・120維持'},
 'G-D':{rounds:12,cap:120,hold:120,cpuCap:120,note:'D 時計統一案：12R・上限120・120維持'},
 'G-D0':{rounds:12,cap:120,hold:120,cpuCap:100,note:'感度分析：D のまま、CPU のそだち上限定数だけ正式の100'},
 'G-OFF':{raw:true,note:'等価性確認用：main 7c1f18c7 の無改変の写し（記録フックなし）'},
};
for(const v of Object.keys(VARIANTS))rmSync(join(OUT,v),{recursive:true,force:true});
const manifest={source:'prototypes/card-game/*.mjs',sourceCommit:commit,sourceSha256:before,variants:{}};
for(const [v,cfg] of Object.entries(VARIANTS)){
 const dir=join(OUT,v);mkdirSync(dir,{recursive:true});const out={};
 for(const f of files)out[f]=source(f);
 if(cfg.raw){for(const [f,t] of Object.entries(out))writeFileSync(join(dir,f),t);manifest.variants[v]={...cfg,patchedSha256:{}};continue;}
 let eng=out['engine.mjs'];
 for(const [l,a,b] of HOOKS)eng=patch(eng,a,b,l);
 if(cfg.rounds===12)for(const [l,a,b] of ROUNDS12)eng=patch(eng,a,b,l);
 // hold-win uses >= so a cap above the hold value still counts; with cap===hold it is identical to the official ===.
 for(const [l,a,b] of capPatches(cfg.cap,cfg.hold))eng=patch(eng,a,b,l);
 out['engine.mjs']=eng;
 if(cfg.cpuCap!==100){let p=out['cpu-policy.mjs'];
  p=patchAll(p,"100-me.growth",`${cfg.cpuCap}-me.growth`,'cpu-outcome-me',1);
  p=patchAll(p,"100-op.growth",`${cfg.cpuCap}-op.growth`,'cpu-outcome-op',1);
  p=patchAll(p,":100-(s.to==='opponent'",`:${cfg.cpuCap}-(s.to==='opponent'`,'cpu-growth',1);
  p=patchAll(p,"opp.growth:100-p.growth)",`opp.growth:${cfg.cpuCap}-p.growth)`,'cpu-variant',1);
  p=patchAll(p,"a.timeSkipBonus??0,100-p.growth)",`a.timeSkipBonus??0,${cfg.cpuCap}-p.growth)`,'cpu-timeskip',1);
  out['cpu-policy.mjs']=p;}
 for(const [f,t] of Object.entries(out))writeFileSync(join(dir,f),t);
 manifest.variants[v]={...cfg,patchedSha256:Object.fromEntries(Object.entries(out).filter(([f,t])=>sha(t)!==before[f]).map(([f,t])=>[f,sha(t)]))};
}
if(JSON.stringify(tree())!==JSON.stringify(treeBefore))throw Error('official sources changed during build');
manifest.officialUnchanged=true;
writeFileSync(join(OUT,'g120-manifest.json'),JSON.stringify(manifest,null,1));
console.log(commit,JSON.stringify(Object.fromEntries(Object.entries(manifest.variants).map(([k,v])=>[k,Object.keys(v.patchedSha256)]))));
