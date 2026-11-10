import {paintGate} from './ref/prototypes/naopoyo-shared/gate-design.mjs';
import {paintTile} from './tile-art.mjs';
import {drawBoard as drawFormal} from './ref/prototypes/naopoyo-time-hand-chapter1/draw.mjs';
import {drawBoard as drawCastle} from './ref/prototypes/naopoyo-castle-forest/draw.mjs';
import {stages as formalStages} from './ref/prototypes/naopoyo-time-hand-chapter1/stages.mjs';
import {stages as castleStages} from './ref/prototypes/naopoyo-castle-forest/stages.mjs';
import {createState} from './ref/prototypes/naopoyo-time-hand-chapter1/engine.mjs';
import {createCastleState,syncTerrain} from './ref/prototypes/naopoyo-castle-forest/runtime.mjs';
import {loadMechanismArt} from './ref/prototypes/naopoyo-castle-forest/mechanism-art.mjs';
import {loadSprites} from './ref/prototypes/naopoyo-rescue/sprites.mjs';
import {stages as worldStages} from './ref/prototypes/naopoyo-world/stages.mjs';
import {WorldSession} from './ref/prototypes/naopoyo-world/session.mjs';
import {render as drawWorld} from './ref/prototypes/naopoyo-world/render.mjs';
const $=s=>document.querySelector(s), esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const [registry,data,v1]=await Promise.all(['catalog.json','candidates.json','v1/atlas.json'].map(x=>fetch(x).then(r=>{if(!r.ok)throw Error(x);return r.json()})));
const entries=registry.entries, images={}, crop=document.createElement('canvas'), base=document.createElement('canvas');
let active=entries[0],running=false,tick=0,discovered=false,reference=null,lastFrame=0;
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const imgPaths={gravity:'./ref/prototypes/naopoyo-time-hand-chapter1/assets/gravity-wood-approved.webp',owl:'./ref/assets/characters/companions/owl.png',forest_bear:'./ref/assets/characters/partners/forest_bear.png',otter:'./ref/assets/characters/companions/otter.png',squirrel:'./ref/assets/characters/companions/squirrel.png',penguin_friend:'./ref/assets/characters/companions/penguin_friend.png'};
const failures=[];
await Promise.all(Object.entries(imgPaths).map(([k,p])=>new Promise(resolve=>{let i=new Image();i.onload=()=>{images[k]=i;resolve()};i.onerror=()=>{failures.push(p);resolve()};i.src=p})));
failures.push(...await loadSprites(),...await loadMechanismArt());
const categories=[...new Set(entries.map(x=>x.category))];$('#category').innerHTML=categories.map(x=>`<option>${esc(x)}</option>`).join('');
$('#chapter').innerHTML=data.chapters.map((x,i)=>`<option value="${i+1}">第${i+1}章 ${esc(x)}</option>`).join('');
function pickReference(e){
 let kind=e.image.current;
 if(['otter','squirrel','penguin_friend'].includes(kind))return {asset:kind,label:'正式キャラクター原画像。パズル能力は未実装。'};
 if(kind==='none')return null;
 if(kind.startsWith('world')){const s=worldStages.find(s=>kind==='worldBeam'?s.events.some(e=>e.kind==='beam'):s.water?.length);if(!s)return null;return {world:s,xy:kind==='worldBeam'?s.events.find(e=>e.kind==='beam').cells[0]:s.water[0],label:'旧World試作の実描画（正式章には未導入）'};}
 if(kind==='gravity')return {formal:formalStages[5],xy:[0,7],label:'正式第1章の重力看板・原画像維持'};
 if(kind==='spike'){const s=formalStages[1];return {formal:s,xy:[s.board.spikes[0].x,s.board.spikes[0].y],label:'正式第1章02の描画関数'};}
 if(kind==='exit'){const s=formalStages[4];return {formal:s,xy:[s.board.exits[0].x,s.board.exits[0].y],label:'正式第1章05の出口描画'};}
 if(kind==='terrain'){const s=e.id==='terrain.floor'?formalStages[0]:formalStages.find(x=>x.board.walls.length);return {formal:s,xy:e.id==='terrain.floor'?[3,2]:s.board.walls[0],label:'正式第1章01の地形描画'};}
 let s,pos;
 for(const st of castleStages){const b=st.board,m=b.mechanisms;
 if(kind==='gate')pos=b.gates[0];
 if(kind==='plate')pos=m.plates?.find(p=>p.hold);
 if(kind==='weight')pos=m.plates?.find(p=>p.exact||p.weight>1);
 if(kind==='latch')pos=m.plates?.find(p=>!p.hold&&!p.exact);
 if(kind==='sequence'&&m.sequence)pos=m.plates?.[0];
 if(kind==='door')pos=m.doors?.[0];
 if(kind==='platform')pos=m.platforms?.[0];
 if(kind==='crumble')pos=m.floors?.[0];
 if(kind==='boulder')pos=m.boulders?.[0];
 if(kind==='owl')pos=m.owl;
 if(kind==='bear')pos=m.bear;
 if(kind==='terrainLamp'&&st.number<18){let p=b.walls.find(([x,y])=>(x+y)%4===1);if(p)pos={x:p[0],y:p[1]};}
 if(kind==='terrainTree'&&st.number>=18){let p=b.walls.find(([x,y])=>(x+y)%3===0);if(p)pos={x:p[0],y:p[1]};}
 if(pos){s=st;break;}
 }
 return s?{castle:s,xy:[pos.x,pos.y],label:`第2章V2 ${s.number}面・現行関数をそのまま実行`}:null;
}
function renderSource(){
 const target=$('#scratch'),on=Number($('#state').value),ref=reference;
 if(!ref){base.width=384;base.height=384;let c=base.getContext('2d');for(let y=0;y<8;y++)for(let x=0;x<8;x++){c.save();c.translate(x*48,y*48);c.scale(48,48);paintTile(c,'terrain.floor');c.restore();}crop.width=96;crop.height=96;return;}
 if(ref.asset){base.width=384;base.height=384;const c=base.getContext('2d');c.clearRect(0,0,384,384);c.drawImage(images[ref.asset],0,0,384,384);crop.width=96;crop.height=96;crop.getContext('2d').drawImage(images[ref.asset],0,0,96,96);return;}
 if(ref.world){const q=new WorldSession(ref.world);q.time=on?2600:0;drawWorld(target,q,{dpr:2,rows:8});}
 else{let s=ref.castle?createCastleState(ref.castle.board):createState(ref.formal.board);
 // State showcase only. No move command or new gameplay is run.
 if(ref.castle&&on){for(const p of s.mechanisms.plates||[]){s.flags[p.id]=true;s.flags[p.id+'Held']=true;}Object.assign(s.flags,{sequence:true,owlHelp:true,bearHelp:true});s.collapsed=(s.mechanisms.floors||[]).map(x=>x.id);syncTerrain(s);}
 (ref.castle?drawCastle:drawFormal)(target,s,{stage:ref.castle||ref.formal,gravitySign:images.gravity,reduced:true,now:0});}
 base.width=target.width;base.height=target.height;base.getContext('2d').drawImage(target,0,0);crop.width=96;crop.height=96;const unit=base.width/8;crop.getContext('2d').drawImage(base,ref.xy[0]*unit,ref.xy[1]*unit,unit,unit,0,0,96,96);
}
function paint(canvas,e=active,unknown=false){const size=canvas.id==='size36'?72:canvas.id==='size48'?96:256;canvas.width=size;canvas.height=size;let c=canvas.getContext('2d');c.clearRect(0,0,size,size);
 if(unknown){c.fillStyle='#ced9d0';c.beginPath();c.roundRect(size*.2,size*.2,size*.6,size*.6,size*.15);c.fill();c.fillStyle='#71867c';c.font=`${size*.15}px sans-serif`;c.textAlign='center';c.fillText('???',size/2,size*.56);return;}
 if(canvas.dataset.book&&e.id==='fixture.gate'){c.scale(size,size);paintGate(c,{x:0,y:0,exact:2});return;}
 if(e.id===active.id&&e.designClass==='A'&&reference){c.drawImage(crop,0,0,size,size);return;}
 c.fillStyle='#627c80';c.fillRect(0,0,size,size);c.scale(size,size);paintTile(c,e.id,{phase:Number($('#state').value),time:tick,images,mask:0});}
function drawBoards(){const before=$('#before-board'),after=$('#after-board');before.width=after.width=768;before.height=after.height=768;before.getContext('2d').drawImage(base,0,0,768,768);let c=after.getContext('2d');c.drawImage(base,0,0,768,768);
 if(reference?.asset){$('#board-caption').textContent='原画像比較。現行のパズル能力は存在しないため、右は展示用8×8に配置。';c.fillStyle='#627c80';c.fillRect(0,0,768,768);}
 let cells=reference?.xy?[reference.xy]:[[3,3]];
 if(['water','air','ice'].includes(active.connectivity.family)&&!reference?.xy)cells=Array.from({length:6},(_,i)=>[i+1,4]);
 if(!reference||active.designClass!=='A')for(const [x,y]of cells){c.save();c.translate(x*96,y*96);c.scale(96,96);if(active.layer!=='medium')paintTile(c,'terrain.floor');paintTile(c,active.id,{phase:Number($('#state').value),time:tick,images,mask:10});c.restore();}
 c.strokeStyle='#f4de9a';c.lineWidth=2;for(const[x,y]of cells)c.strokeRect(x*96+2,y*96+2,92,92);
}
function repaint(){paint($('#proposal'));paint($('#size36'));paint($('#size48'));drawBoards();}
function selectTile(){active=entries.find(x=>x.id===$('#tile').value);reference=pickReference(active);renderSource();let c=$('#original');c.width=256;c.height=256;let ctx=c.getContext('2d');ctx.clearRect(0,0,256,256);if(reference)ctx.drawImage(crop,0,0,256,256);else{ctx.fillStyle='#64776d';ctx.font='19px sans-serif';ctx.textAlign='center';ctx.fillText('現行未実装',128,135);}
 $('#current-caption').textContent=reference?.label||'現行の画像を捏造せず、未実装として扱います。';
 const vid=active.image.v1,v=v1.items.find(x=>x.id===vid&&x.decision==='推奨');$('#v1-art').hidden=!v;if(v)$('#v1-art').src=`v1/art/${vid}-a-${$('#state').value}.svg`;$('#v1-caption').textContent=v?'V1のSVG原本（木と石案）':'V1に独立した図案なし';
 $('#proposal-caption').textContent=active.designClass==='A'?'現行維持。現行の同じ描画を再利用。':'余計な枠を加えず、輪郭・陰影・状態差を調整した案。';
 $('#tile-note').textContent=`${active.name} · ${active.designClass} ${ {A:'現行維持',B:'デザイン改善',C:'仕組みから再検討'}[active.designClass]} ／ ${active.implementation}。${active.description}`;
 $('#board-caption').textContent=reference?.xy?`${reference.label}。黄色枠は比較箇所を示す資料用表示。作動後は状態見本で、解法再生ではありません。`:'未実装素材の展示用8×8。配置・連結の見え方だけを示し、遊べる面ではありません。';
 $('#status').textContent=failures.length?`画像読込失敗 ${failures.length}件`:'本編の保存データは読み書きしません';
 $('#details').innerHTML='<dl>'+Object.entries({ID:active.id,表示単位:'1×1',レイヤー:active.layer,連結:JSON.stringify(active.connectivity),動作範囲:active.actionRange,作動:active.trigger,状態:active.states.join('／'),発見条件:JSON.stringify(active.discovery),将来配置:active.editor.eligible?'検証後の候補（今回は未実装）':active.editor.reason,初登場:active.firstAppearance?`${active.firstAppearance}面 · ${active.firstAppearanceStatus}`:'保留・未割当',現行対応:reference?.label||'なし'}).map(([k,v])=>`<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')+'</dl>';repaint();}
function category(){const xs=entries.filter(e=>e.category===$('#category').value);$('#tile').innerHTML=xs.map(e=>`<option value="${e.id}">${esc(e.name)}</option>`).join('');selectTile();}
function book(){const xs=entries.filter(e=>e.implementation!=='保留');$('#book-grid').innerHTML=xs.map(e=>`<article><canvas data-book="${e.id}" aria-label="${discovered?esc(e.name):'未発見の見本'}"></canvas><h3>${discovered?esc(e.name):'？？？'}</h3><p>${discovered?esc(e.description):'出会うと名前と説明が見られます。'}</p><p class="dim">${discovered?'初遭遇：'+(e.firstAppearance?`${e.firstAppearance}面（表示例）`:'未定'):'未発見'}</p></article>`).join('');const keep=active;document.querySelectorAll('[data-book]').forEach(c=>{const e=entries.find(e=>e.id===c.dataset.book);if(discovered&&e.designClass==='A'){active=e;reference=pickReference(e);renderSource();}paint(c,e,!discovered);});active=keep;reference=pickReference(active);renderSource();}
function plan(){const ch=Number($('#chapter').value),names=Object.fromEntries(data.items.map(g=>[g.id,g.name]));$('#stages').innerHTML=data.stages.filter(s=>s.chapter===ch).map(s=>`<article><span class="number">${String(s.number).padStart(2,'0')}</span><h3>${esc(s.title)}</h3><span class="badge">${esc(s.status)}</span><dl><dt>主／補助</dt><dd>${esc(names[s.main])} ／ ${s.support.map(x=>esc(names[x])).join('・')}</dd><dt>学ぶこと・発想</dt><dd>${esc(s.learn)}。${esc(s.insight)}</dd><dt>解法の違い</dt><dd>${esc(s.difference)}</dd><dt>難度・イベント</dt><dd>${esc(s.difficulty)} ／ ${esc(s.event)}</dd><dt>V2変更</dt><dd>${esc(s.changeV2)}</dd></dl></article>`).join('');}
function candidates(){const xs=data.items.filter(g=>($('#decision').value==='すべて'||g.decision===$('#decision').value)&&($('#review').value==='すべて'||g.designClass===$('#review').value));$('#candidate-count').textContent=`${xs.length}件表示 ／ 推奨41・保留16・不採用7 ／ A8・B11・C45`;
 $('#candidates').innerHTML=xs.map(g=>`<article><span class="badge">${g.decision} · ${g.designClass}</span><h3>${esc(g.name)}</h3><p>${esc(g.rule)}</p><p>${esc(g.designReason)}</p><details><summary>操作・独自性・実装状況</summary><p>${esc(g.input)}</p><p>${esc(g.relations)}</p><p>${esc(g.implementation)}</p></details></article>`).join('');}
$('#category').onchange=category;$('#tile').onchange=selectTile;$('#state').onchange=selectTile;$('#chapter').onchange=plan;$('#decision').onchange=candidates;$('#review').onchange=candidates;
$('#animate').onclick=()=>{running=!running;$('#animate').setAttribute('aria-pressed',String(running));$('#animate').textContent=running?'動きを止める':'動きを見る';if(running)requestAnimationFrame(frame)};
function frame(now){if(!running)return;if(now-lastFrame>80){tick=now/900;repaint();lastFrame=now}requestAnimationFrame(frame)}
if(reduced){$('#animate').textContent='動きを見る（任意）';}
$('#reveal').onclick=()=>{discovered=!discovered;$('#reveal').setAttribute('aria-pressed',String(discovered));$('#reveal').textContent=discovered?'未発見の見本に戻す':'発見済みの見本に切り替える';book();};
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-view]').forEach(x=>x.classList.toggle('active',x===b));for(const id of ['compare','book','plan','design'])$('#'+id).hidden=id!==b.dataset.view;if(b.dataset.view==='book')book();});
category();plan();candidates();
