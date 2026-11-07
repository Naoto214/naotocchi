// Isolated copies of the official modules (read via git show from HEAD) with exact-string proxy patches. Official files untouched.
import {writeFileSync,mkdirSync,rmSync,readFileSync,readdirSync} from 'node:fs';import {execFileSync} from 'node:child_process';import {join} from 'node:path';import {createHash} from 'node:crypto';
const OUT=new URL('./build/',import.meta.url).pathname,SRC=new URL('../../',import.meta.url).pathname.replace(/\/$/,''),BASE=process.argv[2]??'81c044a9977dbd013f1632372a72785b540fb463';
const sha=t=>createHash('sha256').update(t).digest('hex');const tree=()=>readdirSync(SRC).filter(f=>f.endsWith('.mjs')).sort().map(f=>f+':'+sha(readFileSync(join(SRC,f)))).join();
const before=tree();const git=(...a)=>execFileSync('git',a,{cwd:SRC,maxBuffer:1<<28}).toString();
const files=git('ls-tree','--name-only',BASE,'./').split('\n').filter(f=>f.endsWith('.mjs'));
const patch=(t,a,b)=>{if(t.split(a).length!==2)throw Error('patch miss '+a.slice(0,40));return t.replace(a,()=>b);};
const DRAW="draw(s,s.turn);log(s,`R${s.round} ${s.turn}のターン開始`);";
const MAR="if(p.relationship===4)grow(s,who,10);";
const STATS="const c=card(s,b.main);let power=c.power,wisdom=c.wisdom;";
const V={A0:{},
 MD:{'engine.mjs':[[DRAW,DRAW+"if(p.board.main&&p.board.partner&&p.relationship===4)draw(s,s.turn);"]]},   // married: +1 draw each own turn start
 MG:{'engine.mjs':[[MAR,"if(p.relationship===4)grow(s,who,15);"]]},                                         // one-shot +5 more at marriage
 MS:{'engine.mjs':[[STATS,STATS+"if(b.partner&&p.relationship===4){power+=1;wisdom+=1;}"]]}};               // married: main power/wisdom +1
rmSync(OUT,{recursive:true,force:true});
for(const [v,ps] of Object.entries(V)){const d=join(OUT,v);mkdirSync(d,{recursive:true});for(const f of files){let t=git('show',`${BASE}:./${f}`);for(const [a,b] of ps[f]??[])t=patch(t,a,b);writeFileSync(join(d,f),t);}}
if(tree()!==before)throw Error('official changed');console.log('built from',BASE);
