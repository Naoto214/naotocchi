const $=id=>document.getElementById(id),frame=$('game'),wait=ms=>new Promise(r=>setTimeout(r,ms));
async function boot(){const s=await(await fetch('pilot-seed.json')).json();s.regionId='forest';s.lastSavedAt=s.savedAt=s.lastTickAt=Date.now();const key='naotocchi-home-v21-qa-v1';localStorage.setItem(key,JSON.stringify(s));localStorage.setItem(key+':home-guide-v1','done');await new Promise(resolve=>{frame.onload=resolve;frame.src='qa-v21-game.html';});for(let i=0;i<200&&!frame.contentWindow.HomeV21QA;i++)await wait(50);await apply();}
async function apply(reset=false){$('apply').disabled=true;frame.style.width=$('width').value+'px';frame.style.height='844px';if(reset){await new Promise(resolve=>{frame.onload=resolve;frame.src='qa-v21-game.html?case='+Date.now();});for(let i=0;i<200&&!frame.contentWindow.HomeV21QA;i++)await wait(50);}await wait(150);frame.contentWindow.HomeV21QA.scene($('region').value,Number($('count').value),$('time').value);await wait(1500);measure();$('apply').disabled=false;}
function measure(){const result=frame.contentWindow.HomeV21QA.detail();$('result').textContent=JSON.stringify(result,null,2);return result;}
$('apply').onclick=()=>apply();$('measure').onclick=measure;$('live').onclick=()=>frame.contentWindow.HomeV21QA.live();$('freeze').onclick=()=>frame.contentWindow.HomeV21QA.freeze();$('glyphs').onclick=()=>frame.contentWindow.HomeV21QA.glyphs();$('rotate').onclick=async()=>{frame.style.width='844px';frame.style.height='390px';await wait(700);frame.style.width=$('width').value+'px';frame.style.height='844px';await wait(700);measure();};
boot();
function glyphCheck(){const d=frame.contentDocument,n=d.getElementById('speechText'),box=n.getBoundingClientRect(),r=d.createRange(),errors=[];let last=null;for(const t of n.childNodes){if(t.nodeType!==3)continue;for(let i=0;i<t.length;i++){r.setStart(t,i);r.setEnd(t,i+1);const q=r.getBoundingClientRect();if(q.width&&q.height){last={char:t.textContent[i],x:q.x,y:q.y,right:q.right,bottom:q.bottom};if(q.x<box.x-1||q.right>box.right+1||q.y<box.y-1||q.bottom>box.bottom+1)errors.push(last);}}}return {text:n.textContent,last,errors};}
async function run(){
 const rows=[],errors=[],rotations=[];$('run').disabled=true;
 for(const width of [320,375,390,430])for(const region of ['city'])for(const time of ['day','night'])for(const count of [1,3,6,28]){
  $('width').value=width;$('region').value=region;$('count').value=count;$('time').value=time;await apply(true);
  const qa=frame.contentWindow.HomeV21QA,initial=measure(),glyphs=[];
  for(const text of ['びょうきじゃないって！','いまのぼく、ちょっとできる子']){qa.sayText(text);await wait(100);glyphs.push(glyphCheck());}
  qa.prepare();const moved=qa.moveTest();await wait(1000);const after=qa.detail();qa.live();await wait(1000);const live=qa.detail();qa.freeze();
  const row={width,region,time,count,initial,after,live,moved,glyphs};rows.push(row);$('run').textContent='検証中 '+rows.length+'/32';$('run').dataset.completed=String(rows.length);
  const pet0=initial.actors.find(a=>a.key.startsWith('pet:')),pet1=after.actors.find(a=>a.key.startsWith('pet:'));
  if(!moved||Math.hypot(pet1.x-pet0.x,pet1.y-pet0.y)<.2)errors.push({width,region,count,kind:'movement'});
  if(initial.region!==region||initial.actors.length!==count)errors.push({width,region,count,kind:'cast'});
  if(initial.actors.some(a=>!a.safe)||after.actors.some(a=>!a.safe)||live.actors.some(a=>!a.safe))errors.push({width,region,count,kind:'unsafe actor'});
  if(initial.slots.homeEventSlot.height!==42||initial.slots.speechSlot.height!==76)errors.push({width,region,count,kind:'slot'});
  if(glyphs.some(g=>g.errors.length||g.last?.char!==(g.text.endsWith('子')?'子':'！')))errors.push({width,region,count,kind:'glyph',glyphs});
  // Strict candidate rotation: fixed header minimum must eliminate the old 6px shift.
  frame.style.width='844px';frame.style.height='390px';await wait(350);frame.style.width=width+'px';frame.style.height='844px';await wait(350);
  const rotated=qa.detail();if(Math.abs(rotated.slots.castStage.y-initial.slots.castStage.y)>1)errors.push({width,region,count,kind:'rotation layout'});if(rotated.actors.some(a=>!a.safe))errors.push({width,region,count,kind:'rotation terrain'});rotations.push({width,region,count,dy:rotated.slots.castStage.y-initial.slots.castStage.y,noticeHeight:rotated.slots.homeEventSlot.height,speechHeight:rotated.slots.speechSlot.height});let partial=document.getElementById('partialReport');if(!partial){partial=document.createElement('script');partial.id='partialReport';partial.type='application/json';document.body.append(partial);}partial.textContent=JSON.stringify({rows,errors,rotations});
 }
 const result={rows,errors,rotations};$('result').textContent=JSON.stringify(result,null,2);let raw=document.getElementById('rawReport');if(!raw){raw=document.createElement('script');raw.id='rawReport';raw.type='application/json';document.body.appendChild(raw);}raw.textContent=JSON.stringify(result);$('run').disabled=false;return result;
}
$('run').onclick=()=>run().catch(e=>{const raw=document.createElement('pre');raw.id='rawReport';raw.textContent=JSON.stringify({fatal:String(e.stack||e)});document.body.append(raw);$('run').disabled=false;});
