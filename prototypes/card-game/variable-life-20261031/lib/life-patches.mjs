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
 'T-2v':{time:{cost:2,counter:true,cpu:'smart2'},note:'VERSION 2：時2・特殊カウンターあり・CPU は勝率見込み（smart2）で判断。デッキ構成はマニフェストで指定'},
 'T-4v':{time:{cost:2,counter:true,cpu:'smart3'},v4:true,note:'VERSION 4：時のカード＋新カード7種類・U12・CPU smart3。デッキ構成はマニフェストで指定'},
 'T-5v':{time:{cost:2,counter:true,cpu:'smart4'},v4:true,v5:true,note:'VERSION 5：T-4v＋おいわいのつるの比較案（ラウンド終了・ラウンド開始）・CPU smart4'},
 'T-6h':{time:{cost:2,counter:true,cpu:'smart4'},v4:true,v5:true,v6:{naga:'hold'},note:'VERSION 6：T-5v＋しゃしんの記録（CPU は VERSION 5 と同じ温存型）'},
 'T-6e':{time:{cost:2,counter:true,cpu:'smart4-early'},v4:true,v5:true,v6:{naga:'early'},note:'VERSION 6：ながいきのひけつを VERSION 4 の判断（早期使用型）で'},
 'T-6a':{time:{cost:2,counter:true,cpu:'smart4-adaptive'},v4:true,v5:true,v6:{naga:'adaptive'},note:'VERSION 6：ながいきのひけつを状況に応じた判断で'},
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
// smart2 (VERSION 2, PLAN-V2.md): a time card is worth the change in the estimated win probability between the pending final
// round F and its N, times the chance that it stands (not countered now, not overwritten before the end), minus its cost and the
// world it replaces. Win probability: projected growth difference at the end of a final round = current difference + (own rate −
// opponent rate) × rounds left, rates = growth gained so far per round blended with a prior, adjusted by each side's deck tendency
// read from public information only (own main card / own deck list; the opponent's face-up main card). Growth is capped at 100
// in the projection. Hold (100 reached) keeps the V1 adjustments. Nothing about hidden or future cards is used: the opponent's
// chance of holding a time card is a fixed prior per unknown hand card.
const SMART2=`
const TIMEN={IX:9,X:10,XI:11,XII:12};
function pendingFinal(o){for(let i=(o.chain?.length??0)-1;i>=0;i--){const n=TIMEN[o.chain[i].name];if(n)return n;}return o.life?.final??10;}
const TREND={'M-turtle':-2,'M-mushroom':-.5,'M-cat':0,'M-dog':.5,'M-beetle':.5,'M-sakura':.5,'M-dragon':.5,'M-venus_flytrap':1,'M-salmon':1};
const spec=id=>id?.replace(/-\d+$/,'')??null;
function trendOf(o,seat){const m=o.players[seat]?.board?.main;let k=m&&!m.hidden?spec(m.cardId):null;
 if(!k&&seat===o.seat){const n={};for(const c of o.deck??[])if(c.type==='main')n[spec(c.cardId)]=(n[spec(c.cardId)]??0)+c.count;k=Object.keys(n).sort((x,y)=>n[y]-n[x])[0]??null;}
 return TREND[k]??0;}
const PHI=x=>{const t=1/(1+.2316419*Math.abs(x)),y=.3989423*Math.exp(-x*x/2)*t*(.3193815+t*(-.3565638+t*(1.781478+t*(-1.821256+t*1.330274))));return x>0?1-y:y;};
function winP(o,F){const me=o.players[o.seat],op=o.players[other(o.seat)],r=o.round,done=Math.max(.5,r-(o.turn===o.seat?.5:0)-.5);
 const wt=done/(done+5),rate=(g,tr)=>wt*(g-20)/done+(1-wt)*7+tr;
 const left=Math.max(0,F-r+.5),a=Math.min(100,me.growth+rate(me.growth,trendOf(o,o.seat))*left),b=Math.min(100,op.growth+rate(op.growth,trendOf(o,other(o.seat)))*left);
 return PHI((a-b)/(6*Math.sqrt(left+.3)+2));}
function timeValue(c,o){const n=TIMEN[c?.name],L=o.life;if(!n||!L)return null;const F=pendingFinal(o);if(n===F)return 0;
 let v=80*(winP(o,n)-winP(o,F));
 if(L.holding[other(o.seat)])v+=n>F?-20:10;if(L.holding[o.seat])v+=n>F?10:-10;
 const op=o.players[other(o.seat)],h=(op.hand?.length??op.handCount??0),qNow=(op.time??0)>=2?1-Math.pow(.92,h):0;
 const stand=(1-qNow)*Math.pow(.9,Math.max(0,Math.min(n,F)-o.round));return v>0?v*stand:v;}
`;
export function policyTime(cpu='smart'){
 // Trial only: both CPUs in one bundle, chosen at run time by globalThis.__timeCpu ('v1' = smart, otherwise smart2).
 if(cpu==='switch'){const v1=policyTime('smart')[0][2].replace('const growthMult=o=>','').replace(/const TIMEN=[^\n]*\n/,'').replace(/function pendingFinal[^\n]*\n/,'').replace('function timeValue(','function timeValueV1(');
  return [['time-helper',"const growthMult=o=>",SMART2+v1+"const growthMult=o=>"],
  ['time-score',"if(a.slot==='world')return (b.world?.cardId===c?.cardId?-6:b.world?3:9)-spend;","if(a.slot==='world'){const V1=globalThis.__timeCpu==='v1',tv=V1?timeValueV1(c,o):timeValue(c,o);if(tv!==null)return (V1?(tv===0?-1:tv):(tv<=.5?-1:tv))-spend-(b.world&&!TIMEN[b.world.name]?3:0);return (b.world?.cardId===c?.cardId?-6:b.world?3:9)-spend;}"]];}
 if(cpu==='smart2')return [['time-helper',"const growthMult=o=>",SMART2+"const growthMult=o=>"],
  ['time-score',"if(a.slot==='world')return (b.world?.cardId===c?.cardId?-6:b.world?3:9)-spend;","if(a.slot==='world'){const tv=timeValue(c,o);if(tv!==null)return (tv<=.5?-1:tv)-spend-(b.world&&!TIMEN[b.world.name]?3:0);return (b.world?.cardId===c?.cardId?-6:b.world?3:9)-spend;}"]];
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

// ---- VERSION 4 (PLAN-V4.md, CARDS-V3.md): 7 new provisional cards, U12, CPU smart3 --------------------------------------
// Card ids X-N-*. Experiment/trial only; the 452 official cards and their programs are untouched.
export const NEW_IDS=['X-N-hayajimai','X-N-nagaiki','X-N-tsuru','X-N-photo','X-N-machibuse','X-N-omiyage','X-N-chotto'];
export function newCards(){
 const c=(id,name,type,cost,text,method)=>({id,name,type,cost,rare:false,text,source:'variable-life-20261031 VERSION 4（実験専用の仮カード）',source_sha256:'experimental',...(method?{method}:{})});
 return Object.fromEntries([
  c('X-N-hayajimai','はやじまい','event',2,'自分のそだちが相手より少なく、終了ラウンドが現在のラウンドの次のラウンドの場合に発動できる。終了ラウンドが9なら自分のそだち+15、10なら+10、11以上なら+5。この名前のカードは1ターンに1回しか発動できない。','すぐつかう'),
  c('X-N-nagaiki','ながいきのひけつ','event',2,'自分のそだち+5。この効果の解決直前に、終了ラウンドが11以上で、自分のそだちが相手より少ない場合、さらに自分のそだち+10。','すぐつかう'),
  c('X-N-tsuru','おいわいのつる','companion',0,'この名前の能力は1ターンに1回。現在のラウンドがR10以降の場合、自分のターン終了時、自分のそだちが相手以下なら、発動できる。自分のそだち+5。'),
  c('X-N-photo','おもいでのしゃしん','event',2,'現在のラウンドが終了ラウンドの場合に発動できる。自分の場の、なかま・こいびと・セカイ（時のカードを除く）の枚数1枚につき自分のそだち+5（最大+15）。この名前のカードは1ターンに1回しか発動できない。','すぐつかう'),
  c('X-N-machibuse','まちぶせどけい','play',1,'自分が相手の時のカードに時のカードでカウンターする時、準備枠に伏せてあるこのカードを捨て札に置いてもよい。そうしたなら、そのカウンターの時を2少なくし、1枚引く。','しかける'),
  c('X-N-omiyage','いなかのおみやげ','event',1,'自分の捨て札の、時のカード以外のセカイ1枚を対象として発動できる。対象を手札に戻す。このターンに自分が時のカードを出していたなら、さらに1枚引く。','すぐつかう'),
  c('X-N-chotto','ちょっとまった','play',2,'相手のターン終了時、相手のそだちが100で、終了ラウンドが現在のラウンドより後の場合に発動できる。相手のそだち-5。','しかける'),
 ].map(x=>[x.id,x]));
}
export function newRules(){
 const v=(value,op,n)=>JSON.stringify({value,op,n}),all=(...c)=>`{"all":[${c.join(',')}]}`,g=(n,to='self')=>`{"op":"growth","n":${n},"to":"${to}"}`,iff=(c,s)=>`{"op":"if","condition":${c},"steps":[${s.join(',')}]}`;
 const behind=v('growth','lt',{value:'opponentGrowth'});
 return '\n// ---- variable-life-20261031 VERSION 4 new cards ----\n'+[
  `add('X-N-hayajimai',{mode:'quick',condition:${all(behind,v('roundsLeft','eq',1))},onceName:true,steps:[${g(5)},${iff(v('final','lte',10),[g(5)])},${iff(v('final','eq',9),[g(5)])}]});`,
  `add('X-N-nagaiki',{mode:'quick',steps:[${iff(all(v('final','gte',11),behind),[g(10)])},${g(5)}]});`,
  `add('X-N-tsuru',{mode:'companion',triggers:[{when:'end',onceName:true,condition:${all(v('round','gte',10),v('growth','lte',{value:'opponentGrowth'}))},steps:[${g(5)}]}]});`,
  `add('X-N-photo',{mode:'quick',condition:${v('roundsLeft','eq',0)},onceName:true,steps:[{op:'growthByValue',key:'photoCount',per:5,max:15}]});`,
  `add('X-N-machibuse',{mode:'trap',triggers:[]});`,
  `add('X-N-omiyage',{mode:'quick',target:'ownDiscardWorldNonTime',steps:[{op:'move',destination:'hand'},${iff('"timePlacedThisTurn"',[`{"op":"draw","n":1,"to":"self"}`])}]});`,
  `add('X-N-chotto',{mode:'trap',triggers:[{when:'end',opponent:true,condition:${all(v('opponentGrowth','gte',100),v('roundsLeft','gte',1))},steps:[${g(-5,'opponent')}]}]});`,
 ].join('\n')+'\n';
}
// effects.mjs: values (final round, rounds left, photo count), a condition, a target and one op used by the new cards.
export const EFFECTS_V4=[
 ['v4-values',"opponentGrowth:owner(s,other(a)).growth,","opponentGrowth:owner(s,other(a)).growth,final:s.life.final,round:s.round,roundsLeft:s.life.final-s.round,photoCount:Math.min(3,b.companions.length+(b.partner?1:0)+(b.world&&!/^X-T-/.test(card(s,b.world).id)?1:0)),"],
 ['v4-condition'," case 'finalTime':return s.round===10||m?.stage===8;"," case 'timePlacedThisTurn':return s.history.some(e=>e.serial===s.serial&&e.kind==='place'&&e.actor===a&&/^X-T-/.test(s.cards[e.source]?.cardId??''));case 'finalTime':return s.round===10||m?.stage===8;"],
 ['v4-target'," case 'ownDiscardNonMain':return p.discard.filter(id=>card(s,id).type!=='main');"," case 'ownDiscardNonMain':return p.discard.filter(id=>card(s,id).type!=='main');\n case 'ownDiscardWorldNonTime':return p.discard.filter(id=>card(s,id).type==='world'&&!/^X-T-/.test(card(s,id).id));"],
 ['v4-op',"case 'growthVariant':","case 'growthByValue':{const n=Math.min(e.max,e.per*value(s,a,e.key,l));if(n>0){l.applied=true;work.steps.unshift({op:'quantity',effect:{kind:'growth',actor:a,n}});}break;}\n case 'growthVariant':"],
];
// U12 (VERSION 4): a countered time card leaves the world slot through the ordinary move (destination: discard), so existing
// replacement effects of its owner apply (タンポポ④: stay by discarding a world from hand; ヒトデ⑦: deck bottom; サンゴ⑦: stay).
// Its effect is negated in every case: the link is marked negated before any move, and only the last time card sets the final.
export const EFFECTS_TIME_U12=[['time-op',EFFECTS_TIME[1][1],EFFECTS_TIME[1][2].replace(
 "x.negated=true;const own=s.cards[x.source].owner;if(owner(s,own).board.world===x.source)h.discardField(s,own,x.source,{cause:'effect',effectActor:a});",
 "x.negated=true;const own=s.cards[x.source].owner;if(owner(s,own).board.world===x.source)moves.push({id:x.source,generation:s.cards[x.source].generation,zone:'field'});")
 .replace("superseded=[],names=[];","superseded=[],names=[],moves=[];")
 .replace("'カウンター成立：'+names.join('・')+' は捨て札へ。'","'カウンター成立：'+names.join('・')+' は効果なし。'")
 .replace("reached:{A:owner(s,'A').reached,B:owner(s,'B').reached}});break;}","reached:{A:owner(s,'A').reached,B:owner(s,'B').reached}});if(moves.length)work.steps.unshift(...moves.flatMap(ref=>[{op:'bindTarget',ref},{op:'move',destination:'discard'}]));break;}")]];
if(!EFFECTS_TIME_U12[0][2].includes('moves.flatMap')||EFFECTS_TIME_U12[0][2].includes('h.discardField(s,own'))throw Error('U12 patch did not apply');
// engine.mjs: まちぶせどけい — an extra counter action (cost −2, discard this face-down card, draw 1) while it is set face-down.
export const ENGINE_V4=[
 ['v4-ambush-action',"if(cost!==Infinity)add('place',`${c.name}でカウンター（時${cost}）`,{source,slot:'world',cost,counter:true});",
  "if(cost!==Infinity){add('place',`${c.name}でカウンター（時${cost}）`,{source,slot:'world',cost,counter:true});const amb=p.board.prepared.find(e=>e.faceDown&&s.cards[e.id].cardId==='X-N-machibuse');if(amb)add('place',`${c.name}でカウンター（時${Math.max(0,cost-2)}・まちぶせどけい）`,{source,slot:'world',cost:Math.max(0,cost-2),counter:true,ambush:amb.id});}"],
 ['v4-ambush-cost',"-(data.discount?1:0);","-(data.discount?1:0)-(data.ambush?2:0);"],
 ['v4-ambush-consume',"-(x.discount?1:0);const ctx","-(x.discount?1:0)-(x.ambush?2:0);const ctx"],
 ['v4-ambush-pay',"consumeActionCost(s,who,a);p.time-=a.cost;remove(p.hand,a.source);","consumeActionCost(s,who,a);p.time-=a.cost;remove(p.hand,a.source);if(a.ambush&&b.prepared.some(e=>e.id===a.ambush)){discardField(s,who,a.ambush);draw(s,who);log(s,who+'：まちぶせどけいを使った（時−2・1枚引く）');}"],
];
// CPU smart3 (VERSION 4, experiment only): smart2 plus (1) the new cards' values and (2) time-card values that count the own
// hand's new cards and both sides' public tsuru (おいわいのつる) as extra projected growth. Only own hand, public board and
// public state are read. Without new cards it decides exactly like smart2 (checked by save hashes, PLAN-V4).
const SMART3=SMART2.replace("function winP(o,F){","function winP(o,F,bonus=0){")
 .replace("return PHI((a-b)/(6*Math.sqrt(left+.3)+2));}","return PHI((Math.min(100,a+bonus)-b)/(6*Math.sqrt(left+.3)+2));}")
 .replace("let v=80*(winP(o,n)-winP(o,F));","let v=80*(winP(o,n,v4Bonus(o,n))-winP(o,F,v4Bonus(o,F)));")+`
const ownHand=o=>o.players[o.seat]?.hand??[],hasNew=(o,id)=>ownHand(o).filter(c=>c.cardId===id).length;
const onBoard=(o,seat,id)=>(o.players[seat]?.board?.companions??[]).some(c=>c.cardId===id);
function tsuruRounds(o,n){return Math.max(0,n-Math.max(10,o.round)+1);}
function v4Bonus(o,n){const me=o.players[o.seat],op=o.players[other(o.seat)];let b=0;
 if(me.growth<op.growth){if(hasNew(o,'X-N-hayajimai')&&n-o.round===1)b+=n===9?15:n===10?10:5;b+=10*Math.min(2,hasNew(o,'X-N-nagaiki'))*(n>=11?1:0);}
 if(me.growth<=op.growth&&onBoard(o,o.seat,'X-N-tsuru'))b+=5*tsuruRounds(o,n);
 if(op.growth<=me.growth&&onBoard(o,other(o.seat),'X-N-tsuru'))b-=5*tsuruRounds(o,n);
 return b;}
function newCardValue(a,o,spend){const id=a.card?.cardId;if(!id?.startsWith('X-N-'))return null;
 const me=o.players[o.seat],op=o.players[other(o.seat)],F=o.life?.final??10,G=g=>g*growthMult(o),behind=me.growth<op.growth;
 if(a.kind==='place'&&a.slot==='prepared'){if(id==='X-N-machibuse')return ownHand(o).some(c=>TIMEN[c.name])?6-spend:-1;if(id==='X-N-chotto')return op.growth>=85&&F>o.round?7-spend:-1;return null;}
 if(!['play','programPlay'].includes(a.kind))return null;
 if(id==='X-N-hayajimai')return G(F===9?15:F===10?10:5)-3-spend;
 if(id==='X-N-nagaiki'){const big=F>=11&&behind;if(!big&&behind&&o.round<10&&ownHand(o).some(c=>c.name==='XI'||c.name==='XII'))return -1;return G(big?15:5)-3-spend;}
 if(id==='X-N-photo'){const b=me.board,n=Math.min(3,(b.companions?.length??0)+(b.partner?1:0)+(b.world&&!TIMEN[b.world.name]?1:0));return n?G(5*n)-3-spend:-1;}
 if(id==='X-N-omiyage')return (!me.board.world||TIMEN[me.board.world.name])?10-spend:2-spend;
 return null;}
`;
export function policyV4(){return [['time-helper',"const growthMult=o=>",SMART3+"const growthMult=o=>"],
 ['time-score',"if(a.slot==='world')return (b.world?.cardId===c?.cardId?-6:b.world?3:9)-spend;","if(a.slot==='world'){const tv=timeValue(c,o);if(tv!==null)return (tv<=.5?-1:tv)-spend-(b.world&&!TIMEN[b.world.name]?3:0);return (b.world?.cardId===c?.cardId?-6:b.world?3:9)-spend;}"],
 ['v4-score'," const spend=spendOf(a,o);"," const spend=spendOf(a,o);{const nv=newCardValue(a,o,spend);if(nv!==null)return nv;}"]];}
// Trial only (VERSION 4): smart3 (default) and VERSION 1's smart in one bundle, chosen at run time by globalThis.__timeCpu
// ('v1' = smart; otherwise smart3, which decides exactly like smart2 when no new card is involved).
export function policyTrialV4(){const v1=policyTime('smart')[0][2].replace('const growthMult=o=>','').replace(/const TIMEN=[^\n]*\n/,'').replace(/function pendingFinal[^\n]*\n/,'').replace('function timeValue(','function timeValueV1(');
 const [h,,n]=policyV4();
 return [['time-helper',h[1],SMART3+v1+"const growthMult=o=>"],
  ['time-score',"if(a.slot==='world')return (b.world?.cardId===c?.cardId?-6:b.world?3:9)-spend;","if(a.slot==='world'){const V1=globalThis.__timeCpu==='v1',tv=V1?timeValueV1(c,o):timeValue(c,o);if(tv!==null)return (V1?(tv===0?-1:tv):(tv<=.5?-1:tv))-spend-(b.world&&!TIMEN[b.world.name]?3:0);return (b.world?.cardId===c?.cardId?-6:b.world?3:9)-spend;}"],n];}

// ---- VERSION 5 (PLAN-V5.md): おいわいのつる timing variants (comparison only; the V4 card X-N-tsuru is kept unchanged) ----
// R: at the end of each round (end of the second player's turn, after both players acted), R10 or later.
// S: at the start of each round (start of the first player's turn), R10 or later.
// Both: only a player whose growth is strictly lower than the opponent's gets +5; the check is made once for both players at
// the same moment (trigger collection), so at most one player gains per round; the same name works once per turn (= once per
// round, since there is one such turn per round). A tie gives nothing.
export function v5Cards(){
 const c=(id,name,text)=>({id,name,type:'companion',cost:0,rare:false,text,source:'variable-life-20261031 VERSION 5（実験専用の仮カード）',source_sha256:'experimental'});
 return {'X-N-tsuruR':c('X-N-tsuruR','おいわいのつる（ラウンド終了）','R10以降の各ラウンドの終わり（後攻のターン終了時）に、自分のそだちが相手より少ないなら、自分のそだち+5。この名前の効果は1ラウンドに1回。'),
  'X-N-tsuruS':c('X-N-tsuruS','おいわいのつる（ラウンド開始）','R10以降の各ラウンドの始め（先攻のターン開始時）に、自分のそだちが相手より少ないなら、自分のそだち+5。この名前の効果は1ラウンドに1回。')};
}
export function v5Rules(){
 const v=(value,op,n)=>JSON.stringify({value,op,n}),all=(...c)=>`{"all":[${c.join(',')}]}`,g=`{"op":"growth","n":5,"to":"self"}`,behind=v('growth','lt',{value:'opponentGrowth'});
 return '\n// ---- variable-life-20261031 VERSION 5 おいわいのつる variants ----\n'+
  `add('X-N-tsuruR',{mode:'companion',triggers:[{when:'end',anyActor:true,mandatory:true,onceName:true,condition:${all(v('secondTurn','eq',1),v('round','gte',10),behind)},steps:[${g}]}]});\n`+
  `add('X-N-tsuruS',{mode:'companion',triggers:[{when:'start',anyActor:true,mandatory:true,onceName:true,condition:${all(v('firstTurn','eq',1),v('round','gte',10),behind)},steps:[${g}]}]});\n`;
}
export const EFFECTS_V5=[['v5-values',"roundsLeft:s.life.final-s.round,","roundsLeft:s.life.final-s.round,secondTurn:Number(s.turn==='B'),firstTurn:Number(s.turn==='A'),"]];
// CPU smart4 (VERSION 5, experiment only) = smart3 plus:
//  (1) ながいきのひけつ: compare using it now (+5, or +15 if already final>=11 and behind) with holding it. Holding is worth
//      (5 + 10 × P(final becomes >=11) × P(still behind then)) at the late-round weight, slightly discounted; P is read from own
//      and public information only (own XI/XII in hand, rounds left; the opponent's hand is unknown → a fixed prior). It is used
//      now when that is worth more: already final>=11 and behind, the final round, or +5 reaches 100 (starts the 100維持).
//  (2) おもいでのしゃしん in hand: replacing an own non-time world with a time card also loses that world's +5 for the photo.
//  (3) all おいわいのつる variants count in the time-card bonus (V4: ≤, R/S: strictly behind).
const SMART4=SMART3
 .replace("const onBoard=(o,seat,id)=>(o.players[seat]?.board?.companions??[]).some(c=>c.cardId===id);","const TSURU=['X-N-tsuru','X-N-tsuruR','X-N-tsuruS'],onBoard=(o,seat,id)=>(o.players[seat]?.board?.companions??[]).some(c=>id==='X-N-tsuru'?TSURU.includes(c.cardId):c.cardId===id);")
 .replace("if(id==='X-N-nagaiki'){const big=F>=11&&behind;if(!big&&behind&&o.round<10&&ownHand(o).some(c=>c.name==='XI'||c.name==='XII'))return -1;return G(big?15:5)-3-spend;}",
  "if(id==='X-N-nagaiki'){const big=F>=11&&behind;if(big||o.round>=F)return G(big?15:5)-3-spend;const ext=ownHand(o).some(c=>c.name==='XI'||c.name==='XII');const pExt=F>=11?1:ext&&o.round<=10?.75:o.round<=6?.35:o.round<=8?.25:.12;const d=op.growth-me.growth,pBehind=d>0?.85:d>-10?.45:.2;if(me.growth<100&&me.growth+5>=100&&!o.life?.holding?.[o.seat])return G(5)+10-3-spend;const later=(5+10*pExt*pBehind)*2.2*.95;if(later>G(5))return -1;return G(5)-3-spend;}");
if(SMART4===SMART3||!SMART4.includes('pExt')||!SMART4.includes('TSURU'))throw Error('smart4 patch did not apply');
export function policyV5(){const [h,s,n]=policyV4();
 return [['time-helper',h[1],SMART4+"const growthMult=o=>"],
  ['time-score',s[1],s[2].replace("-spend-(b.world&&!TIMEN[b.world.name]?3:0);return","-spend-(b.world&&!TIMEN[b.world.name]?3+(ownHand(o).some(x=>x.cardId==='X-N-photo')?5:0):0);return")],n];}
// Trial only (VERSION 5): smart4 (default), smart3 (VERSION 4: globalThis.__timeCpu==='v4') and VERSION 1's smart (=== 'v1').
export function policyTrialV5(){const v1=policyTime('smart')[0][2].replace('const growthMult=o=>','').replace(/const TIMEN=[^\n]*\n/,'').replace(/function pendingFinal[^\n]*\n/,'').replace('function timeValue(','function timeValueV1(');
 const v4fn=SMART3.slice(SMART3.indexOf('function newCardValue(')).replace('function newCardValue(','function newCardValueV4(');
 const [h,,n]=policyV4();
 return [['time-helper',h[1],SMART4+v4fn+v1+"const growthMult=o=>"],
  ['time-score',"if(a.slot==='world')return (b.world?.cardId===c?.cardId?-6:b.world?3:9)-spend;","if(a.slot==='world'){const M=globalThis.__timeCpu,V1=M==='v1',tv=V1?timeValueV1(c,o):timeValue(c,o);if(tv!==null)return (V1?(tv===0?-1:tv):(tv<=.5?-1:tv))-spend-(b.world&&!TIMEN[b.world.name]?3+(M!=='v4'&&!V1&&ownHand(o).some(x=>x.cardId==='X-N-photo')?5:0):0);return (b.world?.cardId===c?.cardId?-6:b.world?3:9)-spend;}"],
  [n[0],n[1],n[2].replace('const nv=newCardValue(a,o,spend);','const nv=(globalThis.__timeCpu==="v4"?newCardValueV4:newCardValue)(a,o,spend);')]];}

// ---- VERSION 6 (PLAN-V6.md): measurement and CPU comparison only; the cards' effects are unchanged ----
// (1) おもいでのしゃしん: each resolution is logged in life.events {op:'photo', n, count, actor, round, turn, final} (state only;
//     saves are commands, decisions do not read events).
export const EFFECTS_V6_LOG=[['v6-photo-log',"case 'growthByValue':{const n=Math.min(e.max,e.per*value(s,a,e.key,l));","case 'growthByValue':{const n=Math.min(e.max,e.per*value(s,a,e.key,l));if(e.key==='photoCount')s.life.events.push({op:'photo',n,count:value(s,a,e.key,l),actor:a,round:s.round,turn:s.turn,final:s.life.final,serial:s.serial,growth:{A:owner(s,'A').growth,B:owner(s,'B').growth}});"]];
// (2) ながいきのひけつ: three CPU decisions on top of smart4 (everything else identical).
//   early   : VERSION 4 (smart3) — hold only when behind with XI/XII in hand before R10, else use now (+5 / +15).
//   hold    : VERSION 5 (smart4) — unchanged.
//   adaptive: now vs later, where later = (5 + 10 × P(final>=11, discounted by the opponent's counter chance) × P(behind then,
//             from the current win estimate)) × late weight × (1 − risk of never finding time for it, from the own hand size);
//             now = the card's value this turn after its time opportunity cost (0 when the time would be unused). Uses now for
//             +15, the final round, or reaching 100. Only own hand, public counts and public state are read.
const NAGA_HOLD="if(id==='X-N-nagaiki'){const big=F>=11&&behind;if(big||o.round>=F)return G(big?15:5)-3-spend;const ext=ownHand(o).some(c=>c.name==='XI'||c.name==='XII');const pExt=F>=11?1:ext&&o.round<=10?.75:o.round<=6?.35:o.round<=8?.25:.12;const d=op.growth-me.growth,pBehind=d>0?.85:d>-10?.45:.2;if(me.growth<100&&me.growth+5>=100&&!o.life?.holding?.[o.seat])return G(5)+10-3-spend;const later=(5+10*pExt*pBehind)*2.2*.95;if(later>G(5))return -1;return G(5)-3-spend;}";
const NAGA_EARLY="if(id==='X-N-nagaiki'){const big=F>=11&&behind;if(!big&&behind&&o.round<10&&ownHand(o).some(c=>c.name==='XI'||c.name==='XII'))return -1;return G(big?15:5)-3-spend;}";
const NAGA_ADAPTIVE="if(id==='X-N-nagaiki'){const big=F>=11&&behind;if(big||o.round>=F)return G(big?15:5)-3-spend;if(me.growth<100&&me.growth+5>=100&&!o.life?.holding?.[o.seat])return G(5)+10-3-spend;const ext=ownHand(o).some(c=>c.name==='XI'||c.name==='XII');const oh=op.handCount??op.hand?.length??0,qC=(op.time??0)>=2?1-Math.pow(.92,oh):0;const pExt=(F>=11?1:ext&&o.round<=10?.75:o.round<=6?.35:o.round<=8?.25:.12)*(F>=11?1:1-.5*qC);const pW=winP(o,F),pBehind=Math.min(.95,Math.max(.05,1-pW));const hs=ownHand(o).length,crowd=hs>=7?.3:hs>=5?.15:.05;const later=(5+10*pExt*pBehind)*2.2*(1-crowd);if(later>G(5)-spend)return -1;return G(5)-3-spend;}";
if(!SMART4.includes(NAGA_HOLD))throw Error('smart4 naga text changed');
export function policyV6(naga='hold'){const [h,s,n]=policyV5();const body=naga==='early'?NAGA_EARLY:naga==='adaptive'?NAGA_ADAPTIVE:NAGA_HOLD;
 return [[h[0],h[1],h[2].replace(NAGA_HOLD,body)],s,n];}
