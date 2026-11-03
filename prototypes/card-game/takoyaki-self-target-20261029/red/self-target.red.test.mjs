// RED（未修正の実装で失敗することを確かめるテスト）。しかけたカードが発動する時、そのカード自身は「自分の準備枠のカード1枚」の対象にできない。
// 正式裁定：たこやきやさん＝87 接続「このしかけ自身は発動領域へ出ているため対象にできない」・88 X06。
//           かえるのおうちがえり＝82 P20「自身は発動領域へ出るので対象にならない」（同じ原因の関連カード）。
// tests/ の外に置くので、通常の回帰（tests/*.test.mjs）とCIには含まれない。修正案を当てた時に tests/ へ移す想定。
// 使い方: node --test prototypes/card-game/takoyaki-self-target-20261029/red/self-target.red.test.mjs
import test from 'node:test';import assert from 'node:assert/strict';
import * as e from '../../engine.mjs';
function fixture(){const s=e.createGame(71);s.choice=null;s.pending=[];s.phase='normal';s.window='normal';s.players.A.time=10;s.players.B.time=10;return s;}
function take(s,a,c){const x=s.players[a].deck.shift();s.cards[x].cardId=c;return x;}
function field(s,a,c,slot){const id=take(s,a,c);s.cards[id].generation++;s.players[a].board[slot]=id;return id;}
function hand(s,a,c){const id=take(s,a,c);s.players[a].hand.push(id);return id;}
function trap(s,a,c){const id=take(s,a,c);s.cards[id].generation++;s.players[a].board.prepared.push({id,faceDown:true,setSerial:0});return id;}
function equip(s,a,c,target){const id=take(s,a,c);s.cards[id].generation++;s.players[a].board.prepared.push({id,target,targetGeneration:s.cards[target].generation,attachedAt:0});return id;}
const act=(s,p)=>{const a=e.legalActions(s).find(p);assert.ok(a,'action not legal');return e.act(s,e.actor(s),s.revision,a.id);};
// 発動の機会まで進め、そのカードの発動候補（対象ごと）を返す
function untilTrigger(s,source){for(let g=0;g<8;g++){const rows=e.legalActions(s).filter(a=>a.kind==='trigger'&&a.source===source);if(rows.length||s.phase==='trigger')return {s,rows};const pass=e.legalActions(s).find(a=>a.kind==='pass');if(!pass)break;s=e.act(s,e.actor(s),s.revision,pass.id);}return {s,rows:[]};}

function takoyaki(withOther){const s=fixture();const main=field(s,'A','M-dog-03','main');const tako=trap(s,'A','G-takoyaki-grill');const other=withOther?equip(s,'A','I-bowtie',main):null;
 return {...untilTrigger(act(s,a=>a.kind==='pass'),tako),tako,other};}
test('たこやきやさん：準備枠にほかの札があれば、対象はその札だけ（自身は選べない）',()=>{
 const {rows,tako,other}=takoyaki(true);assert.ok(rows.length>0,'ターン終了時に発動の機会がある');
 assert.deepEqual(rows.map(a=>a.target),[other]);assert.ok(!rows.some(a=>a.target===tako),'自身を対象にする候補がある');
});
test('たこやきやさん：準備枠がたこやきだけなら、対象がないので発動できない',()=>{
 const {rows}=takoyaki(false);assert.deepEqual(rows.map(a=>a.label),[],'自身しかないのに発動できる');
});

function frogger(withOther){let s=fixture();const main=field(s,'A','M-dog-03','main');field(s,'A','W-forest','world');const frog=trap(s,'A','G-frogger-road');const other=withOther?equip(s,'A','I-bowtie',main):null;
 const snow=hand(s,'A','W-snow');s=act(s,a=>a.source===snow&&a.slot==='world');return {...untilTrigger(s,frog),frog,other};}
test('関連：かえるのおうちがえり：通常のセカイ変更で発動する時、自身は対象にならない',()=>{
 const {rows,frog,other}=frogger(true);assert.ok(rows.length>0,'セカイ変更で発動の機会がある');
 assert.deepEqual(rows.map(a=>a.target),[other]);assert.ok(!rows.some(a=>a.target===frog),'自身を対象にする候補がある');
});
test('関連：かえるのおうちがえり：準備枠がかえるだけなら発動できない',()=>{
 const {rows}=frogger(false);assert.deepEqual(rows.map(a=>a.label),[],'自身しかないのに発動できる');
});

// 関連：ボンバー（84 P12「自身は発動領域なので、自分側は別の準備が必要」）。相手のターン開始時、自分側の対象にボンバー自身を選べない。
function bomber(withOther){let s=fixture();const main=field(s,'A','M-dog-03','main');const bm=field(s,'B','M-dog-03','main');const bomb=trap(s,'A','G-bomber-maze');const other=withOther?equip(s,'A','I-bowtie',main):null;equip(s,'B','I-bowtie',bm);
 let r=untilTrigger(act(s,a=>a.kind==='pass'),bomb);s=r.s;if(!r.rows.length)return {rows:r.rows,own:[],bomb,other};
 s=e.act(s,e.actor(s),s.revision,r.rows[0].id);for(let g=0;g<5&&s.choice?.kind!=='activation_selection';g++){const p=e.legalActions(s).find(a=>a.kind==='pass');if(!p)break;s=e.act(s,e.actor(s),s.revision,p.id);}
 const own=e.legalActions(s).filter(a=>a.kind==='choose'&&a.value!==undefined&&s.cards[a.value]?.owner==='A').map(a=>a.value);return {rows:r.rows,own,bomb,other};}
test('関連：ボンバー：自分側の対象は別の準備の札だけ（自身は選べない）',()=>{
 const {rows,own,bomb,other}=bomber(true);assert.ok(rows.length>0,'相手のターン開始時に発動の機会がある');assert.ok(!own.includes(bomb),'自身を対象にする候補がある');assert.deepEqual(own,[other]);
});
test('関連：ボンバー：自分側に別の準備がなければ、自分側の対象がないので発動できない',()=>{
 const {rows}=bomber(false);assert.deepEqual(rows.map(a=>a.label),[],'自身しかないのに発動できる');
});
