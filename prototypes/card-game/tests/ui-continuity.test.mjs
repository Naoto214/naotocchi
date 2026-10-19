import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {updateGameDOM} from '../ui-render.mjs';
import {boardMarkup,gameMarkup} from '../ui-presentation.mjs';
import {createGame,view} from '../engine.mjs';
// Small tree double records every disconnect (even within one synchronous render).
class Node {
 constructor(name,...children){this.name=name;this.children=[];this.append(...children);}
 get childNodes(){return this.children;}
 get isConnected(){return this.name==='game'||Boolean(this.parentNode?.isConnected);}
 querySelector(selector){return this.children.find(n=>n.name===selector.slice(1));}
 remove(){if(this.isConnected)this.visit(n=>n.detached=(n.detached??0)+1);if(this.parentNode)this.parentNode.children.splice(this.parentNode.children.indexOf(this),1);this.parentNode=null;}
 visit(fn){fn(this);this.children.forEach(n=>n.visit(fn));}
 append(...nodes){for(const n of nodes){if(n.name==='fragment'){this.append(...[...n.children]);continue;}n.remove();n.parentNode=this;this.children.push(n);}}
 insertBefore(n,ref){n.remove();n.parentNode=this;this.children.splice(this.children.indexOf(ref),0,n);}
 replaceChildren(...nodes){[...this.children].forEach(n=>n.remove());this.append(...nodes);}
}
test('CPU refresh leaves the visible notice and its ancestor continuously connected',()=>{
 const notice=new Node('notice'),host=new Node('feedback',notice),battle=new Node('battle-area',new Node('old-board'),host),game=new Node('game',new Node('old-header'),battle,new Node('old-hand'));
 for(let i=0;i<10;i++){
  const next=new Node('fragment',new Node('header'),new Node('battle-area',new Node('board')),new Node('hand'));
  updateGameDOM(game,next,host);
  assert.equal(notice.detached??0,0,'render detached an animated result notice');
  assert.equal(host.parentNode,battle);assert.equal(game.querySelector('.battle-area'),battle);
  assert.deepEqual(game.children.map(n=>n.name),['header','battle-area','hand']);
  assert.deepEqual(battle.children.filter(n=>n!==host).map(n=>n.name),['board']);
 }
});
test('initial render attaches the feedback host once',()=>{
 const game=new Node('game'),host=new Node('feedback'),next=new Node('fragment',new Node('header'),new Node('battle-area',new Node('board')));
 updateGameDOM(game,next,host);assert.equal(host.isConnected,true);assert.equal(host.detached??0,0);
});
test('finished or hidden CPU view keeps human A/B upright without granting a private viewer',()=>{
 for(const humanSeat of ['A','B']){
  const v=view(createGame(22019),null);v.humanSeat=humanSeat;v.result={winner:null,reason:'QA display fixture',growth:{A:0,B:0}};
  const html=gameMarkup(v,null),own=html.split('aria-label="自分の盤面"')[1];
  assert.match(own,new RegExp(`data-player="${humanSeat}" class="player-board own"`));
  assert.deepEqual([...own.matchAll(/data-slot="(\d+)"/g)].map(m=>Number(m[1])),[0,1,2,3,4,5,6,7,8]);
  assert.doesNotMatch(html,/id="hand"|data-action=/);
 }
});
test('both human seats reverse opponent positions only, preserving slot IDs and card taps',()=>{
 for(const viewer of ['A','B']){
  const v=view(createGame(22019),viewer),opponent=viewer==='A'?'B':'A';
  for(const seat of [viewer,opponent]){
   const p=structuredClone(v.players[seat]),cards=v.players[viewer].hand;
   p.board.world=cards[0];p.board.main=cards[1];p.board.partner=cards[2];
   const html=boardMarkup(p,seat,viewer,[],v);
   assert.deepEqual([...html.matchAll(/data-slot="(\d+)"/g)].map(m=>Number(m[1])),seat===viewer?[0,1,2,3,4,5,6,7,8]:[8,7,6,5,4,3,2,1,0]);
   for(let i=0;i<3;i++)assert.ok(html.includes(`data-slot="${i}"><small>${['セカイ','メイン','こいびと'][i]}</small>`));
   for(let i=0;i<3;i++){
    const slot=html.split(`data-slot="${i}"`)[1].split('data-slot=')[0],c=cards[i];
    assert.ok(slot.includes(`data-browse="${c.id}"`)||slot.includes(`data-inspect="${c.id}"`));
   }
  }
 }
});
test('opponent management faces the human in either orientation without rotating content',()=>{
 const css=readFileSync(new URL('../style.css',import.meta.url),'utf8');
 assert.match(css,/\.opponent \.board-layout\{grid-template-columns:36px minmax\(0,1fr\)\}/);
 for(const [zone,row] of [['deck',1],['activation',2],['discard',3]])assert.ok(css.includes(`.opponent .management>[data-zone="${zone}"]{grid-row:${row}}`));
 assert.doesNotMatch(css,/rotate\(180deg\)/);
});
test('notification frame has no opacity entrance animation to restart between results',()=>{
 const css=readFileSync(new URL('../style.css',import.meta.url),'utf8');
 const rule=css.match(/\.result-notice\{([^}]+)\}/)[1];assert.doesNotMatch(rule,/animation:/);
});
