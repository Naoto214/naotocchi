import {studyCases, studyNotes, renderStudy} from './gimmick-study.mjs';
import {puzzles} from '../puzzles.mjs';
import {createDraft, changeWorld} from './model.mjs';
import {PlaySession} from '../v5/play-session.mjs';
import {LabPlayback, createLab} from './lab-playback.mjs';
import {searchLab} from './lab-session.mjs';
import {solve} from '../../solver.mjs';
import {TouchController} from '../../interaction.mjs';
import {loadArt} from '../../render.mjs';
import {loadCharacterArt} from './character-art.mjs';
const $=id=>document.getElementById(id),canvas=$('board'),reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
let play, lab=false, ready=false, solution=null, index=0,last=performance.now();
const touch=new TouchController(canvas,{
  state:()=>play.state, presentation:{}, enabled:()=>ready&&play.state.actors.length>0,
  begin:()=>play.begin(),end:()=>play?.end(),render:()=>draw(),
  step:(id,dx,dy)=>{const r=play.step(id,dx,dy,reduced());invalidate();$('message').textContent=r.ok?'操作しました':r.reason||'この方向には進めません';return r},
  sign:()=>{$('message').textContent='正式な重力ルールの比較盤面です。'}
});
const actions=()=>lab?play.session.actions:play.actions;
function invalidate(){solution=null;index=0;$('example').disabled=true;$('result').textContent='';}
function documentData(){return lab?play.document:{d:play.draft,state:play.state};}
function draw(){
  if(!ready)return;
  const width=$('size').value==='auto'?Math.floor(document.querySelector('.board-column').getBoundingClientRect().width):Number($('size').value)*8;
  document.querySelector('.board-shell').style.width=width+'px';
  play.presentation.sync(play.state);play.presentation.focus=touch.input.selected;
  const frame=play.presentation.frame(performance.now(),reduced()),held=touch.input.down&&frame.state.actors.find(a=>a.id===touch.input.gestureActor),{d}=documentData();
  renderStudy(canvas,d,frame.state,{...frame,selected:held?[held.x,held.y]:null},$('style').value,lab?play.session.state:null);
  $('moves').textContent=actions().length+'手 · '+(play.state.actors.length?'試遊中':'全員到達');
  $('undo').disabled=lab?!play.gestures.groups.length:!play.history.length;
}
function start(){
  if(play)touch.end();const id=$('scene').value;lab=/^[FD][12]$/.test(id);
  play=lab?new LabPlayback(createLab(id)):new PlaySession(changeWorld(createDraft(puzzles.find(p=>p.id===id).board),{crates:'forest',air:'sky',earth:'earth',warp:'cave'}[id]));
  touch.presentation=play.presentation;touch.input.select(null);invalidate();
  $('ruleset').textContent=lab?'独立試作のルール（正式能力ではありません）':'正式4種の物理・操作';
  $('message').textContent='仲間を選んで、隣をタップ／なぞって移動';
  $('notes').replaceChildren();for(const n of studyNotes(documentData().d,lab?play.session.state:null)){const li=document.createElement('li');li.textContent=n.name+(n.x===undefined?'':`（${n.x+1},${n.y+1}）`)+'：'+n.text;$('notes').append(li)}draw();
}
$('scene').innerHTML=studyCases.map(c=>`<option value="${c.id}">${c.label}</option>`).join('');$('scene').onchange=start;
for(const id of ['style','size'])$(id).onchange=()=>{touch.end();draw()};
$('undo').onclick=()=>{touch.end();play.undo();touch.input.select(null);invalidate();draw()};$('retry').onclick=start;
$('solve').onclick=()=>{touch.end();const r=lab?searchLab(play.session.state,play.session.step):solve(play.draft.board,{limit:12000,maxDepth:90});solution=r.solution||null;index=0;$('example').disabled=!solution?.length;$('result').textContent=r.status==='shortest'?(lab?'現在位置から':'開始盤面から')+`最短${solution.length}手`+(lab?'（変身テストは除外）':''):r.status==='exhausted'?'全探索で解なし':'探索上限により未確定';if(!lab&&solution){play.reset();touch.input.select(null)}draw()};
$('example').onclick=()=>{const a=solution?.[index];if(!a)return;touch.end();play.begin();const actor=lab?null:play.state.actors.find(v=>v.x===a.x&&v.y===a.y),r=lab?play.act(a,reduced()):actor?play.step(actor.id,a.dx,a.dy,reduced()):{ok:false};play.end();if(r.ok)index++;$('example').disabled=index>=solution.length;draw()};
for(const px of [36,48])for(const c of studyCases){const figure=document.createElement('figure'),caption=document.createElement('figcaption'),scroll=document.createElement('div'),img=document.createElement('img');caption.textContent=c.label+' · '+px+'px';scroll.className='scroll';img.src='../../../../docs/naopoyo-100-v6/controls/images/'+c.id+'-'+px+'.png';img.alt=c.label+' 左旧案・右改善候補';img.loading='lazy';scroll.append(img);figure.append(caption,scroll);$('images').append(figure)}
const failures=[...await loadArt(),...await loadCharacterArt()];if(failures.length)throw Error(failures.join(','));ready=true;start();
new ResizeObserver(draw).observe(document.querySelector('.board-column'));window.addEventListener('resize',()=>touch.end());document.addEventListener('visibilitychange',()=>{if(document.hidden)touch.end()});
function tick(now){if(!document.hidden){play.presentation.advance(Math.min(100,now-last),reduced());draw()}last=now;requestAnimationFrame(tick)}requestAnimationFrame(tick);document.documentElement.dataset.ready='true';
