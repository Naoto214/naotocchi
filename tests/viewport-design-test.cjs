const assert = require('node:assert/strict');
const {test} = require('node:test');
const fs = require('node:fs');
const {layoutCast} = require('../cast-layout.js');
const {harness} = require('./helpers/runtime-harness.cjs');
const master = new Function(fs.readFileSync('character-world-master.v1.js','utf8')+';return NAOTOCCHI_CHARACTER_WORLD_MASTER_V1')();
const friends = [...master.companions.normal,...master.companions.rare].map(c=>c.asset);
const separated = (a,b,gap) => a.x+a.w+gap<=b.x+.001 || b.x+b.w+gap<=a.x+.001 || a.y+a.h+gap<=b.y+.001 || b.y+b.h+gap<=a.y+.001;

test('a small newborn uses spare space and stays near the speech below it', () => {
  // The reported turtle has a small body low in its original 128px image.
  // Keeping a fixed 112px frame left ~80px below it in a 270px stage.
  for (const height of [220,270,320]) {
    const r=layoutCast({width:338,height,mainAsset:'assets/characters/turtle/01.png',hasAccessory:true,motionRadius:3});
    const visibleWidth=r.main.w*66/128;
    const visibleBottom=r.main.y+r.main.h*120/128+(r.main.artOffsetY||0);
    assert.ok(visibleWidth>=90,'spare space should enlarge the small newborn');
    assert.ok(height-visibleBottom<=24,'do not leave a large gap above speech');
    for(const f of [r.main,r.accessory]) {
      assert.ok(f.x>=7 && f.x+f.w<=331,'keep the complete image during sway');
      assert.ok(f.y>=4 && f.y+f.h<=height-4,'keep the complete image during reactions');
    }
  }
});

test('bottom transparency cannot leave a fish far above its speech', () => {
  const h=harness(), s=h.api.state();
  s.speciesLine='clownfish';s.ageTicks=0;
  h.get('lifeCardOverlay').classList.add('hidden');
  h.get('castStage').getBoundingClientRect=()=>({width:338,height:270});
  h.api.render();
  const pet=h.get('petSprite');
  assert.ok(pet.innerHTML.includes('assets/characters/clownfish/01.png'));
  const size=parseFloat(pet.style.width),top=parseFloat(pet.style.top);
  const offset=parseFloat(pet.style['--cast-art-offset-y'])||0;
  const bottom=top+size*79/128+offset;
  assert.ok(270-bottom<=12,'the painted fish, not its empty canvas, stays near speech');
  assert.ok(bottom<=266.001,'painted body reserves its reaction margin');
  h.api.setSpeechBubble('いっしょに泳ごう。',{kind:'pet',emoji:'🐠',label:'クマノミ'},{event:'play_with'});
  const animation=pet.animations.at(-1);
  h.api.render();
  assert.equal(animation.playState,'running','static placement must not cancel the response');

  h.sandbox.HTMLImageElement=class {};
  const img=h.get('failed-main-image');Object.setPrototypeOf(img,h.sandbox.HTMLImageElement.prototype);
  img.classList.add('character-asset');
  img.getAttribute=()=> 'assets/characters/clownfish/01.png';
  img.closest=()=>h.get('fish-visual');
  h.dispatch(img,'error');
  assert.equal(pet.style['--cast-art-offset-y'],'0px','emoji fallback must not inherit PNG padding');
});

test('closer core actors retain the readable size of both full companion arcs', () => {
  for(const [count,minimum] of [[6,58],[26,32]]) {
    const r=layoutCast({width:338,height:270,mainAsset:'assets/characters/sakura/04.png',hasPartner:true,
      partnerAsset:'assets/characters/partners/forest_bear.png',hasAccessory:true,companions:friends.slice(0,count),motionRadius:count>18?1:3});
    assert.ok(r.size>=minimum,'do not spend companion width on extra core spacing');
    assert.equal(r.companions.length,count);
  }
});

test('equipment and the partner sit near the visible body instead of the transparent image top', () => {
  const bounds=require('../cast-bounds.js');
  const visible=(f,asset)=>{const b=bounds[asset]?.box||[0,0,128,128];return {x:f.x+f.w*b[0]/128,y:f.y+f.h*b[1]/128+(f.artOffsetY||0),w:f.w*(b[2]-b[0])/128,h:f.h*(b[3]-b[1])/128};};
  const hull=(f,asset)=>(bounds[asset]?.hull||[[0,0],[128,0],[128,128],[0,128]]).map(([x,y])=>[f.x+x*f.w/128,f.y+y*f.h/128+(f.artOffsetY||0)]);
  const pointToEdge=(p,a,b)=>{const dx=b[0]-a[0],dy=b[1]-a[1];const t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy||1)));return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy);};
  const distance=(a,b)=>Math.min(...a.flatMap(p=>b.map((v,i)=>pointToEdge(p,v,b[(i+1)%b.length]))),...b.flatMap(p=>a.map((v,i)=>pointToEdge(p,v,a[(i+1)%a.length]))));
  const bear='assets/characters/partners/forest_bear.png';
  const cases=['assets/characters/turtle/01.png','assets/characters/sakura/04.png','assets/characters/antlion/01.png',null].map(asset=>[asset,bear]);
  cases.push(['assets/characters/unknown/01.png','assets/characters/partners/cliff_goat.png'],['assets/characters/unknown/07.png',bear]);
  for(const [asset,partner] of cases) {
    const r=layoutCast({width:338,height:270,mainAsset:asset,hasPartner:true,partnerAsset:partner,hasAccessory:true,motionRadius:3});
    const a=visible(r.main,asset),p=visible(r.partner,partner);
    for(const [b,frame,image] of [[p,r.partner,partner],[r.accessory,r.accessory,null]]) {
      assert.ok(separated(a,b,0),'the visible bodies do not intersect');
      // Check distance between painted outlines independently of the layout's
      // separating-axis calculation; diagonal clearance can share a box edge.
      assert.ok(distance(hull(r.main,asset),hull(frame,image))>=7.999,'reserve both reactions along the outline');
      assert.ok(a.y-(b.y+b.h)<=12,'transparent padding must not separate the core actors');
    }
    assert.ok(distance(hull(r.partner,partner),hull(r.accessory,null))>=7.999,'partner and equipment reserve both reactions');
    for(const f of [r.main,r.partner,r.accessory,...r.hearts]) {
      assert.ok(f.x>=7 && f.x+f.w<=331,'narrow bodies must retain the whole frame during sway');
      assert.ok(f.y>=4 && f.y+f.h<=266,'narrow bodies must retain the whole frame during reactions');
    }
  }
});

test('height-constrained companions keep curved wings instead of straight columns', () => {
  for (const width of [294,354]) for (const height of [96,104,120,160,220,300]) {
    for (const count of [6,9,10,26]) for (const together of [false,true]) {
      const r=layoutCast({width,height,mainAsset:null,hasPartner:together,partnerAsset:null,hasAccessory:together,
        companions:Array(count).fill(null),motionRadius:count>18?1:3});
      assert.ok(r.height<=height,'curves must use the available height');
      for (const side of [0,1]) {
        const points=r.companions.filter((_,i)=>i%2===side).map(f=>({x:f.x+f.w/2,y:f.y+f.h/2}));
        const distinctX=new Set(points.map(p=>p.x.toFixed(1)));
        assert.ok(distinctX.size>=Math.ceil(points.length/2),`straight columns at ${width}/${height}/${count}`);
        points.sort((a,b)=>a.y-b.y);
        const reach=p=>Math.abs(p.x-width/2);
        const middle=Math.max(...points.slice(1,-1).map(reach));
        assert.ok(reach(points[0])<middle && reach(points.at(-1))<middle,`both tips curve inward at ${width}/${height}/${count}/${side}`);
      }
    }
  }
});

test('height-constrained cast keeps all frames, two sides and motion gaps', () => {
  for (const width of [270,294,314,354,384]) for (const height of [96,100,104,120,160,220,300]) {
    for (let count=0;count<=28;count++) for (const known of [false,true]) {
      const radius=count>18?1:3;
      const r=layoutCast({width,height,mainAsset:null,hasPartner:true,partnerAsset:null,hasAccessory:true,
        companions:Array.from({length:count},(_,i)=>known?friends[i]:null),motionRadius:radius});
      assert.ok(r.height<=height, 'cast exceeds available height: '+[width,height,count]);
      assert.equal(r.companions.length,count);
      assert.ok(r.main.w>=40 && r.size>=12);
      const core=[r.main,r.partner,r.accessory,...r.hearts];
      for (const f of [...core,...r.companions]) {
        assert.ok(f.x-radius-4>=-.001 && f.x+f.w+radius+4<=width+.001, 'whole frame during sway');
        assert.ok(f.y-radius-1>=-.001 && f.y+f.h+radius+1<=height+.001, 'whole frame during reaction');
      }
      for(let i=0;i<3;i++) for(let j=0;j<i;j++) assert.ok(separated(core[i],core[j],2+2*radius),'core gap');
      r.companionBodies.forEach((a,i)=>{
        for(const b of [...core,...r.companionBodies.slice(0,i)]) assert.ok(separated(a,b,4+2*radius),'friend gap');
        assert.ok(i%2 ? a.x>=r.main.x+r.main.w : a.x+a.w<=r.main.x,'13 friends on each side');
      });
    }
  }
});

test('more vertical room grows the cast instead of leaving a fixed small scene', () => {
  const args={width:354,mainAsset:null,hasPartner:true,partnerAsset:null,hasAccessory:true,companions:friends,motionRadius:1};
  const short=layoutCast({...args,height:120}), tall=layoutCast({...args,height:300});
  assert.ok(tall.size>short.size);
  assert.ok(tall.main.w>short.main.w);
});

test('design choices keep independent selections and show the selected pattern on the selected color', () => {
  const h=harness(), s=h.api.state();
  s.lifetime.endingTiersReached=[0,1,2,3,4];
  h.api.selectTheme('screen','aurora'); h.api.selectTheme('screenPattern','dots');
  h.api.selectTheme('device','starlight'); h.api.selectTheme('devicePattern','rings');
  h.api.openExclusiveMenu('theme');
  assert.equal(s.lifetime.screenThemeId,'aurora');
  assert.equal(s.lifetime.deviceThemeId,'starlight');
  assert.equal(s.lifetime.screenPatternId,'dots');
  assert.equal(s.lifetime.devicePatternId,'rings');
  assert.ok(h.get('screenPatternGrid').innerHTML.includes('surface-screen theme-aurora pattern-dots'));
  assert.ok(h.get('devicePatternGrid').innerHTML.includes('surface-device theme-starlight pattern-rings'));
  assert.ok(h.get('screenPatternGrid').innerHTML.includes('aria-pressed="true"'));
  h.api.selectTheme('screenPattern','none');
  assert.equal(s.lifetime.screenThemeId,'aurora');
});

test('viewport changes follow browser chrome height while pinch zoom remains usable', () => {
  const h=harness({viewportHeight:664}), viewport=h.window.visualViewport;
  assert.equal(h.document.documentElement.style['--app-height'],'664px');
  viewport.height=548; h.dispatch(viewport,'resize');
  assert.equal(h.document.documentElement.style['--app-height'],'548px');
  viewport.scale=2; viewport.height=274; h.dispatch(viewport,'resize');
  assert.equal(h.document.documentElement.style['--app-height'],'548px','do not undo magnification');
  const fallback=harness(); fallback.window.innerHeight=568; fallback.dispatch(fallback.window,'resize');
  assert.equal(fallback.document.documentElement.style['--app-height'],'568px');
});

test('short visible viewports switch meter arrangement and recover without undoing pinch zoom', () => {
  const h=harness({viewportHeight:664}), viewport=h.window.visualViewport;
  const compact=()=>h.get('device').classList.contains('ui-home-compact');
  assert.equal(compact(),false);
  viewport.height=548; h.dispatch(viewport,'resize');
  assert.equal(compact(),true);
  viewport.scale=2; viewport.height=700; h.dispatch(viewport,'resize');
  assert.equal(compact(),true,'zoom must not change the chosen arrangement');
  viewport.scale=1; h.dispatch(viewport,'resize');
  assert.equal(compact(),false,'recover the regular arrangement when room returns');
  const fallback=harness(); fallback.window.innerHeight=568; fallback.dispatch(fallback.window,'resize');
  assert.equal(fallback.get('device').classList.contains('ui-home-compact'),true);
});

test('a viewport resize lays out before the next reaction and does not cancel it on render', () => {
  const h=harness();
  // The DOM double has no initial HTML classes. In index.html this card is
  // hidden; a visible life card deliberately takes the home out of fit mode.
  h.get('lifeCardOverlay').classList.add('hidden');
  let height=240;
  h.get('castStage').getBoundingClientRect=()=>({width:294,height});
  h.api.render();
  const before=parseFloat(h.get('petSprite').style.width);
  height=120;
  h.api.setSpeechBubble('いっしょにあそべて、とってもうれしいよ。ずっとなかよしだよ！',{kind:'pet',emoji:'🐕',label:'なおとっち'},{event:'play_with'});
  const pet=h.get('petSprite'), animation=pet.animations.at(-1);
  assert.ok(parseFloat(pet.style.width)<before);
  assert.equal(animation.playState,'running');
  h.api.render();
  assert.equal(animation.playState,'running');
});

test('a new narration starts at the top while normal renders preserve the reading position', () => {
  const h=harness(), message=h.get('message');
  const text='きょうのできごとを思い出している。'.repeat(8);
  message.scrollTop=40;
  h.api.setMessage(text);
  assert.equal(message.textContent,text,'retain the full narration');
  assert.equal(message.scrollTop,0,'a new notice starts from its first line');
  message.scrollTop=20;
  h.api.render();
  assert.equal(message.scrollTop,20,'do not interrupt reading on a game render');
  h.advance(4200);
  assert.equal(message.textContent,'','keep the existing notice duration');
  assert.equal(message.scrollTop,0,'an empty notice resets its old position');
});

test('a new speech starts at its first line without truncating a long message', () => {
  const h=harness(), speech=h.get('speechText');
  const bubble=h.get('speechBubble');
  let readingPosition=0;
  // A scroll setter has no effect while display:none removes the CSS box.
  // Keep the saved position to model an expired bubble being shown again.
  Object.defineProperty(speech,'scrollTop',{
    get:()=>bubble.classList.contains('hidden')?0:readingPosition,
    set:value=>{if(!bubble.classList.contains('hidden'))readingPosition=value;},
  });
  const text='いっしょにいると楽しいね。'.repeat(8);
  h.api.setSpeechBubble(text,{kind:'pet',emoji:'🐢',label:'かめ'});
  assert.equal(speech.textContent,text);
  speech.scrollTop=25;
  h.advance(2500);
  assert.ok(bubble.classList.contains('hidden'));
  const next=text+'またあそぼう。';
  h.api.setSpeechBubble(next,{kind:'pet',emoji:'🐢',label:'かめ'});
  assert.equal(speech.textContent,next);
  assert.equal(speech.scrollTop,0);
  h.advance(2500);
  assert.ok(h.get('speechBubble').classList.contains('hidden'));
});

test('locked or invalid saved design IDs show selected classic fallback without changing the save', () => {
  const h=harness(), s=h.api.state();
  s.lifetime.screenThemeId='starlight'; s.lifetime.devicePatternId='missing';
  h.api.openExclusiveMenu('theme');
  assert.ok(h.get('screen').classList.contains('theme-default'));
  assert.ok(h.get('device').classList.contains('pattern-none'));
  assert.ok(h.get('screenThemeGrid').innerHTML.includes('data-id="default" aria-pressed="true"'));
  assert.ok(h.get('devicePatternGrid').innerHTML.includes('data-id="none" aria-pressed="true"'));
  assert.equal(s.lifetime.screenThemeId,'starlight');
});

test('every saved color and pattern has one shared preview definition and independent paint layers', () => {
  const css=fs.readFileSync('design.css','utf8'), js=fs.readFileSync('script.js','utf8');
  const colors=[...js.match(/const COLOR_THEMES = ([\s\S]*?\n  \]);/)[1].matchAll(/id: '([^']+)'/g)].map(m=>m[1]);
  const patterns=[...js.match(/const PATTERNS = ([\s\S]*?\n  \]);/)[1].matchAll(/id: '([^']+)'/g)].map(m=>m[1]);
  assert.equal(colors.length,40); assert.equal(patterns.length,40);
  for(const target of ['screen','device']) for(const id of colors) {
    const rules=[...css.matchAll(new RegExp('\\.surface-'+target+'\\.theme-'+id+'\\s*\\{([^}]+)\\}','g'))];
    assert.equal(rules.filter(m=>m[1].includes('--surface-color:')).length,1,target+'/'+id+' paints once');
  }
  for(const id of patterns) {
    const rules=[...css.matchAll(new RegExp('\\.pattern-'+id+'\\s*\\{([^}]+)\\}','g'))];
    assert.equal(rules.length,1);
    assert.ok(rules[0][1].includes('--pattern-image:'));
    assert.ok(!rules[0][1].includes('--surface-') && !rules[0][1].includes('background:'),'motif never erases color');
  }
  assert.ok(css.includes('background-image:var(--surface-image)'));
  assert.ok(css.includes('background-image:var(--pattern-image)'));
  assert.ok(!js.includes('deviceSwatch') && !js.includes('screenSwatch'),'no stale ticket palette');
});

test('screen palette samples retain at least 4.5 contrast with white and colored motifs', () => {
  // Numeric palette samples only, not browser text rasterization or iPhone QA.
  const css=fs.readFileSync('design.css','utf8');
  const rgb=h=>h.replace('#','').match(/../g).slice(0,3).map(v=>parseInt(v,16));
  const lum=c=>c.map(x=>x/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4).reduce((a,x,i)=>a+x*[.2126,.7152,.0722][i],0);
  const ratio=(a,b)=>(Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);
  const mix=(a,b,f)=>a.map((x,i)=>x*(1-f)+b[i]*f);
  assert.equal(ratio([0,0,0],[255,255,255]),21);
  for(const [,id,props] of css.matchAll(/\.surface-screen\.theme-([\w-]+)\s*\{([^}]+)\}/g)){
    if(!props.includes('--surface-color:'))continue;
    const wash=props.match(/linear-gradient\(#ffffff([0-9a-f]{2})/);
    const ink=rgb(id==='starlight'?'#fffaf3':'#34382f');
    const colors=[...props.matchAll(/#[0-9a-f]{6}(?![0-9a-f])/g)].map(m=>rgb(m[0]));
    for(let i=0;i<colors.length;i++)for(let step=0;step<=16;step++){
      let c=mix(colors[i],colors[(i+1)%colors.length],step/16);
      if(wash)c=mix(c,[255,255,255],parseInt(wash[1],16)/255);
      for(const overlay of [[255,255,255,.22],[255,94,168,.077],[255,210,63,.077],[85,230,165,.077],[79,195,247,.077],[199,125,255,.077],[255,255,255,0]]){
        const opacity=id==='starlight'?overlay[3]/.22*.18:overlay[3];
        assert.ok(ratio(ink,mix(c,overlay,opacity))>=4.5,id+' sample contrast');
      }
    }
  }
});
