const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');const {chromium,webkit}=require('playwright');const root=path.resolve(__dirname,'..'),base='http://127.0.0.1:8772/';
(async()=>{const evidence=[];for(const [name,type]of [['chromium',chromium],['webkit',webkit]]){
 const browser=await type.launch({headless:true,...(name==='chromium'?{executablePath:'/usr/bin/chromium'}:{})});try{
 const p=await browser.newPage();p.setDefaultTimeout(20000);await p.addInitScript({path:path.join(__dirname,'graph.js')});await p.goto(base+'bgm-v7-complete/');
 await p.addScriptTag({url:base+'assets/bgm/catalog.js'});await p.addScriptTag({url:base+'assets/bgm/placement.js'});await p.addScriptTag({path:path.join(root,'reference/bgm-v2.js')});await p.addScriptTag({path:path.join(root,'reference/audio.js')});
 await p.evaluate(base=>{
  window.fixture={state:{stage:'alive',isSleeping:false,lifetime:{soundBgm:true,soundSfx:true,timeMode:'morning',quickVoice:'tts'}},game:null,date:false};window.NaotocchiEnvironment={timeOfDay:x=>x};
  // Native speech is outside automated audio scope; stub only OS speech sink to observe existing duck scheduling.
  window.speechSynthesis={paused:false,getVoices:()=>[],speak(){},cancel(){},resume(){}};window.SpeechSynthesisUtterance=class{constructor(t){this.text=t}};
  window.runtime=installNaotocchiAudio({bgmBase:base+'assets/bgm/',getState:()=>fixture.state,STAGE:{DEAD:'dead',FAREWELL:'farewell'},el:{},isGameActive:()=>!!fixture.game,getActiveMinigame:()=>fixture.game,minigameGenreId:()=> 'action',isDateOpen:()=>fixture.date});
  localStorage.setItem('audit-sentinel','keep');
 },base);await p.mouse.click(1,1);
 const settled=async id=>{await p.waitForFunction(id=>{const s=AUDIO_AUDIT.snapshot().sources.filter(s=>s.id);return s.length===1&&s[0].id===id&&s[0].age>1.3&&s[0].paths.every(p=>Math.abs(p.gain-.36)<.0001)},id)};
 await settled('home-morning');
 for(const [time,id]of [['day','home-day'],['evening','home-evening'],['night','home-night']]){await p.evaluate(t=>fixture.state.lifetime.timeMode=t,time);await settled(id);evidence.push({engine:name,transition:'home→'+id,steadyGain:.36});}
 for(const [game,id]of [[{id:'road-themed'},'game-1'],[{id:'quick-run'},'bgm-game'],[{id:'falling-block-puzzle'},'poyo-2'],[null,'home-night']]){await p.evaluate(g=>fixture.game=g,game);await settled(id);evidence.push({engine:name,transition:'main→'+id,steadyGain:.36});}
 await p.evaluate(()=>fixture.state.isSleeping=true);await settled('lullaby-a');await p.evaluate(()=>{fixture.state.isSleeping=false;fixture.date=true});await settled('event-2');await p.evaluate(()=>fixture.date=false);await settled('home-night');
 await p.evaluate(()=>runtime.bgmJingle('var-ohayo-hatch2',{duckDb:-14}));await p.waitForFunction(()=>{const s=AUDIO_AUDIT.snapshot().sources;return s.some(x=>x.id==='var-ohayo-hatch2')&&s.some(x=>x.id==='home-night'&&x.paths.some(p=>Math.abs(p.gain-.36*10**(-14/20))<.0001))});
 const duck=await p.evaluate(()=>AUDIO_AUDIT.snapshot().sources.filter(s=>s.id));assert.equal(duck.length,2);evidence.push({engine:name,hatchOverlay:duck});await settled('home-night');
 await p.evaluate(()=>runtime.voice('あいうえおかきくけこ',{mode:'tts'}));await p.waitForFunction(()=>AUDIO_AUDIT.snapshot().sources.some(x=>x.id==='home-night'&&x.paths.some(p=>Math.abs(p.gain-.36/7)<.0001)));
 const speech=await p.evaluate(()=>AUDIO_AUDIT.snapshot());assert.ok(speech.gains.some(g=>Math.abs(g.value-.45)<1e-5&&g.paths.some(p=>Math.abs(p.gain-.405)<1e-5)),'SFX speech duck preserved');evidence.push({engine:name,speechBgmGain:.36/7,speechSfxGain:.405});await settled('home-night');
 await p.evaluate(()=>{fixture.state.lifetime.soundBgm=false;runtime.settingsChanged()});await p.waitForFunction(()=>AUDIO_AUDIT.snapshot().sources.filter(s=>s.id).length===0);assert.equal(await p.evaluate(()=>fixture.state.lifetime.soundSfx),true);await p.evaluate(()=>{fixture.state.lifetime.soundBgm=true;runtime.settingsChanged()});await settled('home-night');
 await p.evaluate(()=>{const b=NAOTOCCHI_BGM2_INSTANCES[0];for(let i=0;i<20;i++)b.setSong(i%2?'home-night':'home-day')});await settled('home-night');
 const values=await p.evaluate(()=>({sentinel:localStorage.getItem('audit-sentinel'),state:fixture.state}));assert.equal(values.sentinel,'keep');assert.equal(values.state.lifetime.timeMode,'night');
 // Default/custom user options of generic player must be untouched.
 const explicit=await p.evaluate(()=>{const p=NAOTOCCHI_BGM2.create({level:.17});p.setDuck(1,0);return AUDIO_AUDIT.snapshot().gains.some(g=>Math.abs(g.value-.17)<1e-6)});assert.equal(explicit,true);
 console.log(name+': PASS actual audio.js selection/scheduler,4 dayparts, games/quick/puzzle/sleep/event/return, hatch duck/fades, speech/SFX paths, BGM toggle, rapid final selection, untouched explicit level/save sentinel');
 }finally{await browser.close()}}
 fs.writeFileSync(path.join(root,'verification/lifecycle.json'),JSON.stringify(evidence,null,2));
})().catch(e=>{console.error(e);process.exit(1)});
