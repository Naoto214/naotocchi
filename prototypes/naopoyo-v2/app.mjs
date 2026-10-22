import {stages} from './stages.mjs';
import {Session} from './session.mjs';
import {KEY,pack,restore} from './store.mjs';
import {complete,mass} from './engine.mjs';
import {render} from './render.mjs';
import {loadSprites,speciesNames} from '../naopoyo-rescue/sprites.mjs';
export function mount({document:doc=globalThis.document,window:win=globalThis.window,storage}={}){
 const $=id=>doc.getElementById(id),canvas=$('board');let saved=null,storageError=false,corrupt=false;
 try{storage??=win.localStorage;const raw=storage?.getItem(KEY);saved=restore(raw,stages);corrupt=!!raw&&!saved}catch{storageError=true}
 let session=new Session(stages.find(s=>s.id===saved?.stageId)||stages[0],saved),cleared=saved?.cleared||[],pointer=null,pulse=false;
 const controller={get session(){return session}};
 const listeners=[];const listen=(target,name,fn)=>{target.addEventListener(name,fn);listeners.push([target,name,fn])};
 function save(){try{storage.setItem(KEY,pack(session,cleared));storageError=false}catch{storageError=true;$('message').textContent='保存できません。この画面では続けて遊べます。'}}
 function draw(){render(canvas,session.state,session.active?.id,{dpr:Math.min(win.devicePixelRatio||1,2),pulse})}
 function update(){const s=session.state;$('stageNum').textContent=`${s.id.replace('V','')} / ${stages.length}`;$('title').textContent=session.stage.title;$('lesson').textContent=session.stage.lesson;$('moves').textContent=`${session.snapshots().length} ひと筆`;$('remaining').textContent=`帰った段階 ${s.rescued} / ${mass(s)}`;$('gravity').textContent=s.gravity?'↓ 下へ落ちる':'ふわり・重力なし';$('undo').disabled=!session.history.length&&!session.active;$('win').hidden=!complete(s);$('winText').textContent=`${session.snapshots().length}回のひと筆で、みんなおかえり。`;
  const a=s.actors.find(a=>a.id===session.active?.id);$('active').textContent=a?`${speciesNames[a.species]} ${a.level} · そのまま続けて`:'キャラから、なぞってみよう';doc.body?.setAttribute('data-theme',s.theme||'grove');draw();
 }
 function releasePointer(){const old=pointer;pointer=null;if(old!==null&&canvas.hasPointerCapture?.(old))try{canvas.releasePointerCapture(old)}catch{}}
 function finish(){session.end();releasePointer();if(complete(session.state)&&!cleared.includes(session.stage.id))cleared.push(session.stage.id);save();update()}
 function choose(stage){finish();session=new Session(stage);$('message').textContent='';$('stageDialog').close();save();update()}
 function point(e){const r=canvas.getBoundingClientRect();return {x:Math.max(0,Math.min(session.state.w-1e-6,(e.clientX-r.left)/r.width*session.state.w)),y:Math.max(0,Math.min(session.state.h-1e-6,(e.clientY-r.top)/r.height*session.state.h))}}
 function travel(e){const results=session.travel(point(e));const last=results.at(-1);if(last){pulse=!!last.splitBlocked;if(last.ok){$('message').textContent=last.merged&&last.split?`合体して、${last.split}つの1に分裂`:last.split?`${last.split}つの1が生まれたよ`:last.overflow?`8になって、${last.overflow}を後ろに残したよ`:last.merged?'いっしょになったよ':last.splitBlocked?'そのまま通れるよ':''}else $('message').textContent=({saturated:'8と8は、そのまま。別の道をなぞろう。',species:'同じ種族どうしで、いっしょに。',foothold:'上に進むには、下と横の足場がいるよ。','occupied-spike':'比較B：先にトゲの上の子を動かそう。',gate:'門の数字を確かめてみよう。',exit:'星の条件を確かめてみよう。'})[last.reason]||'指を戻して、別の道をなぞろう。'}update()}
 listen(canvas,'pointerdown',e=>{if(pointer!==null||complete(session.state))return;const p=point(e),a=session.state.actors.find(a=>a.x===Math.floor(p.x)&&a.y===Math.floor(p.y));if(!a)return;e.preventDefault();if(session.begin(a.id,p)){pointer=e.pointerId;canvas.setPointerCapture(e.pointerId);pulse=false;update()}});
 listen(canvas,'pointermove',e=>{if(e.pointerId!==pointer)return;e.preventDefault();const coalesced=e.getCoalescedEvents?.();for(const sample of coalesced?.length?coalesced:[e])travel(sample)});
 listen(canvas,'pointerup',e=>{if(e.pointerId!==pointer)return;travel(e);finish()});
 for(const name of ['pointercancel','lostpointercapture'])listen(canvas,name,e=>{if(e.pointerId===pointer)finish()});
 listen(doc,'visibilitychange',()=>{if(doc.hidden)finish()});listen(win,'pagehide',finish);listen(win,'resize',draw);
 listen($('undo'),'click',()=>{releasePointer();session.undo();$('message').textContent='ひと筆ぶん、戻しました。';save();update()});
 listen($('retry'),'click',()=>{releasePointer();session.retry();$('message').textContent='';save();update()});
 listen($('next'),'click',()=>choose(stages[(stages.indexOf(session.stage)+1)%stages.length]));
 listen($('stageSelect'),'click',()=>{finish();$('levels').replaceChildren(...stages.map(stage=>{const b=doc.createElement('button');b.textContent=`${stage.id.replace('V','')}  ${stage.title}${cleared.includes(stage.id)?' ✓':''}`;b.setAttribute('aria-current',stage.id===session.stage.id?'step':'false');b.addEventListener('click',()=>choose(stage));return b}));$('stageDialog').showModal()});
 listen($('closeStages'),'click',()=>$('stageDialog').close());listen($('help'),'click',()=>{finish();$('guide').showModal()});listen($('closeHelp'),'click',()=>$('guide').close());
 if(corrupt)$('message').textContent='保存データを読み込めなかったため、最初の場面から再開しました。';if(storageError)$('message').textContent='保存できません。この画面では続けて遊べます。';
 update();if(typeof Image!=='undefined')loadSprites().then(failed=>{if(failed.length)$('message').textContent='キャラ画像を読み込めませんでした。再読み込みしてください。';draw()});
 controller.destroy=()=>{finish();for(const [target,name,fn] of listeners)target.removeEventListener(name,fn)};return controller;
}
