import {stages} from './baseline/prototypes/naopoyo-chapter2/stages.mjs';
import {cycleWell} from './fixtures.mjs';
const modes=['A','B','C','B-once'],engines={},previews={};
for(const m of modes){engines[m]=await import(`./generated/${m}/engine.mjs`);previews[m]=await import(`./generated/${m}/preview.mjs`);}
const data=await (await fetch('./report-data.json')).json(),$=s=>document.querySelector(s);
const names={A:'現行：親子を一時保留',B:'分裂後も通常合体',C:'真上を後回し', 'B-once':'B＋トゲは一手に一度'};
const descriptions={A:'進入方向で生成。親子の落下合体をその一手だけ止める。',B:'生成位置はAと同じ。親子にも通常の落下合体。',C:'左右から生成し、真上を最後へ。親子抑制は維持。','B-once':'通常合体を維持。同じトゲの分裂成功は1マス操作につき一度。'};
let state,selected,direction=[1,-1],results={};
for(const st of stages){const o=document.createElement('option');o.value=st.number;o.textContent=st.title+'：初期盤面';$('#scenario').append(o);}
function renderBoard(host,s,interactive=false){host.replaceChildren();host.style.setProperty('--w',s.w);host.style.setProperty('--h',s.h);
 for(let y=0;y<s.h;y++)for(let x=0;x<s.w;x++){
  const a=s.actors.find(a=>a.x===x&&a.y===y),wall=s.walls.some(p=>p[0]===x&&p[1]===y),g=s.gates.find(p=>p.x===x&&p.y===y),sp=s.spikes.find(p=>p.x===x&&p.y===y),ex=s.exits.find(p=>p.x===x&&p.y===y);
  const el=document.createElement(interactive&&a?'button':'div');el.className='cell'+(wall?' rock':'')+(g?' gate':'')+(ex?' exit':'')+(interactive&&a?.id===selected?' selected':'');
  if(g||sp||ex){const t=document.createElement('span');t.className='terrain';t.textContent=g?'G'+g.exact:sp?'▲'+sp.power:'☆'+ex.exact;el.append(t);}
  if(a){const v=document.createElement('span');v.className='actor'+(a.id.startsWith('child')?' child':'');v.textContent=a.level;el.append(v);}
  el.setAttribute('aria-label',`(${x},${y}) ${a?'段階'+a.level+' ':''}${wall?'岩':g?'ゲート'+g.exact:sp?'トゲ'+sp.power:ex?'出口'+ex.exact:'空間'}`);
  if(interactive&&a)el.onclick=()=>{selected=a.id;update();};host.append(el);
 }
}
function reset(){const value=$('#scenario').value;
 if(value==='repro'){state=structuredClone(data.repro.before);selected='b';direction=[1,-1];}
 else if(value==='well'){state=engines.A.createState(cycleWell());selected='active';direction=[1,0];}
 else{state=engines.A.createState(stages.find(s=>s.number===Number(value)));engines.A.settle(state);selected=state.actors[0]?.id;direction=[1,0];}update();
}
const buttons=[];for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
 if(!dx&&!dy){const el=document.createElement('span');el.textContent='●';$('#directions-pad').append(el);continue;}
 const b=document.createElement('button');b.textContent=({'-1,-1':'↖','0,-1':'↑','1,-1':'↗','-1,0':'←','1,0':'→','-1,1':'↙','0,1':'↓','1,1':'↘'})[[dx,dy]];b.setAttribute('aria-label',`方向 ${b.textContent}`);b.onclick=()=>{direction=[dx,dy];update();};buttons.push([b,dx,dy]);$('#directions-pad').append(b);
}
const reasons={'gravity-cycle':'分裂と再合体が循環したため、一手を取り消し','foothold':'上へ進むための足場がありません','wall':'岩・盤面の外です','corner':'岩やゲートの角を通れません','gate':'ゲートの数字が合いません','gate-top':'ゲート上面を上下に抜けられません','step':'仲間を選んでください','saturated':'下の8が支えます','split-family':'同じ分裂グループのため合体を保留','species':'別種の仲間が支えます'};
function update(){
 renderBoard($('#before'),state,true);const actor=state.actors.find(a=>a.id===selected);$('#selection').textContent=actor?`選択：段階${actor.level} / (${actor.x}, ${actor.y})`:'全員が出口へ。盤面を戻して再比較できます。';
 for(const [b,x,y] of buttons){b.classList.toggle('chosen',x===direction[0]&&y===direction[1]);b.disabled=!actor;}
 $('#move-label').textContent=`同じ盤面・同じ入力 → (${direction[0]}, ${direction[1]}) の一手を比較`;
 results={};$('#results').replaceChildren();
 for(const mode of modes){
  const E=engines[mode],next=E.clone(state),trace=[],result=E.move(next,selected,...direction,{trace:t=>trace.push(t)});
  const preview=previews[mode].simulateSplit(state,selected,...direction);if(preview&&JSON.stringify(preview.state)!==JSON.stringify(next))throw Error('preview mismatch');
  results[mode]={state:next,result,trace};if(mode==='B-once'&&!$('#extra').checked)continue;
  const card=document.createElement('article');card.className='result-card';const h=document.createElement('h3');h.textContent=mode+' / '+names[mode];card.append(h);
  const desc=document.createElement('p');desc.className='description';desc.textContent=descriptions[mode];card.append(desc);
  const board=document.createElement('div');board.className='board';renderBoard(board,next);card.append(board);
  const status=document.createElement('p');status.textContent=result.ok?`分裂 ${result.events.filter(e=>e.type==='split').length}回 / 合体 ${result.events.filter(e=>e.type==='merge').length}回`:(reasons[result.reason]||result.reason);card.append(status);
  const count=document.createElement('p');count.textContent=`盤面の仲間 ${next.actors.length}体 / 段階合計 ${E.mass(next)}（救出済み含む）`;card.append(count);
  const take=document.createElement('button');take.textContent='この結果から続ける';take.disabled=!result.ok;take.onclick=()=>{state=E.clone(next);if(!state.actors.some(a=>a.id===selected))selected=state.actors[0]?.id;update();};card.append(take);$('#results').append(card);
 }
 $('#trace-step').value=0;showTrace();
}
function showTrace(){const mode=$('#trace-mode').value,r=results[mode],steps=[{kind:'before',actors:state.actors},...r.trace,{kind:r.result.ok?'result':'rollback',actors:r.state.actors}];const slider=$('#trace-step');slider.max=steps.length-1;const i=Math.min(Number(slider.value),steps.length-1),t=steps[i];slider.value=i;
 const label={before:'操作前',contact:'進入・落下を判定',reject:'進入を拒否', 'split-plan':'生成位置を選ぶ','split-born':'分裂体が生まれた',stable:'重力が安定',result:'処理後',rollback:'循環などにより操作前へ戻した',cycle:'同じ物理状態が再登場'}[t.kind]||t.kind;
 $('#trace-label').textContent=`${mode} / ${i+1} / ${steps.length}：${label}${t.reason?' — '+(reasons[t.reason]||t.reason):''}`;
 renderBoard($('#trace-board'),{...state,actors:t.actors});$('#trace-detail').textContent=JSON.stringify({kind:t.kind,id:t.id,from:t.from,to:t.to,direction:t.direction,levelBefore:t.levelBefore,count:t.count,families:t.families,reason:t.reason},null,2);
}
$('#scenario').onchange=reset;$('#reset').onclick=reset;$('#extra').onchange=update;$('#trace-mode').onchange=()=>{$('#trace-step').value=0;showTrace();};$('#trace-step').oninput=showTrace;
$('#trace-prev').onclick=()=>{$('#trace-step').value=Math.max(0,Number($('#trace-step').value)-1);showTrace();};$('#trace-next').onclick=()=>{$('#trace-step').value=Math.min(Number($('#trace-step').max),Number($('#trace-step').value)+1);showTrace();};
for(const row of data.stages){const tr=document.createElement('tr');for(const value of [row.number,row.A,row.B,row.C,`${row.oldB?'成立':'不成立'} / ${row.oldC?'成立':'不成立'}`]){const td=document.createElement('td');td.textContent=value;tr.append(td);}$('#impact-rows').append(tr);}
$('#audit-stats').textContent=`A/B/Cの${data.attempts.toLocaleString()}入力を監査。分裂を含む${data.previews.toLocaleString()}件で予告と実結果が一致。Bの循環検知は${data.cyclesB}件。A/Cは今回の監査では0件。15〜20面は「分裂なし」の到達状態を調べ尽くし、解答がないことを確認。`;
reset();
