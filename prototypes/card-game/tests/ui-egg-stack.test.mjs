import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,view,CARDS,save} from '../engine.mjs';
import * as ui from '../ui-presentation.mjs';

test('egg is a tappable state card only in the empty main slot, in both orientations',()=>{
 const s=createGame(719),before=save(s);
 for(const seat of ['A','B'])for(const front of ['A','B']){
  const p=view(s,front).players[seat],html=ui.boardMarkup(p,seat,front,[],null,front);
  assert.equal((html.match(/data-slot=/g)||[]).length,9);
  assert.match(html,/data-slot="1"[^]*data-egg-detail=/);
  assert.equal((html.match(/data-egg-detail=/g)||[]).length,1);
  assert.doesNotMatch(html,/egg-parking|たまご置き場/);
  p.board.main={...CARDS['M-beetle-01'],id:'A:main',cardId:'M-beetle-01'};
  const born=ui.boardMarkup(p,seat,front,[],null,front);
  assert.doesNotMatch(born,/data-egg-detail=|egg-card-small/);
  assert.match(born,/data-browse="A:main"/);
  p.board.main=null;
  assert.match(ui.boardMarkup(p,seat,front),/data-egg-detail=/);
 }
 assert.equal(save(s),before);assert.equal(Object.keys(CARDS).length,452);
});
test('egg detail distinguishes normal draw, extra draw, mandatory return and birth without actions',()=>{
 assert.equal(typeof ui.eggDetailMarkup,'function');
 const html=ui.eggDetailMarkup();
 for(const text of ['通常ドロー','追加ドロー','山札の一番下','手札があれば','たんじょう','段階','ちょうせん'])assert.ok(html.includes(text),text);
 assert.match(html,/data-close/);
 assert.doesNotMatch(html,/data-action=|data-inspect=|card-cost|card-stats/);
 assert.match(html,/detail-layout/);assert.match(html,/egg-card-large/);
});

// Engine commands remain the only source of transitions; rendering cannot move cards.
import * as e from '../engine.mjs';
import {HotseatSession} from '../ui-session.mjs';
test('real opening return and birth switch the top card and replay preserves the same display',()=>{
 const x=new HotseatSession({autoAdvance:true});x.start(e.createGame(4));x.reveal();
 const html=()=>ui.boardMarkup(x.projection.players.A,'A','A',[],x.projection);
 assert.match(html(),/data-egg-detail="A"/);
 const step=(predicate)=>{const v=x.projection,a=v.actions.find(predicate);assert.ok(a);x.commit(a.id,v.revision,x.viewer);};
 step(a=>a.kind==='choose'&&a.choiceCard.includes('G-hit-blow'));
 step(a=>a.kind==='place'&&a.source.includes('M-beetle-01'));
 assert.doesNotMatch(html(),/data-egg-detail=/);
 const raw=x.save(),y=new HotseatSession({autoAdvance:true});y.restore(raw);y.reveal();
 assert.equal(ui.boardMarkup(y.projection.players.A,'A','A',[],y.projection),html());
 assert.equal(x.save(),raw);assert.equal(Object.keys(e.restore(raw).cards).length,80);
});
test('real dragon removal exposes opponent egg and retains the engine discard destination',()=>{
 let s=e.createGame(71);s.choice=null;s.pending=[];s.phase='normal';s.players.A.time=10;s.players.B.time=0;
 const put=(seat,id,slot)=>{const p=s.players[seat],x=p.deck.shift();s.cards[x].cardId=id;if(slot==='main'){p.board.main=x;s.cards[x].generation++;}else if(slot==='prepared')p.board.prepared.push({id:x,faceDown:true});else p.hand.push(x);return x;};
 const dragon=put('A','M-dragon-06','main'),target=put('B','M-beetle-01','main');
 put('A','G-ski-jump','prepared');put('A','G-dot-eater');
 const go=(kind,p=()=>true)=>{const a=e.legalActions(s).find(a=>a.kind===kind&&p(a));assert.ok(a,kind);s=e.act(s,e.actor(s),s.revision,a.id);};
 assert.doesNotMatch(ui.boardMarkup(e.view(s,'A').players.B,'B','A'),/data-egg-detail=/);
 go('programAbility',a=>a.source===dragon&&a.target===target);
 for(let i=0;i<50&&s.phase!=='normal';i++)go(s.phase==='choice'?'choose':s.phase==='trigger'?'skip':'pass',a=>a.value!=='cancel');
 assert.equal(s.players.B.board.main,null);assert.ok(s.players.B.discard.includes(target));e.validate(s);
 assert.match(ui.boardMarkup(e.view(s,'A').players.B,'B','A'),/data-egg-detail="B"/);
});
