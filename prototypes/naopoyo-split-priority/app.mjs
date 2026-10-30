import {loadSprites} from '../naopoyo-rescue/sprites.mjs';
import {fixture,simulate,scenarios,edit,cellName,modeText} from './model.mjs';
import {headingNames,compass,blockedReason} from './priorities.mjs';
import {drawBoard} from './draw.mjs';
import {clone,mass} from './engine.mjs';
const $=id=>document.getElementById(id),board=$('board');let input=fixture(),mode='A',heading=4,phase='initial',birth=7,selected=null,route=null,results,lesson=0;
$('scenario').innerHTML=scenarios.map(([value,name])=>`<option value="${value}">${name}</option>`).join('');
$('heading').innerHTML=headingNames.map((n,i)=>`<option value="${i}" ${i===4?'selected':''}>${['↑','↗','→','↘','↓','↙','←','↖'][i]} ${n}へ</option>`).join('');
function resetBoard(){input=fixture($('scenario').value,{gravity:$('gravity').value==='true',level:Number($('level').value)});phase='initial';birth=7;selected=route=null;$('predict').checked=false;$('cell-info').textContent='マスをタップすると、生成経路を見られます。';recompute();}
function recompute(){results=Object.fromEntries(['A','B','C'].map(m=>[m,simulate(input,m,heading)]));selected=route=null;draw();comparison();}
function phaseState(){const r=results[mode];if(phase!=='spawn')return r[phase];const s=clone(r.spawn),children=r.spawns[0]?.children||[];s.actors=s.actors.filter(a=>!children.slice(birth).some(b=>b.id===a.id));const p=s.actors.find(a=>a.id==='parent');if(p)p.level+=Math.max(0,children.length-birth);return s;}
function draw(){const r=results[mode],children=r.spawns[0]?.children||[],limit=children.length;birth=Math.min(birth,limit);$('birth').max=limit;$('birth').value=birth;$('birth-value').textContent=`${birth} / ${limit}体`;$('back-birth').disabled=birth<=0;$('next-birth').disabled=birth>=limit;
 $('rule').textContent=modeText[mode];$('mode-badge').textContent=mode;const phaseNames={initial:'トゲ到着・生成前',spawn:'分裂直後',final:input.gravity?'重力後・最終配置':'平面・最終配置'};$('phase-title').textContent=phaseNames[phase];
 document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.mode===mode));document.querySelectorAll('[data-phase]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.phase===phase));
 const s=phaseState();drawBoard(board,s,{candidates:r.candidates,showRanks:$('ranks').checked&&!$('predict').checked,route,selected,origin:input.actors[0],children:phase==='spawn'?children.slice(0,birth):[]});
 $('snapshot-info').textContent=r.result.ok?`最初の分裂 ${limit}体 / 本体 ${r.spawn.actors.find(a=>a.id==='parent')?.level??'救出'}。段階合計 ${mass(s)}。最終救出 ${r.final.rescued}。${phase==='final'?'数字は生成時の候補順位です。落下後の場所の順位ではありません。':phase==='spawn'?'橙の枠は生成順。一斉生成を順に表示しています。':'本体到着後の空きマスから候補を計算しています。'}`:`この操作は成立しません：${r.result.reason}（盤面は巻き戻されています）`;
 if($('predict').checked)$('snapshot-info').textContent='順位を隠しています。最初の1体が生まれるマスをタップしてください。';
 const events=r.result.events||[];$('events').innerHTML=events.length?events.map((e,i)=>`<div class="event">${i+1}. ${({split:'分裂',fall:'落下',merge:e.overflow?'合体＋余剰分離':'合体',rescue:'救出',phase:'ゲート通過',swap:'位置交換'})[e.type]||e.type} ${e.x!==undefined&&e.y!==undefined?cellName(e.x,e.y):''}${e.type==='split'?` / ${e.count}体`:''}${e.type==='fall'?` / ${cellName(e.x,e.from)} → ${cellName(e.x,e.to)}`:''}</div>`).join(''):'重力の連鎖はありません。';
}
function comparison(){$('comparison').innerHTML=['A','B','C'].map(m=>{const r=results[m],cs=r.spawns[0]?.children||[];return `<div class="comparison-row"><strong>${m} ${m==='A'?'現行BFS':m==='B'?'方向優先':'固定リング'}</strong>生成順：${cs.map((a,i)=>`${i+1}=${cellName(a.x,a.y)}`).join(' → ')||'生成なし'}<br>最終：${r.final.actors.length}体 / 救出 ${r.final.rescued} / 合体 ${(r.result.events||[]).filter(e=>e.type==='merge').length}回${r.result.ok?'':' / 不成立：'+r.result.reason}</div>`}).join('');}
for(const id of ['scenario','gravity','level'])$(id).addEventListener('change',resetBoard);
$('heading').addEventListener('change',()=>{heading=Number($('heading').value);recompute()});
for(const b of document.querySelectorAll('[data-mode]'))b.addEventListener('click',()=>{mode=b.dataset.mode;selected=route=null;$('cell-info').textContent='方式を切り替えました。同じ盤面で比較しています。';draw()});
for(const b of document.querySelectorAll('[data-phase]'))b.addEventListener('click',()=>{phase=b.dataset.phase;$('predict').checked=false;draw()});
$('ranks').addEventListener('change',draw);$('predict').addEventListener('change',()=>{phase='initial';selected=route=null;draw()});
$('birth').addEventListener('input',()=>{birth=Number($('birth').value);phase='spawn';$('predict').checked=false;draw()});
$('back-birth').addEventListener('click',()=>{birth--;phase='spawn';$('predict').checked=false;draw()});$('next-birth').addEventListener('click',()=>{birth++;phase='spawn';$('predict').checked=false;draw()});$('reset').addEventListener('click',resetBoard);
board.addEventListener('click',e=>{const rect=board.getBoundingClientRect(),x=Math.floor((e.clientX-rect.left)/rect.width*8),y=Math.floor((e.clientY-rect.top)/rect.height*8);if(x<0||y<0||x>=8||y>=8)return;const r=results[mode],p=r.candidates.find(p=>p.x===x&&p.y===y);selected=[x,y];
 if($('predict').checked){const first=r.spawns[0]?.children[0];$('cell-info').textContent=first?(first.x===x&&first.y===y?'正解！':'この配置では違います。')+` 1体目は ${cellName(first.x,first.y)}。経路：${r.candidates[0].path.map(p=>cellName(...p)).join(' → ')}`:'この配置では分裂体は生まれません。';route=first?r.candidates[0].path:null;draw();return;}
 if($('tool').value!=='inspect'){if(edit(input,x,y,$('tool').value)){phase='initial';birth=7;recompute();$('cell-info').textContent=`${cellName(x,y)}を変更しました。3方式すべてに同じ配置を適用しています。`;}return;}
 route=p?.path||null;$('cell-info').textContent=p?`${cellName(x,y)}：探索 ${p.order}番${p.fixedRank?`（固定枠 ${p.fixedRank}番）`:''} / 経路 ${p.distance}歩 / ${p.path.map(q=>cellName(...q)).join(' → ')}。${p.ring===1&&p.distance===2?'近隣ですが、回り道で2歩かかります。':''}`:`${cellName(x,y)}：生成不可。${blockedReason(r.initial,x,y)|| (mode==='B'?'直線2歩の対象外、または途中が通れません。':'2歩以内の合法な経路がありません。')}`;draw();});
const lessons=[
 ['分裂の基本','まず段階2で、1体だけ。トゲに触れると、段階1が生まれます。','empty',2,false],
 ['方向が順番を決める','最初は進んできた側（後ろ）。進入方向を変えて、1体目を予想してみましょう。','empty',3,false],
 ['仲間で道を変える','異種の仲間8が、最初の候補をふさいでいます。置く・取り除くで結果を比べましょう。','one',3,false],
 ['2歩先へ','2歩先にも、途中の空いたマスが必要です。Bは直線だけ、AとCは曲がる経路も使えます。','two',8,false],
 ['生まれた場所と、落ち着く場所','分裂直後を確認してから重力後へ。落下・合体で、見える体数が変わります。','empty',4,true],
 ['配置を工夫する','仲間を2マスに置いて、3体目の生成先を調整してみましょう。慣れたら段階8で7体へ。','two',4,true]
];
function showLesson(){const [title,body]=lessons[lesson];$('lesson-count').textContent=`${lesson+1} / 6`;$('lesson-title').textContent=title;$('lesson-body').textContent=body;$('lesson-prev').disabled=!lesson;$('lesson-next').disabled=lesson===5;}
$('lesson-prev').addEventListener('click',()=>{lesson--;showLesson()});$('lesson-next').addEventListener('click',()=>{lesson++;showLesson()});$('lesson-try').addEventListener('click',()=>{const [, ,name,level,gravity]=lessons[lesson];heading=4;$('heading').value='4';$('scenario').value=name;$('level').value=level;$('gravity').value=String(gravity);resetBoard();document.querySelector('.experiment').scrollIntoView({behavior:'auto',block:'start'});});
const failed=await loadSprites();if(failed.length)$('cell-info').textContent='正式画像の一部を読み込めませんでした。再読み込みしてください。';recompute();showLesson();new ResizeObserver(draw).observe(board);
try{const rows=await (await fetch('./compatibility.json')).json();$('compatibility').innerHTML='<table><thead><tr><th>面 / 手数</th><th>A</th><th>B</th><th>C</th></tr></thead><tbody>'+rows.map(r=>`<tr><td>${r.number} / ${r.savedMoves}</td>${['A','B','C'].map(m=>`<td>${r.modes[m].status==='solved'?'成功':r.modes[m].failure.step+'手目×'}</td>`).join('')}</tr>`).join('')+'</tbody></table>';}catch{$('compatibility').textContent='検証結果を読み込めませんでした。調査報告をご覧ください。';}
