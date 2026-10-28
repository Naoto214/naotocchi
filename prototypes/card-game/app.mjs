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
import {eggDetailMarkup,cardActions,cardMarkup,gameMarkup,detailMarkup,workflowMarkup,confirmationMarkup,handoffMessage,resultNoticeMarkup,resultHistoryMarkup,canInspectCard,zoneMarkup,escapeHTML as h} from './ui-presentation.mjs';
import {HandOrder} from './ui-hand.mjs';
import {mountHandDrag} from './ui-drag.mjs';
import {visibleCards} from './ui-context.mjs';
import {ResultFeedback} from './ui-result-feedback.mjs';
import {updateGameDOM,TurnFeedback,installActionInputGuard} from './ui-render.mjs';
import {installViewport} from './ui-viewport.mjs';
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
 const hand=!catalog&&session.viewer?handOrder.arrange(session.viewer,v.players[session.viewer].hand):[],index=hand.findIndex(x=>x.id===c.id);
 const d=$('card-dialog');d.classList.remove('workflow-dialog');d.classList.add('card-detail');d.innerHTML=detailMarkup(c,{v,viewer:session.viewer,catalog,readOnly,handPosition:index<0?null:{index,total:hand.length}});

 if(readOnly&&zone&&seat){const back=button('一覧へ',()=>showZone(seat,zone,null));d.querySelector('.detail-toolbar').prepend(back);}
 d.showModal();input.stamp();d.querySelector('[data-close]').focus();
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
document.addEventListener('click',e=>{
 const b=e.target.closest('button');if(!b||b.disabled)return;
 if(b.hasAttribute('data-result-collapse')){feedback.collapse();document.querySelector('[data-result-reopen]')?.focus({preventScroll:true});return;}
 if(b.hasAttribute('data-result-reopen')){feedback.reopen();return;}
 if(b.hasAttribute('data-close')||b.hasAttribute('data-cancel')){const back=b.hasAttribute('data-cancel')?returnDetail:null;const flow=b.hasAttribute('data-cancel')&&returnWorkflow;returnDetail=null;returnWorkflow=false;closeDialogs();if(back)inspect(back);else if(flow)openWorkflow();return;}
 if(b.hasAttribute('data-result-history')){closeDialogs({focus:false});const d=$('card-dialog');d.classList.remove('card-detail');d.classList.add('workflow-dialog');d.innerHTML='<button type="button" class="dialog-close" data-close>閉じる ×</button>'+resultHistoryMarkup(session.projection,session.viewer);d.querySelector('details').open=true;d.showModal();input.stamp();d.scrollTop=0;return;}
 if(b.hasAttribute('data-workflow')){openWorkflow();return;}
 if(b.hasAttribute('data-hand-toggle')){handOpen=$('hand').classList.contains('hand-collapsed');applyHandVisibility();return;}
 if(b.hasAttribute('data-menu')){closeDialogs({focus:false});$('menu-dialog').showModal();return;}
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
 if(b.hasAttribute('data-home')){cpu.cancel();feedback.reset();session.clear();closeDialogs();$('game').replaceChildren();$('welcome').hidden=false;$('game').hidden=true;$('export').hidden=true;document.body.classList.remove('playing');renderDeck();$('new').focus();}
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
