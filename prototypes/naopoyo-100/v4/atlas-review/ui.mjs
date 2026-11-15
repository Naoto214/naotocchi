import {reviewEntries,history,symbolGuide} from './review.mjs';
import {sceneFor,targets,inspectCell} from './scenes.mjs';
import {renderReview,drawTile} from './paint.mjs';
import {PlaySession} from '../v5/play-session.mjs';
import {searchLab} from '../v6/lab-session.mjs';
import {TouchController} from '../../interaction.mjs';
import {loadArt} from '../../render.mjs';
import {loadCharacterArt} from '../v6/character-art.mjs';
const $=id=>document.getElementById(id),canvas=$('board'),reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
let entry,scene,play,ready=false,demo=null,demoIndex=0,auto=false,inspectAt=null,previewAt=-Infinity,last=performance.now(),lastDraw=0,lastStep=0;
const previews=[36,48].map(px=>({px,old:document.createElement('canvas'),candidate:document.createElement('canvas')}));
const touch=new TouchController(canvas,{
 state:()=>play.state,presentation:{},enabled:()=>ready&&scene.playable&&$('mode').value==='play'&&play.state.actors.length>0,
 begin:()=>play.begin(),end:()=>play?.end(),render:()=>draw(),
 step:(id,dx,dy)=>{stopDemo();const r=play.step(id,dx,dy,reduced());$('message').textContent=r.ok?'操作しました':r.reason||'この方向には進めません';return r},
 sign:()=>{$('message').textContent='木製看板は重力の目印です。重力を切り替える操作ではありません。'}
});
const formalDown=canvas.onpointerdown;
canvas.onpointerdown=e=>{
 if(!ready||e.isPrimary===false)return;
 if($('mode').value==='read'){e.preventDefault();const p=touch.point(e);inspectAt={x:Math.floor(p.x),y:Math.floor(p.y)};showCell();return;}
 formalDown(e);
};
function actions(){return scene.lab?play.session.actions:play.actions;}
function stopDemo(){auto=false;demo=null;demoIndex=0;$('pause').disabled=true;$('next').disabled=true;}
function showCell(){if(inspectAt)$('cell').textContent=inspectCell(scene,play.state,inspectAt.x,inspectAt.y).join('\n');}
function draw(forcePreview=false){
 if(!ready)return;
 const width=$('size').value==='auto'?Math.floor(document.querySelector('.board-column').getBoundingClientRect().width):Number($('size').value)*8;
 document.querySelector('.board-shell').style.width=width+'px';
 play.presentation.sync(play.state);play.presentation.focus=touch.input.selected;
 const now=performance.now(),frame=play.presentation.frame(now,reduced()),held=touch.input.down&&frame.state.actors.find(a=>a.id===touch.input.gestureActor),options={...frame,selected:held?[held.x,held.y]:null};
 renderReview(canvas,scene,frame.state,options,$('style').value);
 $('moves').textContent=actions().length+'手 · '+(!scene.playable?'未実装の過去図':play.state.actors.length?'試遊中':'全員到達');
 $('undo').disabled=!scene.playable||!(scene.lab?play.gestures.groups.length:play.history.length);
 if(forcePreview||now-previewAt>150){
  const list=targets(entry.id,scene,play.state),previous=$('target').value;
  $('target').replaceChildren();for(const [i,t]of list.entries()){const o=document.createElement('option');o.value=String(i);o.textContent=`（${t.x+1}, ${t.y+1}）`;$('target').append(o);}
  $('target').value=Number(previous)<list.length?previous:'0';if(!$('target').value)$('target').value='0';
  const target=list[Number($('target').value)];
  for(const p of previews){for(const style of ['old','candidate']){const board=p[style];board.getBoundingClientRect=()=>({width:p.px*8});renderReview(board,scene,frame.state,options,style);drawTile($(style==='old'?'old'+p.px:'new'+p.px),board,target,p.px);}}
  previewAt=now;showCell();
 }
}
function section(parent,title,body){const box=document.createElement('div');box.className='history-item';const strong=document.createElement('strong'),p=document.createElement('p');strong.textContent=title;p.textContent=body;box.append(strong,p);parent.append(box);}
function describe(){
 for(const k of ['meaning','eligibility','always','details','candidate','purpose','difference','risk','question'])$(k).textContent=entry[k];
 $('name').textContent=entry.name;$('identity').textContent=entry.id+' · '+entry.category+' · 優先度 '+entry.priority;
 $('decision').textContent=entry.decision;$('runtime').textContent=entry.runtime;$('approval').textContent=entry.approvalNote;
 const e=entry.evidence;$('evidence').textContent=e.tested?`過去の主効果禁止：${e.tested}面。全探索で解なし ${e.necessary} ／ 省略解あり ${e.bypass} ／ 未確定 ${e.unknown}。対象外 ${e.notApplicable}。`:'主効果禁止の対象記録なし。不要という意味ではありません。';
 $('evidence-rows').replaceChildren();for(const r of e.rows){const li=document.createElement('li');li.textContent=`${r.number}「${r.title}」：${r.requirement} → `+({exhausted:'全探索で解なし',shortest:'省略解あり'}[r.necessity?.status]||(r.necessity?'未確定':'対象外'));$('evidence-rows').append(li);}
 $('history').replaceChildren();if(!entry.history.length)section($('history'),'V5表示基盤','既存物理IDへ対応する表示素材。新しい仕掛けとして重複登録しません。');
 for(const h of entry.history)section($('history'),h.id+' '+h.name+' — 当時：'+h.decision,`当時の表示：${h.currentDesign}。当時の改善案：${h.design}。過去の案であり、現在のルールとは限りません。`);
}
function start(){
 if(play)touch.end();stopDemo();scene=sceneFor(entry.id,$('variant').value);play=scene.lab||new PlaySession(scene.d);touch.presentation=play.presentation;touch.input.select(null);
 $('mode').value='read';$('mode').disabled=!scene.playable;$('retry').disabled=!scene.playable;
 $('example').disabled=!scene.playable||!(scene.witness||scene.lab);$('source').textContent=scene.source;
 $('message').textContent=scene.playable?'読むモード：盤面のマスをタップすると詳細を表示します。':'未実装の過去図展示。正式な操作・物理は追加していません。';
 inspectAt=targets(entry.id,scene,play.state)[0];previewAt=-Infinity;draw(true);showCell();
}
function chooseMaterial(){
 entry=reviewEntries.find(e=>e.id===$('material').value);if(!entry)return;
 $('style').value='old';$('variant').replaceChildren();const variants=['formal',...(entry.id==='terrain.soil'?['D1','D2']:['v5.terrain.air','v5.terrain.platform','field.updraft'].includes(entry.id)?['F1','F2']:[])];
 for(const v of variants){const o=document.createElement('option');o.value=v;o.textContent=v==='formal'?'現在の正式物理／過去展示':v+' 独立試作';$('variant').append(o);}
 $('variant-label').hidden=variants.length===1;describe();start();
}
function filter(){const previous=$('material').value,q=$('search').value.trim().toLowerCase(),priority=$('priority').value,list=reviewEntries.filter(e=>(!priority||e.priority===priority)&&[e.name,e.id,e.meaning].join(' ').toLowerCase().includes(q));$('material').replaceChildren();for(const e of list){const o=document.createElement('option');o.value=e.id;o.textContent=e.name+' · '+e.priority;$('material').append(o);}$('count').textContent=list.length+'件 / 76素材（IDの重複登録なし）';if(list.some(e=>e.id===previous))$('material').value=previous;if(!list.length){$('message').textContent='該当する素材はありません。現在の比較盤面は保持しています。';return;}if(ready&&$('material').value!==entry?.id)chooseMaterial();}
$('search').oninput=filter;$('priority').onchange=filter;$('material').onchange=chooseMaterial;$('variant').onchange=start;
$('style').onchange=$('size').onchange=()=>{touch.end();draw(true);};
$('mode').onchange=()=>{touch.end();stopDemo();$('message').textContent=$('mode').value==='read'?'マスをタップして条件を確認。':'仲間を選び、隣をタップ／ドラッグ。動作中もつかみ直せます。';};
$('target').onchange=()=>{const list=targets(entry.id,scene,play.state);inspectAt=list[Number($('target').value)];draw(true);showCell();};
$('undo').onclick=()=>{touch.end();stopDemo();play.undo();touch.input.select(null);draw(true);};$('retry').onclick=start;
function demoStep(){
 const a=demo?.[demoIndex];if(!a)return;touch.end();play.begin();const actor=scene.lab?null:play.state.actors.find(v=>v.x===a.x&&v.y===a.y),r=scene.lab?play.act(a,reduced()):actor?play.step(actor.id,a.dx,a.dy,reduced()):{ok:false};play.end();
 if(!r.ok){stopDemo();$('message').textContent='見本の再生に失敗しました。やり直してください。';return;}
 demoIndex++;lastStep=performance.now();$('next').disabled=demoIndex>=demo.length;if(demoIndex>=demo.length){auto=false;$('pause').disabled=true;}draw(true);
}
$('example').onclick=()=>{touch.end();play.reset();touch.input.select(null);demo=scene.lab?searchLab(play.session.state,play.session.step).solution:structuredClone(scene.witness);demoIndex=0;auto=Boolean(demo?.length);$('pause').disabled=!auto;$('pause').textContent='一時停止';$('message').textContent='開始盤面から、既存ルールの動きを再生中。';demoStep();};
$('pause').onclick=()=>{auto=!auto;$('pause').textContent=auto?'一時停止':'再開';};$('next').onclick=()=>{auto=false;$('pause').textContent='再開';demoStep();};
for(const g of symbolGuide){const box=document.createElement('article');box.className='card';section(box,g.name,g.meaning+' 常時：'+g.always+'。詳細：'+g.details);$('symbols').append(box);}
for(const e of reviewEntries){const b=document.createElement('button');b.className='read-button';b.textContent=e.name+' · '+e.decision+' · 優先度 '+e.priority;b.onclick=()=>{$('search').value='';$('priority').value='';filter();$('material').value=e.id;chooseMaterial();$('name').scrollIntoView?.({block:'start'});};$('inventory').append(b);}
for(const h of history)section($('proposals'),h.id+' '+h.name+' — '+h.decision,h.rule+' 対応素材：'+(reviewEntries.filter(e=>e.history.some(p=>p.id===h.id)).map(e=>e.id).join('、')||'新規登録なし（構成法・能力・保留案）'));
for(const px of [36,48]){for(const id of ['catalog','object.crate','fixture.plate.weight','fixture.sequence','field.updraft','fixture.burrow','terrain.tunnel','fixture.gate','fixture.warp']){const wrap=document.createElement('div'),img=document.createElement('img');wrap.className='saved-image';img.loading='lazy';img.src='../../../../docs/naopoyo-gimmick-review/images/'+id+'-'+px+'.png';img.alt=id+' '+px+'px 左：旧案／右：候補';wrap.append(img);$('images').append(wrap);}}
filter();$('material').value='object.crate';const failures=[...await loadArt(),...await loadCharacterArt()];if(failures.length)throw Error(failures.join(','));ready=true;chooseMaterial();
new ResizeObserver(()=>draw(true)).observe(document.querySelector('.board-column'));window.addEventListener('resize',()=>touch.end());document.addEventListener('visibilitychange',()=>{if(document.hidden){touch.end();auto=false;}});
function tick(now){if(!document.hidden){play.presentation.advance(Math.min(100,now-last),reduced());if(auto&&!play.presentation.motion.length&&now-lastStep>350)demoStep();if(now-lastDraw>32){draw();lastDraw=now;}}last=now;requestAnimationFrame(tick);}requestAnimationFrame(tick);document.documentElement.dataset.ready='true';
