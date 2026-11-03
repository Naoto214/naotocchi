// 新しいカード詳細（大型カード＋補足付きボタン）の確認用に、正式エンジンの合法手だけで追加の場面を探して保存する。
// 前回の4場面（../detail-ui-ab-20261028/scenarios.json）に加え、4つ以上の行動・宣言・連鎖中の応答・対象/支払いの選択。
// 使い方: node prototypes/card-game/detail-stage-20261029/make-scenarios.mjs > prototypes/card-game/detail-stage-20261029/scenarios-extra.json
import {createGame,DEFAULT_DECK} from '../engine.mjs';
import {HotseatSession} from '../ui-session.mjs';
import {CpuSession} from '../cpu-session.mjs';
import {chooseCpuAction} from '../cpu-policy.mjs';
import {cardActions} from '../ui-presentation.mjs';
import {visibleCards} from '../ui-context.mjs';
import {encodeMatch,newMetadata} from '../records-match.mjs';
// 前回と同じ比較用デッキ（長文カード入り）。前回のスクリプトは読み込むと探索を始めるため、定義だけをここに写す。
const LONG=['M-woman-02','C-monkey','W-city'],keep=DEFAULT_DECK.filter(id=>!['G-area-claim','G-archery-3d','G-animal-shogi','E-first-date','I-bowtie'].includes(id));
const DECK_A=[...LONG.flatMap(id=>[id,id,id]),'M-starfish-01','M-starfish-01','M-starfish-01','I-bowtie','I-bowtie',...keep];

// 自分（A）の公開カードのうち、条件に合う行動を持つものを返す
const pick=(v,test)=>v.actor==='A'?visibleCards(v).filter(c=>!c.hidden).find(c=>test(cardActions(v,'A',c),c,v)):null;
const WANT={
 many:v=>pick(v,acts=>acts.filter(a=>!a.declare).length>=4),
 declare:v=>pick(v,acts=>acts.some(a=>a.declare)),
 chain:v=>v.turn==='B'&&v.chain.length>0?pick(v,acts=>acts.some(a=>a.kind!=='pass')):null,
 target:v=>v.choice?.kind==='activation_selection'?pick(v,acts=>acts.some(a=>a.kind==='choose')):null,
};
const LABEL={many:'4つ以上の行動があるカード',declare:'宣言（名前を選ぶ）があるカード',chain:'連鎖中の応答（相手の効果の解決前）',target:'発動の対象・支払いを選ぶ'};
function play(seed,deckA,want,limit=500){
 const se=new HotseatSession({autoAdvance:true});se.start(createGame(seed,{A:deckA,B:DEFAULT_DECK}));
 for(let step=0;step<limit&&!se.finished;step++){se.reveal();const v=se.projection,who=v.actor;
  const card=who==='A'&&want(v);if(card)return {se,v,card};
  const d=chooseCpuAction(se.decisionInput(who),{difficulty:'intermediate',seed,step});se.commit(d.id,v.revision,who);}
 return null;
}
const out={generatedFrom:'engine.mjs legalActions + cpu-policy (both seats)',scenarios:[]};
for(const key of Object.keys(WANT).filter(k=>!process.env.ONLY||process.env.ONLY.split(',').includes(k))){
 let found=null,deck=null;
 for(const d of [DECK_A,DEFAULT_DECK])for(let seed=1;seed<40&&!found;seed++){found=play(seed,d,WANT[key]);if(found)deck=d;}
 if(!found){out.scenarios.push({key,label:LABEL[key],missing:true});process.stderr.write(`${key}: not found\n`);continue;}
 const {se,v,card}=found,hot=se.save();
 const cpu=new CpuSession({humanSeat:'A',difficulty:'intermediate',policySeed:1});cpu.start(createGame(1,{A:deck,B:DEFAULT_DECK}));
 const shape=JSON.parse(cpu.save());shape.game=JSON.parse(hot);shape.step=0;shape.guard={turn:null,count:0,seen:{}};new CpuSession().restore(JSON.stringify(shape));
 const decks={A:{id:null,name:'比較用デッキ',cards:[...deck]},B:{id:null,name:'初期デッキ',cards:[...DEFAULT_DECK]}};
 const acts=cardActions(v,'A',card);
 out.scenarios.push({key,label:LABEL[key],card:card.cardId,cardName:card.name,zone:v.players.A.hand.some(c=>c.id===card.id)?'hand':'board',instance:card.id,round:v.round,turn:v.turn,choice:v.choice?.kind??null,chain:v.chain.length,actions:acts.map(a=>a.displayLabel??a.label),
  hotseat:encodeMatch(hot,newMetadata({mode:'hotseat',decks})),
  cpu:encodeMatch(JSON.stringify(shape),newMetadata({mode:'cpu',human:'A',difficulty:'intermediate',decks:{A:decks.A,B:{id:null,name:'CPU 初期デッキ',cards:[...DEFAULT_DECK]}}}))});
 process.stderr.write(`${key}: ${card.name} (${acts.length} actions)\n`);
}
process.stdout.write(JSON.stringify(out,null,1)+'\n');
