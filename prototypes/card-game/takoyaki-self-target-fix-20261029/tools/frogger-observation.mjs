// 参考の観察（修正なし）：かえるのみち（G-frogger-road、81接続「自身は発動領域へ移るので対象にできない」）の対象候補。
// effects.targets に同じ 'ownPrepared' を渡しているため、たこやきと同じく自分自身が候補に入るかを確かめる。
import * as e from '../../engine.mjs';import {RULES} from '../../rules.mjs';import * as fx from '../../effects.mjs';
const s=e.createGame(71);const p=s.players.A;const take=c=>{const id=p.deck.shift();s.cards[id].cardId=c;return id;};
const frog=take('G-frogger-road');p.board.prepared.push({id:frog,faceDown:true,setSerial:0});const fish=take('G-real-fishing');p.board.prepared.push({id:fish,faceDown:true,setSerial:0});
const rule=RULES['G-frogger-road'].triggers[0];const cands=fx.targets(s,'A',rule.target,frog);
console.log(JSON.stringify({card:'G-frogger-road',ruling:'81 接続：自身は発動領域へ移るので対象にできない',ruleTarget:rule.target,candidates:cands.map(id=>s.cards[id].cardId),selfOffered:cands.includes(frog),fixedInThisPR:false},null,1));
