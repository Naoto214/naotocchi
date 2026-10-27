const $=id=>document.getElementById(id),frame=$('game'),wait=ms=>new Promise(r=>setTimeout(r,ms));
async function boot(){const s=await(await fetch('pilot-seed.json')).json();s.regionId='forest';s.lastSavedAt=s.savedAt=s.lastTickAt=Date.now();const key='naotocchi-home-v19-qa-v1';localStorage.setItem(key,JSON.stringify(s));localStorage.setItem(key+':home-guide-v1','done');await new Promise(resolve=>{frame.onload=resolve;frame.src='qa-v19-game.html';});for(let i=0;i<200&&!frame.contentWindow.HomeV19QA;i++)await wait(50);await apply();}
async function apply(){$('apply').disabled=true;frame.style.width=$('width').value+'px';frame.style.height='844px';await wait(150);frame.contentWindow.HomeV19QA.scene($('region').value,Number($('count').value),$('time').value);await wait(1500);measure();$('apply').disabled=false;}
function measure(){const result=frame.contentWindow.HomeV19QA.detail();$('result').textContent=JSON.stringify(result,null,2);return result;}
$('apply').onclick=apply;$('measure').onclick=measure;$('live').onclick=()=>frame.contentWindow.HomeV19QA.live();$('freeze').onclick=()=>frame.contentWindow.HomeV19QA.freeze();$('glyphs').onclick=()=>frame.contentWindow.HomeV19QA.glyphs();$('rotate').onclick=async()=>{frame.style.width='844px';frame.style.height='390px';await wait(700);frame.style.width=$('width').value+'px';frame.style.height='844px';await wait(700);measure();};
boot();
function glyphCheck(){const d=frame.contentDocument,n=d.getElementById('speechText'),box=n.getBoundingClientRect(),r=d.createRange(),errors=[];let last=null;for(const t of n.childNodes){if(t.nodeType!==3)continue;for(let i=0;i<t.length;i++){r.setStart(t,i);r.setEnd(t,i+1);const q=r.getBoundingClientRect();if(q.width&&q.height){last={char:t.textContent[i],x:q.x,y:q.y,right:q.right,bottom:q.bottom};if(q.x<box.x-1||q.right>box.right+1||q.y<box.y-1||q.bottom>box.bottom+1)errors.push(last);}}}return {text:n.textContent,last,errors};}
async function run(){
 const rows=[],errors=[],rotations=[];$('run').disabled=true;
 for(const width of [320,375,390,430])for(const region of ['forest','river_lake','city'])for(const count of [1,28]){
  $('width').value=width;$('region').value=region;$('count').value=count;await apply();
  const qa=frame.contentWindow.HomeV19QA,initial=measure(),glyphs=[];
  for(const text of ['びょうきじゃないって！','いまのぼく、ちょっとできる子']){qa.sayText(text);await wait(100);glyphs.push(glyphCheck());}
  qa.prepare();const moved=qa.moveTest();await wait(1000);const after=qa.detail();qa.live();await wait(1000);const live=qa.detail();qa.freeze();
  const row={width,region,count,initial,after,live,moved,glyphs};rows.push(row);
  const pet0=initial.actors.find(a=>a.key.startsWith('pet:')),pet1=after.actors.find(a=>a.key.startsWith('pet:'));
  if(!moved||Math.hypot(pet1.x-pet0.x,pet1.y-pet0.y)<.2)errors.push({width,region,count,kind:'movement'});
  if(initial.region!==region||initial.actors.length!==count)errors.push({width,region,count,kind:'cast'});
  if(initial.actors.some(a=>!a.safe)||after.actors.some(a=>!a.safe)||live.actors.some(a=>!a.safe))errors.push({width,region,count,kind:'unsafe actor'});
  if(initial.slots.homeEventSlot.height!==42||initial.slots.speechSlot.height!==76)errors.push({width,region,count,kind:'slot'});
  if(glyphs.some(g=>g.errors.length||g.last?.char!==(g.text.endsWith('子')?'子':'！')))errors.push({width,region,count,kind:'glyph',glyphs});
  // Rotation is reported separately: v18's known WebKit 6px shift stays visible.
  frame.style.width='844px';frame.style.height='390px';await wait(350);frame.style.width=width+'px';frame.style.height='844px';await wait(350);
  const rotated=qa.detail();if(rotated.actors.some(a=>!a.safe))errors.push({width,region,count,kind:'rotation terrain'});rotations.push({width,region,count,dy:rotated.slots.castStage.y-initial.slots.castStage.y,noticeHeight:rotated.slots.homeEventSlot.height,speechHeight:rotated.slots.speechSlot.height});
 }
 const result={rows,errors,rotations};$('result').textContent=JSON.stringify(result,null,2);let raw=document.getElementById('rawReport');if(!raw){raw=document.createElement('script');raw.id='rawReport';raw.type='application/json';document.body.appendChild(raw);}raw.textContent=JSON.stringify(result);$('run').disabled=false;return result;
}
$('run').onclick=run;
