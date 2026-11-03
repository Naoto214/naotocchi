// 比較用の対戦シナリオを、正式エンジンの合法手だけで再生して作る（読み取り専用。エンジン・カードは変更しない）。
// 使い方: node prototypes/card-game/detail-ui-ab-20261028/make-scenarios.mjs > prototypes/card-game/detail-ui-ab-20261028/scenarios.json
// 保存は本番と同じ形式（seed＋操作列）。試遊版は「保存した対戦に戻る」と同じ復帰処理で読み込む。
import {createGame,DEFAULT_DECK,validateDeck} from '../engine.mjs';
import {HotseatSession} from '../ui-session.mjs';
import {CpuSession} from '../cpu-session.mjs';
import {chooseCpuAction} from '../cpu-policy.mjs';
import {cardActions} from '../ui-presentation.mjs';
import {visibleCards} from '../ui-context.mjs';
import {encodeMatch,newMetadata} from '../records-match.mjs';
import {CATALOG} from '../full-catalog.mjs';

export const LONG=['M-woman-02','C-monkey','W-city'],SHORT=['M-starfish-01','C-box'];
const keep=DEFAULT_DECK.filter(id=>!['G-area-claim','G-archery-3d','G-animal-shogi','E-first-date','I-bowtie'].includes(id));
export const DECK_A=[...LONG.flatMap(id=>[id,id,id]),'M-starfish-01','M-starfish-01','M-starfish-01','I-bowtie','I-bowtie',...keep];
validateDeck(DECK_A);validateDeck(DEFAULT_DECK);
const featured=new Set([...LONG,...SHORT]);

function play(seed,want,limit=900){
 const se=new HotseatSession({autoAdvance:true});se.start(createGame(seed,{A:DECK_A,B:DEFAULT_DECK}));
 for(let step=0;step<limit&&!se.finished;step++){
  se.reveal();const v=se.projection,who=v.actor;
  const hit=who==='A'&&want(v,se);if(hit)return {se,v,hit};
  const o=se.decisionInput(who);
  // A は特集カードを手放さない（山札の下へ戻す選択で特集カード以外を選ぶ）。他はCPU方針で進める。
  let d=chooseCpuAction(o,{difficulty:'intermediate',seed,step});
  if(who==='A'&&v.choice){const alt=v.actions.find(a=>a.kind==='choose'&&!featured.has(a.choiceCard?.split(':')[1]));if(alt&&featured.has(v.actions.find(a=>a.id===d.id)?.choiceCard?.split(':')[1]))d=alt;}
  se.commit(d.id,v.revision,who);
 }
 return null;
}
const inHand=(v,ids)=>(v.players.A.hand??[]).filter(c=>ids.includes(c.cardId));
const onBoard=(v,id)=>Object.values(v.players).some(p=>[p.board.main,p.board.partner,p.board.world,...p.board.companions,...p.board.prepared].some(c=>c?.id===id));

const WANT={
 choice:v=>v.actor==='A'&&v.turn==='A'&&v.choice?.kind==='egg_bottom'&&inHand(v,LONG).length>=2&&inHand(v,SHORT).length>=1,
 normal:v=>v.actor==='A'&&v.turn==='A'&&!v.choice&&!v.chain.length&&v.round>=2&&inHand(v,LONG).some(c=>cardActions(v,'A',c).length)&&inHand(v,SHORT).length>=1,
 response:v=>v.actor==='A'&&v.turn==='B'&&v.actions.some(a=>a.kind!=='pass')&&v.actions.some(a=>a.kind==='pass'),
 // 対象指定: 盤面のカードを選ぶ必須選択、または発動の対象を盤面から選ぶ段階。
 target:v=>v.actor==='A'&&v.choice?.kind!=='egg_bottom'&&v.actions.filter(a=>(a.choiceCard&&onBoard(v,a.choiceCard))||(a.targetCard&&onBoard(v,a.targetCard)&&a.kind!=='play')).length>=2,
};
const LABEL={choice:'必須選択中（たまごの交換）',normal:'通常手番',response:'応答中（相手の手番）',target:'対象を選ぶ行動（交代先などを選ぶ）'};

const out={generatedFrom:'engine.mjs legalActions + cpu-policy (both seats); A keeps featured cards',deckA:DECK_A,deckB:DEFAULT_DECK,long:LONG,short:SHORT,names:Object.fromEntries([...LONG,...SHORT].map(id=>[id,CATALOG[id].name])),scenarios:[]};
for(const key of Object.keys(WANT).filter(k=>!process.env.ONLY||k===process.env.ONLY)){
 let found=null;
 for(let seed=1;seed<60&&!found;seed++){found=play(seed,WANT[key],400);process.stderr.write(`${key} seed ${seed} ${found?'found':'-'}\n`);}
 if(!found){out.scenarios.push({key,label:LABEL[key],missing:true});continue;}
 const {se,v}=found,hot=se.save();
 // CPU 版: 同じ盤面を CPU 対戦（あなた=A、CPU=B）として保存。CPU の内部状態は初期値。
 const cpu=new CpuSession({humanSeat:'A',difficulty:'intermediate',policySeed:1});cpu.start(createGame(1,{A:DECK_A,B:DEFAULT_DECK}));
 const shape=JSON.parse(cpu.save());shape.game=JSON.parse(hot);shape.step=0;shape.guard={turn:null,count:0,seen:{}};
 const cpuRaw=JSON.stringify(shape),check=new CpuSession();check.restore(cpuRaw);
 const decks={A:{id:null,name:'比較用デッキ',cards:[...DECK_A]},B:{id:null,name:'初期デッキ',cards:[...DEFAULT_DECK]}};
 const hand=(v.players.A.hand??[]).map(c=>c.cardId);
 out.scenarios.push({key,label:LABEL[key],seed:JSON.parse(hot).seed,commands:JSON.parse(hot).commands.length,round:v.round,turn:v.turn,actor:v.actor,choice:v.choice?.kind??null,chain:v.chain.length,
  hand,focus:{long:hand.filter(id=>LONG.includes(id)),short:hand.filter(id=>SHORT.includes(id))},
  actions:v.actions.map(a=>a.displayLabel??a.label).slice(0,8),
  hotseat:encodeMatch(hot,newMetadata({mode:'hotseat',decks})),
  cpu:encodeMatch(cpuRaw,newMetadata({mode:'cpu',human:'A',difficulty:'intermediate',decks:{A:decks.A,B:{id:null,name:'CPU 初期デッキ',cards:[...DEFAULT_DECK]}}}))});
}
process.stdout.write(JSON.stringify(out,null,1)+'\n');
