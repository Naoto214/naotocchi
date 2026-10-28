// Private QA packaging only. Never included in the production allowlist.
const fs=require('fs'),path=require('path');const out=path.resolve(process.argv[2]);
for(const f of ['home-diorama.js','home-diorama-model.js','home-diorama.css','ui.css'])fs.copyFileSync(f,path.join(out,f));
let source=fs.readFileSync('script.js','utf8').replaceAll('naotocchi-save-v1','naotocchi-home-diorama-preview-v1');
fs.writeFileSync(path.join(out,'script.js'),source);fs.copyFileSync('index.html',path.join(out,'game.html'));
// The QA page uses its own save and explicitly exposes test controls in a separate script.
let qa=source.replaceAll('naotocchi-home-diorama-preview-v1','naotocchi-home-v12-qa-v1');
const inject=`
  const qp=new URLSearchParams(location.search),originalLayout=window.NaotocchiHomeDiorama.layoutTerrainCast;
  window.NaotocchiHomeDiorama.layoutTerrainCast=(a,k)=>originalLayout({...a,...(qp.has('scale')?{mainScale:Number(qp.get('scale'))}:{}),formation:qp.get('formation')||'arc'},k);
  window.HomeV12QA={
    rerender(){render();},
    longNotice(){showStoryEvent({emoji:'⭐',message:'先頭：長文通知の読みやすさ。'.repeat(9)+'末尾：そだち＋41％ ／ げんき＋2'});},
    notice(){showStoryEvent({emoji:'⭐',message:'そだちの変化を確認する長い通知。既存の内容と数値を失わずに表示します。\\nそだち＋41％ ／ げんき＋2'});},
    notices(){this.notice();showStoryEvent({emoji:'🌱',message:'次のお知らせ。げんき＋2'});},
    question(){clearConversationTimers();message='';speechActive=false;conversationBusyUntil=0;petBusyUntil=0;if(careAfterglowTimer)clearTimeout(careAfterglowTimer);careAfterglowTimer=null;castMotion.clear();state.poopCount=0;state.isSleeping=false;state.isSick=false;state.hunger=state.happiness=state.energy=state.health=95;render();return conv2Ask(CONVERSATION_BANTER.QUESTIONS[0]);},
    exchange(){if(individualityDialogOpen)closeIndividualityDialog();individualityDeferred=false;state.isSleeping=false;state.isSick=false;state.individuality.lastExchangeAge=-1;state.individuality.lastCompanion=null;for(const e of INDIVIDUALITY.pending(state.individuality))state.individuality.events[e.age].status='chosen';for(const e of INDIVIDUALITY.data.exchanges)if(e.id!=='shiba-breeze'&&!state.individuality.natural.kindness[e.category].includes(e.id))state.individuality.natural.kindness[e.category].push(e.id);state.individuality.natural.kindness[1]=state.individuality.natural.kindness[1].filter(id=>id!=='shiba-breeze').slice(0,5);if(!state.companions.some(c=>c.id==='shiba'))state.companions.push({id:'shiba',bond:80});render();return maybeIndividualExchange();},
    group(){castMotion.speak({speaker:{kind:'pet'},text:'',event:'clean',primaryBeat:true});},
    map(){const stage=el.castStage,scene=homeDiorama.inspectScene(),old=stage.querySelector('.qa-nav-map');if(old){old.remove();return;}const c=document.createElement('canvas');c.className='qa-nav-map';c.width=scene.width;c.height=scene.height;c.style.cssText='position:absolute;inset:0;pointer-events:none;z-index:1000;opacity:.65';const ctx=c.getContext('2d'),actors=homeDiorama.model.snapshot();for(let y=0;y<c.height;y+=8)for(let x=0;x<c.width;x+=8){const roles=['pet','companion','partner'].map(kind=>actors.find(a=>a.kind===kind)).filter(Boolean);let valid=0;for(const a of roles){const b=homeDiorama.model.bounds(a);if(x>=b.left&&x<=b.right&&y>=b.top&&y<=b.bottom&&(!scene.navigation||scene.navigation.valid({x,y})))valid++;}ctx.fillStyle=valid===roles.length?'#17bb66':valid?'#e9ab24':'#bd354755';ctx.fillRect(x,y,5,5);}stage.appendChild(c);},
    metrics(){return {cast:homeDiorama.model.snapshot().map(({key,x,y,w,h,activity,target})=>({key,x,y,w,h,activity,target})),metrics:JSON.parse(el.castStage.dataset.livingMetrics||'{}'),stage:el.castStage.getBoundingClientRect().toJSON(),buttons:[...el.careActions?.children||document.querySelector('#careActions').children].map(b=>({id:b.id,...b.getBoundingClientRect().toJSON()}))};}
  };homeCastLayoutKey='';render();
`;
qa=qa.replace(/\}\)\(\);\s*$/,inject+'\n})();');fs.writeFileSync(path.join(out,'qa-v12-script.js'),qa);
let html=fs.readFileSync('index.html','utf8').replace(/src="script.js[^\"]*"/,'src="qa-v12-script.js"').replace(/src="home-diorama.js[^\"]*"/,'src="qa-v12-diorama.js"');fs.writeFileSync(path.join(out,'qa-v12-game.html'),html);
fs.writeFileSync(path.join(out,'qa-v12-diorama.js'),fs.readFileSync('home-diorama.js','utf8').replace('return {model,update,sync,interrupt,','return {inspectScene:()=>scene,model,update,sync,interrupt,'));
let page=fs.readFileSync('tools/home-household-qa/index.html','utf8').replaceAll('naotocchi-home-diorama-preview-v1','naotocchi-home-v12-qa-v1').replace('<option>6</option>','<option>3</option><option>6</option>').replace('<option>26</option>','<option>20</option><option>26</option>').replace('<option>576</option>','<option>568</option><option>576</option>');
page=page.replace('<label>版<select id="version">','<label>主役<select id="scale"><option value="">採用値</option><option value="1">100%</option><option value=".9">90%</option><option value=".85">85%</option><option value=".8">80%</option></select></label><label>配置<select id="formation"><option value="arc">ゆるい弧</option><option value="distributed">旧分散</option></select></label><label>恋人<select id="partner"><option value="auto">28体のみ</option><option value="yes">あり</option></select></label><label>版<select id="version">').replace('<option value="game.html">新28体</option><option value="v9-game.html">v9来訪のみ</option>','<option value="qa-v12-game.html">V12比較</option>');
page=page.replace("const defs=", "const withPartner=n===28||(n>1&&document.getElementById('partner').value==='yes');const defs=").replace("n===28?26:n-1","n-1-Number(withPartner)").replace("s.partner=n===28?","s.partner=withPartner?");
page=page.replace("+'?householdqa='+Date.now()","+'?householdqa='+Date.now()+'&formation='+document.getElementById('formation').value+(document.getElementById('scale').value?'&scale='+document.getElementById('scale').value:'')");
page=page.replace('</nav><p>','</nav><nav><button data-action="notice">通知1件</button><button data-action="longNotice">長文通知</button><button data-action="rerender">再描画</button><button data-action="notices">連続通知</button><button data-action="question">既存の質問</button><button data-action="exchange">なかまと、ひととき</button><button data-action="group">集合反応Pilot</button><button data-action="map">移動領域</button></nav><p>');
page=page.replace('start();\n</script>',"document.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>document.getElementById('game').contentWindow.HomeV12QA[b.dataset.action]());start();\n</script>");
fs.writeFileSync(path.join(out,'v12-qa.html'),page);
// Existing landing and v11 QA are retained; update the stated version only.
let landing=fs.readFileSync(path.join(out,'index.html'),'utf8').replace('HOME PILOT V11','HOME PILOT V12').replace('href="household-qa.html"','href="v12-qa.html"');fs.writeFileSync(path.join(out,'index.html'),landing);
console.log('V12 source and isolated, explicit QA controls installed.');
