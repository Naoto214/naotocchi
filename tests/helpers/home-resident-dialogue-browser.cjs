// The normal index, actual care buttons and autonomous movement; only the starting
// save, random stream and clock are controlled. No QA entry or speech injection.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {harness} = require('./runtime-harness.cjs');
const shibaExchanges = require('../../conversation-banter.js').BANTERS.filter(b=>b.with==='companion:shiba');

const pet = {kind:'pet', id:'dog', name:'あかちゃんいぬ', portrait:/\/(?:expressions\/)?dog\/01(?:-[\w-]+)?\.png$/};
const friend = {kind:'companion', id:'shiba', name:'ひとなつっこいしばいぬ', portrait:/\/(?:companions\/shiba|relationship\/shiba\/\w+)\.png$/};
const partner = {kind:'partner', id:'robot_neighbor', name:'となりまちのロボット', portrait:/\/(?:partners\/robot_neighbor|relationship\/robot_neighbor\/\w+)\.png$/};

function savedHousehold(other) {
  const {api} = harness({deterministic:true});
  const s = JSON.parse(JSON.stringify(api.state()));
  const hasPartner = other.kind === 'partner';
  Object.assign(s, {stage:'growing', regionId:'home', speciesLine:'dog', ageTicks:20, stageIndex:0,
    gender:'male', orientationId:'pan', attractedTo:['male','female','nonbinary'],
    hunger:90, happiness:90, health:100, energy:100, sodachi:22, maxSodachi:22,
    isSleeping:false, isSick:false, transformMeter:0, savedAt:0,
    achievementsUnlocked:api.achievements.filter(a=>a.id!=='dex-complete').map(a=>a.id), companions:hasPartner?[]:[{id:other.id,bond:80}],
    partner:hasPartner?{...api.partnerCandidates.find(a=>a.id===other.id), married:true, affection:80, bondCount:0}:null});
  Object.assign(s.lifetime,{weatherMode:'sunny',timeMode:'day',seasonMode:'summer'});
  return s;
}

async function readBubble(page) {
  return page.locator('#speechBubble').evaluate(async b=>{
    const img=b.querySelector('#speechSpeaker img');
    if(img)await img.decode();
    const rect=id=>document.getElementById(id).getBoundingClientRect().toJSON();
    const buttonRects=[...document.querySelectorAll('#careActions>button')].map(e=>{
      const r=e.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
      return e===hit||e.contains(hit);
    });
    return {visible:!!b.getClientRects().length, kind:b.dataset.kind,id:b.dataset.speakerId,
      event:b.dataset.reactionEvent,text:document.getElementById('speechText').textContent,
      name:document.getElementById('speechSpeaker').textContent, portrait:img?.getAttribute('src'),
      bubble:rect('speechBubble'), dock:rect('homeCommentDock'), notice:rect('homeEventSlot'),controls:buttonRects};
  });
}

function checkBeat(d, actor, label){
  assert.ok(d.visible,label+' visible speech');
  assert.deepEqual([d.kind,d.id,d.name],[actor.kind,actor.id,actor.name],label+' speaker for '+d.text);
  assert.match(d.portrait,actor.portrait,label+' loaded portrait for '+d.name);
  assert.ok(d.text.trim(),label+' complete visible line');
  assert.equal(d.dock.height,76,label+' comment lane');
  assert.equal(d.notice.height,42,label+' notice lane');
  assert.ok(d.notice.bottom<=d.dock.top+1 && d.bubble.top>=d.dock.top-1 && d.bubble.bottom<=d.dock.bottom+1,label+' speech stays in its lane');
  assert.equal(d.controls.length,9);assert.ok(d.controls.every(Boolean),label+' controls stay tappable');
}

async function autonomousExchange(browser,engine,base,out,records,errors){
  const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'no-preference'});
  const label=engine+'-390x844-autonomous';
  page.on('pageerror',e=>errors.push(e.message));
  try{
    await page.clock.install({time:new Date('2026-11-06T12:00:00Z')});
    await page.clock.pauseAt(new Date('2026-11-06T12:01:00Z'));
    await page.addInitScript(save=>{
      if(location.protocol!=='http:'&&location.protocol!=='https:')return;
      localStorage.setItem('naotocchi-save-v1',JSON.stringify(save));
      // Movement gets its own seed from crypto; do not replace its decisions,
      // actors, RAF loop, event producer or the gameplay random distribution.
      let x=1182;const native=crypto.getRandomValues.bind(crypto);
      crypto.getRandomValues=a=>a instanceof Uint32Array && a.length===1?(a[0]=x,a):native(a);
      Math.random=()=>((x=(Math.imul(x,1664525)+1013904223)>>>0)/4294967296);
    },savedHousehold(friend));
    await page.goto(base+'/index.html');
    // If the daypart image loads first, the renderer publishes readiness on its
    // next animation frame. Drive that frame while the gameplay clock is paused.
    const stage=page.locator('#castStage[data-world-renderer="art-25d"]');
    await page.locator('#castStage[data-world-renderer]').waitFor({state:'attached'});
    const deadline=Date.now()+30000;
    while(!await stage.count() && Date.now()<deadline)await page.clock.runFor(16);
    assert.equal(await stage.count(),1,'the production artwork must finish rendering');
    await page.clock.runFor(400);
    await page.locator('#castStage').evaluate(s=>{
      s.addEventListener('naotocchi:home-reaction',({detail:d})=>{
        if(d.type==='social'&&d.source==='ambient')s.lastAmbientPair={at:Date.now(),keys:[d.actor.key,d.listener.key]};
      });
    });
    // A meeting can yield to a higher priority notification. Observe successive
    // natural encounters within three simulated minutes. A coincidental solo
    // greeting, an unrelated line, or a synthetic QA comment cannot qualify.
    let found;
    for(let n=0;n<225&&!found;n++){
      await page.clock.runFor(800);
      const pair=await page.locator('#castStage').evaluate(s=>
        s.lastAmbientPair && Date.now()-s.lastAmbientPair.at<900?s.lastAmbientPair:null);
      if(!pair)continue;
      assert.deepEqual(pair.keys.slice().sort(),['companion:shiba','pet:dog']);
      const first=await readBubble(page);
      const def=shibaExchanges.find(u=>u.beats[0].text===first.text);
      if(!first.visible||!def)continue;
      const beats=[first];let savedPortrait=false;
      for(const [i,authored] of def.beats.entries()){
        if(i){
          // Rotate during a live exchange; the same unit must continue with
          // its original participants and a usable landscape comment lane.
          if(i===1){await page.setViewportSize({width:844,height:390});}
          await page.clock.runFor(2500);beats.push(await readBubble(page));
        }
        const actual=beats[i];checkBeat(actual,authored.role==='pet'?pet:friend,label+' turn '+(i+1));
        assert.equal(actual.text,authored.text,label+' attributed full authored line');
        if(actual.kind==='companion'&&!savedPortrait){await page.screenshot({path:path.join(out,label+'-shiba.png')});savedPortrait=true;}
      }
      found={label,pair,exchange:def.id,beats};records.push(found);
    }
    assert.ok(found,label+' no authored exchange after a real ambient meeting');
  }finally{await page.close();}
}

module.exports=async function(browser,engine,base,out){
  const records=[],errors=[];
  for(const [width,height] of [[390,844],[844,390]])for(const [event,button,other,ownText] of [
    ['play_with','playWithBtn',friend,'投げるまで待てる。たぶん!'],
    ['court','courtBtn',partner,'たのしい、をいま学習中'],
  ]){
    const label=engine+'-'+width+'x'+height+'-'+event;
    const page=await browser.newPage({viewport:{width,height},hasTouch:true,isMobile:true,reducedMotion:'reduce'});
    page.on('pageerror',e=>errors.push(e.message));
    try{
      await page.clock.install({time:new Date('2026-11-06T12:00:00Z')});
      await page.clock.pauseAt(new Date('2026-11-06T12:01:00Z'));
      await page.addInitScript(save=>{if(location.protocol!=='http:'&&location.protocol!=='https:')return;localStorage.setItem('naotocchi-save-v1',JSON.stringify(save));Math.random=()=>.01;},savedHousehold(other));
      await page.goto(base+'/index.html');
      await page.clock.runFor(400);
      await page.waitForFunction(()=>document.querySelectorAll('[data-diorama-actor]').length>=2);
      await page.clock.runFor(120);
      await page.locator('#'+button).tap();
      await page.clock.runFor(1);
      const first=await readBubble(page);
      await page.clock.runFor(2500);
      const reply=await readBubble(page);
      records.push({label,first,reply});
      checkBeat(reply,other,label+' reply');
      assert.equal(reply.text,ownText,label+' authored by '+other.name);
      checkBeat(first,pet,label+' opening');
      assert.ok(first.text!==reply.text);
      assert.equal(first.event,event);assert.equal(reply.event,event);
      await page.screenshot({path:path.join(out,label+'-reply.png')});
    }catch(e){
      console.error(label,e.message,await page.evaluate(()=>({url:location.href,state:document.readyState,body:document.body?.innerText.slice(0,800),actors:[...document.querySelectorAll('[data-diorama-actor]')].map(a=>a.dataset.dioramaActor)})).catch(()=>null),errors);
      await page.screenshot({path:path.join(out,label+'-failure.png')}).catch(()=>{});
      throw e;
    }finally{
      await page.close();
      fs.writeFileSync(path.join(out,'resident-dialogue-'+engine+'.json'),JSON.stringify({records,errors},null,2));
    }
  }
  try{await autonomousExchange(browser,engine,base,out,records,errors);}
  finally{fs.writeFileSync(path.join(out,'resident-dialogue-'+engine+'.json'),JSON.stringify({records,errors},null,2));}
  assert.deepEqual(errors,[]);console.log('PASS resident dialogue',engine,records.length);
};
