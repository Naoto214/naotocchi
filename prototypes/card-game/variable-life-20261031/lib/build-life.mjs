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

// ---- variants -------------------------------------------------------------------------------------------------
// ext  : 人生延長（仮）   timing final = only while the current round is the final round; any = any round; late = R8+.
//        method quick = すぐつかう, trap = しかける (fires at the end of the owner's own turn in the final round).
//        perMatch = max uses per player per match (null = no limit besides the cards).
// raise: そだち上限解放（仮） scope shared = both players' cap and maintenance target +10; self = own only.
// both : 人生延長・上限解放（仮） one card that does ext + shared raise.
const EXT={method:'quick',cost:2,timing:'final',perMatch:null};
const RAISE={cost:2,scope:'shared'};
export const VARIANTS={
 'L-A0':{note:'A0 現行：公式デッキ・公式ルール（X札なし。等価性確認用）'},
 'L-X0':{note:'X0 対照：2枚を「効果なしの対照札」に交換（ルールは現行）'},
 'L-A1':{ext:EXT,note:'A1 人生延長：すぐつかう・時2・最終ラウンドのみ'},
 'L-A1a':{ext:{...EXT,timing:'any'},note:'A1a 人生延長：すぐつかう・時2・いつでも'},
 'L-A1t':{ext:{...EXT,method:'trap'},note:'A1t 人生延長：しかける・時2・最終ラウンドの自分のターン終了時'},
 'L-A2':{raise:RAISE,note:'A2 そだち上限解放：共通・時2・いつでも'},
 'L-A2s':{raise:{...RAISE,scope:'self'},note:'A2s そだち上限解放：自分だけ・時2・いつでも'},
 'L-A3':{ext:EXT,raise:RAISE,note:'A3 人生延長1枚＋上限解放1枚（独立カード）'},
 'L-A4':{both:{cost:3,timing:'final'},note:'A4 延長＋上限解放を1枚で：すぐつかう・時3・最終ラウンドのみ'},
 // sensitivity (PLAN §3)
 'L-A1c4':{ext:{...EXT,cost:4},note:'感度：A1 の時コスト4'},
 'L-A1n1':{ext:EXT,note:'感度：A1 を1枚だけ（残り1枠は対照札）'},
 'L-A1aL':{ext:{...EXT,timing:'any',perMatch:1},note:'感度：A1a に「各プレイヤー1試合1回」'},
};

// ---- cards ----------------------------------------------------------------------------------------------------
const extText=e=>(e.method==='trap'?'自分のターン終了時、現在のラウンドが最終ラウンドの場合に発動できる。':e.timing==='final'?'現在のラウンドが最終ラウンドの場合に発動できる。':e.timing==='late'?'現在のラウンドがR8以降の場合に発動できる。':'')
 +'最終ラウンドを1つ後ろへのばす（両プレイヤー共通・最大R12）。'+(e.perMatch?`この名前のカードは各プレイヤー1試合${e.perMatch}回までしか発動できない。`:'');
function cards(cfg){
 const c=(id,name,cost,method,text)=>({id,name,type:'event',cost,rare:false,text,source:'variable-life-20261031（実験専用の仮カード）',source_sha256:'experimental',method});
 const out={'X-blank':c('X-blank','対照札（効果なし・仮）',1,'すぐつかう','（実験の対照用。プレイできない。）')};
 const e=cfg.ext??EXT,r=cfg.raise??RAISE,b=cfg.both??{cost:3,timing:'final'};
 out['X-life-extend']=c('X-life-extend','人生延長（仮）',e.cost,e.method==='trap'?'しかける':'すぐつかう',extText(e));
 out['X-cap-raise']=c('X-cap-raise','そだち上限解放（仮）',r.cost,'すぐつかう',(r.scope==='self'?'自分の':'両プレイヤーの')+'そだちの上限と維持勝利の値を10上げる（最大120）。現在のそだちは変わらない。');
 out['X-life-both']=c('X-life-both','人生延長・上限解放（仮）',b.cost,'すぐつかう',(b.timing==='final'?'現在のラウンドが最終ラウンドの場合に発動できる。':'')+'最終ラウンドを1つ後ろへのばし、両プレイヤーのそだちの上限と維持勝利の値を10上げる（最大R12・120）。');
 return out;
}
function rulesAppendix(cfg){
 const e=cfg.ext??EXT;
 const ext=e.method==='trap'
  ?`add('X-life-extend',{mode:'trap',triggers:[{when:'end',condition:'lifeExtendOK',steps:[{op:'lifeExtend'}]}]});`
  :`add('X-life-extend',{mode:'quick',condition:'lifeExtendOK',steps:[{op:'lifeExtend'}]});`;
 return `\n// ---- variable-life-20261031: experiment-only cards (not part of the official catalog) ----\n`+
  `add('X-blank',{mode:'quick',condition:'lifeNever',steps:[]});\n${ext}\n`+
  `add('X-cap-raise',{mode:'quick',condition:'lifeRaiseOK',steps:[{op:'lifeRaise'}]});\n`+
  `add('X-life-both',{mode:'quick',condition:'lifeBothOK',steps:[{op:'lifeBoth'}]});\n`;
}

// ---- engine ---------------------------------------------------------------------------------------------------
const HOOKS=[ // state-neutral logging (same as PR #495 build-variants.mjs)
 ['reset',"p.time=s.round;p.personUsed=false;","globalThis.__rLog?.({kind:'reset',actor:s.turn,expired:p.time,granted:s.round,round:s.round,growth:{A:s.players.A.growth,B:s.players.B.growth}});p.time=s.round;p.personUsed=false;"],
 ['leave',"if(key==='partner'){p.relationship=null;grow(s,a,-10);}","if(key==='partner'){globalThis.__rLog?.({kind:'leave',actor:a,stage:p.relationship,round:s.round,effectActor:context.effectActor??null,cause:context.cause??'cost'});p.relationship=null;grow(s,a,-10);}"],
];
const ENGINE=[
 ['life-state',"challenge:null};\n const rng=random(seed);","challenge:null,life:{final:10,cap:{A:100,B:100},hold:{A:100,B:100},events:[]}};\n const rng=random(seed);"],
 ['grow',"p.growth=Math.max(0,Math.min(100,old+n));","const H=s.life.hold[a];p.growth=Math.max(0,Math.min(s.life.cap[a],old+n));"],
 ['grow-reached',"if(p.growth<100)p.reached=null;else if(old<100)p.reached=","if(p.growth<H)p.reached=null;else if(old<H)p.reached="],
 ['early-window',"if(s.round<10){const winner=","if(s.round<s.life.final){const winner="],
 ['hold-win',"const winner=['A','B'].find(a=>s.players[a].growth===100&&","const winner=['A','B'].find(a=>s.players[a].growth>=s.life.hold[a]&&"],
 ['hold-reason',"if(winner){finish(s,winner,'100維持');return;}","if(winner){finish(s,winner,s.life.hold[winner]+'維持');return;}"],
 ['final',"if(s.round===10&&s.turn==='B'){const a=s.players.A.growth,b=s.players.B.growth;finish(s,a===b?null:a>b?'A':'B','R10最終比較');return;}","if(s.round===s.life.final&&s.turn==='B'){const a=s.players.A.growth,b=s.players.B.growth;finish(s,a===b?null:a>b?'A':'B','R'+s.life.final+'最終比較');return;}"],
 ['validate-round',"s.round<1||s.round>10)throw Error(","s.round<1||s.round>s.life.final||s.life.final>12)throw Error("],
 ['validate-time',"p.time<0||p.time>10||","p.time<0||p.time>12||"],
 ['validate-growth',"p.growth<0||p.growth>100||","p.growth<0||p.growth>s.life.cap[a]||s.life.cap[a]>120||"],
];
// ---- effects: conditions and ops ------------------------------------------------------------------------------
function effectsPatches(cfg){
 const e=cfg.ext??EXT,r=cfg.raise??RAISE,b=cfg.both??{cost:3,timing:'final'};
 const timing=t=>t==='final'?'s.round===s.life.final':t==='late'?'s.round>=8':'true';
 const perMatch=e.perMatch?`&&s.history.filter(x=>x.kind==='play'&&x.actor===a&&x.cardId==='X-life-extend').length<${e.perMatch}`:'';
 // A trap's activation is recorded as kind 'ability'; the per-match limit is only used with the quick card.
 // Provisional ruling R1 (RULINGS.md): the final round moves at most once per round (both players together), and a life card
 // cannot be activated while one of the same kind is still on the chain (the play condition is checked at activation only).
 const onChain=ids=>`s.chain.some(l=>${JSON.stringify(ids)}.includes(card(s,l.source)?.id))`;
 const extendedThisRound="s.life.events.some(x=>x.extended&&x.round===s.round)";
 const cond=`case 'lifeNever':return false;`+
  `case 'lifeExtendOK':return s.life.final<12&&${timing(e.timing)}&&!${extendedThisRound}&&!${onChain(['X-life-extend','X-life-both'])}${perMatch};`+
  `case 'lifeRaiseOK':return (${r.scope==='self'?'s.life.cap[a]<120':"s.life.cap.A<120||s.life.cap.B<120"})&&!${onChain(['X-cap-raise','X-life-both'])};`+
  `case 'lifeBothOK':return s.life.final<12&&${timing(b.timing)}&&!${extendedThisRound}&&!${onChain(['X-life-extend','X-life-both','X-cap-raise'])};\n`;
 // Resolution re-checks the once-per-round limit, so nothing can move the final round twice in one round.
 const ext=`let extended=false;if(s.life.final<12&&!${extendedThisRound}){s.life.final++;extended=true;l.applied=true;h.log(s,'人生延長：最終ラウンドがR'+s.life.final+'になった');}`;
 const raise=who=>`for(const x of ${who}){if(s.life.cap[x]<120){raised=true;s.life.cap[x]+=10;s.life.hold[x]=s.life.cap[x];l.applied=true;const q=owner(s,x);if(q.growth<s.life.hold[x])q.reached=null;}}h.log(s,'そだち上限：A '+s.life.cap.A+' / B '+s.life.cap.B);`;
 const rec=op=>`s.life.events.push({op:'${op}',extended:${op==='lifeRaise'?'false':'extended'},raised:${op==='lifeExtend'?'false':'raised'},actor:a,round:s.round,turn:s.turn,serial:s.serial,final:s.life.final,cap:{...s.life.cap},growth:{A:owner(s,'A').growth,B:owner(s,'B').growth},reached:{A:owner(s,'A').reached,B:owner(s,'B').reached}});`;
 const ops=`case 'lifeExtend':{${ext}${rec('lifeExtend')}break;}`+
  `case 'lifeRaise':{let raised=false;${raise(r.scope==='self'?'[a]':"['A','B']")}${rec('lifeRaise')}break;}`+
  `case 'lifeBoth':{let raised=false;${ext}${raise("['A','B']")}${rec('lifeBoth')}break;}\n`;
 return [
  ['life-conditions'," case 'finalTime':return s.round===10||m?.stage===8;"," "+cond+" case 'finalTime':return s.round===10||m?.stage===8;"],
  ['life-ops'," default:throw Error('効果handlerが未実装：'+e.op);"," "+ops+" default:throw Error('効果handlerが未実装：'+e.op);"],
 ];
}
// ---- CPU (experiment-only helper) -----------------------------------------------------------------------------
const OBSERVATION=[
 ['life-observation',"return freeze(structuredClone({seat,round:v.round,","return freeze(structuredClone({seat,round:v.round,life:{final:s.life.final,cap:{...s.life.cap},hold:{...s.life.hold},holding:{A:s.players.A.reached!==null,B:s.players.B.reached!==null}},"],
];
function policyPatches(cfg){
 const scope=(cfg.raise??RAISE).scope;
 // lifeValue: growth-point scale like stepValue (a +5 growth late in the game is worth 5 x 2.2 = 11).
 //  延長: one more round for BOTH players. Worth something only to the seat that is behind (or tied) near the end; the
 //        leader prefers the game to end. Never hand an opponent who is holding the maintenance target a new judgement round.
 //  上限解放: breaks an opponent's running maintenance (shared only), gives room when the seat itself is at the cap,
 //        and is avoided while the seat itself is holding (its own target would rise).
 const helper=`
const capMe=o=>o.life?.cap?.[o.seat]??100,capOp=o=>o.life?.cap?.[other(o.seat)]??100,finalOf=o=>o.life?.final??10;
function lifeValue(op,o){const L=o.life;if(!L)return 0;const me=o.players[o.seat],opp=o.players[other(o.seat)],d=opp.growth-me.growth;let v=0;
 const meHold=L.holding[o.seat],oppHold=L.holding[other(o.seat)],shared=op==='lifeBoth'||${JSON.stringify(scope)}==='shared';
 if(op!=='lifeRaise'&&L.final<12){const near=o.round>=L.final?1:o.round>=L.final-2?.35:.1;
  v+=d>0?near*(6+Math.min(d,30)*.6):d===0?near*2:-near*(4+Math.min(-d,30)*.4)-2;
  if(oppHold&&!(op==='lifeBoth'))v-=30;}
 if(op!=='lifeExtend'){if(oppHold&&shared&&o.round<L.final+(op==='lifeBoth'?1:0))v+=25;if(meHold)v-=30;
  if(me.growth>=capMe(o)-10)v+=6;if(shared&&opp.growth>=capOp(o)-10&&opp.growth>=me.growth)v-=4;}
 return v;}
`;
 return [
  ['helper',"const growthMult=o=>",helper+"const growthMult=o=>"],
  ['cpu-outcome',"return sign>0?Math.min(5,100-me.growth)*growthMult(o):sign<0?-Math.min(5,100-op.growth)*growthMult(o):0;","return sign>0?Math.min(5,capMe(o)-me.growth)*growthMult(o):sign<0?-Math.min(5,capOp(o)-op.growth)*growthMult(o):0;"],
  ['cpu-growth',":100-(s.to==='opponent'?opp.growth:p.growth))",":(s.to==='opponent'?capOp(o)-opp.growth:capMe(o)-p.growth))"],
  ['cpu-variant',"opp.growth:100-p.growth)","opp.growth:capMe(o)-p.growth)"],
  ['cpu-timeskip',"a.timeSkipBonus??0,100-p.growth)","a.timeSkipBonus??0,capMe(o)-p.growth)"],
  ['cpu-nexttime',"Math.min(10,o.round+1)","Math.min(finalOf(o),o.round+1)"],
  ['cpu-schedule',"o.round===10?.1:.65","o.round===finalOf(o)?.1:.65"],
  ['cpu-ops'," case 'look':v=p.deckCount?1.5:0;break;"," case 'look':v=p.deckCount?1.5:0;break;\n case 'lifeExtend':case 'lifeRaise':case 'lifeBoth':v=lifeValue(s.op,o);break;"],
 ];
}

for(const v of Object.keys(VARIANTS))rmSync(join(OUT,v),{recursive:true,force:true});
const manifest={source:'prototypes/card-game/*.mjs',sourceCommit:commit,sourceSha256:before,variants:{}};
for(const [v,cfg] of Object.entries(VARIANTS)){
 const dir=join(OUT,v);mkdirSync(dir,{recursive:true});const out={};
 for(const f of files)out[f]=source(f);
 let eng=out['engine.mjs'];for(const [l,a,b] of [...HOOKS,...ENGINE])eng=patch(eng,a,b,l);out['engine.mjs']=eng;
 let eff=out['effects.mjs'];for(const [l,a,b] of effectsPatches(cfg))eff=patch(eff,a,b,l);out['effects.mjs']=eff;
 let obs=out['cpu-observation.mjs'];for(const [l,a,b] of OBSERVATION)obs=patch(obs,a,b,l);out['cpu-observation.mjs']=obs;
 let pol=out['cpu-policy.mjs'];for(const [l,a,b] of policyPatches(cfg))pol=patch(pol,a,b,l);out['cpu-policy.mjs']=pol;
 out['full-catalog.mjs']+=`\n// ---- variable-life-20261031: experiment-only cards ----\nObject.assign(CATALOG,${JSON.stringify(cards(cfg),null,1)});\n`;
 out['rules.mjs']+=rulesAppendix(cfg);
 for(const [f,t] of Object.entries(out))writeFileSync(join(dir,f),t);
 manifest.variants[v]={...cfg,cards:cards(cfg),patchedSha256:Object.fromEntries(Object.entries(out).filter(([f,t])=>sha(t)!==before[f]).map(([f,t])=>[f,sha(t)]))};
}
if(JSON.stringify(tree())!==JSON.stringify(treeBefore))throw Error('official sources changed during build');
manifest.officialUnchanged=true;
writeFileSync(join(OUT,'life-manifest.json'),JSON.stringify(manifest,null,1));
console.log(commit,Object.keys(manifest.variants).join(' '));
