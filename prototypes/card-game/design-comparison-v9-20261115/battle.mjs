import {createGame} from '../design-comparison-v8-20261115/runtime/engine.mjs';
import {HotseatSession} from '../design-comparison-v8-20261115/runtime/ui-session.mjs';
import {gameMarkup,detailMarkup,eggDetailMarkup,workflowMarkup,confirmationMarkup,zoneMarkup,resultHistoryMarkup} from '../design-comparison-v8-20261115/runtime/ui-presentation.mjs';
import {visibleCards} from '../design-comparison-v8-20261115/runtime/ui-context.mjs';
import {normalCard,backCard,identity} from './cards.mjs';
import {layout} from '../design-comparison-v8-20261115/fit.mjs';
const $=s=>document.querySelector(s),data=await fetch('../v8/data.json').then(r=>r.json()),records=new Map(data.cards.map(c=>[c.id,c])),egg={...data.egg,type:'egg',name:'たまご',image:'../v8/'+data.egg.image,large:'../v8/'+data.egg.image};
const session=new HotseatSession({autoAdvance:true});let lastSeat='A',pending=null,detailState=null,reorder=false,order=[],collapsed=false,showIcons=false;
const cardHTML=(c,large=false)=>c.hidden?backCard():normalCard(records.get(c.cardId??c.id),{icons:showIcons?data.icons:null,large});
function safeCard(id){return visibleCards(session.projection).find(c=>c.id===id);}
function decorate(root){
 const hint=root.querySelector('.hand-heading small');if(hint)hint.textContent='補助操作で並び替え';
 for(const b of root.querySelectorAll('[data-inspect],[data-browse]')){const c=safeCard(b.dataset.inspect??b.dataset.browse);if(!c)continue;if(!b.querySelector('.card-face,.card-back'))continue;const label=b.querySelector('.board-card-name')?.textContent;b.innerHTML=cardHTML(c)+(label?`<span class="board-card-name single-name" data-fit><span></span></span>`:'');if(label)b.querySelector('.board-card-name span').textContent=label;}
 for(const b of root.querySelectorAll('[data-egg-detail]')){b.innerHTML=normalCard(egg,{egg:true})+'<span class="board-card-name single-name" data-fit><span>たまご</span></span>';}
 for(const old of root.querySelectorAll('.card-face')){const c=data.cards.find(c=>c.name===old.getAttribute('aria-label'));if(c){const t=document.createElement('template');t.innerHTML=normalCard(c,{icons:showIcons?data.icons:null});old.replaceWith(t.content);}}
 for(const img of root.querySelectorAll('img')){if(img.getAttribute('src')?.includes('card-back-approved'))img.src='../v8/assets/back.png';if(img.classList.contains('egg-image'))img.src='../v8/assets/egg-art.png';}
 for(const board of root.querySelectorAll('.player-board')){const p=session.projection.players[board.dataset.player],spans=board.querySelectorAll('.board-metrics>span');['power','wisdom'].forEach((key,i)=>{spans[i].innerHTML=(showIcons?data.icons[i?'brain':'fist']:`<span class="stat-word">${i?'ちえ':'ちから'}</span>`)+' <b>'+(p.stats?.[key]??'—')+'</b>';});}
}
function render(){const v=session.projection,viewer=session.viewer||(v.result?lastSeat:null);if(viewer)lastSeat=viewer;$('#handoff').hidden=!!viewer;$('#game').hidden=!viewer;if(!viewer){$('#game').replaceChildren();return;}const hand=v.players[viewer].hand??[];order=order.filter(id=>hand.some(c=>c.id===id));for(const c of hand)if(!order.includes(c.id))order.push(c.id);const t=document.createElement('template');t.innerHTML=gameMarkup(v,viewer,{reordering:reorder,hand:order.map(id=>hand.find(c=>c.id===id))});decorate(t.content);$('#game').replaceChildren(t.content);if(collapsed)$('#hand')?.classList.add('hand-collapsed');$('#status').textContent=`ROUND ${v.round} · 操作 ${v.actor} · 更新 ${v.revision} · 正式ルール／保存なし`;schedule();}
function detail(id,readOnly=false){const c=safeCard(id);if(!c)return;detailState={id,readOnly};$('#inspect-body').innerHTML=detailMarkup(c,{v:session.projection,viewer:session.viewer,readOnly});const canvas=$('#inspect .detail-card-canvas');canvas.innerHTML=cardHTML(c,true);canvas.insertAdjacentHTML('afterend','<button class="lab-flip" data-lab-flip aria-pressed="false">表裏を反転</button>');const title=$('#inspect .detail-summary h2'),text=title.textContent;title.replaceChildren();const span=document.createElement('span');span.textContent=text;title.append(span);title.dataset.fit='';const record=records.get(c.cardId??c.id);const rarity=$('#inspect .card-rarity-description');if(rarity)rarity.remove();const summary=$('#inspect .detail-summary');if(record)summary.insertAdjacentHTML('beforeend',identity(record,data.cards));decorate($('#inspect-body'));if(!$('#inspect').open)$('#inspect').showModal();schedule();}
function showEgg(){detailState={egg:true};$('#inspect-body').innerHTML=eggDetailMarkup();$('#inspect .detail-card-canvas').innerHTML=normalCard(egg,{egg:true,large:true});$('#inspect .detail-card-canvas').insertAdjacentHTML('afterend','<button class="lab-flip" data-lab-flip aria-pressed="false">表裏を反転</button>');if(!$('#inspect').open)$('#inspect').showModal();schedule();}
function prepareAction(id){const p=session.prepare(id);if(p.required){pending=p;$('#confirm-body').innerHTML=confirmationMarkup(p);$('#confirm').showModal();}else commit(p);}
document.addEventListener('change',e=>{if(e.target.matches('[data-declaration]')&&e.target.value){try{const id=e.target.value;e.target.value='';prepareAction(id);}catch(err){$('#status').textContent=err.message;}}});
function commit(p){session.commit(p.action.id,p.revision,p.who);pending=null;$('#confirm').close();$('#inspect').close();detailState=null;render();}
let scheduled=false;function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;layout();});}new ResizeObserver(schedule).observe(document.documentElement);new ResizeObserver(schedule).observe($('#inspect'));document.fonts.ready.then(schedule);window.addEventListener('resize',schedule);
document.addEventListener('click',e=>{try{
 const b=e.target.closest('button');if(!b)return;
 if(b.hasAttribute('data-home')){location.href='./';return;}
 if(b.hasAttribute('data-close')){$('#inspect').close();return;}
 if(b.hasAttribute('data-cancel')){$('#confirm').close();pending=null;return;}
 if(b.hasAttribute('data-confirm')){if(pending)commit(pending);return;}
 if(b.dataset.action){prepareAction(b.dataset.action);return;}
 if(b.dataset.inspect){detail(b.dataset.inspect);return;}if(b.dataset.browse){detail(b.dataset.browse,true);return;}
 if(b.hasAttribute('data-egg-detail')){showEgg();return;}
 if(b.hasAttribute('data-lab-flip')){const flip=b.getAttribute('aria-pressed')!=='true';b.setAttribute('aria-pressed',flip);$('#inspect .detail-card-canvas').innerHTML=flip?backCard():detailState?.egg?normalCard(egg,{egg:true,large:true}):cardHTML(safeCard(detailState.id),true);schedule();return;}
 if(b.hasAttribute('data-result-history')||b.hasAttribute('data-result-reopen')){$('#inspect-body').innerHTML='<header class="detail-toolbar"><h2>対戦履歴</h2><button data-close>閉じる ×</button></header>'+resultHistoryMarkup(session.projection,session.viewer);decorate($('#inspect-body'));$('#inspect').showModal();schedule();return;}
 if(b.hasAttribute('data-workflow')){$('#inspect-body').innerHTML=workflowMarkup(session.projection,session.viewer);detailState=null;decorate($('#inspect-body'));$('#inspect').showModal();schedule();return;}
 if(b.dataset.zone){$('#inspect-body').innerHTML=zoneMarkup(session.projection,b.dataset.seat,b.dataset.zone);decorate($('#inspect-body'));detailState=null;$('#inspect').showModal();schedule();return;}
 if(b.hasAttribute('data-hand-toggle')){collapsed=!collapsed;render();return;}if(b.hasAttribute('data-reorder')){reorder=!reorder;render();return;}
 if(b.dataset.move){const i=order.indexOf(b.dataset.handId),j=i+Number(b.dataset.move);if(j>=0&&j<order.length)[order[i],order[j]]=[order[j],order[i]];render();return;}
 if(b.hasAttribute('data-life-clock')||b.hasAttribute('data-menu')||b.hasAttribute('data-related-rule'))$('#status').textContent='この独立試遊ではカード表示と選択操作を確認します。時計・保存・ルールブックは正式版を維持しています。';
 }catch(err){$('#status').textContent=err.message;}});
function start(){session.start(createGame(719));session.reveal();order=[];render();}
$('#reveal').onclick=()=>{session.reveal();render();};$('#restart').onclick=start;$('#marks').onchange=e=>{showIcons=e.target.value==='icons';render();if(detailState?.id)detail(detailState.id,detailState.readOnly);};
$('#sample').onclick=()=>{session.start(createGame(719));session.reveal();for(let i=0;i<24&&!session.finished;i++){if(!session.viewer)session.reveal();const v=session.projection,a=v.actions.find(a=>a.kind==='place')??v.actions.find(a=>a.kind==='choose')??v.actions.find(a=>a.kind==='pass')??v.actions[0];if(!a)break;session.commit(a.id,v.revision,session.viewer);if(Object.values(session.projection.players).every(p=>p.board.main))break;}if(!session.viewer)session.reveal();order=[];render();};
start();
// Reproducible QA-only scenarios, reached through the viewport fixture.
// Every transition still goes through the unchanged engine's legal action list.
const scenario=new URLSearchParams(location.search).get('scenario');
if(['finish','declaration'].includes(scenario)){
 for(let i=0;i<1000&&!session.finished;i++){
  if(!session.viewer)session.reveal();const v=session.projection;
  const declaration=v.actions.find(a=>a.declare);
  if(scenario==='declaration'&&declaration){render();detail(declaration.source);break;}
  const a=v.actions.find(a=>a.kind==='choose')??v.actions.find(a=>a.kind==='pass')??v.actions[0];if(!a)break;
  session.commit(a.id,v.revision,session.viewer);
 }
 if(scenario==='finish')render();
}
