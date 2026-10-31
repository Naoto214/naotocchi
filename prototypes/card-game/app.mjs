import {RecordsStore,buildRecord} from './records.mjs';
import {newMetadata,encodeMatch,decodeMatch} from './records-match.mjs';
import {mountRecords} from './records-ui.mjs';
import {mountLearning} from './learning-ui.mjs';
import {mountCollection} from './collection-ui.mjs';
import {mountMyDecks} from './my-decks-ui.mjs';
import {createGame,TYPE_NAMES,CARDS,supported,DEFAULT_DECK,validateDeck,restore as restoreEngine} from './engine.mjs';
import {HotseatSession} from './ui-session.mjs';
import {CpuSession,restoreMatch} from './cpu-session.mjs';
import {CPU_DECKS,resolveCpuDeck,cpuDeck} from './cpu-decks.mjs';
import {CpuScheduler} from './cpu-scheduler.mjs';
import {eggDetailMarkup,cardActions,cardMarkup,gameMarkup,cardStageMarkup,workflowMarkup,confirmationMarkup,handoffMessage,resultNoticeMarkup,resultHistoryMarkup,canInspectCard,zoneMarkup,escapeHTML as h} from './ui-presentation.mjs';
import {HandOrder} from './ui-hand.mjs';
import {mountHandDrag} from './ui-drag.mjs';
import {visibleCards} from './ui-context.mjs';
import {ResultFeedback} from './ui-result-feedback.mjs';
import {updateGameDOM,TurnFeedback,installActionInputGuard} from './ui-render.mjs';
import {installViewport,watchStage,fitStageCard,stageRange} from './ui-viewport.mjs';
import {installArtFallback,fitMainCardCopy} from './ui-art-loading.mjs';
installArtFallback();
installViewport();
const ORDER_KEY='naotocchi-hand-order-v1';
let handOrder;try{handOrder=new HandOrder(localStorage.getItem(ORDER_KEY));}catch{handOrder=new HandOrder();}
const $=id=>document.getElementById(id),KEY='naotocchi-hotseat-v1',CPU_KEY='naotocchi-cpu-match-v1';
let session=new HotseatSession({autoAdvance:true});
let matchMetadata=null,recordedId=null;
const recordsStore=new RecordsStore(localStorage);
const withRecordsLock=fn=>globalThis.navigator?.locks?.request?globalThis.navigator.locks.request('naotocchi-card-records',fn):Promise.resolve().then(fn);
function saveMatch(){return matchMetadata?encodeMatch(session.save(),matchMetadata):session.save();}
function recordFinished(){if(!session.finished||!matchMetadata||recordedId===matchMetadata.id)return;const m=structuredClone(matchMetadata),raw=session.engineSave??session.save();recordedId=m.id;withRecordsLock(()=>recordsStore.add(buildRecord(restoreEngine(raw),m,m.completedAt))).then(()=>recordsUI.refresh()).catch(e=>{recordedId=null;message('対戦は終了しました。戦績を保存できません：'+e.message+'。戦績画面から書き出してください。');});}
const input=installActionInputGuard(document,()=>({session,revision:session.projection?.revision,viewer:session.viewer}));
let dragging=false;
let busy=false,pending=null,dialogOrigin=null,selected=null,reordering=false,returnDetail=null,returnWorkflow=false,dragCleanup=()=>{},handOpen=null;
const cpu=new CpuScheduler({getSession:()=>session,canRun:()=>!document.hidden&&!busy&&!reordering&&!dragging&&!['card-dialog','confirm-dialog','menu-dialog','collection-dialog','rulebook-dialog','tutorial-dialog','learning-card-dialog','learning-term-dialog','records-dialog'].some(id=>$(id)?.open),onStep:()=>{persist();render();}});
const turnFeedback=new TurnFeedback();
const feedbackHost=document.createElement('div');feedbackHost.id='result-feedback';feedbackHost.setAttribute('role','status');feedbackHost.setAttribute('aria-live','polite');feedbackHost.setAttribute('aria-atomic','true');
function clearResultMotion(){document.querySelectorAll('.result-arrive,.result-deck').forEach(n=>n.classList.remove('result-arrive','result-deck'));}
const feedback=new ResultFeedback({dock:available=>{const b=document.querySelector('[data-result-reopen]');if(b)b.hidden=!available;},clear:()=>{feedbackHost.replaceChildren();clearResultMotion();},paint:g=>{
 feedbackHost.innerHTML=resultNoticeMarkup(g);clearResultMotion();
 for(const r of g.rows){if(r.to==='deck')document.querySelector(`[data-player="${r.seat}"] [data-zone="deck"]`)?.classList.add('result-deck');
  if(['draw','birth','main','move','marriage'].includes(r.kind))for(const c of r.cards)for(const n of document.querySelectorAll('[data-inspect],[data-browse]'))if((n.dataset.inspect??n.dataset.browse)===c.id)n.classList.add('result-arrive');
 }
}});
function persistOrder(){try{localStorage.setItem(ORDER_KEY,handOrder.serialize());}catch{message("手札の表示順はこの画面だけで保持します");}}
function bindOrder(){handOrder.bind(session.engineSave??session.save());persistOrder();}
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
function button(text,handler){const n=el('button',text);n.type='button';n.addEventListener('click',handler);return n;}
function message(text){$('status').textContent=text;}
function persist(){if(session.finished&&matchMetadata&&matchMetadata.completedAt===null&&matchMetadata.startedAt!==null)matchMetadata.completedAt=Date.now();try{localStorage.setItem(session.mode==='cpu'?CPU_KEY:KEY,saveMatch());message('この端末に保存しました');}catch{message('自動保存できません。保存ファイルを書き出してください。');}recordFinished();}
function closeDialogs({focus=true}={}){
 input.invalidate();
 for(const id of ['card-dialog','confirm-dialog','menu-dialog']){const d=$(id);if(d.open)d.close();if(id!=='menu-dialog')d.replaceChildren();delete d.dataset.browseSeat;delete d.dataset.browseZone;}
 input.stamp();pending=null;if(focus&&dialogOrigin?.isConnected)dialogOrigin.focus();dialogOrigin=null;cpu.schedule();
}
function showAutomationStop(){
 cpu.cancel();feedback.hide();turnFeedback.hide();
 dragCleanup();session.hide();closeDialogs({focus:false});$('curtain').hidden=true;$('hide').hidden=true;
 $('game').innerHTML='<section class="panel" role="alert"><h2>自動進行を停止しました</h2><p>最後に確定した状態を保持しています。対戦を保存し、復帰または調査に利用できます。</p><button type="button" data-menu>保存メニュー</button></section>';
}
function hide(){
 input.invalidate();
 cpu.cancel();feedback.hide();turnFeedback.hide();
 if(!session.active)return;
 if(session.automationStop){showAutomationStop();return;}
 dragCleanup();session.hide();returnWorkflow=false;selected=null;reordering=false;returnDetail=null;closeDialogs({focus:false});$('game').replaceChildren();
 $('curtain').hidden=session.finished;$('handoff-title').textContent=session.mode==='cpu'?'対戦を一時停止しました':handoffMessage(session.projection);$('curtain').querySelector('p').textContent=session.mode==='cpu'?'準備OKで自分の手札を表示し、CPU対戦を再開します。':'前のプレイヤーは画面から目を離してください。確認するまで手札は表示されません。';$('hide').hidden=true;
 if(session.finished)render();else $('reveal').focus();
}
function start(next){turnFeedback.hide();session.start(next);bindOrder();$('welcome').hidden=true;$('game').hidden=false;$('export').hidden=false;document.body.classList.add('playing');myDecks.release();if(session.mode==='cpu'){session.reveal();$('curtain').hidden=true;render();}else hide();}
function render(){
 input.invalidate();
 if(session.automationStop){showAutomationStop();return;}
 const scrolls=[...document.querySelectorAll('.board-shell')].map(n=>n.scrollTop);dragCleanup();const v=session.projection,hand=session.viewer?handOrder.arrange(session.viewer,v.players[session.viewer].hand):null;
 const next=document.createElement('template');next.innerHTML=gameMarkup(v,session.viewer,{selected,reordering,hand});updateGameDOM($('game'),next.content,feedbackHost);turnFeedback.present(document.querySelector('.turn-indicator'),v,window.matchMedia('(prefers-reduced-motion: reduce)').matches,document.querySelector('.field-turn-active'));$('hide').hidden=!session.viewer||!!v.result;$('hide').textContent=session.mode==='cpu'?'対戦を一時停止':'手札を隠して渡す';input.stamp();if(hand)persistOrder();applyHandVisibility();highlight();feedback.present(v.results,session.viewer??(v.result?'public':null),v.resultEpoch,v.resultSince);
 document.querySelectorAll('.board-shell').forEach((n,i)=>{n.scrollTop=scrolls[i]??0;});
 dragCleanup=mountHandDrag(document.querySelector('#hand .cards'),{onTap:id=>inspect(id),onReorder:ids=>{if(!session.viewer)return;const scroll=document.querySelector('#hand .cards').scrollLeft;handOrder.reorder(session.viewer,session.projection.players[session.viewer].hand,ids);persistOrder();render();document.querySelector('#hand .cards').scrollLeft=scroll;},onAnnounce:message,onInteraction:active=>{dragging=active;if(active)cpu.cancel();else cpu.schedule();}});cpu.schedule();
}
function applyHandVisibility(){const panel=$('hand');if(!panel)return;const open=handOpen??(window.innerHeight>=400||window.innerWidth>window.innerHeight);panel.classList.toggle('hand-collapsed',!open);panel.querySelector('[data-hand-toggle]').setAttribute('aria-expanded',String(open));}
function openWorkflow(){if(!session.viewer||session.finished)return;closeDialogs({focus:false});const d=$('card-dialog');d.classList.remove('card-detail');d.classList.add('workflow-dialog');d.innerHTML=workflowMarkup(session.projection,session.viewer);d.showModal();input.stamp();d.scrollTop=0;d.querySelector('[data-close]').focus();}
function continuePriority(){const panel=$('operation-panel');if(panel){panel.setAttribute('tabindex','-1');panel.focus({preventScroll:true});}}
function highlight(action=null){
 document.querySelectorAll('.is-selected,.is-destination,.is-target').forEach(n=>n.classList.remove('is-selected','is-destination','is-target'));
 if(!session.viewer)return;
 const v=session.projection,cards=visibleCards(v),selectedCard=cards.find(c=>c.id===selected),actions=action?[action]:selectedCard?cardActions(v,session.viewer,selectedCard):[];
 document.querySelectorAll('[data-inspect],[data-browse]').forEach(n=>{const id=n.dataset.inspect??n.dataset.browse;const card=cards.find(c=>c.id===id);n.classList.toggle('is-eligible',Boolean(card&&cardActions(v,session.viewer,card).length));if(id===selected)n.classList.add('is-selected');if(actions.some(a=>a.targetCard===id))n.classList.add('is-target');});
 for(const a of actions)if(a.destination)document.querySelector(`[data-player="${a.destination.seat}"] [data-slot="${a.destination.index}"]`)?.classList.add('is-destination');
}
function inspect(id,{catalog=false,origin=null,readOnly=false}={}){
 if(!catalog&&(!session.active||(!session.viewer&&!session.finished)))return;
 const zone=origin?.closest('[data-browse-zone]')?.dataset.browseZone,seat=origin?.closest('[data-browse-seat]')?.dataset.browseSeat;
 const v=session.active?session.projection:null,c=catalog?CARDS[id]:(visibleCards(v).find(c=>c.id===id&&!c.hidden)??visibleCards(v).find(c=>c.id===id));
 if(!c||(!catalog&&!readOnly&&!canInspectCard(v,session.viewer,c)))return;closeDialogs({focus:false});dialogOrigin=origin;
 if(!catalog&&!readOnly){selected=c.id;highlight();}
 const d=$('card-dialog');d.classList.remove('workflow-dialog');d.classList.add('card-detail');delete d.dataset.stageZoom;delete d.dataset.stagePinch;d.innerHTML=cardStageMarkup(c,{v,viewer:session.viewer,catalog,readOnly});

 if(readOnly&&zone&&seat){const back=button('一覧へ',()=>showZone(seat,zone,null));d.querySelector('.detail-toolbar').prepend(back);}
 d.showModal();input.stamp();d.querySelector('[data-close]').focus();watchStage(d);
 const face=d.querySelector('.main-face');
 document.fonts.ready.then(()=>{if(d.open&&face?.isConnected&&d.contains(face))fitMainCardCopy(face);});
}
function perform(action,revision,who){
 if(busy)return;busy=true;
 try{const handoff=session.commit(action.id,revision,who);closeDialogs({focus:false});persist();returnDetail=null;if(handoff)hide();else{render();continuePriority();}}
 catch(e){message(e.message);closeDialogs();}finally{busy=false;cpu.schedule();}
}
function requestAction(id){
 const v=session.projection,a=v?.actions.find(a=>a.id===id);if(!a||!session.viewer)return;
 let prepared;try{prepared=session.prepare(id);}catch(e){message(e.message);return;}
 if(!prepared.required){perform(a,v.revision,v.actor);return;}
 returnWorkflow=$('card-dialog').open&&$('card-dialog').classList.contains('workflow-dialog');returnDetail=$('card-dialog').open&&!returnWorkflow?selected:null;const origin=dialogOrigin??document.activeElement;closeDialogs({focus:false});dialogOrigin=origin;pending=prepared;highlight(prepared.action);
 const d=$('confirm-dialog');d.innerHTML=confirmationMarkup(prepared);d.showModal();input.stamp();d.querySelector('[data-cancel]').focus();
}
// Native select exposes every legal declaration even on short iPhone dialogs.
document.addEventListener('change',event=>{
 const picker=event.target;
 if(!picker.matches?.('select[data-declaration]')||!picker.value)return;
 const id=picker.value;picker.value='';requestAction(id);
});
function showZone(seat,zone,origin){
 const v=session.projection;if(!v||(!session.viewer&&!v.result))return;
 const html=zoneMarkup(v,seat,zone);if(!html)return;closeDialogs({focus:false});dialogOrigin=origin;
 const d=$('card-dialog');d.classList.remove('card-detail');d.classList.add('workflow-dialog');d.dataset.browseSeat=seat;d.dataset.browseZone=zone;d.innerHTML=html;d.showModal();input.stamp();d.querySelector('[data-close]').focus();
}
// Zoom of the detail card. A double tap (or the portrait chip / Enter) switches normal ⇄ zoom. A pinch on the card sets
// the card's own zoom (not Safari's page zoom), so both share one state: a double tap after a pinch returns to normal.
// Motion is a transform on the card as it is already drawn; the real size (layout, card art at the new resolution) and
// the scroll position change once, after the motion, with no transform left on the card. Changing the layout under a
// running transform made iOS Safari stutter at the start and leave unpainted (white) parts of the enlarged card.
const STAGE_ANIM_MS=260,clamp01=x=>Math.min(1,Math.max(0,x));let stageAnim=null;
const stageSnap=d=>{const s=d.querySelector('.stage-scroll');return {zoom:d.dataset.stageZoom==='1',pinch:d.dataset.stagePinch??null,left:s.scrollLeft,top:s.scrollTop};};
function stageApply(d,{zoom,pinch,left,top}){const s=d.querySelector('.stage-scroll');
 if(zoom){d.dataset.stageZoom='1';if(pinch)d.dataset.stagePinch=String(pinch);else delete d.dataset.stagePinch;}else{delete d.dataset.stageZoom;delete d.dataset.stagePinch;}
 fitStageCard(d);s.scrollLeft=left;s.scrollTop=top;}
// Where the card ends up for a zoom state (keeping the card point f under at); measured, then the layout is put back.
function stageTarget(d,{zoom,pinch=null,at=null,f=null}){const card=d.querySelector('.stage-card'),s=d.querySelector('.stage-scroll'),before=stageSnap(d);
 stageApply(d,{zoom,pinch,left:0,top:0});
 if(zoom&&at){const n=card.getBoundingClientRect();s.scrollLeft+=n.left+f.x*n.width-at.x;s.scrollTop+=n.top+f.y*n.height-at.y;}
 const rect=card.getBoundingClientRect(),after=stageSnap(d);stageApply(d,before);return {rect,after};}
function finishStageAnim(){const a=stageAnim;if(!a)return;stageAnim=null;a.commit();a.anim?.cancel();}
// from: the transform the card shows now (a pinch in progress), else none.
function zoomStage(d,state,from='none'){finishStageAnim();const card=d.querySelector('.stage-card');
 const r0=card.getBoundingClientRect(),base=from==='none'?r0:null;card.style.transform='';const lay=card.getBoundingClientRect();
 const {rect:n,after}=stageTarget(d,state),to=`translate(${n.left-lay.left}px,${n.top-lay.top}px) scale(${n.width/lay.width})`;
 const commit=()=>{card.style.transform='';card.style.transformOrigin='';stageApply(d,after);};
 if(!card.animate||matchMedia('(prefers-reduced-motion: reduce)').matches||base&&Math.abs(n.width-r0.width)<1&&Math.abs(n.left-r0.left)<1&&Math.abs(n.top-r0.top)<1){commit();return;}
 const anim=card.animate([{transformOrigin:'0 0',transform:from},{transformOrigin:'0 0',transform:to}],{duration:STAGE_ANIM_MS,easing:'cubic-bezier(.25,.8,.25,1)',fill:'forwards'});
 stageAnim={anim,commit};anim.onfinish=()=>{if(stageAnim?.anim===anim)finishStageAnim();};}
function toggleStageZoom(z,at=null){const d=z.closest('dialog'),card=d?.querySelector('.stage-card');if(!card)return;finishStageAnim();
 const r=card.getBoundingClientRect(),f=at?{x:clamp01((at.x-r.left)/r.width),y:clamp01((at.y-r.top)/r.height)}:null;
 zoomStage(d,{zoom:d.dataset.stageZoom!=='1',at,f});}
document.addEventListener('click',e=>{const z=e.target.closest('button[data-stage-zoom]');if(z)toggleStageZoom(z);});
// Double tap and pinch on the detail card, built on pointer events: iOS Safari sends no click to a plain element through
// a document listener. A drag, a long press, two slow taps or two taps apart are not a double tap; a single tap does nothing.
const DOUBLE_TAP_MS=350,TAP_SLOP=12,DOUBLE_TAP_SLOP=36;
const activePointers=new Set(),cardPointers=new Map();let tapStart=null,lastTap=null,stagePinch=null;
const pinchSpan=()=>{const [a,b]=[...cardPointers.values()];return {dist:Math.max(1,Math.hypot(a.x-b.x,a.y-b.y)),mid:{x:(a.x+b.x)/2,y:(a.y+b.y)/2}};};
function beginPinch(card){const d=card.closest('dialog'),range=stageRange(d);if(!range)return;finishStageAnim();
 const r0=card.getBoundingClientRect(),base=parseFloat(card.style.getPropertyValue('--stage-scale'))||range.normal,{dist,mid}=pinchSpan();
 stagePinch={card,d,r0,base,range,dist,mid,ids:[...cardPointers.keys()],r:1,tx:0,ty:0,at:mid};}
function movePinch(){const p=stagePinch,{dist,mid}=pinchSpan();
 const s=Math.min(p.range.max*1.1,Math.max(p.range.normal*.85,p.base*dist/p.dist));p.r=s/p.base;
 p.tx=mid.x-p.r0.left-p.r*(p.mid.x-p.r0.left);p.ty=mid.y-p.r0.top-p.r*(p.mid.y-p.r0.top);p.at=mid;
 p.card.style.transformOrigin='0 0';p.card.style.transform=`translate(${p.tx}px,${p.ty}px) scale(${p.r})`;}
function endPinch(){const p=stagePinch;stagePinch=null;if(!p.card.isConnected)return;
 const s=Math.min(p.range.max,Math.max(p.range.normal,p.base*p.r)),f={x:clamp01((p.mid.x-p.r0.left)/p.r0.width),y:clamp01((p.mid.y-p.r0.top)/p.r0.height)};
 zoomStage(p.d,{zoom:s>p.range.normal*1.05,pinch:s,at:p.at,f},p.card.style.transform||'none');}
document.addEventListener('pointerdown',e=>{activePointers.add(e.pointerId);
 const card=e.target.closest?.('#card-dialog[open] .stage-card');
 if(card&&e.pointerType!=='mouse'){cardPointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(cardPointers.size===2&&!stagePinch)beginPinch(card);}
 if(activePointers.size>1){tapStart=null;lastTap=null;return;}
 tapStart=card&&e.isPrimary?{id:e.pointerId,x:e.clientX,y:e.clientY,t:e.timeStamp,card}:null;},true);
document.addEventListener('pointermove',e=>{const p=cardPointers.get(e.pointerId);if(!p)return;p.x=e.clientX;p.y=e.clientY;if(stagePinch&&cardPointers.size>=2)movePinch();},true);
function releasePointer(e){activePointers.delete(e.pointerId);cardPointers.delete(e.pointerId);if(stagePinch?.ids.includes(e.pointerId))endPinch();}
document.addEventListener('pointercancel',e=>{releasePointer(e);tapStart=null;lastTap=null;},true);
document.addEventListener('pointerup',e=>{releasePointer(e);const s=tapStart;tapStart=null;
 if(!s||s.id!==e.pointerId||!s.card.isConnected)return;
 if(Math.hypot(e.clientX-s.x,e.clientY-s.y)>TAP_SLOP||e.timeStamp-s.t>500){lastTap=null;return;}
 const l=lastTap;
 if(l&&l.card===s.card&&e.timeStamp-l.t<=DOUBLE_TAP_MS&&Math.hypot(e.clientX-l.x,e.clientY-l.y)<=DOUBLE_TAP_SLOP){lastTap=null;e.preventDefault();toggleStageZoom(s.card,{x:e.clientX,y:e.clientY});}
 else lastTap={card:s.card,x:e.clientX,y:e.clientY,t:e.timeStamp};},true);
// iOS Safari: keep its own page pinch-zoom off the card (the card's touch-action already says so; older iOS needs this).
for(const t of ['gesturestart','gesturechange'])document.addEventListener(t,e=>{if(e.target.closest?.('#card-dialog[open] .stage-card'))e.preventDefault();},{passive:false});
document.addEventListener('keydown',e=>{const z=e.target.closest?.('div[data-stage-zoom]');if(z&&(e.key==='Enter'||e.key===' ')){e.preventDefault();toggleStageZoom(z);}});
document.addEventListener('click',e=>{
 const b=e.target.closest('button');if(!b||b.disabled)return;
 if(b.hasAttribute('data-result-collapse')){feedback.collapse();document.querySelector('[data-result-reopen]')?.focus({preventScroll:true});return;}
 if(b.hasAttribute('data-result-reopen')){feedback.reopen();return;}
 if(b.hasAttribute('data-close')||b.hasAttribute('data-cancel')){const back=b.hasAttribute('data-cancel')?returnDetail:null;const flow=b.hasAttribute('data-cancel')&&returnWorkflow;returnDetail=null;returnWorkflow=false;closeDialogs();if(back)inspect(back);else if(flow)openWorkflow();return;}
 if(b.hasAttribute('data-result-history')){closeDialogs({focus:false});const d=$('card-dialog');d.classList.remove('card-detail');d.classList.add('workflow-dialog');d.innerHTML='<button type="button" class="dialog-close" data-close>閉じる ×</button>'+resultHistoryMarkup(session.projection,session.viewer);d.querySelector('details').open=true;d.showModal();input.stamp();d.scrollTop=0;return;}
 if(b.hasAttribute('data-workflow')){openWorkflow();return;}
 if(b.hasAttribute('data-hand-toggle')){handOpen=$('hand').classList.contains('hand-collapsed');applyHandVisibility();return;}
 if(b.hasAttribute('data-menu')){closeDialogs({focus:false});syncLeaveMenu();$('menu-dialog').showModal();return;}
 if(b.hasAttribute('data-reorder')){reordering=!reordering;handOpen=true;render();document.querySelector('[data-reorder]')?.focus();return;}
 if(b.hasAttribute('data-move')){
  if(!session.viewer||busy)return;const v=session.projection,id=b.dataset.handId,direction=Number(b.dataset.move),detail=$('card-dialog').open,scroll=document.querySelector('#hand .cards')?.scrollLeft??0;
  handOrder.move(session.viewer,v.players[session.viewer].hand,id,direction);selected=id;persistOrder();render();
  if(detail){inspect(id);const buttons=[...$('card-dialog').querySelectorAll('[data-move]')];(buttons.find(n=>Number(n.dataset.move)===direction&&!n.disabled)??buttons.find(n=>!n.disabled)??$('card-dialog').querySelector('[data-close]'))?.focus();}
  else{const strip=document.querySelector('#hand .cards');strip.scrollLeft=scroll;const entry=[...strip.querySelectorAll('[data-hand-entry]')].find(n=>n.dataset.handEntry===id);entry?.scrollIntoView({block:'nearest',inline:'nearest'});const controls=[...entry.querySelectorAll('[data-move]')];(controls.find(n=>Number(n.dataset.move)===direction&&!n.disabled)??controls.find(n=>!n.disabled))?.focus({preventScroll:true});}return;
 }
 if(b.hasAttribute('data-confirm')){const p=pending;if(p)perform(p.action,p.revision,p.who);return;}
 if(b.dataset.action){requestAction(b.dataset.action);return;}
 if(b.dataset.eggDetail){
  const seat=b.dataset.eggDetail,v=session.projection;
  if(!session.active||(!session.viewer&&!session.finished)||!v?.players[seat]||v.players[seat].board.main)return;
  cpu.cancel();closeDialogs({focus:false});dialogOrigin=b;selected=null;
  const d=$('card-dialog');d.classList.remove('workflow-dialog');d.classList.add('card-detail');d.innerHTML=eggDetailMarkup();d.showModal();input.stamp();d.querySelector('[data-close]').focus();return;
 }
 if(b.dataset.inspect){inspect(b.dataset.inspect,{catalog:b.hasAttribute('data-catalog'),origin:b});return;}
 if(b.dataset.browse){inspect(b.dataset.browse,{readOnly:true,origin:b});return;}
 if(b.dataset.zone){showZone(b.dataset.seat,b.dataset.zone,b);return;}
 if(b.hasAttribute('data-home')){toWelcome('setup');}// 対戦終了後の「対戦の準備へ」
});
for(const id of ['card-dialog','confirm-dialog','menu-dialog'])$(id).addEventListener('close',()=>cpu.schedule());
for(const id of ['card-dialog','confirm-dialog','menu-dialog'])$(id).addEventListener('cancel',e=>{e.preventDefault();const back=id==='confirm-dialog'?returnDetail:null;const flow=id==='confirm-dialog'&&returnWorkflow;returnDetail=null;returnWorkflow=false;closeDialogs();if(back)inspect(back);else if(flow)openWorkflow();});
$('new').onclick=()=>{try{const seeds=crypto.getRandomValues(new Uint32Array(3)),seed=seeds[0],solo=$('match-mode').value==='cpu',human=$('human-seat').value,cpuSeat=human==='A'?'B':'A';
 // The CPU seat may use a strategy deck instead of a My Deck; the human seat always uses the selected My Deck.
 const label=solo?resolveCpuDeck({mode:$('cpu-deck-mode').value,chosen:$('cpu-deck-type').value,last:readPref().last,seed:seeds[2]}):null,match={...decks,...(label?{[cpuSeat]:label.cards}:{})};
 validateDeck(match.A);validateDeck(match.B);cpu.cancel();session=solo?new CpuSession({humanSeat:human,difficulty:$('cpu-level').value,policySeed:seeds[1],cpuDeck:label}):new HotseatSession({autoAdvance:true});matchMetadata=newMetadata({mode:solo?'cpu':'hotseat',human:solo?human:null,difficulty:solo?$('cpu-level').value:null,cpuDeck:label?.id??null,decks:Object.fromEntries(['A','B'].map(seat=>[seat,label&&seat===cpuSeat?{id:null,name:'CPU '+label.name,cards:[...match[seat]]}:myDecks.list().find(d=>d.id===$('select-deck-'+seat).value)]))});recordedId=null;start(createGame(seed,match));if(label)writePref({last:label.id});persist();}catch(e){message(e.message);}};
$('restore').onclick=()=>{try{const raw=localStorage.getItem($('match-mode').value==='cpu'?CPU_KEY:KEY);if(!raw)throw Error('保存された対戦がありません');cpu.cancel();{const loaded=decodeMatch(raw);session=loaded.session;matchMetadata=loaded.metadata;recordedId=null;}bindOrder();$('welcome').hidden=true;$('game').hidden=false;$('export').hidden=false;document.body.classList.add('playing');myDecks.release();hide();persist();message(matchMetadata?'保存を検証して復帰しました':'保存を検証して復帰しました（旧形式のため戦績には記録しません）');}catch(e){message(`復帰できません：${e.message}`);}};
$('reveal').onclick=()=>{if(!session.active)return;session.reveal();$('curtain').hidden=true;render();continuePriority();};$('hide').onclick=hide;
$('export').onclick=()=>{if(!session.active)return;hide();const url=URL.createObjectURL(new Blob([saveMatch()],{type:'application/json'})),a=el('a');a.href=url;a.download=session.mode==='cpu'?'naotocchi-cpu.json':'naotocchi-hotseat.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
// もどる操作（☰ 対戦メニュー・対戦の準備の「← もどる」・結果の「対戦の準備へ」）。
// 戻り先は3つ。CARD GAME はトップ（メインメニュー）と「対戦の準備」が同じページの上下にある1ページ構成なので、
// 新しい画面は作らず、そのページの該当位置へ戻す。
//   setup: 対戦の準備（モード・席・CPU・デッキ選択。「保存した対戦に戻る」がある）
//   top:   CARD GAME トップ（メインメニュー）
//   home:  なおとっち（育成画面）。ページを移動する
// 対戦中は先にこの端末へ保存し直し、読み戻して保存できたことを確かめてから確認を出す。
const HOME_URL=$('home-return').href;// 戻り先は開始画面ヘッダーのリンクと同じ（index.html の href が唯一の定義）
const LEAVE={
 setup:{label:'← 対戦の準備へもどる',title:'対戦の準備へもどりますか？',resume:()=>'対戦の準備の「保存した対戦に戻る」で'},
 top:{label:'← CARD GAMEトップへもどる',title:'CARD GAMEトップへもどりますか？',resume:route=>`「${route}」→「保存した対戦に戻る」で`},
 home:{label:'なおとっちへもどる',title:'なおとっちへもどりますか？',resume:route=>`あとで CARD GAME の「${route}」→「保存した対戦に戻る」で`},
};
const menuParts=()=>[document.querySelector('#menu-dialog .utility-nav'),$('menu-leave')];
function leaveConfirmReset(){$('menu-home-confirm').hidden=true;$('menu-home-confirm').replaceChildren();menuParts().forEach(n=>n.hidden=false);syncLeaveMenu();}
// 開始画面から開いたとき（対戦なし）は、もどる操作を出さない（ヘッダーの「なおとっちへもどる」がある）。
function syncLeaveMenu(){const playing=!$('game').hidden;$('menu-leave').hidden=!playing;$('menu-continue').hidden=!session.active||session.finished;}
// 対戦画面から CARD GAME の開始ページ（トップまたは対戦の準備）へ。保存済みの対戦は端末に残したまま。
function toWelcome(target,{saved=false}={}){
 const mode=session.mode==='cpu'?'cpu':'hotseat',had=session.active;
 cpu.cancel();collection.close();closeDialogs({focus:false});feedback.reset();turnFeedback.hide();session.clear();
 $('game').replaceChildren();$('game').hidden=true;$('curtain').hidden=true;$('welcome').hidden=false;$('export').hidden=true;document.body.classList.remove('playing');
 if(had)$('match-mode').value=mode;// 「保存した対戦に戻る」がこの対戦の保存を読むように
 modeGuide();renderDeck();
 if(target==='setup'){$('match-setup').scrollIntoView?.({block:'start'});(saved?$('restore'):$('new')).focus({preventScroll:true});}
 else{window.scrollTo?.(0,0);$('solo-open').focus({preventScroll:true});}
 const note=$('resume-note');note.hidden=!saved;
 if(saved){note.textContent=`さっきの対戦を保存しました。「${mode==='cpu'?'ひとりであそぶ':'ふたりであそぶ'}」の「保存した対戦に戻る」で続きから遊べます。`;message(note.textContent);}
}
// 案内は、新しい対戦を始めたり保存から戻ったりしたら消す。
for(const id of ['new','restore'])$(id).addEventListener('click',()=>{$('resume-note').hidden=true;});
function go(target,saved){if(target==='home'){cpu.cancel();location.assign(HOME_URL);}else toWelcome(target,{saved});}
function requestLeave(target){
 if(!session.active||session.finished){go(target,false);return;}
 cpu.cancel();
 const key=session.mode==='cpu'?CPU_KEY:KEY;let saved=false;
 try{const data=saveMatch();localStorage.setItem(key,data);saved=localStorage.getItem(key)===data;}catch{saved=false;}
 const route=session.mode==='cpu'?'ひとりであそぶ':'ふたりであそぶ',box=$('menu-home-confirm'),t=LEAVE[target];
 box.innerHTML=saved
  ?`<h3>${t.title}</h3><p>この対戦は端末に保存しました。${t.resume(route)}続きから遊べます。</p><div class="menu-home-actions"><button type="button" id="menu-home-go" class="primary">${t.label}</button><button type="button" id="menu-home-stay">対戦をつづける</button></div>`
  :`<h3>保存できませんでした</h3><p class="menu-home-warn">いまもどると、この対戦の続きは遊べません。先に「対戦をつづける」→「保存ファイルを書き出す」で保存してください。</p><div class="menu-home-actions"><button type="button" id="menu-home-stay" class="primary">対戦をつづける</button><button type="button" id="menu-home-go">保存せずにもどる</button></div>`;
 menuParts().forEach(n=>n.hidden=true);box.hidden=false;
 $('menu-home-go').onclick=()=>go(target,saved);
 $('menu-home-stay').onclick=()=>{leaveConfirmReset();$(target==='home'?'menu-home':'menu-'+target).focus();};
 $('menu-home-stay').focus();
}
for(const b of document.querySelectorAll('#menu-leave [data-leave]'))b.onclick=()=>requestLeave(b.dataset.leave);
$('menu-continue').onclick=()=>$('menu-dialog').close();
$('menu-dialog').addEventListener('close',leaveConfirmReset);
// 対戦の準備の「← もどる」：同じページの CARD GAME トップ（メインメニュー）へ。
$('setup-back').onclick=()=>{window.scrollTo?.(0,0);$('solo-open').focus({preventScroll:true});};
$('import').onchange=async e=>{const file=e.target.files[0];if(!file)return;hide();try{if(file.size>2000000)throw Error('保存ファイルが大きすぎます');const restored=decodeMatch(await file.text());cpu.cancel();session=restored.session;matchMetadata=restored.metadata;recordedId=null;bindOrder();$('welcome').hidden=true;$('game').hidden=false;$('export').hidden=false;document.body.classList.add('playing');myDecks.release();hide();persist();}catch(error){message(`読込を拒否しました：${error.message}`);}finally{e.target.value='';}};
window.addEventListener('resize',()=>{dragCleanup();if(session.viewer){render();applyHandVisibility();}});window.addEventListener('blur',hide);document.addEventListener('visibilitychange',()=>{if(document.hidden)hide();});window.addEventListener('pagehide',hide);
let decks={A:[...DEFAULT_DECK],B:[...DEFAULT_DECK]};
const strategyDeck=()=>$('match-mode').value==='cpu'&&$('cpu-deck-mode').value!=='mydeck';
const myDecks=mountMyDecks({inspect,message,onChange:next=>{decks=next;},seats:()=>strategyDeck()?[$('human-seat').value]:['A','B']});
const recordsUI=mountRecords({store:recordsStore,listDecks:()=>myDecks.list(),onOpen:()=>cpu.cancel(),onClose:()=>cpu.schedule(),inspect,withLock:withRecordsLock});
$('records-open').onclick=e=>recordsUI.open(e.currentTarget);
const collection=mountCollection({onStats:(id,origin)=>recordsUI.open(origin,id),onRule:(chapter,origin)=>learning.openBook(chapter,origin),decks:myDecks,onOpen:()=>cpu.cancel(),onClose:()=>{learning.collectionClosed();cpu.schedule();}});
$('collection-open').onclick=e=>collection.open(e.currentTarget);
$('deck-collection-open').onclick=e=>collection.open(e.currentTarget,true);
$('menu-collection-open').onclick=e=>collection.open(e.currentTarget);
function renderDeck(){myDecks.refresh();}
$('coverage').textContent=`全${Object.keys(CARDS).length+1}種類のカードをコレクションで見られます。`;

// CPU deck preferences are a per-device convenience only (mode, chosen type, last CPU deck); failures are ignored.
const PREF_KEY='naotocchi-cpu-deck-pref-v1';
function readPref(){try{const p=JSON.parse(localStorage.getItem(PREF_KEY)??'{}');return p&&typeof p==='object'?p:{};}catch{return {};}}
function writePref(change){try{localStorage.setItem(PREF_KEY,JSON.stringify({...readPref(),...change}));}catch{}}
for(const d of CPU_DECKS){const o=document.createElement('option');o.value=d.id;o.textContent=d.name;$('cpu-deck-type').append(o);}
{const p=readPref();if(['auto','choose','fixed','mydeck'].includes(p.mode))$('cpu-deck-mode').value=p.mode;if(CPU_DECKS.some(d=>d.id===p.chosen))$('cpu-deck-type').value=p.chosen;}
function deckGuide(){const mode=$('cpu-deck-mode').value,cpuSeat=$('human-seat').value==='A'?'B':'A';$('cpu-deck-type-wrap').hidden=$('match-mode').value!=='cpu'||mode!=='choose';
 const last=readPref().last,lastDeck=CPU_DECKS.find(d=>d.id===last);
 $('cpu-deck-guide').textContent=mode==='auto'?`対戦ごとに${CPU_DECKS.length}つの戦略デッキから1つを選びます。どのデッキかは対戦の後に表示します。`:mode==='choose'?`${cpuDeck($('cpu-deck-type').value).name}：${cpuDeck($('cpu-deck-type').value).summary}`:mode==='fixed'?(lastDeck?`前回と同じ「${lastDeck.name}」で練習します。カードの並びは毎回変わります。`:'まだ前回のCPUデッキがありません。「バランス」で始めます。'):`CPUは${cpuSeat}の使用デッキ（マイデッキ）を使います。`;
 for(const s of ['A','B'])$('select-deck-'+s).disabled=strategyDeck()&&s===cpuSeat;myDecks.refresh();}
$('cpu-deck-mode').onchange=()=>{writePref({mode:$('cpu-deck-mode').value});modeGuide();};
$('cpu-deck-type').onchange=()=>{writePref({chosen:$('cpu-deck-type').value});deckGuide();};
function modeGuide(){const solo=$('match-mode').value==='cpu';document.querySelectorAll('[data-cpu-setting]').forEach(n=>n.hidden=!solo);$('solo-open').setAttribute('aria-pressed',String(solo));$('hotseat-open').setAttribute('aria-pressed',String(!solo));$('mode-guide').textContent=solo?`あなたは${$('human-seat').value}、CPUは${$('human-seat').value==='A'?'B':'A'}です。${strategyDeck()?'自分のデッキを選んで始めましょう。CPUは戦略デッキを使います。':'それぞれのマイデッキを選んで始めましょう。'}`:'同じ端末を交代で使います。手札を隠してから相手に渡しましょう。';deckGuide();}
$('match-mode').onchange=modeGuide;$('human-seat').onchange=modeGuide;modeGuide();
for(const [id,mode] of [['solo-open','cpu'],['hotseat-open','hotseat']])$(id).onclick=()=>{$('match-mode').value=mode;modeGuide();$('match-setup').scrollIntoView?.({block:'start'});$('new').focus({preventScroll:true});};
$('my-decks-open').onclick=()=>{const editor=$('deck-editor');editor.open=true;renderDeck();editor.scrollIntoView?.({block:'start'});editor.querySelector('summary').focus({preventScroll:true});};

const learning=mountLearning({onOpen:()=>{cpu.cancel();input.invalidate();},onClose:()=>{input.stamp();cpu.schedule();},onCollection:origin=>collection.open(origin),onCpu:()=>{
 cpu.cancel();hide();collection.close();closeDialogs({focus:false});feedback.reset();session.clear();$('game').replaceChildren();$('game').hidden=true;$('curtain').hidden=true;$('welcome').hidden=false;$('export').hidden=true;document.body.classList.remove('playing');$('match-mode').value='cpu';$('cpu-level').value='beginner';$('human-seat').value='A';modeGuide();renderDeck();message('CPU初級の対戦準備です。保存済み対戦は保持しています。「新しい対戦を開始」で始められます。');$('new').focus();
}});
$('rulebook-open').onclick=e=>learning.openBook(0,e.currentTarget);
$('menu-rulebook-open').onclick=e=>learning.openBook(0,e.currentTarget);
$('deck-rulebook-open').onclick=e=>learning.openBook(3,e.currentTarget);
for(const id of ['tutorial-open','menu-tutorial-open','learning-start'])$(id).onclick=e=>learning.openTutorial(e.currentTarget);
document.addEventListener('click',e=>{const b=e.target.closest('[data-related-rule]');if(b)learning.openBook(Number(b.dataset.relatedRule),b);});
