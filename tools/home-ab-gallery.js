import {artTransform} from './home-art-navigation.mjs';
import {ART_CANDIDATES,ART_SCENES} from './home-ab-manifest.mjs';
const $=id=>document.getElementById(id),wait=ms=>new Promise(r=>setTimeout(r,ms));
const formal=['dog/04.png','partners/forest_bear.png','companions/chameleon.png','companions/cat_friend.png','companions/bat.png','companions/parrot.png'];
for(const id of ['candidateA','candidateB','beauty','fit']){$(id).innerHTML=(id==='beauty'||id==='fit'?'<option value="">未選択</option>':'')+ART_CANDIDATES.map(c=>`<option value="${c.id}">${c.name}</option>`).join('');}
$('candidateA').value='home-interior-a';$('candidateB').value='home-interior-b';
for(const id of ['beauty','fit']){const key='naotocchi-home-ab-rating-'+id;try{$(id).value=localStorage.getItem(key)||'';}catch{}$(id).onchange=()=>{try{localStorage.setItem(key,$(id).value);}catch{}};}
const frames=[$('old'),$('new')];let applying=false,queued=false,applied=null;
function setBusy(disabled){for(const id of ['apply','candidateA','candidateB','count','width','time','staticCount','homes','landscape','portrait','rotate','live','freeze','speech','map','performance','start'])$(id).disabled=disabled;}
async function viewAction(action){if(applying)return;applying=true;setBusy(true);try{await action();}finally{applying=false;setBusy(false);if(queued){queued=false;apply().catch(showError);}}}
function showError(e){$('qaStatus').textContent=e.message;}
async function ready(f){for(let n=0;n<250;n++){if(f.contentWindow.HomeV22QA?.environment())return;await wait(40);}throw Error('ホームの読み込みに時間がかかっています');}
function measure(){for(let i=0;i<frames.length;i++){const e=frames[i].contentWindow.HomeV22QA?.environment(),expected=$(i?'candidateB':'candidateA').value;if(e?.error){showError(Error(e.error));return;}if(!e?.loaded||e.candidate!==expected){$('qaStatus').textContent='選んだ背景を読み込み中…';return;}}const ds=frames.map(f=>f.contentWindow.HomeV22QA.detail());$('metrics').textContent=JSON.stringify(ds,null,2);$('qaStatus').textContent=ds.map((d,i)=>`${i?'B':'A'}: ${d.actors.length}体 / 安全 ${d.actors.filter(a=>a.safe).length}体 / 通知 ${d.slots.homeEventSlot.height}px・会話 ${d.slots.speechSlot.height}px`).join(' ｜ ');return ds;}
async function apply(){
 if(applying){queued=true;return;}applying=true;setBusy(true);
 const ids=[$('candidateA').value,$('candidateB').value],width=$('width').value,count=Number($('count').value),time=$('time').value,staticCount=Number($('staticCount').value);
 try{for(let i=0;i<2;i++){
  const f=frames[i],c=ART_CANDIDATES.find(c=>c.id===ids[i]);f.style.width=width+'px';f.style.height='844px';
  f.previousElementSibling.textContent=`${i?'B':'A'} · ${c.name}`;
  if(f.dataset.candidate!==c.id){await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('ホームを読み込めませんでした')),20000);f.onload=()=>{clearTimeout(timer);resolve();};f.src='qa-home-ab-'+(i?'b':'a')+'-game.html?candidate='+encodeURIComponent(c.id);});f.dataset.candidate=c.id;}
  await ready(f);await wait(150);f.contentWindow.HomeV22QA.scene(c.region,count,time);
  let loaded=false;for(let n=0;n<250;n++){const e=f.contentWindow.HomeV22QA.environment();if(e?.error)throw Error(e.error);if(e?.loaded&&e.candidate===c.id){loaded=true;break;}await wait(60);}if(!loaded)throw Error('背景の読み込みが完了しませんでした');
 }await wait(300);measure();applied={ids,width,count:staticCount?count:0};await drawStatic(applied);}finally{applying=false;setBusy(false);if(queued){queued=false;apply().catch(showError);}}
}
$('apply').onclick=()=>apply().catch(showError);
for(const [id,a,b]of [['homes','home-interior-a','home-interior-b']])$(id).onclick=()=>{$('candidateA').value=a;$('candidateB').value=b;apply().catch(showError);};
for(const [id,method]of [['live','live'],['freeze','freeze'],['speech','glyphs'],['map','map']])$(id).onclick=()=>{frames.forEach(f=>f.contentWindow.HomeV22QA?.[method]());setTimeout(measure,500);};
$('landscape').onclick=()=>viewAction(async()=>{frames.forEach(f=>{f.style.width='844px';f.style.height='390px';});await wait(1200);measure();}).catch(showError);
$('portrait').onclick=()=>viewAction(async()=>{frames.forEach(f=>{f.style.width=$('width').value+'px';f.style.height='844px';});await wait(1200);measure();}).catch(showError);
$('rotate').onclick=()=>viewAction(async()=>{frames.forEach(f=>{f.style.width='844px';f.style.height='390px';});await wait(700);frames.forEach(f=>{f.style.width=$('width').value+'px';f.style.height='844px';});await wait(800);measure();}).catch(showError);
$('start').onclick=async()=>{try{const key='naotocchi-home-ab-play-v1',c=ART_CANDIDATES.find(c=>c.id===$('candidateB').value);const old=localStorage.getItem(key),s=old?JSON.parse(old):await(await fetch('pilot-seed.json')).json();s.regionId=c.region;if(!old)s.lastSavedAt=s.savedAt=s.lastTickAt=Date.now();localStorage.setItem(key,JSON.stringify(s));location.href='home-ab-play.html?candidate='+c.id;}catch(e){showError(e);}};
$('performance').onclick=async()=>{const button=$('performance');button.disabled=true;try{frames.forEach(f=>f.contentWindow.HomeV22QA.live());const samples=[];let last=performance.now();await new Promise(resolve=>{let done=false;const end=()=>{done=true;resolve();};setTimeout(end,5000);function tick(now){if(done)return;samples.push(now-last);last=now;if(samples.length<121)requestAnimationFrame(tick);else end();}requestAnimationFrame(tick);});samples.shift();samples.sort((a,b)=>a-b);const result={sampleCount:samples.length,medianMs:samples[Math.floor(samples.length*.5)],p95Ms:samples[Math.floor(samples.length*.95)],heapBytes:performance.memory?.usedJSHeapSize??null,scenes:frames.map(f=>f.contentWindow.HomeV22QA.environment()),note:'同時表示の参考値。iPhoneのGPUメモリ・発熱・電池は別途実機確認。'};$('metrics').textContent=JSON.stringify(result,null,2);$('metrics').parentElement.open=true;}finally{button.disabled=false;}};

async function drawStatic(snapshot){
 const {ids,count}=snapshot,width=Number(snapshot.width);
 for(let i=0;i<2;i++){
  const candidate=ART_CANDIDATES.find(c=>c.id===ids[i]),f=frames[i],d=f.contentDocument,qa=f.contentWindow.HomeV22QA;
  const canvas=$(i?'staticB':'staticA'),ctx=canvas.getContext('2d');canvas.width=width;canvas.height=width*1.5;
  const bg=new Image();bg.src=candidate.src;await bg.decode();ctx.drawImage(bg,0,0,canvas.width,canvas.height);
  if(count){
   const host=d.querySelector('.home-living-world').getBoundingClientRect(),stage=d.getElementById('castStage').getBoundingClientRect();
   const t=artTransform(host,{left:stage.left-host.left,top:stage.top-host.top,width:stage.width,height:stage.height}),scale=width/t.width;
   const actors=qa.detail().actors.slice().sort((a,b)=>a.y-b.y);
   for(const a of actors){
    const owner=[...d.querySelectorAll('[data-diorama-actor]')].find(n=>n.dataset.dioramaActor===a.key);
    const img=owner?.querySelector('img.character-asset');if(!img)throw Error('正式画像が見つかりません: '+a.key);await img.decode();
    const r=img.getBoundingClientRect(),x=(r.left-host.left-t.left)*scale,y=(r.top-host.top-t.top)*scale;
    const foot=qa.inspect().scene.navigation.unproject(a);ctx.save();ctx.fillStyle='rgba(28,35,24,.24)';ctx.filter='blur(1px)';ctx.beginPath();ctx.ellipse(foot.x*width,foot.z*width*1.5,Math.max(7,a.w*.36*a.scale*scale),3.1*scale,0,0,Math.PI*2);ctx.fill();ctx.restore();
    // The raster is the official unchanged PNG, using the runtime's placement and scale.
    ctx.save();if(Number(f.contentWindow.getComputedStyle(owner).getPropertyValue('--diorama-facing'))<0){ctx.translate(x+r.width*scale,y);ctx.scale(-1,1);ctx.drawImage(img,0,0,r.width*scale,r.height*scale);}else ctx.drawImage(img,x,y,r.width*scale,r.height*scale);ctx.restore();
   }
   ctx.save();ctx.beginPath();for(const poly of ART_SCENES[candidate.id].foreground){poly.forEach(([x,y],n)=>n?ctx.lineTo(x*width,y*canvas.height):ctx.moveTo(x*width,y*canvas.height));ctx.closePath();}ctx.clip();ctx.drawImage(bg,0,0,canvas.width,canvas.height);ctx.restore();
  }
  canvas.dataset.count=String(count);canvas.dataset.candidate=candidate.id;
  const link=$(i?'downloadB':'downloadA');link.href=canvas.toDataURL('image/png');link.download=candidate.id+'-'+width+'-'+count+'.png';
 }
}
$('staticCount').onchange=()=>{if(Number($('staticCount').value)){$('count').value=$('staticCount').value;apply().catch(showError);}else if(applied)drawStatic({...applied,count:0}).catch(showError);};
$('count').onchange=()=>{if($('staticCount').value!=='0')$('staticCount').value=$('count').value;};
$('viewA').onclick=()=>{$('old').parentElement.classList.remove('inactive');$('new').parentElement.classList.add('inactive');};
$('viewB').onclick=()=>{$('old').parentElement.classList.add('inactive');$('new').parentElement.classList.remove('inactive');};
$('viewBoth').onclick=()=>frames.forEach(f=>f.parentElement.classList.remove('inactive'));
async function boot(){
 const q=new URLSearchParams(location.search);for(const key of ['candidateA','candidateB','count','width','time','staticCount'])if(q.has(key))$(key).value=q.get(key);
 if(q.has('sheet'))document.body.classList.add('sheet');if(q.has('capture'))document.body.classList.add('capture');
 if(!q.has('width')&&innerWidth<430)$('width').value=String([320,375,390,430].filter(w=>w<=innerWidth).at(-1)||320);
 if(q.has('staticCount')&&Number(q.get('staticCount'))) $('count').value=q.get('staticCount');
 const seed=await(await fetch('pilot-seed.json')).json();seed.lastSavedAt=seed.savedAt=seed.lastTickAt=Date.now();
 for(const side of ['a','b']){const key='naotocchi-home-ab-'+side+'-qa-v1';localStorage.setItem(key,JSON.stringify(seed));localStorage.setItem(key+':home-guide-v1','done');}
 await apply();
 if(innerWidth<650&&!q.has('capture')&&!q.has('sheet'))$('viewA').click();
}
boot().catch(showError);
