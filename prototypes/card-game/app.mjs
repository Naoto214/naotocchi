import {createGame,TYPE_NAMES,CARDS,supported,DEFAULT_DECK,validateDeck} from './engine.mjs';
import {HotseatSession} from './ui-session.mjs';
import {CpuSession,restoreMatch} from './cpu-session.mjs';
import {CpuScheduler} from './cpu-scheduler.mjs';
import {cardActions,cardMarkup,gameMarkup,detailMarkup,workflowMarkup,confirmationMarkup,handoffMessage,resultNoticeMarkup,resultHistoryMarkup,canInspectCard,zoneMarkup,escapeHTML as h} from './ui-presentation.mjs';
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
const input=installActionInputGuard(document,()=>({session,revision:session.projection?.revision,viewer:session.viewer}));
let dragging=false;
let busy=false,pending=null,dialogOrigin=null,selected=null,reordering=false,returnDetail=null,returnWorkflow=false,dragCleanup=()=>{},handOpen=null;
const cpu=new CpuScheduler({getSession:()=>session,canRun:()=>!document.hidden&&!busy&&!reordering&&!dragging&&!['card-dialog','confirm-dialog','menu-dialog'].some(id=>$(id).open),onStep:()=>{persist();render();}});
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
function persist(){try{localStorage.setItem(session.mode==='cpu'?CPU_KEY:KEY,session.save());message('この端末に保存しました');}catch{message('自動保存できません。保存ファイルを書き出してください。');}}
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
function start(next){turnFeedback.hide();session.start(next);bindOrder();$('welcome').hidden=true;$('game').hidden=false;$('export').hidden=false;document.body.classList.add('playing');$('deck-list').replaceChildren();$('catalog-list').replaceChildren();if(session.mode==='cpu'){session.reveal();$('curtain').hidden=true;render();}else hide();}
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
 if(b.dataset.inspect){inspect(b.dataset.inspect,{catalog:b.hasAttribute('data-catalog'),origin:b});return;}
 if(b.dataset.browse){inspect(b.dataset.browse,{readOnly:true,origin:b});return;}
 if(b.dataset.zone){showZone(b.dataset.seat,b.dataset.zone,b);return;}
 if(b.hasAttribute('data-home')){cpu.cancel();feedback.reset();session.clear();closeDialogs();$('game').replaceChildren();$('welcome').hidden=false;$('game').hidden=true;$('export').hidden=true;document.body.classList.remove('playing');renderDeck();$('new').focus();}
});
for(const id of ['card-dialog','confirm-dialog','menu-dialog'])$(id).addEventListener('close',()=>cpu.schedule());
for(const id of ['card-dialog','confirm-dialog','menu-dialog'])$(id).addEventListener('cancel',e=>{e.preventDefault();const back=id==='confirm-dialog'?returnDetail:null;const flow=id==='confirm-dialog'&&returnWorkflow;returnDetail=null;returnWorkflow=false;closeDialogs();if(back)inspect(back);else if(flow)openWorkflow();});
$('new').onclick=()=>{try{const seeds=crypto.getRandomValues(new Uint32Array(2)),seed=seeds[0];validateDeck(decks.A);validateDeck(decks.B);cpu.cancel();session=$('match-mode').value==='cpu'?new CpuSession({humanSeat:$('human-seat').value,difficulty:$('cpu-level').value,policySeed:seeds[1]}):new HotseatSession({autoAdvance:true});start(createGame(seed,decks));persist();}catch(e){message(e.message);}};
$('restore').onclick=()=>{try{const raw=localStorage.getItem($('match-mode').value==='cpu'?CPU_KEY:KEY);if(!raw)throw Error('保存された対戦がありません');cpu.cancel();session=restoreMatch(raw);bindOrder();$('welcome').hidden=true;$('game').hidden=false;$('export').hidden=false;document.body.classList.add('playing');$('deck-list').replaceChildren();$('catalog-list').replaceChildren();hide();persist();message('保存を検証して復帰しました');}catch(e){message(`復帰できません：${e.message}`);}};
$('reveal').onclick=()=>{if(!session.active)return;session.reveal();$('curtain').hidden=true;render();continuePriority();};$('hide').onclick=hide;
$('export').onclick=()=>{if(!session.active)return;hide();const url=URL.createObjectURL(new Blob([session.save()],{type:'application/json'})),a=el('a');a.href=url;a.download=session.mode==='cpu'?'naotocchi-cpu.json':'naotocchi-hotseat.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
$('import').onchange=async e=>{const file=e.target.files[0];if(!file)return;hide();try{if(file.size>2000000)throw Error('保存ファイルが大きすぎます');const restored=restoreMatch(await file.text());cpu.cancel();session=restored;bindOrder();$('welcome').hidden=true;$('game').hidden=false;$('export').hidden=false;document.body.classList.add('playing');$('deck-list').replaceChildren();$('catalog-list').replaceChildren();hide();persist();}catch(error){message(`読込を拒否しました：${error.message}`);}finally{e.target.value='';}};
window.addEventListener('resize',()=>{dragCleanup();if(session.viewer){render();applyHandVisibility();}});window.addEventListener('blur',hide);document.addEventListener('visibilitychange',()=>{if(document.hidden)hide();});window.addEventListener('pagehide',hide);
const DECK_KEY='naotocchi-deck-drafts-v1';
let decks={A:[...DEFAULT_DECK],B:[...DEFAULT_DECK]};
try{const saved=JSON.parse(localStorage.getItem(DECK_KEY));if(saved&&['A','B'].every(a=>Array.isArray(saved[a])&&saved[a].length<=40&&saved[a].every(id=>typeof id==='string'&&CARDS[id]))){decks={A:[...saved.A],B:[...saved.B]};}}catch{}
function saveDraft(){try{localStorage.setItem(DECK_KEY,JSON.stringify(decks));}catch{message('デッキを保存できません。書き出して保管してください。');}renderDeck();}
function renderDeck(){
 const seat=$('deck-seat').value,deck=decks[seat],counts={};for(const id of deck)counts[id]=(counts[id]??0)+1;
 const valid=a=>{try{validateDeck(decks[a]);return '準備OK';}catch(e){return e.message;}};
 $('deck-count').textContent=`A：${decks.A.length}/40枚 · ${valid('A')} ／ B：${decks.B.length}/40枚 · ${valid('B')}`;
 $('new').disabled=!['A','B'].every(a=>{try{validateDeck(decks[a]);return true;}catch{return false;}});
 const list=$('deck-list');list.replaceChildren();for(const [id,n] of Object.entries(counts)){const row=el('div',undefined,'deck-row');const preview=button('',()=>inspect(id,{catalog:true,origin:preview}));preview.className='card-tap deck-preview-card';preview.setAttribute('aria-label',CARDS[id].name+'を拡大');preview.innerHTML=cardMarkup(CARDS[id],{compact:true});row.append(preview);row.append(el('span',`${CARDS[id].name} × ${n}${supported(id)?'':' · 未対応'}`),button('− 1枚',()=>{deck.splice(deck.indexOf(id),1);saveDraft();}));list.append(row);}
 const query=$('card-search').value.trim().toLowerCase(),type=$('card-type').value;
 const entries=Object.values(CARDS).filter(c=>(!type||c.type===type)&&(!query||`${c.id} ${c.name} ${c.text}`.toLowerCase().includes(query)));
 $('catalog-count').textContent=`${entries.length} / ${Object.keys(CARDS).length}種類を表示`;
 const catalog=$('catalog-list');catalog.replaceChildren();for(const c of entries){const ok=supported(c.id),row=el('article',undefined,'catalog-card');row.dataset.cardId=c.id;const preview=button('',()=>inspect(c.id,{catalog:true,origin:preview}));preview.className='card-tap catalog-preview';preview.setAttribute('aria-label',c.name+'を拡大');preview.innerHTML=cardMarkup(c,{compact:true});row.append(preview);row.append(el('strong',c.name),el('small',`${c.id} · ${TYPE_NAMES[c.type]} · 時 ${c.cost} · ${c.rare?'レア：上限1枚':'通常：上限3枚'} · ${ok?'対応済み':'未対応（閲覧のみ）'}`));if(c.type==='main')row.append(el('p',`段階 ${c.stage} · ちから ${c.power} / ちえ ${c.wisdom}`));const detail=el('details');detail.append(el('summary','カード効果'),el('p',c.text));row.append(detail);const add=button(`＋ ${seat}に追加 (${counts[c.id]??0}/${c.rare?1:3})`,()=>{deck.push(c.id);saveDraft();});add.disabled=!ok||deck.length>=40||(counts[c.id]??0)>=(c.rare?1:3);add.dataset.add=c.id;row.append(add);catalog.append(row);}
}
$('coverage').textContent=`全${Object.keys(CARDS).length}種類を収録・実行対応${Object.keys(CARDS).filter(supported).length}種類。`;
for(const [id,name] of Object.entries(TYPE_NAMES)){const option=el('option',name);option.value=id;$('card-type').append(option);}
$('deck-seat').onchange=renderDeck;$('card-search').oninput=renderDeck;$('card-type').onchange=renderDeck;
$('deck-default').onclick=()=>{decks[$('deck-seat').value]=[...DEFAULT_DECK];saveDraft();};$('deck-clear').onclick=()=>{decks[$('deck-seat').value]=[];saveDraft();};
$('deck-export').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify({version:1,decks},null,2)],{type:'application/json'})),a=el('a');a.href=url;a.download='naotocchi-decks.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
$('deck-import').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>100000)throw Error('ファイルが大きすぎます');const data=JSON.parse(await file.text()),next=data.decks??data;validateDeck(next.A);validateDeck(next.B);decks={A:[...next.A],B:[...next.B]};saveDraft();message('A・Bのデッキを読み込みました');}catch(error){message(`デッキ読込を拒否しました：${error.message}`);}finally{e.target.value='';}};
renderDeck();

function modeGuide(){const solo=$('match-mode').value==='cpu';document.querySelectorAll('[data-cpu-setting]').forEach(n=>n.hidden=!solo);$('mode-guide').textContent=solo?`自分が${$('human-seat').value}、CPUが${$('human-seat').value==='A'?'B':'A'}を担当します。デッキ編集で双方のカードを選べます。`:'交代時は手札を隠して端末を渡してください。従来の2人対戦セーブはこちらから復帰できます。';}
$('match-mode').onchange=modeGuide;$('human-seat').onchange=modeGuide;modeGuide();
