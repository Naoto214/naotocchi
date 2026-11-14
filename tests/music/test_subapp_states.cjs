const {chromium,webkit}=require('playwright');const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');const root=path.resolve(__dirname,'../..');
(async()=>{const records=[];for(const [name,type]of [['chromium',chromium],['webkit',webkit]]){
 const b=await type.launch({headless:true,...(name==='chromium'&&process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});try{
 const p=await b.newPage();p.setDefaultTimeout(20000);await p.addInitScript({path:path.join(__dirname,'graph.js')});
 for(const [app,initial]of [['card-game','card-2'],['naopoyo-time-hand-chapter1','poyo-1'],['life-sugoroku','koro-1']]){
  await p.goto((process.env.BGM_TEST_BASE||'http://127.0.0.1:8780/')+'prototypes/'+app+'/');await p.mouse.click(5,5);
  const one=async(id,age=1.3)=>{await p.waitForFunction(({id,age})=>{const s=AUDIO_AUDIT.snapshot().sources.filter(s=>s.id);return s.length===1&&s[0].id===id&&s[0].age>age&&s[0].paths.every(p=>Math.abs(p.gain-.36)<.0001)},{id,age});records.push({engine:name,app,id,gain:.36,voices:1})};await one(initial);
  // Feed the same DOM states read by the unmodified scene observer, without changing game/save code.
  if(app==='card-game'){
   await p.evaluate(()=>{document.body.classList.add('playing');let g=document.querySelector('#game');g.hidden=false;g.innerHTML='<div class="turn-indicator"><small>ROUND 9</small></div>';document.querySelector('#result')?.remove()});await one('var-card-late');
   for(const [text,id]of [['A の勝利','var-card-win'],['B の勝利','jingle-card-lose']]){
    await p.evaluate(text=>{document.querySelector('#result')?.remove();document.querySelector('#game').innerHTML='<div class="player-board own" data-player="A"></div><div id="result"><h2>'+text+'</h2></div>'},text);await one(id,.4);
   }
  }else if(app==='naopoyo-time-hand-chapter1'){
   await p.evaluate(()=>{const d=document.querySelector('#dialog');d.open=true;document.querySelector('#content').innerHTML='<span class="victory-star"></span><h2>ステージクリア</h2>'});await one('var-poyo-clear',.4);await one('poyo-1');
   await p.evaluate(()=>document.querySelector('#content h2').textContent='第1章クリア');await one('var-poyo-chapter');
  }else{
   await p.evaluate(()=>document.querySelector('#app').innerHTML='<div id="official-frame"></div><div class="official-panel"><span class="caption">通常ゲーム</span></div>');await one('game-1');
   await p.evaluate(()=>document.querySelector('.official-panel .caption').textContent='お金');await one('bgm-game');
   await p.evaluate(()=>document.querySelector('#app').innerHTML='こんな人生に、なりました。');await one('var-koro-goal',.4);await one('var-koro-album');
  }
 }
 console.log(name+': PASS existing subapp observers: card late/win/lose; poyo clear→normal/chapter; koro game/quick/goal→album; no persistent duplicate BGM');
 }finally{await b.close()}}
 fs.writeFileSync(path.join(root,'docs/music/verification/subapp-states.json'),JSON.stringify(records,null,2));
})().catch(e=>{console.error(e);process.exit(1)});
