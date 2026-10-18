// Read-only result journal. Observes committed command boundaries, never rules.
import {CARDS,view,createGame,act,actor} from './engine.mjs';
import * as legacy from './legacy-engine.mjs';
const zoneNames={hand:'手札',deck:'山札',discard:'捨て札',main:'メイン',partner:'こいびと',world:'セカイ',companions:'なかま',prepared:'準備',chain:'発動領域'};
const describe=(s,id)=>({...CARDS[s.cards[id].cardId],cardId:s.cards[id].cardId,id});
function locations(s){const out=new Map();for(const seat of ['A','B']){const p=s.players[seat],b=p.board;
 for(const zone of ['hand','deck','discard'])for(const id of p[zone])out.set(id,{seat,zone,public:zone==='discard'});
 for(const zone of ['main','partner','world'])if(b[zone])out.set(b[zone],{seat,zone,public:true});
 for(const id of b.companions)out.set(id,{seat,zone:'companions',public:true});
 for(const c of b.prepared)out.set(c.id,{seat,zone:'prepared',public:!c.faceDown,target:c.target});
 }for(const l of s.chain)if(!l.ability)out.set(l.source,{seat:l.actor,zone:'chain',public:true});return out;}
const effectNames={stat:'能力値',statSet:'能力値',protection:'移動の保護',prevention:'減少の防止',copiedAbility:'能力コピー',cost:'コスト',restriction:'行動の制限'};
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export function captureResult(before,after){
 const old=before?locations(before):new Map(),now=locations(after),events=(after.history??[]).slice(before?.history?.length??0),trace=after.log.slice(before?.log?.length??0);
 const resolving=trace.filter(t=>t.includes('を解決')||t.includes('予約効果'));
 const heading=!before?'対戦開始時点':resolving.length?resolving.join(' → '):before.choice?.kind==='egg_bottom'?'たまご・手札返却':trace[0]??(before.choice?'選択後の結果':'処理後の結果');
 const rowSpecs=[];
 if(!before){for(const seat of ['A','B'])rowSpecs.push({kind:'initial',seat,ids:[...after.players[seat].hand],publicCards:false,text:'開始時の手札'});}
 else{
  const groups=new Map();for(const [id,to] of now){const from=old.get(id);if(!from||from.zone===to.zone)continue;
   const birth=events.find(e=>e.source===id&&['birth','time_skip','transform'].includes(e.kind));
   const kind=from.zone==='deck'&&to.zone==='hand'?'draw':to.zone==='deck'?'return':to.zone==='discard'?'discard':birth?.kind==='birth'?'birth':to.zone==='main'?'main':to.zone==='chain'?'activate':'move';
   const verb=kind==='draw'?'手札に追加（山札から）':kind==='return'?'山札へ戻した':kind==='discard'?(from.zone==='chain'?'使用後、捨て札へ':'捨て札へ移動'):kind==='birth'?'たんじょう':birth?.kind==='time_skip'?'ときおくり':birth?.kind==='transform'?'へんしん':`${zoneNames[from.zone]} → ${zoneNames[to.zone]}`;
   const key=[to.seat,from.zone,to.zone,kind,to.public,verb].join('|');if(!groups.has(key))groups.set(key,{kind,seat:to.seat,ids:[],publicCards:to.public,from:from.zone,to:to.zone,text:verb});groups.get(key).ids.push(id);
  }rowSpecs.push(...groups.values());
 }
 const growth=events.filter(e=>e.kind==='growth'),totals={A:0,B:0};
 const preciseGrowth=Boolean(before&&growth.length&&growth.every(e=>['A','B'].includes(e.actor)&&Number.isFinite(e.delta))&&['A','B'].every(a=>growth.filter(e=>e.actor===a).reduce((n,e)=>n+e.delta,before.players[a].growth)===after.players[a].growth));
 if(preciseGrowth){for(const a of ['A','B'])totals[a]=before.players[a].growth;for(const event of growth){const a=event.actor,old=totals[a];totals[a]+=event.delta;rowSpecs.push({kind:'growth',seat:a,label:'そだち',before:old,after:totals[a],delta:event.delta});}}
 const previous=before?view(before,null):null,current=view(after,null);
 for(const seat of ['A','B']){
  const p=previous?.players[seat],n=current.players[seat];
  for(const [kind,label] of [['growth','そだち'],['time','時'],['power','ちから'],['wisdom','ちえ'],['relationship','交際']]){
   if(kind==='growth'&&preciseGrowth)continue;
   const a=['power','wisdom'].includes(kind)?p?.stats?.[kind]??null:p?.[kind]??null,b=['power','wisdom'].includes(kind)?n.stats?.[kind]??null:n[kind];
   if(a===b||(!before&&kind!=='time'))continue;
   rowSpecs.push({kind,seat,label,before:a,after:b,delta:typeof a==='number'&&typeof b==='number'?b-a:null});
  }
  if(before&&same(before.players[seat].deck.slice().sort(),after.players[seat].deck.slice().sort())&&!same(before.players[seat].deck,after.players[seat].deck))rowSpecs.push({kind:'order',seat,text:'山札の並びが変わりました'});
 }
 if(before){
  for(const event of events.filter(e=>e.kind==='negated'))rowSpecs.push({kind:'negate',seat:after.cards[event.source].owner,text:'効果は無効のため適用されませんでした',ids:[event.source],publicCards:true});
  for(const l of after.chain)if(l.negated&&!before.chain.find(o=>o.uid===l.uid&&o.source===l.source)?.negated)rowSpecs.push({kind:'negate',seat:l.actor,text:'効果が無効になりました',ids:[l.source],publicCards:true});
  const added=(after.effects??[]).filter(e=>!(before.effects??[]).some(o=>same(o,e)));
  for(const fx of added)rowSpecs.push({kind:'ongoing',seat:fx.actor??after.turn,text:`継続効果を適用：${effectNames[fx.kind]??'効果状態を更新'}`});
  if((before.effects??[]).some(e=>!(after.effects??[]).some(n=>same(e,n))))rowSpecs.push({kind:'ongoing',seat:after.turn,text:'適用済み効果が解除・消費・更新されました'});
  if(!same(before.scheduled??[],after.scheduled??[]))rowSpecs.push({kind:'reservation',seat:after.turn,text:'予約状態が更新されました'});
 }
 for(const line of trace.filter(t=>/防止|置換|公開：|つけ替え|ちょうせん .*対|コピー/.test(t)))rowSpecs.push({kind:'event',text:line});
 if(!rowSpecs.length&&!resolving.length)return null;
 const audiences={};for(const viewer of [null,'A','B']){
  const rows=rowSpecs.map(({ids,publicCards,label,...r})=>{
   const cards=ids&&(publicCards||r.seat===viewer)?ids.map(id=>describe(after,id)):[];
   const number=label?`${label} ${r.before??'—'} → ${r.after??'—'}${r.delta===null?'':`（${r.delta>0?'+':r.delta<0?'−':''}${Math.abs(r.delta)}）`}`:r.text;
   return {...r,text:`${r.seat?r.seat+'：':''}${number}${ids?` ${cards.length?cards.map(c=>c.name).join('・'):ids.length+'枚'}`:''}`,cards};
  });
  audiences[viewer??'public']={id:after.revision,revision:after.revision,turn:after.turn,heading,combined:resolving.length>1||events.filter(e=>e.kind==='effectApplied').length>1,trace:[...trace],rows};
 }
 return audiences;
}
export function appendResult(journal,before,after){const result=captureResult(before,after);if(result)journal.push(result);if(journal.length>40)journal.splice(0,journal.length-40);}
export function projectResults(journal,viewer){return structuredClone(journal.map(r=>r[viewer??'public']));}
export function replayResults(state){let s=state.version===legacy.VERSION?legacy.createGame(state.seed):createGame(state.seed,state.decks);const journal=[];appendResult(journal,null,s);for(const id of state.commands){const next=act(s,actor(s),s.revision,id);appendResult(journal,s,next);s=next;}return journal;}
