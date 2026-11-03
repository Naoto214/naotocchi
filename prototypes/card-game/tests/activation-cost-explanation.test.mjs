import test from 'node:test';import assert from 'node:assert/strict';import * as e from '../engine.mjs';import {CATALOG} from '../full-catalog.mjs';import * as book from '../rulebook-content.mjs';
function put(s,a,id,zone='hand'){const p=s.players[a],x=p.deck.shift();s.cards[x].cardId=id;p[zone].push(x);return x;}
function fixture(){const s=e.createGame(71);s.choice=null;s.pending=[];s.phase='normal';s.players.A.time=10;s.players.B.time=10;return s;}
const WITH_COST=['G-bubble-shooter','G-darts-board','G-jenga-tower','G-shanghai-tiles','G-stack-leaves','G-street-fight','M-phoenix-06'];
test('発動コストを使う7枚が、ルールブック第8章の説明の対象と一致する',()=>{
 const users=Object.values(CATALOG).filter(c=>c.text.includes('発動コスト')).map(c=>c.id).sort();
 assert.deepEqual(users,[...WITH_COST].sort());
 const ch=book.CHAPTERS.find(c=>c.id===8);
 const d=ch.details.find(x=>x.startsWith('発動コスト：'));
 assert.ok(d,'chapter 8 explains activation cost');
 for(const part of ['時とは別','発動する時に決めて払','始められません','払い戻しません','効果の解決中'])assert.ok(d.includes(part),part);
});
test('発動コストを払えない時は、その発動を始められない（コストだけ払う状態にならない）',()=>{
 for(const id of ['G-bubble-shooter','G-darts-board','G-jenga-tower','G-shanghai-tiles','G-stack-leaves']){
  const s=fixture();s.players.A.hand.length=0;s.players.A.board.prepared.length=0;const card=put(s,'A',id);
  assert.equal(e.legalActions(s).some(a=>a.source===card),false,id);
  assert.equal(s.players.A.time,10,id);
 }
});
