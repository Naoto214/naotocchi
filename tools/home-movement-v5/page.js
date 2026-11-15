(()=>{
 const $=id=>document.getElementById(id),labels={a:'従来版',c:'VERSION 2',d:'VERSION 4',e:'VERSION 5'};
 let catalog=null,ready=false,lastWidth=0;
 const values={heroId:'hermit_crab',stage:5,focusKey:'pet:hermit_crab',partnerId:'gentle_gorilla',itemId:'poop1',count:4,region:'city',time:'night',speech:false,notice:false,naotoItems:[]};
 for(let n=1;n<=28;n++)$('count').add(new Option(n+'体',n));$('count').value='4';
 for(let n=0;n<8;n++)$('stage').add(new Option((n+1)+'段階',n));$('stage').value='5';
 const post=data=>$('play').contentWindow?.postMessage(data,location.origin);
 const options=()=>Object.fromEntries(['ground','bounds','feet','ink'].map(id=>[id,$(id).checked]));
 function fill(id,rows,current){$(id).replaceChildren(...rows.map(r=>new Option(r.label,r.id)));if([...$(id).options].some(o=>o.value===String(current)))$(id).value=current;}
 function updateStages(){const h=catalog?.heroes.find(h=>h.id===values.heroId);if(h)fill('stage',h.stages.map((s,i)=>({id:i,label:(i+1)+'：'+s})),values.stage);}
 function updateCatalog(next){
  catalog=next;fill('hero',next.heroes,values.heroId);fill('item',[{id:'',label:'なし'},...next.items],values.itemId||'');fill('region',next.regions,values.region);fill('time',next.times,values.time);fill('partner',next.partners,values.partnerId);
  const residents=next.residents.map(r=>({id:r.kind==='pet'?'pet:'+values.heroId:r.kind==='partner'?'partner:'+values.partnerId:r.key,label:r.kind==='pet'?'主人公':r.label}));fill('focus',residents,values.focusKey);updateStages();
  $('achievements').replaceChildren(...next.achievementItems.map(r=>{const label=document.createElement('label'),input=document.createElement('input');input.type='checkbox';input.value=r.id;input.checked=values.naotoItems.includes(r.id);input.onchange=equipment;label.append(input,document.createTextNode(r.label));return label;}));
 }
 function dimensions(){
  const limit=$('width').value==='auto'?430:+$('width').value,available=document.querySelector('.play-area').clientWidth,width=Math.max(1,Math.floor(Math.min(limit,available))),height=({320:568,375:812,390:844,430:932})[width]||Math.round(width*844/390);
  $('play-wrap').style.width=width+'px';$('play').style.height=height+'px';$('dimensions').textContent=width+' × '+height+' CSS px';return width;
 }
 function load(){
  ready=false;const version=$('version').value,p=new URLSearchParams(Object.fromEntries(Object.entries(values).filter(([k,v])=>k!=='naotoItems'&&v!==null).map(([k,v])=>[k,typeof v==='boolean'?(v?'1':'0'):String(v)])));
  p.set('naotoItems',values.naotoItems.join(','));p.set('freeze',$('autonomy').checked?'0':'1');p.set('itemId',values.itemId||'');$('play-label').textContent=labels[version];lastWidth=dimensions();$('status').textContent='比較画面を読み込んでいます。';
  $('play').src='game/'+version+'/movement-'+(version==='a'?'a':'b')+'.html?'+p;
 }
 function equipment(){values.itemId=$('item').value||null;values.naotoItems=[...$('achievements').querySelectorAll('input:checked')].map(x=>x.value);if(ready)post({type:'v5-item',itemId:values.itemId,naotoItems:values.naotoItems});}
 function change(id,key,number=false){$(id).addEventListener('change',()=>{values[key]=number?+$(id).value:$(id).value;if(id==='count'&&values.count===1)values.focusKey='pet:'+values.heroId;if(id==='hero'){if(values.focusKey.startsWith('pet:'))values.focusKey='pet:'+values.heroId;if(catalog)updateCatalog(catalog);}if(id==='partner'&&values.focusKey.startsWith('partner:'))values.focusKey='partner:'+values.partnerId;load();});}
 change('hero','heroId');change('stage','stage',true);change('partner','partnerId');change('region','region');change('time','time');change('count','count',true);$('version').onchange=load;$('width').onchange=load;$('item').onchange=equipment;$('reset').onclick=load;
 $('focus').onchange=()=>{values.focusKey=$('focus').value;if(ready)post({type:'v5-focus',key:values.focusKey});};
 for(const id of ['speech','notice'])$(id).onchange=()=>{values[id]=$(id).checked;if(ready)post({type:'v5-ui',speech:values.speech,notice:values.notice});};
 $('autonomy').onchange=()=>post({type:'v5-autonomy',enabled:$('autonomy').checked});
 for(const id of ['ground','bounds','feet','ink'])$(id).onchange=()=>post({type:'v5-options',options:options()});
 window.addEventListener('message',event=>{
  if(event.origin!==location.origin||event.source!==$('play').contentWindow)return;const m=event.data;if(m?.version!==$('version').value)return;
  if(m.type==='v5-ready'){ready=true;updateCatalog(m.catalog);post({type:'v5-options',options:options()});}
  if(m.type==='v5-state'||m.type==='v5-ready'){
   const a=m.selected;if(a){values.focusKey=a.key;if([...$('focus').options].some(o=>o.value===a.key))$('focus').value=a.key;$('selected').textContent=catalog?.residents.find(r=>r.key===a.key)?.label||a.id;$('coordinates').textContent='足元 x '+a.foot.x.toFixed(2)+' / y '+a.foot.y.toFixed(2)+' CSS px';$('detail').textContent=JSON.stringify(a,null,2);}
   $('status').textContent=m.count+'体・'+m.viewport.width+'×'+m.viewport.height+'px。'+(m.input===false?'直近の移動先は受け付けられませんでした。':'ドラッグして移動できます。');if(m.count!==values.count){values.count=m.count;$('count').value=String(m.count);}
  }
 });
 let timer;window.addEventListener('resize',()=>{clearTimeout(timer);timer=setTimeout(()=>{const w=dimensions();if(w!==lastWidth){lastWidth=w;load();}},250);});load();
})();
