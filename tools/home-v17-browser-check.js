const $=id=>document.getElementById(id),frame=$('game'),wait=ms=>new Promise(r=>setTimeout(r,ms));
const texts=['あくびの途中でねた','なでられて、目を細めた','ねる向きだけ決めた','もうむり。ねる','あくびに返事とられた','ほこりにも引っ越してもらった','それいらない！ほんとに！'];
let result={rows:[],errors:[]};
async function boot(){
 try{frame.contentWindow.HomeV16QA?.dispose();}catch(_){}
 const s=await(await fetch('pilot-seed.json')).json(),m=NAOTOCCHI_CHARACTER_WORLD_MASTER_V1;
 s.companions=[...m.companions.normal,...m.companions.rare].map(c=>({id:c.id,bond:85}));const p=m.partners.find(p=>p.id==='forest_bear');s.partner={...p,gender:'male',orientationId:'bi',label:p.name||p.label,affection:80,married:true,bondCount:3};s.regionId='forest';s.lastSavedAt=s.savedAt=s.lastTickAt=Date.now();s.lifetime.saveRevision=1;
 const key='naotocchi-home-v15-qa-v1';for(const k of [key,key+'-backup',key+'-snaps'])localStorage.removeItem(k);localStorage.setItem(key,JSON.stringify(s));localStorage.setItem(key+':home-guide-v1','done');
 frame.style.width=$('width').value+'px';frame.style.height=$('height').value+'px';await new Promise(resolve=>{frame.onload=resolve;frame.src=$('version').value+'?v17qa='+Date.now();});
 for(let i=0;i<200;i++){await wait(50);if(frame.contentWindow.HomeV17QA)break;}await frame.contentDocument.fonts.ready;await wait(500);frame.contentWindow.HomeV17QA.prepare();
}
function ranges(n){const d=n.ownerDocument,w=d.defaultView,walker=d.createTreeWalker(n,NodeFilter.SHOW_TEXT),rows=[];let t;while(t=walker.nextNode()){if(!t.parentElement.getClientRects().length||w.getComputedStyle(t.parentElement).visibility==='hidden')continue;for(let i=0;i<t.length;i++){const r=d.createRange();r.setStart(t,i);r.setEnd(t,i+1);const b=r.getBoundingClientRect();if(b.width&&b.height)rows.push({char:t.textContent[i],x:b.x,y:b.y,right:b.right,bottom:b.bottom});}}return rows;}
function inspect(){const d=frame.contentDocument,w=d.defaultView,rect=n=>n.getBoundingClientRect().toJSON(),ids=['homeEventSlot','castStage','speechSlot','careMeters','careActions'];return {width:frame.clientWidth,height:frame.clientHeight,slots:Object.fromEntries(ids.map(id=>[id,rect(d.getElementById(id))])),actors:d.querySelectorAll('[data-diorama-actor]').length,panels:['speechBubble','speechText','speechSpeaker','speechChoices','individualityDialog','individualityText','homeChoiceResult','homeChoiceText','message','storyFlash','storyFlashText'].map(id=>{const n=d.getElementById(id);if(!n)return{id,missing:true};return {id,text:n.textContent,visible:!!n.getClientRects().length&&w.getComputedStyle(n).visibility!=='hidden',rect:rect(n),font:w.getComputedStyle(n).fontSize,clientHeight:n.clientHeight,scrollHeight:n.scrollHeight,clientWidth:n.clientWidth,scrollWidth:n.scrollWidth,scrollTop:n.scrollTop,kind:n.dataset.kind,speakerId:n.dataset.speakerId,label:n.dataset.label,style:n.getAttribute('style'),images:[...n.querySelectorAll('img')].map(i=>i.getAttribute('src')),glyphs:ranges(n)};})};}
function report(label){const m=inspect();$('report').textContent=JSON.stringify({label,...m},null,2);return m;}
const actions=Object.fromEntries(texts.map((t,i)=>['短文'+(i+1),()=>frame.contentWindow.HomeV17QA.named(t)]));Object.assign(actions,{'長文':()=>frame.contentWindow.HomeV17QA.long(),'絵文字':()=>frame.contentWindow.HomeV17QA.named('おやすみ 🌙✨ またあした！'),'仲間発言':()=>frame.contentWindow.HomeV17QA.named('いっしょに歩こう','companion'),'恋人発言':()=>frame.contentWindow.HomeV17QA.named('いっしょに歩こう','partner'),'通知長文':()=>frame.contentWindow.HomeV17QA.noticeEnglish(),'返答':async()=>{frame.contentWindow.HomeV17QA.questionTwo();await wait(50);frame.contentDocument.querySelector('.speech-choice').click();await wait(400);},'英語':()=>frame.contentWindow.HomeV17QA.english(),'2択':()=>frame.contentWindow.HomeV17QA.questionTwo(),'3択長文':()=>frame.contentWindow.HomeV17QA.questionLong(),'仲間質問':()=>frame.contentWindow.HomeV17QA.exchange(),'Reaction':()=>frame.contentWindow.HomeV17QA.reaction(),'長い名前':()=>frame.contentWindow.HomeV17QA.longName(),'通知':()=>frame.contentWindow.HomeV17QA.noticeText(texts[0]),'主役Reaction通知':()=>frame.contentWindow.HomeV17QA.storyPet(),'計測':()=>{}});
for(const [name,fn]of Object.entries(actions)){const b=document.createElement('button');b.textContent=name;b.onclick=async()=>{await fn();if(name==='返答'||name.includes('択'))frame.contentWindow.HomeV17QA.holdFrame();await wait(100);report(name);};$('actions').append(b);}
$('boot').onclick=boot;$('width').onchange=()=>frame.style.width=$('width').value+'px';$('height').onchange=()=>frame.style.height=$('height').value+'px';
$('run').onclick=async()=>{$('rawReport')?.remove();result={engine:navigator.userAgent,version:$('version').value,rows:[],errors:[]};
 for(const [width,height]of [[320,568],[320,844],[375,844],[390,844],[430,844]]){
 $('width').value=width;$('height').value=height;await boot();const api=frame.contentWindow.HomeV17QA,base=inspect();
 for(const [action,fn]of Object.entries(actions)){if(action==='計測')continue;api.prepare();await fn();await wait(450);const m=inspect();result.rows.push({action,...m});
 const fail=(reason,data)=>result.errors.push({width,height,action,reason,data});
 for(const [id,b]of Object.entries(base.slots)){const a=m.slots[id];if(Math.abs(a.height-b.height)>.6||Math.abs(a.y-b.y)>.6)fail('fixed geometry changed',id);}
 if(m.actors!==28||m.slots.speechSlot.height!==76||m.slots.homeEventSlot.height!==42)fail('fixed lanes/cast');
 const text=m.panels.find(p=>p.id==='speechText'),panel=m.panels.find(p=>p.id==='speechBubble'),speaker=m.panels.find(p=>p.id==='speechSpeaker');
 if(action.startsWith('短文')){const lines=new Map();for(const g of text.glyphs){const y=Math.round(g.y);lines.set(y,(lines.get(y)||'')+g.char);}if(lines.size>1&&[...lines.values()].at(-1).length<=1)fail('orphan character',[...lines.values()]);if([1,3,4,5].some(i=>action==='短文'+i)&&lines.size!==1)fail('short wraps',[...lines.values()]);}
 if(panel.visible&&!action.includes('択')&&!action.includes('質問')){if(!speaker.visible||!speaker.label||!speaker.images.some(x=>x.startsWith('assets/characters/')))fail('missing speaker');if(text.scrollWidth>text.clientWidth+1)fail('horizontal text overflow');if(text.rect.right>panel.rect.right+1||text.rect.x<speaker.rect.right)fail('overlap');}
 if(action==='2択'){const s=m.slots.speechSlot;if(text.glyphs.some(g=>g.y<s.y||g.bottom>s.bottom))fail('question clipped');if(!speaker.visible)fail('question speaker hidden');}
 if(action==='Reaction'){const p=m.panels.find(p=>p.id==='homeChoiceResult');if(m.panels.find(p=>p.id==='message').text===p.text)fail('anonymous duplicate reaction');if(p.speakerId!=='shiba'||!p.images.some(x=>x.includes('shiba')))fail('reaction subject missing');}
 if(action==='仲間質問'){const p=m.panels.find(p=>p.id==='individualityDialog');if(p.speakerId!=='shiba'||!p.images.some(x=>x.includes('shiba')))fail('exchange subject missing');}

 const d=frame.contentDocument;
 for(const id of ['speechText','homeChoiceText','storyFlashText','message']){const p=m.panels.find(p=>p.id===id);if(!p?.visible||!p.glyphs.length)continue;const n=d.getElementById(id);if(d.defaultView.getComputedStyle(n).visibility==='hidden'||action.includes('質問')||action==='3択長文')continue;
   if(p.scrollHeight<=p.clientHeight+1&&p.glyphs.some(g=>g.y<p.rect.y-1||g.bottom>p.rect.bottom+1))fail('vertical glyph clipping',id);
 }
 if(action.includes('択')){const buttons=[...d.querySelectorAll('#speechChoices button')];if(buttons.some(b=>b.getBoundingClientRect().height<44))fail('small tap target');if(action==='2択'&&buttons.some(b=>{const r=b.getBoundingClientRect();return r.bottom>m.slots.speechSlot.bottom+1;}))fail('short choices outside lane');if(action==='3択長文'){const lane=d.getElementById('speechSlot');lane.scrollTop=lane.scrollHeight;await wait(40);const last=buttons.at(-1).getBoundingClientRect();if(last.bottom>m.slots.speechSlot.bottom+1||last.top<m.slots.speechSlot.top-1)fail('last choice not scroll reachable');lane.scrollTop=0;}}
 if(action==='返答'&&(!panel.visible||!speaker.label||!speaker.images.length||d.getElementById('speechSlot').classList.contains('is-asking')))fail('reply transition');
 api.fontReload();await wait(40);const after=inspect();if(after.panels.find(p=>p.id==='speechText').scrollWidth>after.panels.find(p=>p.id==='speechText').clientWidth+1)fail('font loaded overflow');

 }
 $('report').textContent=JSON.stringify({completed:result.rows.length,errors:result.errors},null,2);
 }
 $('report').textContent=JSON.stringify({completed:result.rows.length,errors:result.errors},null,2);const raw=document.createElement('pre');raw.id='rawReport';raw.hidden=true;raw.textContent=JSON.stringify(result);document.body.append(raw);$('run').textContent='完了 '+result.rows.length+'件 / 問題 '+result.errors.length;
};
$('download').onclick=()=>{const a=document.createElement('a');a.download='home-v17-'+(result.version||'manual')+'.json';a.href=URL.createObjectURL(new Blob([JSON.stringify(result,null,2)],{type:'application/json'}));a.click();};boot();
