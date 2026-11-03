// VERSION 2 representative checks. Isolated copies of the official modules (git show <BASE>) with exact-string patches.
// Official files are only read; their sha256 is compared before/after. Usage: node build.mjs [commit]
import {writeFileSync,mkdirSync,rmSync,readFileSync,readdirSync} from 'node:fs';import {execFileSync} from 'node:child_process';import {join} from 'node:path';import {createHash} from 'node:crypto';
const OUT=new URL('./build/',import.meta.url).pathname,SRC=new URL('../../../',import.meta.url).pathname.replace(/\/$/,''),BASE=process.argv[2]??'81c044a9977dbd013f1632372a72785b540fb463';
const sha=t=>createHash('sha256').update(t).digest('hex');const tree=()=>readdirSync(SRC).filter(f=>f.endsWith('.mjs')).sort().map(f=>f+':'+sha(readFileSync(join(SRC,f)))).join();
const before=tree();const git=(...a)=>execFileSync('git',a,{cwd:SRC,maxBuffer:1<<28}).toString();
const files=git('ls-tree','--name-only',BASE,'./').split('\n').filter(f=>f.endsWith('.mjs'));
const patch=(t,a,b)=>{if(t.split(a).length!==2)throw Error('patch miss '+a.slice(0,50));return t.replace(a,()=>b);};
const DEER="add('P-grove_deer',{mode:'partner',triggers:[",EAGLE="add('P-high_eagle',{mode:'partner',triggers:[",ROBOT="add('P-robot_neighbor',{mode:'partner',passive:[";
const SCORP="case 'playedPlayAndItem':return played(s,a,'play').length>0&&played(s,a,'item').some(e=>e.faceUp||s.version==='hotseat-2');";
const V={
 A0:{},
 // シカA: 結婚した時、山札上3枚を見て1枚を手札へ。ワシA: 結婚した時、山札上を見て並べる（代理：1枚見て上か下へ）。
 SW:{'rules.mjs':[[DEER,DEER+"{when:'marriage',steps:[search(3)],once:true},"],[EAGLE,EAGLE+"{when:'marriage',steps:[{op:'look'}],once:true},"]]},
 // サソリC（前回の推奨案）：結婚中は「あそび」か「あいてむ」の片方で発動。
 SC:{'effects.mjs':[[SCORP,"case 'playedPlayAndItem':if(b.partner&&p.relationship===4&&card(s,b.partner).id==='P-desert_scorpion')return played(s,a,'play').length>0||played(s,a,'item').some(e=>e.faceUp);return played(s,a,'play').length>0&&played(s,a,'item').some(e=>e.faceUp||s.version==='hotseat-2');"]]},
 // ロボットA：結婚中は ちから+1 に加えて ちえ+1。
 RB:{'rules.mjs':[[ROBOT,ROBOT+"{condition:{value:'relationship',op:'eq',n:4},power:0,wisdom:1},"]]}};
rmSync(OUT,{recursive:true,force:true});
for(const [v,ps] of Object.entries(V)){const d=join(OUT,v);mkdirSync(d,{recursive:true});for(const f of files){let t=git('show',`${BASE}:./${f}`);for(const [a,b] of ps[f]??[])t=patch(t,a,b);writeFileSync(join(d,f),t);}}
if(tree()!==before)throw Error('official changed');console.log('built from',BASE);
