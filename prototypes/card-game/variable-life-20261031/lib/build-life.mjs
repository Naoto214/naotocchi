// Builds the isolated "variable life" conditions (PLAN.md) from main 7c1f18c7 (CPU heuristic-2).
// Official files are only READ with `git show`; the working-tree official .mjs files are hashed before and after.
// Output (not tracked by git): build/<variant>/ — a full copy of the card-game modules with these additions only:
//   * full-catalog.mjs : 4 provisional experiment cards (X-*) appended. The 452 official entries are untouched.
//   * rules.mjs        : rule programs for the X-* cards of this variant.
//   * engine.mjs       : state `life` = {final round, growth cap and maintenance target per seat}. Defaults 10 / 100 / 100,
//                        so a game without X-* cards plays exactly like the official engine (checked by saveSha, PLAN §6).
//   * effects.mjs      : ops lifeExtend / lifeRaise / lifeBoth and their play conditions.
//   * cpu-observation.mjs : exposes the public `life` state to the CPU.
//   * cpu-policy.mjs   : experiment-only CPU helper. The decision method is heuristic-2; the rule constants 10 (final round)
//                        and 100 (growth cap) are read from `life` (identical values without X-* cards), and the three new
//                        ops get an explicit evaluation (lifeValue). The official CPU is never changed.
import {readdirSync,readFileSync,writeFileSync,mkdirSync,rmSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
const HERE=dirname(fileURLToPath(import.meta.url)),SRC=join(HERE,'..','..'),OUT=process.env.LIFE_OUT??join(HERE,'..','build');
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

import {VARIANTS,cards,rulesAppendix,HOOKS,ENGINE,effectsPatches,OBSERVATION,policyPatches,worldCards,worldRules,ENGINE_WORLD,EFFECTS_WORLD,policyWorld,timeCards,timeRules,ENGINE_TIME,EFFECTS_TIME,policyTime,EXTRA_BLANKS,extraBlankRules,newCards,newRules,EFFECTS_V4,EFFECTS_TIME_U12,ENGINE_V4,policyV4,v5Cards,v5Rules,EFFECTS_V5,policyV5,EFFECTS_V6_LOG,policyV6,HOOKS_H8} from './life-patches.mjs';


const ONLY=process.env.LIFE_ONLY?.split(',');const H8=source('engine.mjs').includes('breakupPenalty(s,stage)');
for(const v of Object.keys(VARIANTS))if(!ONLY||ONLY.includes(v))rmSync(join(OUT,v),{recursive:true,force:true});
const manifest={source:'prototypes/card-game/*.mjs',sourceCommit:commit,sourceSha256:before,variants:{}};
for(const [v,cfg] of Object.entries(VARIANTS)){if(ONLY&&!ONLY.includes(v))continue;
 const dir=join(OUT,v);mkdirSync(dir,{recursive:true});const out={};
 for(const f of files)out[f]=source(f);
 let eng=out['engine.mjs'];for(const [l,a,b] of [...(H8?HOOKS_H8:HOOKS),...ENGINE])eng=patch(eng,a,b,l);out['engine.mjs']=eng;
 let eff=out['effects.mjs'];for(const [l,a,b] of effectsPatches(cfg))eff=patch(eff,a,b,l);out['effects.mjs']=eff;
 let obs=out['cpu-observation.mjs'];for(const [l,a,b] of OBSERVATION)obs=patch(obs,a,b,l);out['cpu-observation.mjs']=obs;
 let pol=out['cpu-policy.mjs'];for(const [l,a,b] of policyPatches(cfg))pol=patch(pol,a,b,l);out['cpu-policy.mjs']=pol;
 out['full-catalog.mjs']+=`\n// ---- variable-life-20261031: experiment-only cards ----\nObject.assign(CATALOG,${JSON.stringify(cards(cfg),null,1)});\n`;
 out['rules.mjs']+=rulesAppendix(cfg);
 if(cfg.blanks){out['full-catalog.mjs']+=`\nObject.assign(CATALOG,${JSON.stringify(EXTRA_BLANKS,null,1)});\n`;out['rules.mjs']+=extraBlankRules;}
 if(cfg.time){ // time cards IX–XII (PLAN-TIME.md): world placement condition + counter + timeSet + CPU helper
  const T=cfg.time,V4=!!cfg.v4,V5=!!cfg.v5,V6=cfg.v6; // VERSION 4: U12 move, new cards' effects, ambush counter, CPU smart3 (older builds unchanged)
  for(const [f,list] of [['engine.mjs',[...ENGINE_WORLD,...ENGINE_TIME,...(V4?ENGINE_V4:[])]],['effects.mjs',V4?[EFFECTS_TIME[0],...EFFECTS_TIME_U12,...EFFECTS_V4,...(V5?EFFECTS_V5:[]),...(V6&&V6.log!==false?EFFECTS_V6_LOG:[])]:EFFECTS_TIME],['cpu-policy.mjs',V6?policyV6(V6.naga):V5?policyV5():V4?policyV4():policyTime(T.cpu)]])for(const [l,a,b] of list)out[f]=patch(out[f],a,b,l);
  if(V4){out['full-catalog.mjs']+=`\n// ---- variable-life-20261031 VERSION 4 new cards ----\nObject.assign(CATALOG,${JSON.stringify(newCards(),null,1)});\n`;out['rules.mjs']+=newRules();}
  if(V5){out['full-catalog.mjs']+=`\n// ---- variable-life-20261031 VERSION 5 cards ----\nObject.assign(CATALOG,${JSON.stringify(v5Cards(),null,1)});\n`;out['rules.mjs']+=v5Rules();}
  out['full-catalog.mjs']+=`\n// ---- variable-life-20261031 time cards ----\nObject.assign(CATALOG,${JSON.stringify(timeCards(T.cost,T.counter),null,1)});\n`;
  out['rules.mjs']+=timeRules(T.counter);}
 if(cfg.world){ // world redesign: only these variants get the world cards and their patches (older builds stay byte-identical)
  for(const [f,list] of [['engine.mjs',ENGINE_WORLD],['effects.mjs',EFFECTS_WORLD],['cpu-policy.mjs',policyWorld(cfg.world.cpu)]])for(const [l,a,b] of list)out[f]=patch(out[f],a,b,l);
  out['full-catalog.mjs']+=`\n// ---- variable-life-20261031 world cards ----\nObject.assign(CATALOG,${JSON.stringify(worldCards(cfg.world.cost),null,1)});\n`;
  out['rules.mjs']+=worldRules();}
 for(const [f,t] of Object.entries(out))writeFileSync(join(dir,f),t);
 manifest.variants[v]={...cfg,cards:cards(cfg),patchedSha256:Object.fromEntries(Object.entries(out).filter(([f,t])=>sha(t)!==before[f]).map(([f,t])=>[f,sha(t)]))};
}
if(JSON.stringify(tree())!==JSON.stringify(treeBefore))throw Error('official sources changed during build');
manifest.officialUnchanged=true;
writeFileSync(join(OUT,'life-manifest.json'),JSON.stringify(manifest,null,1));
console.log(commit,Object.keys(manifest.variants).join(' '));
