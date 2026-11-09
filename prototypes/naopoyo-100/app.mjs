import {stages} from './stages.mjs';
import {tutorialPages} from './tutorial.mjs';
import {createGameState,gameMove,isComplete,describeTiles,materialRules} from './engine.mjs';
import {TouchController} from './interaction.mjs';
import {Presentation} from './presentation.mjs';
import {playbackClock} from '../naopoyo-chapter2/example-clock.mjs';
import {GestureHistory} from './gesture.mjs';
import {loadArt,renderBoard,paintSwatch,renderHero,spriteUrl,speciesNames} from './render.mjs';
import {readProgress,writeProgress,exportProgress,importProgress,replayActions,boardSignature} from './session.mjs';

const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const registry=await fetch('../../docs/naopoyo-gimmick-atlas-v2/catalog.json').then(r=>{if(!r.ok)throw Error('図鑑を読み込めません');return r.json()});
const names=Object.fromEntries(registry.entries.map(e=>[e.id,e.name]));
const usedMaterials=new Set([...stages.flatMap(s=>s.materials),...tutorialPages.flatMap(s=>describeTiles(s.board).map(t=>t.catalogId))]);
let storage;try{storage=localStorage}catch{storage=null}
let progress=readProgress(storage),current=null,state=null,history=[],actions=[],bookIndex=null,demo=null,hintLevel=0,view='home',gravityHelpOpen=false,frameRequest=null,lastFrame=0;
const presentation=new Presentation(),gestures=new GestureHistory();
const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
const touch=new TouchController($('#board'),{state:()=>state,step:takeStep,presentation,enabled:()=>view==='play'&&!!state&&!demo&&!isComplete(state)&&!document.querySelector('dialog[open]'),begin:()=>gestures.begin(actions.length),end:()=>gestures.end(),render:()=>render(),sign:()=>{gravityHelpOpen=!gravityHelpOpen}});
const input=touch.input;
let auto=null;
function stopAuto(){if(auto!==null)clearInterval(auto);auto=null}
function resetPresentation(){stopAuto();touch.cancel();presentation.reset(state);if(frameRequest)cancelAnimationFrame(frameRequest);frameRequest=null;gravityHelpOpen=false}
function animate(before,result,id,dx,dy){presentation.queue(before,state,result,id,dx,dy,reduced());if(!frameRequest){lastFrame=performance.now();frameRequest=requestAnimationFrame(tick)}}
function tick(now){frameRequest=null;if(view!=='play')return;if(document.hidden||document.querySelector('dialog[open]')){lastFrame=now;frameRequest=requestAnimationFrame(tick);return}presentation.advance(Math.min(100,Math.max(0,now-lastFrame)),reduced());lastFrame=now;draw();if(presentation.motion.length||presentation.gateEffects.pulses.size||presentation.frame(now,reduced()).stateEffects.length)frameRequest=requestAnimationFrame(tick);else render()}
const labels={wall:'そこには壁があります',corner:'閉じた角は通れません',gate:'門の条件を確かめてみよう',terrain:'この仕掛けの条件を確かめてみよう',foothold:'登るには、出発側と着地側に支えが必要です',step:'キャラクターを選んで1マスずつ動かそう','gravity-cycle':'この動きは落下を繰り返すため戻しました','field-cycle':'流れが循環するため、この動きは戻しました',crate:'箱の先や、押す力を確かめてみよう'};
const chapters=['小さなひらめき','かたちを変えて','ふたつの仕掛け','順番の向こうへ','世界の力を借りて','見方を変えよう','役割を分けて','先を見つめて','星へつながる道','100番目の星'];
function save(){if(!writeProgress(storage,progress))$('#save-status').textContent='端末保存が使えません。記録を書き出して残してください。'}
function updateResume(){if(view==='play'&&bookIndex===null&&!demo&&current){progress.last={id:current.id,actions:structuredClone(actions),groups:[...gestures.groups],definition:boardSignature(current.board)};save()}}
function show(target){view=target;document.body.dataset.view=target;for(const e of document.querySelectorAll('.view'))e.hidden=e.id!==target;document.body.classList.toggle('book-mode',target==='play'&&bookIndex!==null);if(target!=='play'){stopAuto();touch.end();if(demo)demo=null;window.history.replaceState(null,'',location.pathname)}window.scrollTo({top:0,behavior:'instant'});if(target==='home')renderList();if(target==='atlas')renderAtlas()}
function renderList(){
 $('#progress').textContent=`${progress.cleared.length} / 100 クリア`;
 $('#continue').textContent=progress.last.actions.length?'つづきから':'冒険をはじめる';
 const filter=$('#filter').value;let count=0;
 $('#stage-list').innerHTML=chapters.map((name,i)=>{
 const subset=stages.slice(i*10,i*10+10).filter(s=>filter==='all'||filter==='uncleared'&&!progress.cleared.includes(s.id)||filter==='star'&&progress.reviews[s.id]?.star||filter==='review'&&(progress.reviews[s.id]?.rating||progress.reviews[s.id]?.difficulty||progress.reviews[s.id]?.note));count+=subset.length;
 if(!subset.length)return '';return `<section class="stage-group"><h3 class="group-heading"><span>${String(i*10+1).padStart(2,'0')}—${(i+1)*10}</span>${name}</h3><div class="stage-grid">${subset.map(s=>{const r=progress.reviews[s.id]||{},cleared=progress.cleared.includes(s.id);return `<button class="stage-card ${cleared?'cleared':''} ${r.rating==='review'?'review-mark':''}" data-stage="${esc(s.id)}" aria-label="${s.number}面 ${esc(s.title)}、目標難易度${s.difficulty}、${cleared?'クリア済み':'未クリア'}${r.star?'、再確認':''}"><span class="state">${r.star?'☆':cleared?'✓':''}</span><span class="number">${String(s.number).padStart(2,'0')}</span><span class="difficulty-mini">難易度 ${s.difficulty}</span><span class="stage-name">${esc(s.title)}</span></button>`}).join('')}</div></section>`}).join('');
 $('#no-stages').hidden=count!==0;
}
function discover(){const ids=describeTiles(state).map(t=>t.catalogId);progress.discovered=[...new Set([...progress.discovered,...ids])];save()}
function startStage(id,resume=false){
 current=stages.find(s=>s.id===id)||stages[0];bookIndex=null;demo=null;hintLevel=0;state=createGameState(current.board);history=[];actions=[];gestures.reset();resetPresentation();
 if(resume&&progress.last.id===current.id&&progress.last.definition===boardSignature(current.board)){const restored=replayActions(current.board,progress.last.actions,createGameState,gameMove);if(restored){state=restored.state;history=restored.history;actions=structuredClone(progress.last.actions);gestures.reset(progress.last.groups)}}
 input.select(null);presentation.reset(state);$('#message').textContent='';show('play');window.history.replaceState(null,'',`?stage=${current.number}`);discover();updateResume();render();
}
function startBook(index=0){bookIndex=Math.max(0,Math.min(tutorialPages.length-1,index));current=tutorialPages[bookIndex];demo=null;hintLevel=0;state=createGameState(current.board);history=[];actions=[];gestures.reset();resetPresentation();input.select(null);progress.bookSeen=true;save();$('#message').textContent='';show('play');window.history.replaceState(null,'',`?book=${bookIndex}`);discover();render()}
function takeStep(id,dx,dy){
 if(!state||demo||isComplete(state))return {ok:false,reason:'step'};
 const a=state.actors.find(a=>a.id===id);if(!a)return {ok:false,reason:'step'};
 const before=structuredClone(state),command={x:a.x,y:a.y,dx,dy};const result=gameMove(state,id,dx,dy);
 if(result.ok){gestures.record(actions.length);history.push(before);actions.push(command);animate(before,result,id,dx,dy);if(!state.actors.some(a=>a.id===input.selected))input.selected=null;$('#message').textContent=isComplete(state)?'みんな、星にとどいた！':result.events?.some(e=>e.type==='split')?'時間が分かれた。次はだれを動かそう。':result.events?.some(e=>e.type==='merge')?'時間が、ひとつになった。':'';
  if(isComplete(state)&&bookIndex===null&&!progress.cleared.includes(current.id)){progress.cleared.push(current.id)}discover();updateResume();render();
 }else $('#message').textContent=labels[result.reason]||'この方向へは進めません。使う素材でルールを確認できます。';
 return result;
}
function draw(){if(view!=='play'||!state)return;presentation.sync(state);const f=presentation.frame(performance.now(),reduced()),held=input.down?f.state.actors.find(a=>a.id===input.gestureActor):null;renderBoard($('#board'),f.state,{...f,selected:held?[held.x,held.y]:null});$('#gravity-help').hidden=!state.gravity||!gravityHelpOpen||!!demo;}

function render(){
 if(!state)return;
 const book=bookIndex!==null,won=isComplete(state);$('#stage-eyebrow').textContent=book?`はじめの絵本 · ${bookIndex+1} / ${tutorialPages.length}`:`STAGE ${String(current.number).padStart(2,'0')} · 目標難易度 ${current.difficulty}`;
 $('#stage-title').textContent=current.title;$('#stage-text').textContent=current.text||'';$('#stage-goal').textContent=current.goal||'';
 $('#gravity-label').textContent=state.gravity?'左下の看板をタップで重力の説明':'キャラを選び、隣をタップ／なぞって移動';$('#move-count').textContent=`${demo?'解法の見本 · ':''}${state.moves||actions.length}手`;
 $('#undo').disabled=history.length===0||!!demo;$('#retry').disabled=!!demo;
 $('#clear-panel').hidden=!won||presentation.motion.length>0;$('#clear-copy').textContent=demo?'解法の見本です。自分のクリアには記録されません。':book?'何度でも試せます。次のページへ進んでみよう。':current.number===100?'100番目の星に、とどきました。ここまでのひらめきを、ぜひ記録に。':`${state.moves||actions.length}手でクリア。気づいたことを、感想に残せます。`;
 $('#next').hidden=!!demo||book;$('#next').textContent=book?'ページをめくる':current.number===100?'冒険の一覧へ':'次の冒険へ';
 $('#review-open').hidden=book;$('#star').hidden=book;$('#star').setAttribute('aria-pressed',String(!!progress.reviews[current.id]?.star));$('#star').textContent=progress.reviews[current.id]?.star?'★ あとで':'☆ あとで';
 $('#book-nav').hidden=!book;$('#book-prev').disabled=bookIndex===0;$('#book-next').textContent=bookIndex===tutorialPages.length-1?'100の冒険へ':'ページをめくる';$('#leave').hidden=book;$('#leave').textContent='ステージ一覧へ';
 $('#hint-panel').hidden=hintLevel===0&&!demo;$('#hint-panel').classList.toggle('demo-mode',!!demo);
 if(demo){$('#hint-panel').innerHTML=`<strong>解法の見本 ${demo.index} / ${current.solution.length}手</strong><div class="demo-controls"><button id="demo-prev" ${demo.index===0?'disabled':''}>前の1手</button><button id="demo-step" ${demo.index>=current.solution.length?'disabled':''}>次の1手</button><button id="demo-auto" ${demo.index>=current.solution.length?'disabled':''}>${auto===null?'自動再生':'一時停止'}</button><button id="demo-reset">最初から</button></div><button id="demo-back">自分の盤面に戻る</button>`}
 else if(hintLevel){$('#hint-panel').innerHTML=`<button id="hint-close" class="close" aria-label="ヒントを閉じる">×</button><strong>小さなヒント</strong><p>${esc(hintLevel===1?(current.idea||current.hint):(current.hint||current.idea))}</p>${hintLevel===1?'<button id="hint-more">もう少しヒント</button>':'<button id="demo-start">最初から解法の見本を見る</button>'}`}
 draw();
}
function next(){if(bookIndex!==null){if(bookIndex<tutorialPages.length-1)startBook(bookIndex+1);else show('home')}else if(current.number<100)startStage(stages[current.number].id);else show('home')}
function renderAtlas(){
 const included=registry.entries.filter(e=>usedMaterials.has(e.id));$('#atlas-count').textContent=`${included.filter(e=>progress.discovered.includes(e.id)).length} / ${included.length} 素材を発見 · 今回の試作で使うルール`;
 $('#atlas-grid').innerHTML=included.map(e=>{const seen=progress.discovered.includes(e.id);return `<article class="atlas-entry ${seen?'':'unknown'}"><canvas data-tile="${esc(e.id)}" data-seen="${seen}" aria-label="${seen?esc(e.name):'未発見'}"></canvas><h3>${seen?esc(e.name):'まだ出会っていない素材'}</h3><p>${seen?esc(materialRules[e.id]):'冒険で出会うと、絵柄とルールが登録されます。'}</p>${seen?`<p class="tile-id">${esc(e.id)}</p>`:''}</article>`}).join('');
 for(const c of $('#atlas-grid').querySelectorAll('canvas')){if(c.dataset.seen==='true')paintSwatch(c,c.dataset.tile);else{c.width=c.height=144;const x=c.getContext('2d');x.fillStyle='#c8d1bb';x.fillRect(0,0,144,144);x.font='32px system-ui';x.fillStyle='#fffbed';x.textAlign='center';x.fillText('?',72,86)}}
}
function openMaterials(){touch.end();
 const tiles=describeTiles(state),used=[...new Set(tiles.map(t=>t.catalogId))];
 const details=t=>{const p=t.params||{},parts=[];
  if(p.exact!==undefined)parts.push('段階 ='+p.exact);if(p.min!==undefined)parts.push('段階 ≥'+p.min);if(p.max!==undefined)parts.push('段階 ≤'+p.max);
  if(p.species)parts.push(speciesNames[p.species]);if(t.catalogId==='object.crate')parts.push('箱の重さ '+(p.weight??2));
  if(p.partner)parts.push('協力する仲間 '+speciesNames[p.partner]);
  if(p.needs?.length)parts.push('すべて必要: '+p.needs.join('・'));if(p.any?.length)parts.push('いずれか必要: '+p.any.join('・'));
  if(p.id&&!String(p.id).startsWith('tile-'))parts.push('印 '+p.id);if(p.connection&&!String(p.connection).startsWith('tile-'))parts.push('つながり '+p.connection);
  return parts.length?`<li>左から${t.x+1}・上から${t.y+1}：${esc(parts.join(' / '))}</li>`:'';
 };
 $('#stage-materials').innerHTML=used.map(id=>`<div class="material-row"><canvas data-tile="${esc(id)}" aria-label="${esc(names[id]||id)}"></canvas><div><h3>${esc(names[id]||id)}</h3><p>${esc(materialRules[id]||'この盤面の素材です。')}</p><ul>${tiles.filter(t=>t.catalogId===id).map(details).join('')}</ul></div></div>`).join('');
 for(const c of $('#stage-materials').querySelectorAll('canvas')){const t=tiles.find(t=>t.catalogId===c.dataset.tile);paintSwatch(c,c.dataset.tile,t?.params)}$('#materials-dialog').showModal()
}
function review(){touch.end();const r=progress.reviews[current.id]||{};$('#review-stage').textContent=`STAGE ${current.number} · ${current.title}`;$('#rating').value=r.rating||'';$('#difficulty').value=r.difficulty||'';$('#note').value=r.note||'';$('#review-dialog').showModal()}

$('#stage-list').addEventListener('click',e=>{const b=e.target.closest('[data-stage]');if(b)startStage(b.dataset.stage,b.dataset.stage===progress.last.id)});
$('#filter').onchange=renderList;$('#menu').onclick=()=>show('home');$('.brand').onclick=e=>{e.preventDefault();show('home')};$('#continue').onclick=()=>startStage(progress.last.id,true);$('#open-book').onclick=()=>startBook();$('#open-atlas').onclick=()=>show('atlas');$('#open-records').onclick=()=>$('#records-dialog').showModal();$('.back-home').onclick=()=>show('home');$('#leave').onclick=()=>show('home');$('#next').onclick=next;$('#book-next').onclick=next;$('#book-prev').onclick=()=>startBook(bookIndex-1);
$('#undo').onclick=()=>{if(!history.length||demo)return;touch.end();const start=gestures.pop();state=history[start];history.length=start;actions.length=start;input.select(null);resetPresentation();$('#message').textContent='ひと筆ぶん、戻しました';updateResume();render()};
$('#retry').onclick=()=>bookIndex===null?startStage(current.id):startBook(bookIndex);
$('#hint').onclick=()=>{hintLevel=hintLevel?0:1;render()};$('#mechanisms').onclick=openMaterials;
function openDemo(){if(demo)return;touch.end();demo={state:structuredClone(state),history:structuredClone(history),actions:structuredClone(actions),groups:[...gestures.groups],selected:input.selected,index:0};state=createGameState(current.board);input.select(null);history=[];actions=[];resetPresentation();render()}
function demoStep(){if(!demo||demo.index>=current.solution.length)return;const a=current.solution[demo.index],actor=state.actors.find(v=>v.x===a.x&&v.y===a.y);const before=structuredClone(state),result=actor?gameMove(state,actor.id,a.dx,a.dy):{ok:false};if(!result.ok){stopAuto();$('#message').textContent='見本の再生を止めました。自分の盤面に戻れます。';return}demo.index++;animate(before,result,actor.id,a.dx,a.dy);input.selected=null;if(demo.index===current.solution.length)stopAuto();render()}
$('#example').onclick=openDemo;
$('#hint-panel').addEventListener('click',e=>{if(e.target.id==='demo-prev'||e.target.id==='demo-reset'){const index=e.target.id==='demo-reset'?0:Math.max(0,demo.index-1);const r=replayActions(current.board,current.solution.slice(0,index),createGameState,gameMove);state=r.state;demo.index=index;resetPresentation();render()}if(e.target.id==='demo-auto'){if(auto!==null)stopAuto();else{let clock={elapsed:0},last=performance.now();auto=setInterval(()=>{const now=performance.now();clock=playbackClock(clock,now-last,!document.hidden&&!document.querySelector('dialog[open]'),presentation.motion.length>0);last=now;if(clock.advance)demoStep()},32)}render()}
if(e.target.id==='hint-close'){hintLevel=0;render()}if(e.target.id==='hint-more'){hintLevel=2;render()}if(e.target.id==='demo-start')openDemo(); if(e.target.id==='demo-back'){state=demo.state;history=demo.history;actions=demo.actions;gestures.reset(demo.groups);input.select(demo.selected);demo=null;resetPresentation();hintLevel=0;render()}
 if(e.target.id==='demo-step'&&demo){stopAuto();demoStep()}});
$('#star').onclick=()=>{const r=progress.reviews[current.id]??={};r.star=!r.star;save();render()};$('#review-open').onclick=review;$('#save-review').onclick=()=>{progress.reviews[current.id]={...progress.reviews[current.id],rating:$('#rating').value,difficulty:$('#difficulty').value,note:$('#note').value};save();$('#review-dialog').close()};
$('#export').onclick=()=>{const url=URL.createObjectURL(new Blob([exportProgress(progress)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='naopoyo-100-records.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);$('#record-message').textContent='記録ファイルを書き出しました。'};
$('#import').onchange=async e=>{try{const file=e.target.files[0];if(!file)return;if(file.size>1000000)throw Error('記録ファイルが大きすぎます');const incoming=importProgress(await file.text());progress=incoming;save();$('#record-message').textContent='記録を読み込みました。';renderList()}catch(error){$('#record-message').textContent='読み込めませんでした：'+error.message}finally{e.target.value=''}};
$('#board').addEventListener('keydown',e=>{const dir={ArrowUp:[0,-1],ArrowRight:[1,0],ArrowDown:[0,1],ArrowLeft:[-1,0],Home:[-1,-1],PageUp:[1,-1],End:[-1,1],PageDown:[1,1]}[e.key];if(dir&&!demo){e.preventDefault();touch.cancel();takeStep(input.selected,...dir)}});
window.addEventListener('resize',()=>{if(state)touch.end()});document.addEventListener('visibilitychange',()=>{lastFrame=performance.now();if(document.hidden&&state)touch.end()});
function sizeBoard(){if(view!=='play')return;const r=$('.board-column').getBoundingClientRect(),caption=24;document.documentElement.style.setProperty('--board-size',Math.max(60,Math.floor(Math.min(r.width,r.height-caption-8)))+'px');draw()}
new ResizeObserver(sizeBoard).observe($('.board-column'));window.visualViewport?.addEventListener('resize',sizeBoard);window.addEventListener('pagehide',updateResume);
const failures=await loadArt();if(failures.length)throw Error(`画像の読込失敗：${failures.join(', ')}`);renderHero($('#hero-art'));renderList();draw();save();
const requested=new URLSearchParams(location.search);if(requested.has('book'))startBook(Number(requested.get('book'))||0);else if(requested.has('stage'))startStage(String(Number(requested.get('stage'))).padStart(2,'0'),true);

document.documentElement.dataset.ready='true';
