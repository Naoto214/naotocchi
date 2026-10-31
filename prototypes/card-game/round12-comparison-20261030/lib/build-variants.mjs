// Builds isolated copies of the official card-game modules for the 10-round / 12-round comparison.
// The official files are only READ, from the commit the experiment runs on (BASE = main 851cf09a) with `git show`.
// The working-tree official files are hashed before and after the build to prove they were not touched.
// Each variant is a full copy in build/<variant>/ with exact-string patches; a patch that does not match
// exactly once aborts the build.
//   R10 : official rules + state-neutral logging hooks only (equivalence with the official engine is checked).
//   R12 : R10 + the round count and the time value extended to 12 (time = round value, as in R10). Nothing else.
//         The CPU (cpu-policy.mjs, heuristic-1) is byte-identical to R10.
//   R12h: sensitivity only. R12 + the three round constants of the CPU evaluation re-anchored to the last round
//         (min(10,..)→min(12,..), round>=8→round>=10, round===10→round===12). For a 10-round game the same
//         re-anchoring is the identity, so R12h answers "is the R12 result an artefact of a 10-round-tuned CPU?".
// Usage: node lib/build-variants.mjs [commit]
import {readdirSync,readFileSync,writeFileSync,mkdirSync,rmSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
const HERE=dirname(fileURLToPath(import.meta.url)),SRC=join(HERE,'..','..'),OUT=join(HERE,'..','build');
const BASE=process.argv[2]??'851cf09a80c7ed41ba7293888084272917e4582c';
const sha=t=>createHash('sha256').update(t).digest('hex');
const git=(...a)=>execFileSync('git',a,{cwd:SRC,maxBuffer:1<<28}).toString();
const files=git('ls-tree','--name-only',BASE,'./').split('\n').map(f=>f.split('/').pop()).filter(f=>f.endsWith('.mjs')).sort();
const source=f=>git('show',`${BASE}:./${f}`);
const tree=()=>Object.fromEntries(readdirSync(SRC).filter(f=>f.endsWith('.mjs')).sort().map(f=>[f,sha(readFileSync(join(SRC,f)))]));
const treeBefore=tree();
const before=Object.fromEntries(files.map(f=>[f,sha(source(f))]));
function patch(text,from,to,label){const n=text.split(from).length-1;if(n!==1)throw Error(`patch ${label}: expected 1 match, found ${n}`);return text.replace(from,()=>to);}

// Logging hooks (state-neutral). Time left at the moment a seat's time is reset = expired time.
const HOOKS=[
 ['reset',"p.time=s.round;p.personUsed=false;","globalThis.__rLog?.({kind:'reset',actor:s.turn,expired:p.time,granted:s.round,round:s.round,growth:{A:s.players.A.growth,B:s.players.B.growth}});p.time=s.round;p.personUsed=false;"],
 ['leave',"if(key==='partner'){p.relationship=null;grow(s,a,-10);}","if(key==='partner'){globalThis.__rLog?.({kind:'leave',actor:a,stage:p.relationship,round:s.round,effectActor:context.effectActor??null,cause:context.cause??'cost'});p.relationship=null;grow(s,a,-10);}"],
];
// Round-count patches (R12 family). VERSION stays 'hotseat-6' on purpose: card rules gate on it
// (e.g. G-frogger-road onlyVersions ['hotseat-6']), so a renamed version would silently change card behaviour.
// The variant is recorded in the experiment log instead; these saves never leave build/.
// Early win (100維持) stays available up to the round before the last;
// the final comparison moves to the last round's second-player turn; restore validation accepts round 11/12.
const ROUNDS=[
 ['early',"if(s.round<10){const winner=","if(s.round<12){const winner="],
 ['final',"if(s.round===10&&s.turn==='B'){const a=s.players.A.growth,b=s.players.B.growth;finish(s,a===b?null:a>b?'A':'B','R10最終比較');return;}","if(s.round===12&&s.turn==='B'){const a=s.players.A.growth,b=s.players.B.growth;finish(s,a===b?null:a>b?'A':'B','R12最終比較');return;}"],
 ['validate',"s.round<1||s.round>10)throw Error(","s.round<1||s.round>12)throw Error("],
 // Found by the pilot (§8 of PLAN.md): validate() also caps each seat's time at 10, so R11 aborted every 12-round game.
 ['validate-time',"p.time<0||p.time>10||","p.time<0||p.time>12||"],
];
const CPU_H=[
 ['cpu-horizon',"Math.min(10,o.round+1)","Math.min(12,o.round+1)"],
 ['cpu-mult',"const growthMult=o=>o.round>=8?2.2:1.6;","const growthMult=o=>o.round>=10?2.2:1.6;"],
 ['cpu-growth',"p.growth))*(n<0?-1:1)*(o.round>=8?2.2:1.6);break;","p.growth))*(n<0?-1:1)*(o.round>=10?2.2:1.6);break;"],
 ['cpu-schedule',"(o.round===10?.1:.65)","(o.round===12?.1:.65)"],
 ['cpu-variant',"100-p.growth)*(o.round>=8?2.2:1.6);","100-p.growth)*(o.round>=10?2.2:1.6);"],
];
const VARIANTS={R10:{rounds:false,cpu:false},R12:{rounds:true,cpu:false},R12h:{rounds:true,cpu:true}};
rmSync(OUT,{recursive:true,force:true});
const manifest={source:'prototypes/card-game/*.mjs',sourceCommit:BASE,sourceSha256:before,variants:{}};
for(const [v,cfg] of Object.entries(VARIANTS)){
 const dir=join(OUT,v);mkdirSync(dir,{recursive:true});const out={};
 for(const f of files)out[f]=source(f);
 let eng=out['engine.mjs'];
 for(const [l,a,b] of HOOKS)eng=patch(eng,a,b,l);
 if(cfg.rounds){for(const [l,a,b] of ROUNDS)eng=patch(eng,a,b,l);
}
 out['engine.mjs']=eng;
 if(cfg.cpu){let p=out['cpu-policy.mjs'];for(const [l,a,b] of CPU_H)p=patch(p,a,b,l);out['cpu-policy.mjs']=p;}
 for(const [f,t] of Object.entries(out))writeFileSync(join(dir,f),t);
 manifest.variants[v]={...cfg,patchedSha256:Object.fromEntries(Object.entries(out).filter(([f,t])=>sha(t)!==before[f]).map(([f,t])=>[f,sha(t)]))};
}
if(JSON.stringify(tree())!==JSON.stringify(treeBefore))throw Error('official sources changed during build');
manifest.officialUnchanged=true;
writeFileSync(join(OUT,'manifest.json'),JSON.stringify(manifest,null,1));
console.log(JSON.stringify(Object.fromEntries(Object.entries(manifest.variants).map(([k,v])=>[k,Object.keys(v.patchedSha256)]))));
