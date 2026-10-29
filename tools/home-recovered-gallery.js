import {ART_CANDIDATES,ART_SCENES} from './home-recovered-manifest.mjs';
const $=id=>document.getElementById(id),wait=ms=>new Promise(r=>setTimeout(r,ms));
const formal=['dog/04.png','partners/forest_bear.png','companions/chameleon.png','companions/cat_friend.png','companions/bat.png','companions/parrot.png'];
for(const c of ART_CANDIDATES){
 const figure=document.createElement('figure');figure.className='card';figure.dataset.candidate=c.id;
 figure.innerHTML=`<div class="art"><img src="${c.src}" alt="${c.name}" loading="lazy"></div><div class="caption"><span class="badge">保存済み原画 · 動作試作</span><b>${c.name}</b><p>${c.note}</p><a href="${c.src}" target="_blank">背景を拡大</a> · <a href="#living" data-choose="${c.id}">動かしてみる</a></div>`;
 formal.forEach((f,i)=>{const img=document.createElement('img'),[x,y]=ART_SCENES[c.id].seats[i];img.src='assets/characters/'+f;img.alt=i?'正式な仲間':'正式な主役';img.className='sprite';img.hidden=true;const box=window.NaotocchiCastBounds?.['assets/characters/'+f]?.box||[0,0,128,128];img.style.cssText=`transform:translate(${-(box[0]+box[2])/2/128*100}%,${-box[3]/128*100}%);left:${x*100}%;top:${y*100}%;--size:${(i?12:20)*(.78+(y-.4)*.3)}%`;figure.querySelector('.art').append(img);});
 figure.querySelector('[data-choose]').onclick=()=>{$('candidateB').value=c.id;apply().catch(showError);};$('gallery').append(figure);
}
$('characters').onclick=()=>document.querySelectorAll('.sprite').forEach(n=>n.hidden=false);
$('clean').onclick=()=>document.querySelectorAll('.sprite').forEach(n=>n.hidden=true);
for(const id of ['candidateA','candidateB','beauty','fit']){$(id).innerHTML=(id==='beauty'||id==='fit'?'<option value="">未選択</option>':'')+ART_CANDIDATES.map(c=>`<option value="${c.id}">${c.name}</option>`).join('');}
$('candidateA').value='home-garden';$('candidateB').value='home-interior-a';
for(const id of ['beauty','fit']){const key='naotocchi-recovered-rating-'+id;try{$(id).value=localStorage.getItem(key)||'';}catch{}$(id).onchange=()=>{try{localStorage.setItem(key,$(id).value);}catch{}};}
const frames=[$('old'),$('new')];let applying=false,queued=false;
function showError(e){$('qaStatus').textContent=e.message;}
async function ready(f){for(let n=0;n<250;n++){if(f.contentWindow.HomeV22QA)return;await wait(40);}throw Error('ホームの読み込みに時間がかかっています');}
function measure(){for(let i=0;i<frames.length;i++){const e=frames[i].contentWindow.HomeV22QA?.environment(),expected=$(i?'candidateB':'candidateA').value;if(e?.error){showError(Error(e.error));return;}if(!e?.loaded||e.candidate!==expected){$('qaStatus').textContent='選んだ背景を読み込み中…';return;}}const ds=frames.map(f=>f.contentWindow.HomeV22QA.detail());$('metrics').textContent=JSON.stringify(ds,null,2);$('qaStatus').textContent=ds.map((d,i)=>`${i?'B':'A'}: ${d.actors.length}体 / 安全 ${d.actors.filter(a=>a.safe).length}体 / 通知 ${d.slots.homeEventSlot.height}px・会話 ${d.slots.speechSlot.height}px`).join(' ｜ ');return ds;}
async function apply(){
 if(applying){queued=true;return;}applying=true;$('apply').disabled=true;
 const ids=[$('candidateA').value,$('candidateB').value],width=$('width').value,count=Number($('count').value),time=$('time').value;
 try{for(let i=0;i<2;i++){
  const f=frames[i],c=ART_CANDIDATES.find(c=>c.id===ids[i]);f.style.width=width+'px';f.style.height='844px';
  f.previousElementSibling.textContent=`${i?'B':'A'} · ${c.name}`;
  if(f.dataset.candidate!==c.id){await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('ホームを読み込めませんでした')),20000);f.onload=()=>{clearTimeout(timer);resolve();};f.src='qa-recovered-game.html?candidate='+encodeURIComponent(c.id);});f.dataset.candidate=c.id;}
  await ready(f);await wait(150);f.contentWindow.HomeV22QA.scene(c.region,count,time);
  let loaded=false;for(let n=0;n<250;n++){const e=f.contentWindow.HomeV22QA.environment();if(e?.error)throw Error(e.error);if(e?.loaded&&e.candidate===c.id){loaded=true;break;}await wait(60);}if(!loaded)throw Error('背景の読み込みが完了しませんでした');
 }await wait(300);measure();}finally{applying=false;$('apply').disabled=false;if(queued){queued=false;apply().catch(showError);}}
}
$('apply').onclick=()=>apply().catch(showError);
for(const [id,a,b]of [['homes','home-garden','home-interior-a'],['forests','forest-no-waterfall','forest-waterfall']])$(id).onclick=()=>{$('candidateA').value=a;$('candidateB').value=b;apply().catch(showError);};
for(const [id,method]of [['live','live'],['freeze','freeze'],['speech','glyphs'],['map','map']])$(id).onclick=()=>{frames.forEach(f=>f.contentWindow.HomeV22QA?.[method]());setTimeout(measure,500);};
$('landscape').onclick=async()=>{frames.forEach(f=>{f.style.width='844px';f.style.height='390px';});await wait(1200);measure();};
$('portrait').onclick=async()=>{frames.forEach(f=>{f.style.width=$('width').value+'px';f.style.height='844px';});await wait(1200);measure();};
$('rotate').onclick=async()=>{frames.forEach(f=>{f.style.width='844px';f.style.height='390px';});await wait(700);frames.forEach(f=>{f.style.width=$('width').value+'px';f.style.height='844px';});await wait(800);measure();};
$('start').onclick=async()=>{try{const key='naotocchi-recovered-play-v1',c=ART_CANDIDATES.find(c=>c.id===$('candidateB').value);const old=localStorage.getItem(key),s=old?JSON.parse(old):await(await fetch('pilot-seed.json')).json();s.regionId=c.region;if(!old)s.lastSavedAt=s.savedAt=s.lastTickAt=Date.now();localStorage.setItem(key,JSON.stringify(s));location.href='recovered-play.html?candidate='+c.id;}catch(e){showError(e);}};
$('performance').onclick=async()=>{const button=$('performance');button.disabled=true;try{frames.forEach(f=>f.contentWindow.HomeV22QA.live());const samples=[];let last=performance.now();await new Promise(resolve=>{let done=false;const end=()=>{done=true;resolve();};setTimeout(end,5000);function tick(now){if(done)return;samples.push(now-last);last=now;if(samples.length<121)requestAnimationFrame(tick);else end();}requestAnimationFrame(tick);});samples.shift();samples.sort((a,b)=>a-b);const result={sampleCount:samples.length,medianMs:samples[Math.floor(samples.length*.5)],p95Ms:samples[Math.floor(samples.length*.95)],heapBytes:performance.memory?.usedJSHeapSize??null,scenes:frames.map(f=>f.contentWindow.HomeV22QA.environment()),note:'同時表示の参考値。iPhoneのGPUメモリ・発熱・電池は別途実機確認。'};$('metrics').textContent=JSON.stringify(result,null,2);$('metrics').parentElement.open=true;}finally{button.disabled=false;}};
async function boot(){const q=new URLSearchParams(location.search);if(q.has('characters'))$('characters').click();if(q.has('sheet')){document.body.classList.add('sheet');document.querySelectorAll('.art>img').forEach(n=>n.loading='eager');return;}if(q.has('capture'))document.body.classList.add('capture');for(const key of ['candidateA','candidateB','count','width','time'])if(q.has(key))$(key).value=q.get(key);const seed=await(await fetch('pilot-seed.json')).json();seed.lastSavedAt=seed.savedAt=seed.lastTickAt=Date.now();localStorage.setItem('naotocchi-recovered-qa-v1',JSON.stringify(seed));localStorage.setItem('naotocchi-recovered-qa-v1:home-guide-v1','done');await apply();}boot().catch(showError);
