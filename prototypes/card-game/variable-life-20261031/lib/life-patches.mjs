// Patch definitions shared by the experiment builds (build-life.mjs) and the private trial (../trial/build-trial.mjs).
// Each patch is [label, exact text in the official module, replacement]; callers apply them with an exactly-one-match check.
// ---- variants -------------------------------------------------------------------------------------------------
// ext  : 人生延長（仮）   timing final = only while the current round is the final round; any = any round; late = R8+.
//        method quick = すぐつかう, trap = しかける (fires at the end of the owner's own turn in the final round).
//        perMatch = max uses per player per match (null = no limit besides the cards).
// raise: そだち上限解放（仮） scope shared = both players' cap and maintenance target +10; self = own only.
// both : 人生延長・上限解放（仮） one card that does ext + shared raise.
export const EXT={method:'quick',cost:2,timing:'final',perMatch:null};
export const RAISE={cost:2,scope:'shared'};
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
 // follow-up (PLAN-NEXT.md): the untested best candidate from REPORT.md §9
 'L-A1t1':{ext:{...EXT,method:'trap'},note:'追加：A1t（しかける）を1枚だけ（残り1枠は対照札）'},
 // world redesign (PLAN-WORLD.md): せかい「XI」「XII」 as ordinary world cards. The deck decides the mode (card IDs X-XI-A …),
 // so a save always replays with the rule it was played with.
 'W-A':{world:{cost:2},note:'A：XI→XIIの順（XIIは終了ラウンド11以上のときだけ出せる）・時2'},
 'W-B':{world:{cost:2},note:'B：XI・XIIを独立に出せる（終了ラウンドを11／12にする。短くはならない）・時2'},
 'W-C':{world:{cost:2},note:'C：XI・XIIとも終了ラウンドを1のばす（最大12）・時2'},
 'W-XI1':{world:{cost:2},note:'XI（B方式）1枚だけ（残り1枠は対照札）・時2'},
 'W-A3':{world:{cost:3},note:'感度：W-A の時3'},'W-B3':{world:{cost:3},note:'感度：W-B の時3'},'W-C3':{world:{cost:3},note:'感度：W-C の時3'},
 // diagnostics added after the pilot (PLAN-WORLD.md §2): why the extension happens so early
 'W-Bk':{world:{cost:2,cpu:'keep'},note:'診断（CPU）：W-B のまま、CPU は XI・XII を延長のためだけに出す（ただのセカイとしては出さない）'},
 'W-BL':{world:{cost:2},note:'診断（ルール）：B方式で、XI・XII は R8 以降にだけ出せる'},
 // time cards IX–XII with the special counter (PLAN-TIME.md). Controls: T-X4 / T-X8 = 4 / 8 blank cards in the same slots.
 'T-X4':{blanks:true,note:'対照：4枠を効果なしの対照札に（ルールは現行）'},'T-X8':{blanks:true,note:'対照：8枠を効果なしの対照札に（ルールは現行）'},
 'T-2s':{time:{cost:2,counter:true,cpu:'smart'},note:'IX・X・XI・XII 各1・時2・特殊カウンターあり・CPU は終盤の勝敗見込みで判断'},
 'T-2f':{time:{cost:2,counter:true,cpu:'filler'},note:'同上・CPU は時のカードも普通のセカイとして出す（PR #498 W-* と同じ考え方）'},
 'T-3s':{time:{cost:3,counter:true,cpu:'smart'},note:'各1・時3・特殊カウンターあり'},
 'T-2n':{time:{cost:2,counter:false,cpu:'smart'},note:'各1・時2・特殊カウンターなし（比較用）'},
 'T-8s':{time:{cost:2,counter:true,cpu:'smart'},note:'各2（8枚）・時2・特殊カウンターあり'},
};

// ---- cards ----------------------------------------------------------------------------------------------------
export const extText=e=>(e.method==='trap'?'自分のターン終了時、現在のラウンドが最終ラウンドの場合に発動できる。':e.timing==='final'?'現在のラウンドが最終ラウンドの場合に発動できる。':e.timing==='late'?'現在のラウンドがR8以降の場合に発動できる。':'')
 +'最終ラウンドを1つ後ろへのばす（両プレイヤー共通・最大R12）。'+(e.perMatch?`この名前のカードは各プレイヤー1試合${e.perMatch}回までしか発動できない。`:'');
export function cards(cfg){
 const c=(id,name,cost,method,text)=>({id,name,type:'event',cost,rare:false,text,source:'variable-life-20261031（実験専用の仮カード）',source_sha256:'experimental',method});
 const out={'X-blank':c('X-blank','対照札（効果なし・仮）',1,'すぐつかう','（実験の対照用。プレイできない。）')};
 const e=cfg.ext??EXT,r=cfg.raise??RAISE,b=cfg.both??{cost:3,timing:'final'};
 out['X-life-extend']=c('X-life-extend','人生延長（仮）',e.cost,e.method==='trap'?'しかける':'すぐつかう',extText(e));
 out['X-cap-raise']=c('X-cap-raise','そだち上限解放（仮）',r.cost,'すぐつかう',(r.scope==='self'?'自分の':'両プレイヤーの')+'そだちの上限と維持勝利の値を10上げる（最大120）。現在のそだちは変わらない。');
 out['X-life-both']=c('X-life-both','人生延長・上限解放（仮）',b.cost,'すぐつかう',(b.timing==='final'?'現在のラウンドが最終ラウンドの場合に発動できる。':'')+'最終ラウンドを1つ後ろへのばし、両プレイヤーのそだちの上限と維持勝利の値を10上げる（最大R12・120）。');
 return out;
}
export function rulesAppendix(cfg){
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
export const HOOKS=[ // state-neutral logging (same as PR #495 build-variants.mjs)
 ['reset',"p.time=s.round;p.personUsed=false;","globalThis.__rLog?.({kind:'reset',actor:s.turn,expired:p.time,granted:s.round,round:s.round,growth:{A:s.players.A.growth,B:s.players.B.growth}});p.time=s.round;p.personUsed=false;"],
 ['leave',"if(key==='partner'){p.relationship=null;grow(s,a,-10);}","if(key==='partner'){globalThis.__rLog?.({kind:'leave',actor:a,stage:p.relationship,round:s.round,effectActor:context.effectActor??null,cause:context.cause??'cost'});p.relationship=null;grow(s,a,-10);}"],
];
export const ENGINE=[
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
export function effectsPatches(cfg){
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
export const OBSERVATION=[
 ['life-observation',"return freeze(structuredClone({seat,round:v.round,","return freeze(structuredClone({seat,round:v.round,life:{final:s.life.final,cap:{...s.life.cap},hold:{...s.life.hold},holding:{A:s.players.A.reached!==null,B:s.players.B.reached!==null}},"],
];
export function policyPatches(cfg){
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

// ---- world redesign: せかい「XI」「XII」 (PLAN-WORLD.md) ------------------------------------------------------------
// Ordinary world cards: placed from hand as a normal action with the normal world cost, replacing the owner's current world.
// A forced 'place' trigger (same pattern as こねこのしゃちょう) changes the final round for both players. The world then stays as a
// plain world. Its leaving the field later does NOT undo the change (no shortening in this experiment).
// The final round is changed only through one op, lifeFinal {set:n} (never lowers) or {add:n}, clamped to [current final, 12].
// A future shortening card (IX, VIII) would need a separately approved rule: it must keep final >= the current round, and it is
// rejected here on purpose (allowLower is not implemented).
export const WORLD_MODES={A:'XIはいつでも、XIIはXIのあと（終了ラウンド11以上）だけ',B:'XI・XIIを独立に（11／12にする。短くはならない）',C:'XI・XIIとも1のばす（最大12）'};
export function worldCards(cost=2){
 const c=(id,name,text)=>({id,name,type:'world',cost,rare:false,text,source:'variable-life-20261031 world（実験専用の仮カード）',source_sha256:'experimental'});
 const raise=n=>`このカードを手札から出した時、終了ラウンドを${n}にする（両プレイヤー共通。すでに${n}以上なら変わらない）。`;
 const add='このカードを手札から出した時、終了ラウンドを1つ後ろへのばす（両プレイヤー共通・最大12）。';
 return {
  'X-XI-A':c('X-XI-A','XI',raise(11)),'X-XII-A':c('X-XII-A','XII','終了ラウンドが11以上の場合にだけ、手札から出せる。'+raise(12)),
  'X-XI-B':c('X-XI-B','XI',raise(11)),'X-XII-B':c('X-XII-B','XII',raise(12)),
  'X-XI-C':c('X-XI-C','XI',add),'X-XII-C':c('X-XII-C','XII',add),
  'X-XI-BL':c('X-XI-BL','XI','現在のラウンドがR8以降の場合にだけ、手札から出せる。'+raise(11)),'X-XII-BL':c('X-XII-BL','XII','現在のラウンドがR8以降の場合にだけ、手札から出せる。'+raise(12)),
 };
}
export function worldRules(){
 const r=(id,step,extra='')=>`add('${id}',{mode:'world',${extra}triggers:[{when:'place',mandatory:true,steps:[${JSON.stringify(step)}]}]});`;
 return `\n// ---- variable-life-20261031 world: せかい「XI」「XII」 ----\n`+[
  r('X-XI-A',{op:'lifeFinal',set:11}),r('X-XII-A',{op:'lifeFinal',set:12},"placeCondition:'lifeFinalAtLeast11',"),
  r('X-XI-B',{op:'lifeFinal',set:11}),r('X-XII-B',{op:'lifeFinal',set:12}),
  r('X-XI-C',{op:'lifeFinal',add:1}),r('X-XII-C',{op:'lifeFinal',add:1}),
  r('X-XI-BL',{op:'lifeFinal',set:11},"placeCondition:'lifeRound8',"),r('X-XII-BL',{op:'lifeFinal',set:12},"placeCondition:'lifeRound8',")].join('\n')+'\n';
}
// A world with a placeCondition is offered only when the condition holds (no new UI: the placement simply is not listed).
export const ENGINE_WORLD=[
 ['world-place-condition',"if(c.type==='world'){const cost=fx.payment(s,a,'world',c.cost);","if(c.type==='world'&&(!RULES[c.id]?.placeCondition||fx.condition(s,a,RULES[c.id].placeCondition,{source:id}))){const cost=fx.payment(s,a,'world',c.cost);"],
];
export const EFFECTS_WORLD=[
 ['world-condition'," case 'finalTime':return s.round===10||m?.stage===8;"," case 'lifeFinalAtLeast11':return s.life.final>=11; case 'lifeRound8':return s.round>=8; case 'finalTime':return s.round===10||m?.stage===8;"],
 ['world-op'," default:throw Error('効果handlerが未実装：'+e.op);"," case 'lifeFinal':{if(e.allowLower)throw Error('終了ラウンドの短縮は未実装');const from=s.life.final,to=Math.min(12,Math.max(from,e.add?from+e.add:e.set));if(to!==from){s.life.final=to;l.applied=true;h.log(s,'終了ラウンドがR'+to+'になった（'+card(s,l.source).name+'）');}s.life.events.push({op:'lifeFinal',extended:to>from,raised:false,from,to,card:card(s,l.source).id,actor:a,round:s.round,turn:s.turn,serial:s.serial,final:s.life.final,cap:{...s.life.cap},growth:{A:owner(s,'A').growth,B:owner(s,'B').growth},reached:{A:owner(s,'A').reached,B:owner(s,'B').reached}});break;}\n default:throw Error('効果handlerが未実装：'+e.op);"],
];
// CPU helper: an XI/XII world is scored as an ordinary world plus the value of the rounds it adds (lifeValue, per round added).
// cpu 'keep' (diagnostic W-Bk): an XI/XII world is worth only its extension value minus its cost and the world it replaces.
export const policyWorld=(cpu='filler')=>[...POLICY_WORLD.slice(0,1),cpu==='keep'
 ?['world-score',"if(a.slot==='world')return (b.world?.cardId===c?.cardId?-6:b.world?3:9)-spend;","if(a.slot==='world')return XW.test(c?.cardId??'')?worldLifeValue(c,o)-spend-(b.world?4:0):(b.world?.cardId===c?.cardId?-6:b.world?3:9)-spend;"]
 :POLICY_WORLD[1]];
export const POLICY_WORLD=[
 ['world-helper',"const growthMult=o=>","const XW=/^X-(XI|XII)-(A|B|C|BL)$/;\nfunction worldLifeValue(c,o){const m=XW.exec(c?.cardId??''),L=o.life;if(!m||!L)return 0;const from=L.final,to=Math.min(12,m[2]==='C'?from+1:Math.max(from,m[1]==='XI'?11:12));return to>from?lifeValue('lifeExtend',o)*(to-from):0;}\nconst growthMult=o=>"],
 ['world-score',"if(a.slot==='world')return (b.world?.cardId===c?.cardId?-6:b.world?3:9)-spend;","if(a.slot==='world')return (b.world?.cardId===c?.cardId?-6:b.world?3:9)-spend+worldLifeValue(c,o);"],
];

// ---- time cards IX・X・XI・XII with the special counter (PLAN-TIME.md, TIME.md) --------------------------------------
// Ordinary world cards (normal placement, normal world cost, replacing the owner's world). Placing one triggers a forced
// 'place' ability (same pattern as XI/XII): set the final round to N. N must not be before the current round (the card is
// simply not offered then). Special counter: while the opponent's time card ability is waiting on the chain, a player may place
// a time card from hand as a response (it is placed in the world slot like a normal world, paying its world cost). The chain
// resolves last-in-first-out: the last (top) time card that is not negated applies its N and marks every earlier time card of
// the same chain as countered: negated, and moved from its owner's world slot to the discard pile. So IX → XII → X → XI ends with
// XI applied, the other three in the discard piles, and the final round fixed only after every response (not mid-chain).
export const TIME_N={IX:9,X:10,XI:11,XII:12};
export function timeCards(cost=2,counter=true){
 const c=(n,name)=>({id:'X-T-'+name,name,type:'world',cost,rare:false,
  text:`このカードを出したとき、終了ラウンドを${n}にする（両者共通。現在のラウンドより前にはできない）。`+(counter?'相手の時のカードに対して、カウンターとして出してもよい。カウンターされた時のカードは捨て札に置く。':''),
  source:'variable-life-20261031 time（実験専用の仮カード）',source_sha256:'experimental'});
 return Object.fromEntries(Object.entries(TIME_N).map(([name,n])=>['X-T-'+name,c(n,name)]));
}
export function timeRules(counter=true){
 return '\n// ---- variable-life-20261031 time cards IX–XII ----\n'+Object.entries(TIME_N).map(([name,n])=>
  `add('X-T-${name}',{mode:'world',placeCondition:'roundAtMost${n}',${counter?"reaction:'timeCounter',":''}triggers:[{when:'place',mandatory:true,steps:[{op:'timeSet',n:${n}}]}]});`).join('\n')+'\n';
}
export const ENGINE_TIME=[
 // Response-window counter: offered only to the player whose opponent owns the top-most live time card ability on the chain.
 ['time-counter',"for(const source of p.hand){const c=card(s,source);if(p.time<fx.payment(s,a,'quick_'+c.type,c.cost)&&RULES[c.id]?.mode!=='trap')continue;",
  "for(const source of p.hand){const c=card(s,source);if(RULES[c.id]?.reaction==='timeCounter'){if(s.phase==='response'&&!s.choice&&!s.pending.length&&fx.condition(s,a,RULES[c.id].placeCondition,{source})){const top=[...s.chain].reverse().find(l=>!l.negated&&RULES[card(s,l.source)?.id]?.reaction==='timeCounter');if(top&&top.actor!==a){const cost=fx.payment(s,a,'world',c.cost);if(cost!==Infinity)add('place',`${c.name}でカウンター（時${cost}）`,{source,slot:'world',cost,counter:true});}}continue;}if(p.time<fx.payment(s,a,'quick_'+c.type,c.cost)&&RULES[c.id]?.mode!=='trap')continue;"],
];
export const EFFECTS_TIME=[
 ['time-conditions'," case 'finalTime':return s.round===10||m?.stage===8;"," case 'roundAtMost9':return s.round<=9; case 'roundAtMost10':return s.round<=10; case 'roundAtMost11':return s.round<=11; case 'roundAtMost12':return s.round<=12; case 'finalTime':return s.round===10||m?.stage===8;"],
 ['time-op'," default:throw Error('効果handlerが未実装：'+e.op);"," case 'timeSet':{const from=s.life.final,to=Math.min(12,Math.max(e.n,s.round)),superseded=[],names=[];for(const x of s.chain){if(x.negated||!/^X-T-/.test(card(s,x.source)?.id??'')||!RULES[card(s,x.source).id]?.reaction)continue;x.negated=true;const own=s.cards[x.source].owner;if(owner(s,own).board.world===x.source)h.discardField(s,own,x.source,{cause:'effect',effectActor:a});superseded.push(card(s,x.source).id);names.push(card(s,x.source).name);}s.life.final=to;l.applied=true;h.log(s,(names.length?'カウンター成立：'+names.join('・')+' は捨て札へ。':'')+'終了ラウンドがR'+to+'になった（'+card(s,l.source).name+'）');s.life.events.push({op:'timeSet',n:e.n,extended:to>from,shortened:to<from,from,to,battle:superseded.length+1,superseded,card:card(s,l.source).id,actor:a,round:s.round,turn:s.turn,serial:s.serial,final:s.life.final,cap:{...s.life.cap},growth:{A:owner(s,'A').growth,B:owner(s,'B').growth},reached:{A:owner(s,'A').reached,B:owner(s,'B').reached}});break;}\n default:throw Error('効果handlerが未実装：'+e.op);"],
];
// CPU helper. smart: a time card is worth only the change it makes to the pending final round, weighted by how close the end is
// and by the standings (behind → longer, ahead → shorter), minus its cost and the world it replaces. filler: an ordinary world's
// value plus the same change value (the PR #498 W-* behaviour). The pending final round is read from the public chain (the
// names of time cards waiting to resolve), so a counter is valued against the card it would beat.
export function policyTime(cpu='smart'){
 const helper=`
const TIMEN={IX:9,X:10,XI:11,XII:12};
function pendingFinal(o){for(let i=(o.chain?.length??0)-1;i>=0;i--){const n=TIMEN[o.chain[i].name];if(n)return n;}return o.life?.final??10;}
function timeValue(c,o){const n=TIMEN[c?.name],L=o.life;if(!n||!L)return null;const F=pendingFinal(o);if(n===F)return 0;
 const me=o.players[o.seat],op=o.players[other(o.seat)],d=op.growth-me.growth,w=o.round>=F-1?1:o.round>=F-3?.5:.15;
 let v=w*(n-F)*(d>0?4+.4*Math.min(d,30):d<0?-(4+.4*Math.min(-d,30)):0);
 if(L.holding[other(o.seat)])v+=n>F?-20:10;if(L.holding[o.seat])v+=n>F?10:-10;return v;}
`;
 const score=cpu==='smart'
  ?"if(a.slot==='world'){const tv=timeValue(c,o);if(tv!==null)return (tv===0?-1:tv)-spend-(b.world&&!TIMEN[b.world.name]?3:0);return (b.world?.cardId===c?.cardId?-6:b.world?3:9)-spend;}"
  :"if(a.slot==='world'){const tv=timeValue(c,o);return (b.world?.cardId===c?.cardId?-6:b.world?3:9)-spend+(tv??0);}";
 return [['time-helper',"const growthMult=o=>",helper+"const growthMult=o=>"],
  ['time-score',"if(a.slot==='world')return (b.world?.cardId===c?.cardId?-6:b.world?3:9)-spend;",score]];
}

// More blank control cards for the 4- and 8-slot controls: each name is an ordinary card (3 copies at most), so the controls use
// X-blank, X-blank-2 and X-blank-3 — identical, unplayable, only the names differ.
export const EXTRA_BLANKS={'X-blank-2':{id:'X-blank-2',name:'対照札2（効果なし・仮）',type:'event',cost:1,rare:false,text:'（実験の対照用。プレイできない。）',source:'variable-life-20261031（実験専用の仮カード）',source_sha256:'experimental',method:'すぐつかう'},
 'X-blank-3':{id:'X-blank-3',name:'対照札3（効果なし・仮）',type:'event',cost:1,rare:false,text:'（実験の対照用。プレイできない。）',source:'variable-life-20261031（実験専用の仮カード）',source_sha256:'experimental',method:'すぐつかう'}};
export const extraBlankRules="\nadd('X-blank-2',{mode:'quick',condition:'lifeNever',steps:[]});\nadd('X-blank-3',{mode:'quick',condition:'lifeNever',steps:[]});\n";
