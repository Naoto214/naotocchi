// VERSION 7: builds the official-introduction candidate "I7" (459 cards = 452 official + 7 candidates) on the current main.
// Nothing official is changed: main's modules are read with `git show <base>` (default: the pinned main commit below) and
// the output goes to build-main/ (not tracked). Steps:
//   1. lib/build-life.mjs builds variant I-7 (= T-6a rules and CPU, no photo log) from <base> into build-main/I-7.
//   2. This script copies it to build-main/I7 and
//      - removes every experiment card from full-catalog.mjs / rules.mjs and appends only the 7 candidates
//        (integration/candidate-cards.mjs, official IDs and structure),
//      - renames the experiment IDs used by the patched engine / effects / CPU code (each replacement has a fixed count),
//      - names the CPU policy 'heuristic-4-candidate' (= heuristic-3 features + the VERSION 6 adaptive time-card logic).
//   The rule version stays hotseat-8: games without the new cards replay exactly like main (test-candidate.mjs checks it);
//   the formal hotseat-9 bump is an integration step (CANDIDATE-V7.md §5).
// Also builds build-main/L-A0 and build-main/I-7 for the equivalence checks.
// Usage: node integration/build-candidate.mjs [base]
import {readFileSync,writeFileSync,rmSync,cpSync,readdirSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {CANDIDATE_CARDS,candidateRules,ID_MAP} from './candidate-cards.mjs';
// VERSION 8: re-pinned to main after PR #520 (3b0bf8bb). Every rule/CPU/catalog/records module is byte-identical to the
// VERSION 7 base 88ff5e1f (only display modules changed: PR #519 card names), so the E1/E2 results (560/560) still apply.
export const PINNED_MAIN='3b0bf8bbb30ba24c0da5e9b3547d5930aca62b5b'; // main after PR #519/#520 (hotseat-8, heuristic-3)
const HERE=dirname(fileURLToPath(import.meta.url)),EXP=join(HERE,'..'),OUT=join(EXP,'build-main');
const base=process.argv[2]??PINNED_MAIN;
const sha=t=>createHash('sha256').update(t).digest('hex');
execFileSync('node',[join(EXP,'lib','build-life.mjs'),base],{env:{...process.env,LIFE_OUT:OUT,LIFE_ONLY:'L-A0,I-7'},stdio:'inherit'});
const src=join(OUT,'I-7'),dst=join(OUT,'I7');rmSync(dst,{recursive:true,force:true});cpSync(src,dst,{recursive:true});
const rd=f=>readFileSync(join(dst,f),'utf8'),wr=(f,t)=>writeFileSync(join(dst,f),t);
function rep(text,from,to,count,label){const n=text.split(from).length-1;if(n!==count)throw Error(`${label}: expected ${count}, found ${n}`);return text.split(from).join(to);}
const MARK='\n// ---- variable-life-20261031';
// 1. catalog: official 452 + 7 candidates only
let cat=rd('full-catalog.mjs');cat=cat.slice(0,cat.indexOf(MARK));
cat+=`\n// ---- official-introduction candidates (variable-life-20261031 VERSION 7; not in the official catalog) ----\nObject.assign(CATALOG,${JSON.stringify(CANDIDATE_CARDS,null,1)});\n`;
wr('full-catalog.mjs',cat);
let rules=rd('rules.mjs');rules=rules.slice(0,rules.indexOf(MARK))+candidateRules();wr('rules.mjs',rules);
// 2. IDs in patched code. Counts are fixed so an unexpected change in the patches fails the build.
const EXPECT={'effects.mjs':{"/^X-T-/":4},'cpu-policy.mjs':{"X-N-hayajimai":2,"X-N-nagaiki":2,"X-N-photo":2,"id?.startsWith('X-N-')":1}};
const NEWSET="['E-hayajimai','E-nagaiki','E-omoide-photo'].includes(id)";
for(const [f,m] of Object.entries(EXPECT)){let t=rd(f);for(const [from,n] of Object.entries(m)){
 const to=from==="/^X-T-/"?"/^W-time-/":from==="id?.startsWith('X-N-')"?NEWSET:ID_MAP[from];t=rep(t,from,to,n,`${f} ${from}`);}wr(f,t);}
// No experiment time/candidate ID may remain anywhere (the other X-N-* names are cards that are not in this catalog).
for(const f of readdirSync(dst).filter(f=>f.endsWith('.mjs'))){const t=rd(f);for(const x of [...Object.keys(ID_MAP),'/^X-T-/','X-T-'])if(t.includes(x))throw Error(`${f} still has ${x}`);}
// 3. CPU policy version name
let pol=rd('cpu-policy.mjs');
pol=rep(pol,"export const POLICY_VERSION='heuristic-3';","export const POLICY_VERSION='heuristic-4-candidate';",1,'policy version');
pol=rep(pol,"export const POLICY_VERSIONS=Object.freeze(['heuristic-1','heuristic-2','heuristic-3']);","export const POLICY_VERSIONS=Object.freeze(['heuristic-1','heuristic-2','heuristic-3','heuristic-4-candidate']);",1,'policy versions');
pol=rep(pol,"'heuristic-3':{intermediate:{statChoice:true,loverMarried:true}}});","'heuristic-3':{intermediate:{statChoice:true,loverMarried:true}},'heuristic-4-candidate':{intermediate:{statChoice:true,loverMarried:true}}});",1,'policy features');
wr('cpu-policy.mjs',pol);
// 4. modules the card UI imports from sub-directories (unchanged official files, read from <base>), so the candidate's card faces
//    can be rendered in tests (placeholder art for the 7 candidates until Astra's images are adopted).
for(const f of ['art-pilot/approved-colors.mjs','art-pilot/symbols/attributes.mjs']){mkdirSync(dirname(join(dst,f)),{recursive:true});
 writeFileSync(join(dst,f),execFileSync('git',['show',`${base}:prototypes/card-game/${f}`],{cwd:EXP,maxBuffer:1<<26}));}
const files=Object.fromEntries(readdirSync(dst).filter(f=>f.endsWith('.mjs')).sort().map(f=>[f,sha(rd(f))]));
writeFileSync(join(OUT,'I7-manifest.json'),JSON.stringify({base:execFileSync('git',['rev-parse',base],{cwd:EXP}).toString().trim(),from:'I-7',candidates:Object.keys(CANDIDATE_CARDS),sha256:files},null,1)+'\n');
console.log('I7 built from',base,Object.keys(CANDIDATE_CARDS).length,'candidates');
