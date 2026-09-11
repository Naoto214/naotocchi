const fs = require('node:fs');
const vm = require('node:vm');

// Reuse the existing game harness only to create complete saves. The browser
// loads the unmodified index, stylesheet and game scripts from this checkout.
function createFixtures() {
  const harness = fs.readFileSync('tests/dialogue-test.js', 'utf8');
  // Vite relocates its bundled config; fixture imports still belong to tests/.
  const fixtureRequire = require('node:module').createRequire(require('node:path').resolve('tests/dialogue-test.js'));
  return vm.runInNewContext(harness + `
    (() => {
      const fixtures = {};
      const ids = [...api.COMPANIONS, ...api.RARE_COMPANIONS].map(c => c.id);
      const knownAchievements = api.ACHIEVEMENTS.filter(a => a.id !== 'dex-complete').map(a => a.id);
      const make = (name, count, patch = {}) => {
        reset({ sodachi:85, maxSodachi:85, hunger:70, legendMet:true,
          gender:'male', orientationId:'pan', attractedTo:['male','female','nonbinary'],
          partner:partner('robot_neighbor', { married:true }), marriageAge:0,
          marriageMilestonesSeen:[1,10,25,50], achievementsUnlocked:knownAchievements,
          companions:ids.slice(0,count).map(id => ({ id, bond:95 })), ...patch });
        const save = api.getState();
        save.lifetime.companionsRecruited = api.COMPANIONS.map(c => c.id);
        save.lifetime.rareCompanionsRecruited = api.RARE_COMPANIONS.map(c => c.id);
        save.lifetime.partnersRecorded = api.ALL_PARTNER_CANDIDATES.map(c => c.id);
        save.lifetime.partnersMarried = ['robot_neighbor'];
        fixtures[name] = JSON.parse(JSON.stringify(save));
        return fixtures[name];
      };
      for (const [name, count, weather, time, season] of [
        ['world_sea',2,'sunny','day','summer'],
        ['world_sea_night',2,'cloudy','night','winter'],
        ['world_sea_rain',2,'rain','morning','spring'],
        ['world_sea_full',26,'sunny','day','summer'],
        ['world_sea_snow',2,'snow','evening','winter'],
      ]) {
        const save=make(name,count,{regionId:'sea',speciesLine:'clownfish',hunger:80,health:90,energy:90,happiness:80});
        Object.assign(save.lifetime,{timeMode:time,weatherMode:weather,seasonMode:season,equippedItemId:'ribbon'});
        save.lifetime.ownedShopItems=['ribbon'];
      }
      for (const region of ['home','city','countryside','forest','mountain','snow','deepsea','river_lake','jungle','desert','star_stop','memory_lake']) {
        const save=make('world_'+region,2,{regionId:region,hunger:85,health:95,energy:95,happiness:90});
        Object.assign(save.lifetime,{timeMode:'day',weatherMode:'sunny',seasonMode:'summer',equippedItemId:'ribbon'});
        save.lifetime.ownedShopItems=['ribbon'];
      }
      for (const [name,region,season,weather,time] of [
        ['world_forest_autumn','forest','autumn','cloudy','evening'],
        ['world_forest_winter','forest','winter','snow','morning'],
        ['world_shore_rain','river_lake','spring','rain','day'],
        ['world_jungle_snow','jungle','winter','snow','day'],
      ]) {
        const save=make(name,2,{regionId:region,hunger:85,health:95,energy:95,happiness:90});
        Object.assign(save.lifetime,{seasonMode:season,weatherMode:weather,timeMode:time});
      }
      for (const [name,region,season,weather,time] of [
        ['scenery_city_night','city','autumn','sunny','night'],
        ['scenery_home_rain','home','autumn','rain','night'],
        ['scenery_home_snow','home','winter','snow','day'],
        ['scenery_country_winter','countryside','winter','snow','morning'],
        ['scenery_forest_night','forest','autumn','cloudy','night'],
      ]) {
        const save=make(name,2,{regionId:region,hunger:85,health:95,energy:95,happiness:90});
        Object.assign(save.lifetime,{seasonMode:season,weatherMode:weather,timeMode:time});
      }
      for(const [name,display,prefecture] of [['函館市','はこだてし','北海道'],['飯田市','いいだし','長野県'],['大阪市','おおさかし','大阪府'],['未登録町','みとうろくまち','北海道']]) {
        const save=make('scenery_local_'+name,2,{regionId:'home',hunger:85,health:95,energy:95,happiness:90});
        Object.assign(save.lifetime,{timeMode:'day',weatherMode:'sunny',seasonMode:'summer',currentLocationSelected:true,currentLocation:{name,display,prefecture}});
      }
      const worldCritical=make('world_sea_critical',26,{regionId:'sea',speciesLine:'clownfish',health:55,hunger:55,happiness:55,energy:55,deathMeter:85,dying:true,dyingTicks:80});
      Object.assign(worldCritical.lifetime,{timeMode:'night',weatherMode:'rain',seasonMode:'winter'});
      const worldLarge=make('world_sea_large',26,{regionId:'sea',hunger:85,health:95,energy:95,happiness:90});
      Object.assign(worldLarge.lifetime,{timeMode:'day',weatherMode:'sunny',seasonMode:'summer',textSize:'large'});
      const worldCriticalLarge=JSON.parse(JSON.stringify(worldCritical));
      worldCriticalLarge.lifetime.textSize='large';
      fixtures.world_sea_critical_large=worldCriticalLarge;
      const worldFarewell=make('world_farewell',2,{regionId:'sea',stage:'farewell',dying:false});
      Object.assign(worldFarewell.lifetime,{timeMode:'evening',weatherMode:'sunny',seasonMode:'summer'});
      for (const theme of ['starlight','rainbow']) {
        const save=make('world_theme_'+theme,2,{regionId:'sea',hunger:85,health:95,energy:95,happiness:90});
        Object.assign(save.lifetime,{timeMode:'day',weatherMode:'sunny',seasonMode:'summer',screenThemeId:theme,deviceThemeId:theme,screenPatternId:'checker',devicePatternId:'brick',clears:5,perfectCleared:true,endingTiersReached:[0,1,2,3,4]});
      }
      make('alone',0,{partner:null});
      make('egg',0,{stage:'egg',growth:0,ageTicks:0,sodachi:0,maxSodachi:0,partner:null});
      make('egg_cracking',0,{stage:'egg',growth:8,ageTicks:0,sodachi:0,maxSodachi:0,partner:null});
      make('egg_ready',0,{stage:'egg',growth:16,ageTicks:0,sodachi:0,maxSodachi:0,partner:null});
      make('pair',2);
      make('normal18',18);
      make('all26',26);
      make('legacy28',26).companions.push({id:'koala',bond:95},{id:'kinoko',bond:95});
      const equipped = make('equipped',26);
      equipped.lifetime.ownedShopItems = ['crown'];
      equipped.lifetime.equippedItemId = 'crown';
      equipped.items.fun_bubbles = 1;
      make('legend',26,{sodachi:95,maxSodachi:95});
      make('sleeping',26,{isSleeping:true,energy:20});
      make('sick',26,{isSick:true,sicknessType:'かぜ'});
      // Status fixtures use the same production save format and life rules.
      // Critical scenes have a short real lifetime; load again to observe care.
      make('care_health_zero',26,{health:0,hunger:0,happiness:0,energy:0,
        deathMeter:0,lowHealthStreak:0,totalSicknessCount:10,isSick:false,ageTicks:101});
      make('care_low_health',26,{health:20,hunger:45,happiness:80,energy:80});
      make('care_life_danger',26,{health:55,hunger:55,happiness:55,energy:55,deathMeter:85,dying:true,dyingTicks:40});
      make('care_hungry',26,{hunger:15,health:90,happiness:80,energy:80});
      make('care_tired',26,{energy:15,hunger:80,health:90,happiness:80});
      make('care_unhappy',26,{happiness:15,hunger:80,health:90,energy:80});
      make('care_decline',26,{decline:75,hunger:80,happiness:80,health:90,energy:80});
      make('care_sleep_full',26,{isSleeping:true,energy:100,hunger:80,happiness:80,health:90});
      make('care_sleep_hungry',26,{isSleeping:true,energy:25,hunger:15,happiness:80,health:90});
      make('care_sick',26,{isSick:true,sicknessType:'しんぞうがバクバクするびょうき',health:25,hunger:80,happiness:80,energy:80});
      make('care_sick_only',26,{isSick:true,sicknessType:'しんぞうがバクバクする、とてもながいなまえのびょうき',health:90,hunger:80,happiness:80,energy:80});
      for (const [name, region, deathMeter, isSick, time] of [
        ['care_attention_sick','sea',0,true,'day'],
        ['care_attention_low_life','sea',65,false,'night'],
        ['care_attention_critical','snow',85,true,'day'],
      ]) {
        const save=make(name,26,{regionId:region,speciesLine:'clownfish',deathMeter,isSick,
          sicknessType:isSick?'かぜ':null,health:90,hunger:55,happiness:80,energy:80,
          growth:0,decline:0,totalSicknessCount:10,ageTicks:101});
        Object.assign(save.lifetime,{timeMode:time,weatherMode:'sunny',seasonMode:'summer',
          buttonTransparency:80,infoReadability:0,equippedItemId:'ribbon'});
        save.lifetime.ownedShopItems=['ribbon'];
      }
      const careLarge=make('care_large',26,{isSick:true,sicknessType:'げんいんふめいのこうねつ',health:20,hunger:80});
      careLarge.lifetime.textSize='large';
      make('care_infinite',26,{infinite:true,health:0,hunger:0,energy:0,deathMeter:95});
      const illustrated=make('ui_illustrations',26,{hunger:80,health:90,energy:80,happiness:80});
      illustrated.lifetime.money=9999;
      illustrated.lifetime.ownedShopItems=['flower','ribbon','bowtie','poop1','scarf','glasses','energy1','hat','travel1','sleepboost1','star','bond1','partner1','crown','itemluck1'];
      illustrated.lifetime.equippedItemId='ribbon';
      illustrated.lifetime.endingTiersReached=[0,1,2,3];
      illustrated.lifetime.ownedNaotoItems=['naoto_charm','naoto_lantern','naoto_ring','naoto_crown'];
      illustrated.lifetime.clears=1;illustrated.lifetime.lifeClears=1;illustrated.lifetime.bestLives=1;illustrated.lifetime.dexCleared=true;
      illustrated.lifetime.consumablesUsed=2;
      for(const id of ['fun_candy','fun_bubbles','fun_balloon','fun_fireworks','fun_camera','fun_musicbox','fun_surprise']) illustrated.items[id]=2;
      const allBadges=JSON.parse(JSON.stringify(illustrated));
      Object.assign(allBadges,{isSick:true,sicknessType:'げんいんふめいのこうねつ',isSleeping:true,energy:35});
      allBadges.lifetime.endingTiersReached=[0,1,2,3,4];
      fixtures.badges_transparent=allBadges;
      const comments=make('comment_illustrations',26,{ageTicks:619,hunger:80,health:90,energy:80,happiness:80});
      comments.lifetime.money=9999;comments.lifetime.consumablesUsed=2;
      for(const id of ['fun_candy','fun_bubbles','fun_balloon','fun_fireworks','fun_camera','fun_musicbox','fun_surprise']) comments.items[id]=2;
      const notices=make('notice_food_illustrations',26,{ageTicks:619,hunger:80,health:90,energy:80,happiness:80});
      notices.achievementsUnlocked=api.ACHIEVEMENTS.filter((a,i)=>i%2===0).map(a=>a.id);
      notices.lifetime.achievementUnlockedAt=Object.fromEntries(notices.achievementsUnlocked.map(id=>[id,Date.now()]));
      const props=make('context_prop_illustrations',26,{ageTicks:1200,hunger:80,health:90,energy:80,happiness:80});
      props.lifetime.money=9999;
      Object.assign(props.lifetime,{timeMode:'morning',weatherMode:'sunny'});
      for(const [name,season,region] of [
        ['season_spring','spring','home'],['season_autumn','autumn','forest'],['season_summer_sea','summer','sea'],
        ['scenery_animals_farm','spring','countryside'],['scenery_animals_snow','spring','snow'],
        ['scenery_memory_lake','summer','memory_lake'],
        ['stack_harvest','summer','countryside'],['stack_sakura','spring','home'],
        ['stack_leaves','autumn','forest'],
      ]) {
        const scene=make(name,26,{regionId:region,hunger:80,health:90,energy:80,happiness:80});
        Object.assign(scene.lifetime,{seasonMode:season,weatherMode:'sunny',timeMode:'day'});
        if(region==='memory_lake')Object.assign(scene,{sodachi:75,maxSodachi:75});
      }
      for(const [name,season,weather,time] of [
        ['scenery_clouds','winter','cloudy','day'],['scenery_snow','winter','snow','night'],
        ['scenery_moon','summer','sunny','night'],['scenery_rain','spring','rain','day'],
      ]) {
        const scene=make(name,26,{regionId:'home',hunger:80,health:90,energy:80,happiness:80});
        Object.assign(scene.lifetime,{seasonMode:season,weatherMode:weather,timeMode:time});
      }
      make('mushroom',26,{speciesLine:'mushroom',stageIndex:7});
      make('goal4',26,{discoveredStages:allForms.slice(),achievementsUnlocked:[]});
      make('goal5',26,{discoveredStages:allForms.slice(),achievementsUnlocked:api.ACHIEVEMENTS.map(a=>a.id)});
      const greeting = make('author',26);
      greeting.lifetime.dexCleared = true;
      greeting.lifetime.endingTiersReached = [3];
      make('anniversary',2,{ageTicks:499,marriageAge:0,marriageMilestonesSeen:[1,10]});
      for (const years of [1,10,25,50]) {
        make('anniversary_' + years,26,{ageTicks:(25+years)*20-1,marriageAge:25,
          marriageMilestonesSeen:[1,10,25,50].filter(y=>y<years)});
      }
      make('anniversary_10_scrolled',26,{ageTicks:696,marriageAge:25,marriageMilestonesSeen:[1]});
      // Leave four real ticks for pre-movie care/scroll operations on BP-1.
      for (const years of [1,50]) {
        const delayed = make('anniversary_' + years + '_scrolled',26,{
          ageTicks:(25+years)*20-4,marriageAge:25,
          marriageMilestonesSeen:[1,10,25,50].filter(y=>y<years)});
        if (years === 50) delayed.lifetime.money = 123456789;
      }
      const legendPending = make('legend_boss',26,{partner:null,legendMet:false,
        sodachi:95,maxSodachi:95,hunger:100,energy:100,happiness:100});
      legendPending.lifetime.legendsMet = ['gate','stairs','lamp','mirror'];
      legendPending.lifetime.money = 362;
      const legendCared = make('legend_boss_cared',26,{partner:null,legendMet:false,
        sodachi:95,maxSodachi:95,hunger:85,energy:100,happiness:100});
      legendCared.lifetime.legendsMet = ['gate','stairs','lamp','mirror'];
      legendCared.oneTimeBoosts.sicknessShieldCount = 12;
      // Constrain only the saved encounter history; story and trigger RNG stay real.
      for (const id of ['gate','stairs','lamp','mirror']) {
        const pending = make('legend_' + id + '_cared',26,{partner:null,legendMet:false,
          sodachi:95,maxSodachi:95,hunger:85,energy:100,happiness:100});
        pending.lifetime.legendsMet = ['gate','stairs','boss','lamp','mirror'].filter(other=>other!==id);
        pending.oneTimeBoosts.sicknessShieldCount = 12;
      }
      const specialDate = make('special_date',26,{items:{reward:1},datesThisLife:2});
      specialDate.lifetime.money = 123456789;
      const specialTwo = make('special_date_two',26,{items:{reward:2},datesThisLife:2});
      specialTwo.lifetime.money = 123456789;
      const specialRing = make('special_date_ring',26,{items:{reward:1},datesThisLife:2});
      specialRing.lifetime.ownedNaotoItems = ['naoto_ring'];
      make('deepsea_date',26,{regionId:'deepsea',partner:partner('anglerfish',{married:true})});
      make('deepsea_special_date',26,{regionId:'deepsea',partner:partner('anglerfish',{married:true}),
        items:{reward:1},datesThisLife:2});
      const scrolledAnniversary = make('anniversary_scrolled',26,{ageTicks:1498,
        marriageAge:25,marriageMilestonesSeen:[1,10,25]});
      scrolledAnniversary.lifetime.money = 123456789;
      make('firstEncounter',26,{partner:null,regionId:'city'});
      const freeForm = make('freeForm',26,{infinite:true,infiniteForm:{line:'man',stageIndex:7}});
      freeForm.lifetime.perfectCleared = true;
      freeForm.lifetime.endingTiersReached = [3,4];
      for (const candidate of api.ALL_PARTNER_CANDIDATES) {
        make('partner_' + candidate.id,26,{partner:partner(candidate.id,{married:true})});
      }
      for (const regionId of new Set(master.partners.map(p=>p.firstRegion))) {
        const first = make('first_' + regionId,26,{partner:null,regionId});
        first.lifetime.partnersRecorded = [];
        first.lifetime.partnersMarried = [];
        first.lifetime.partnerEncounters = [];
      }
      return fixtures;
    })()
  `, { require:fixtureRequire, console:{log() {}} });
}

// This route is registered only by Vite's development server. It is not a
// production page and it never injects functions into the game closure.
function visualQaPlugin() {
  const fixtures = createFixtures();
  return {
    name: 'naotocchi-visual-qa',
    configureServer(server) {
      server.middlewares.use('/__qa', (req, res) => {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store');
        res.end(`<!doctype html><html lang="en"><meta charset="utf-8">
          <title>Naotocchi PR visual QA</title>
          <style>body{margin:16px;font:14px system-ui;background:#e4e8ed;color:#192536}label{margin-right:12px}button,select{font:inherit;padding:6px}iframe{display:block;border:1px solid #8a98a8;margin:14px 0;background:white}output{position:absolute;left:820px;top:110px;white-space:pre-wrap;max-width:500px}h1{font-size:18px}</style>
          <h1>PR visual QA — real game in an iframe</h1>
          <p>Development saves only. Load replaces this preview origin's save.</p>
          <p>For stack_* scenes, open プロフィール → ゲームを選ぶ, then choose しゅうかくタワー / さくらタワー / おちばタワー. The missing-image option also applies to their Canvas motifs. Layout measurements below cover the home UI, not the Canvas picture.</p>
          <p>For comment_illustrations, the next age tick shows a birthday notice. Use the small items and おせわ to inspect illustrated notices and speech portraits with 26 companions and a partner. The missing-image option covers new comment portraits too; SVG symbols remain readable without an image download.</p>
          <p>For notice_food_illustrations, open じっせき to compare unlocked pictures, locks, recent marks and goals. In ゲームきろく, choose ケーキデコレーション or おべんとうづくり. Check the preview, tray, dropped food, wrong slots and completion text. These fixtures do not establish browser or device verification.</p>
          <p>For context_prop_illustrations, choose the road, space-flight, highway and memory-card games in ゲームきろく. Check 20 distinct card positions, loading and missing-image fallback. River/desert marks can be checked by travel; morning birds require an environment notice. This does not change region decoration routing or certify real device rendering.</p>
          <label>Scene <select id="scene">${Object.keys(fixtures).map(k=>'<option>'+k+'</option>').join('')}</select></label>
          <label>Width <select id="width"><option>320</option><option selected>390</option><option>768</option></select></label>
          <label>Height <select id="height"><option>640</option><option selected>844</option><option>1000</option></select></label>
          <label><input type="checkbox" id="failIcons">Simulate missing icon image</label>
          <button id="load">Load scene</button> <button id="measure">Measure layout</button>
          <button id="loadMovie">Load and observe next movie</button>
          <button id="observe">Observe motion (4s)</button>
          <button id="observeStory">Observe story (9s)</button>
          <button id="observeMovie">Observe movie (32s)</button>
          <output id="result"></output><div id="mount"></div>
          <script>
          const fixtures=${JSON.stringify(fixtures).replace(/</g,'\\u003c')};
          const mount=document.getElementById('mount');
          let observationToken=0;
          const iconLoads=new Map();
          function loadScene(watchMovie=false){
            observationToken++;
            // Let the old game finish its unload save before installing the fixture.
            mount.replaceChildren();
            setTimeout(()=>{
              localStorage.setItem('naotocchi-save-v1',JSON.stringify(fixtures[document.getElementById('scene').value]));
              const frame=document.createElement('iframe');frame.title='Game preview';frame.id='game';
              if(document.getElementById('failIcons').checked) frame.addEventListener('load',()=>{
                const style=frame.contentDocument.createElement('style');
                style.textContent='.care-icon,#message[data-care-icon]::before,.world-backdrop{background-image:url("/__qa-missing-icon.png")!important}';
                frame.contentDocument.head.append(style);
                frame.contentDocument.querySelectorAll('img[data-icon-atlas]').forEach(img=>{img.src='/__qa-missing-icon.png';});
                const failScenery=()=>frame.contentDocument.querySelectorAll('img.scenery-asset,img.comment-asset,img[data-prop-image],img.world-prop').forEach(img=>{
                  if(img.dataset.qaOriginalSrc)return;
                  img.dataset.qaOriginalSrc=img.getAttribute('src');img.src='/__qa-missing-icon.png';
                });
                const observer=new MutationObserver(failScenery);
                observer.observe(frame.contentDocument.body,{childList:true,subtree:true});failScenery();
                frame.contentWindow.addEventListener('pagehide',()=>observer.disconnect(),{once:true});
              },{once:true});
              frame.width=document.getElementById('width').value;frame.height=document.getElementById('height').value;frame.src='/';mount.append(frame);
              document.getElementById('result').textContent='Loaded '+document.getElementById('scene').value;
              if(watchMovie)observeNextMovie();
            },0);
          }
          document.getElementById('load').onclick=()=>loadScene();
          document.getElementById('loadMovie').onclick=()=>loadScene(true);
          function measure(){
            const doc=document.getElementById('game')?.contentDocument;
            if(!doc||doc.readyState==='loading'||!doc.getElementById('petArea'))return;
            const area=doc.getElementById('petArea').getBoundingClientRect();
            const chips=[...doc.querySelectorAll('.companion-chip-small')];
            const outside=chips.filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&(r.left<area.left||r.right>area.right||r.top<area.top||r.bottom>area.bottom)});
            const images=[...doc.images].filter(e=>e.getBoundingClientRect().width>0);
            // Keep failed/hidden PNGs in the report after their emoji appears.
            const sceneryPictures=[...doc.querySelectorAll('.scenery-picture')].map(wrapper=>{
              const img=wrapper.querySelector('img'),rect=wrapper.getBoundingClientRect();
              return {src:img.getAttribute('src'),originalSrc:img.dataset.qaOriginalSrc||null,
                complete:img.complete,loaded:img.complete&&img.naturalWidth>0,
                fallback:wrapper.classList.contains('asset-failed'),width:rect.width,height:rect.height};
            });
            // CSS sprite sheets are not doc.images. Track their actual URLs so
            // a failed atlas cannot be reported as "all images loaded".
            const iconNodes=[...doc.querySelectorAll('.care-icon')].filter(e=>e.getBoundingClientRect().width>0);
            const backgrounds=iconNodes.map(e=>doc.defaultView.getComputedStyle(e).backgroundImage);
            backgrounds.push(doc.defaultView.getComputedStyle(doc.getElementById('message'),'::before').backgroundImage);
            // A failed atlas is removed from computed backgrounds by fallback
            // CSS. Hidden probes keep it in the measured resource set.
            const probeSources=[...doc.querySelectorAll('img[data-icon-atlas]')].map(img=>img.src);
            const iconSources=[...new Set([...backgrounds.map(s=>s.match(/url\\(["']?(.*?)["']?\\)/)?.[1]),...probeSources].filter(Boolean))];
            for(const src of iconSources) if(!iconLoads.has(src)){
              const record={src,status:'pending'};iconLoads.set(src,record);
              const image=new Image();image.onload=()=>record.status='loaded';image.onerror=()=>record.status='failed';image.src=src;
            }
            const iconImages=iconSources.map(src=>({...iconLoads.get(src)}));
            const panelOverflow=[...doc.querySelectorAll('.dex-scroll,.profile-scroll')].filter(e=>e.clientWidth>0&&e.scrollWidth>e.clientWidth).map(e=>({panel:e.className,width:e.clientWidth,contentWidth:e.scrollWidth}));
            const intersects=(a,b)=>a.width>0&&b.width>0&&a.left<b.right&&b.left<a.right&&a.top<b.bottom&&b.top<a.bottom;
            const hero=doc.getElementById('petSprite').getBoundingClientRect();
            const attachments=['partnerCompanion','petAccessory'].map(id=>doc.getElementById(id).getBoundingClientRect()).filter(r=>r.width>0);
            const detached=attachments.filter(r=>Math.abs((r.left+r.right-hero.left-hero.right)/2)>hero.width/2+12||hero.top-r.bottom>32).length;
            const actors=[...chips.map(e=>e.getBoundingClientRect()),hero,...attachments];
            const speech=doc.getElementById('speechBubble').getBoundingClientRect();
            const story=doc.getElementById('storyFlash').getBoundingClientRect();
            const storyText=doc.getElementById('storyFlashText');
            const storyTextOverflow=story.width>0&&storyText.scrollWidth>storyText.clientWidth;
            const profile=doc.getElementById('profilePartnerCard');
            const storyOutsideViewport=story.width>0&&(story.top<0||story.bottom>doc.documentElement.clientHeight);
            const speechOverlap=actors.some(r=>intersects(r,speech));
            // Whole PNG frames include intentional transparent padding. Inspect
            // their conservative alpha hulls at their actual rendered positions.
            // Keep the old rectangular result visible as a separate diagnostic.
            const actorFrameOverlap=actors.some((r,i)=>actors.slice(i+1).some(other=>intersects(r,other)));
            const actorNodes=[...chips,doc.getElementById('petSprite'),doc.getElementById('partnerCompanion'),doc.getElementById('petAccessory')].filter(e=>e.getBoundingClientRect().width>0);
            const painted=actorNodes.map(e=>{
              const image=e.querySelector('img'),loaded=image?.complete&&image.naturalWidth>0;
              const r=(loaded?image:e).getBoundingClientRect();
              const hull=loaded&&doc.defaultView.NaotocchiCastBounds?.[image.getAttribute('src')?.split('?')[0]]?.hull;
              return (hull||[[0,0],[128,0],[128,128],[0,128]]).map(([x,y])=>[r.left+x*r.width/128,r.top+y*r.height/128]);
            });
            const polygonsOverlap=(a,b)=>{
              for(const p of [a,b])for(let i=0;i<p.length;i++){
                const q=p[(i+1)%p.length],dx=q[0]-p[i][0],dy=q[1]-p[i][1];
                if(!dx&&!dy)continue;
                const aa=a.map(v=>-dy*v[0]+dx*v[1]),bb=b.map(v=>-dy*v[0]+dx*v[1]);
                if(Math.max(...aa)<=Math.min(...bb)||Math.max(...bb)<=Math.min(...aa))return false;
              }
              return true;
            };
            const overlapPairs=painted.flatMap((p,i)=>painted.slice(i+1).flatMap((other,j)=>polygonsOverlap(p,other)?[[i,i+j+1]]:[]));
            const actorOverlap=overlapPairs.length>0;
            const movie=doc.getElementById('dateMovieScene');
            const movieBounds=movie.getBoundingClientRect();
            const moviePanel=doc.getElementById('dateMovie').getBoundingClientRect();
            const movieOutsideViewport=movieBounds.width>0&&(moviePanel.top<0||moviePanel.bottom>doc.documentElement.clientHeight);
            const movieActors=[...doc.querySelectorAll('.date-movie-actor .character-visual')].map(e=>e.getBoundingClientRect()).filter(r=>r.width>0);
            const movieCaptionNode=doc.getElementById('dateMovieCaption');
            const movieCaption=movieCaptionNode.getBoundingClientRect();
            const movieCaptionOverflow=movieBounds.width>0&&(movieCaptionNode.scrollWidth>movieCaptionNode.clientWidth||movieCaptionNode.scrollHeight>movieCaptionNode.clientHeight);
            const movieCaptionOutside=movieBounds.width>0&&(movieCaption.left<movieBounds.left||movieCaption.right>movieBounds.right||movieCaption.top<movieBounds.top||movieCaption.bottom>movieBounds.bottom);
            const movieActorRow=doc.querySelector('.date-movie-actors');
            const movieOverflow=movieBounds.width>0&&movieActorRow.scrollWidth>movieActorRow.clientWidth;
            const movieClipped=movieActors.some(r=>r.left<movieBounds.left||r.right>movieBounds.right||r.top<movieBounds.top||r.bottom>movieBounds.bottom);
            const movieCaptionOverlap=movieActors.some(r=>intersects(r,movieCaption));
            const farewellBounds=doc.getElementById('farewellBar').getBoundingClientRect();
            const farewellOverlap=[...doc.querySelectorAll('.home-meters,#message,.buttons')].some(e=>intersects(farewellBounds,e.getBoundingClientRect()));
            const layoutChecksPass=outside.length===0&&!speechOverlap&&!actorOverlap&&!detached&&!panelOverflow.length&&!storyOutsideViewport&&!storyTextOverflow&&!movieOverflow&&!movieClipped&&!movieCaptionOverlap&&!movieCaptionOverflow&&!movieCaptionOutside&&!movieOutsideViewport&&!farewellOverlap&&doc.documentElement.scrollWidth<=doc.documentElement.clientWidth;
            const result={scene:document.getElementById('scene').value,width:doc.documentElement.clientWidth,
              height:doc.documentElement.clientHeight,pageHeight:doc.documentElement.scrollHeight,
              stylesheet:doc.querySelector('link[rel="stylesheet"]').getAttribute('href'),
              worldStylesheet:doc.querySelector('link[href^="world-scene.css"]')?.getAttribute('href')||null,
              gameScript:doc.querySelector('script[src^="script.js"]').getAttribute('src'),
              heroAsset:doc.querySelector('#petSprite img')?.getAttribute('src')||null,
              actorFrameOverlap,
              farewellOverlap,
              world:doc.getElementById('worldScene')?{...doc.getElementById('worldScene').dataset,
                backdrop:doc.defaultView.getComputedStyle(doc.getElementById('worldBackdrop')).backgroundImage,
                motion:doc.body.dataset.worldMotion,paused:doc.body.dataset.worldPaused,
                care:doc.getElementById('device').dataset.worldCare}:null,
              careNotice:doc.getElementById('message').textContent,
              careSeverity:doc.getElementById('message').dataset.careSeverity||'',
              careNoticeHeight:doc.getElementById('message').getBoundingClientRect().height,
              careNoticeOverflow:doc.getElementById('message').scrollHeight>doc.getElementById('message').clientHeight,
              careRecommended:[...doc.querySelectorAll('[data-care-recommended="true"]')].map(e=>e.id),
              careButtonBounds:[...doc.querySelectorAll('.buttons button')].map(e=>{const r=e.getBoundingClientRect();return {id:e.id,x:r.x,y:r.y,width:r.width,height:r.height};}),
              iconImages,missingIconsRequested:document.getElementById('failIcons').checked,
              iconSurfaces:iconNodes.map(e=>{const s=doc.defaultView.getComputedStyle(e);return {icon:e.dataset.uiIcon||e.dataset.careIcon,backgroundColor:s.backgroundColor,clipPath:s.clipPath};}),
              badgeBounds:[...doc.querySelectorAll('#badges .care-icon,#endingBadges .ending-badge')].map(e=>{const r=e.getBoundingClientRect();return {label:e.getAttribute('aria-label'),x:r.x,y:r.y,width:r.width,height:r.height};}),
              environment:{time:doc.body.dataset.time,weather:doc.body.dataset.weather,
                reducedMotion:doc.defaultView.matchMedia('(prefers-reduced-motion: reduce)').matches,
                rainDrops:doc.querySelectorAll('#weatherFx .wx-drop').length,
                snowflakes:doc.querySelectorAll('#weatherFx .wx-flake').length,
                clouds:doc.querySelectorAll('#weatherFx .wx-cloud').length,
                sceneryIcons:[...new Set([...doc.querySelectorAll('#weatherFx [data-ui-icon],#regionDecor [data-ui-icon],#seasonBgFx [data-ui-icon],#seasonFrontFx [data-ui-icon]')].map(e=>e.dataset.uiIcon))],
                decorAnimations:[...new Set([...doc.querySelectorAll('.region-decor-item')].map(e=>doc.defaultView.getComputedStyle(e).animationName))]},
              storyVisible:story.width>0,storyText:story.width>0?storyText.textContent:null,storyTextOverflow,
              storyAsset:story.width>0?doc.querySelector('#storyFlashEmoji img')?.getAttribute('src')||null:null,
              profileVisible:profile.getBoundingClientRect().width>0,
              profilePartnerAsset:doc.querySelector('#profilePartnerCard img')?.getAttribute('src')||null,
              profilePartnerText:profile.getBoundingClientRect().width>0?profile.textContent.trim():null,
              partnerAsset:doc.querySelector('#partnerCompanion img')?.getAttribute('src')||null,
              moviePetAsset:doc.querySelector('#dateMoviePet img')?.getAttribute('src')||null,
              moviePartnerAsset:doc.querySelector('#dateMoviePartner img')?.getAttribute('src')||null,
              movieVisible:movieBounds.width>0,movieOverflow,movieClipped,movieCaptionOverlap,movieOutsideViewport,
              moviePanelBounds:{top:moviePanel.top,bottom:moviePanel.bottom,height:moviePanel.height},
              movieCaptionOverflow,movieCaptionOutside,
              movieText:movieBounds.width>0?movieCaptionNode.textContent:null,
              movieTitle:movieBounds.width>0?doc.getElementById('dateMoviePlace').textContent:null,
              movieComplete:movieBounds.width>0&&!doc.getElementById('dateMovieCloseBtn').classList.contains('hidden'),
              movieRowWidth:movieActorRow.clientWidth,movieRowContentWidth:movieActorRow.scrollWidth,
              moviePetDisplay:doc.defaultView.getComputedStyle(doc.getElementById('dateMoviePet')).display,
              movieAnimation:doc.defaultView.getComputedStyle(doc.getElementById('dateMoviePet')).animationName,
              petDisplay:doc.defaultView.getComputedStyle(doc.getElementById('pet')).display,
              areaWidth:Math.round(area.width),speechOverlap,actorOverlap,overlapPairs,detached,panelOverflow,storyOutsideViewport,
              animations:[doc.getElementById('pet'),doc.getElementById('petSprite')].map(e=>doc.defaultView.getComputedStyle(e).animationName),
              companions:chips.length,outside:outside.length,
              sceneryPictures,
              pendingImages:images.filter(e=>!e.complete).length,
              brokenImages:images.filter(e=>e.complete&&!e.naturalWidth).length,
              horizontalOverflow:doc.documentElement.scrollWidth>doc.documentElement.clientWidth,
              layoutChecksPass,checksPass:layoutChecksPass&&images.every(e=>e.complete&&e.naturalWidth)&&iconImages.every(e=>e.status==='loaded')&&sceneryPictures.every(e=>e.loaded)};
            return result;
          }
          document.getElementById('measure').onclick=()=>document.getElementById('result').textContent=JSON.stringify(measure(),null,2);
          function observe(duration){
            const token=++observationToken;
            const samples=[];const start=performance.now();
            document.getElementById('result').textContent='Observing';
            function sample(){
              if(token!==observationToken)return;
              samples.push(measure());
              if(performance.now()-start<duration){requestAnimationFrame(sample);return;}
              const failed=samples.filter(s=>!s.checksPass);
              document.getElementById('result').textContent=JSON.stringify({scene:samples[0].scene,width:samples[0].width,height:samples[0].height,
                samples:samples.length,failedFrames:failed.length,firstFailure:failed[0],
                layoutFailedFrames:samples.filter(s=>!s.layoutChecksPass).length,
                pendingImageFrames:samples.filter(s=>s.pendingImages>0).length,
                brokenImageFrames:samples.filter(s=>s.brokenImages>0).length,
                movieVisibleFrames:samples.filter(s=>s.movieVisible).length,
                movieBeats:[...new Set(samples.filter(s=>s.movieVisible).map(s=>s.movieText))],
                movieTitles:[...new Set(samples.filter(s=>s.movieVisible).map(s=>s.movieTitle))],
                moviePetAssets:[...new Set(samples.filter(s=>s.movieVisible).map(s=>s.moviePetAsset))],
                moviePartnerAssets:[...new Set(samples.filter(s=>s.movieVisible).map(s=>s.moviePartnerAsset))],
                movieCompleteFrames:samples.filter(s=>s.movieComplete).length,
                gameScripts:[...new Set(samples.map(s=>s.gameScript))],
                storyBeats:[...new Set(samples.filter(s=>s.storyVisible).map(s=>s.storyText))],
                storyAssets:[...new Set(samples.filter(s=>s.storyVisible).map(s=>s.storyAsset))],
                storyVisibleFrames:samples.filter(s=>s.storyVisible).length,
                movieAnimations:[...new Set(samples.map(s=>s.movieAnimation))],
                animations:[...new Set(samples.flatMap(s=>s.animations))],checksPass:!failed.length},null,2);
            }
            requestAnimationFrame(sample);
          }
          // Observe UI only: never replace the game's clock/RNG or call its closure.
          // Watch as soon as the iframe DOM is ready; do not wait for image load.
          function observeNextMovie(){
            const token=++observationToken;
            const started=performance.now();const samples=[];const transitions=[];
            let opened=null,completed=null,previousFrame=null,maxFrameGapMs=0;
            let hiddenBeforeOpening=false,lastWaitingReport=-1000;
            let lastWaitingFrame=null,openingFrameGapMs=null;
            document.getElementById('result').textContent='Waiting for next movie';
            function finish(reason){
              const first=samples[0];
              const failures=samples.filter(s=>!s.checksPass);
              document.getElementById('result').textContent=JSON.stringify({
                mode:'next-movie',scene:document.getElementById('scene').value,reason,
                hiddenBeforeOpening,waitMs:opened===null?performance.now()-started:opened-started,
                observedMovieMs:opened===null?0:performance.now()-opened,
                completeAtMs:completed===null?null:completed-opened,maxFrameGapMs,openingFrameGapMs,
                continuousSampling:openingFrameGapMs!==null&&maxFrameGapMs<1000,
                width:first?.width,height:first?.height,samples:samples.length,
                failedFrames:failures.length,firstFailure:failures[0],
                layoutFailedFrames:samples.filter(s=>!s.layoutChecksPass).length,
                pendingImageFrames:samples.filter(s=>s.pendingImages>0).length,
                brokenImageFrames:samples.filter(s=>s.brokenImages>0).length,
                movieVisibleFrames:samples.filter(s=>s.movieVisible).length,
                movieCompleteFrames:samples.filter(s=>s.movieComplete).length,
                movieBeats:transitions,movieTitles:[...new Set(samples.map(s=>s.movieTitle))],
                moviePetAssets:[...new Set(samples.map(s=>s.moviePetAsset))],
                moviePartnerAssets:[...new Set(samples.map(s=>s.moviePartnerAsset))],
                movieAnimations:[...new Set(samples.map(s=>s.movieAnimation))],
                gameScripts:[...new Set(samples.map(s=>s.gameScript))],
                checksPass:samples.length>0&&hiddenBeforeOpening&&openingFrameGapMs!==null&&maxFrameGapMs<1000&&reason==='complete'&&!failures.length
              },null,2);
            }
            function sample(){
              if(token!==observationToken)return;
              const now=performance.now();const value=measure();
              if(!value){
                if(now-started>=10000)return finish('frame-unavailable');
                requestAnimationFrame(sample);return;
              }
              if(opened===null){
                if(!value.movieVisible){
                  hiddenBeforeOpening=true;
                  lastWaitingFrame=now;
                  if(now-started>=600000)return finish('start-timeout');
                  if(now-started-lastWaitingReport>=1000){
                    lastWaitingReport=now-started;
                    document.getElementById('result').textContent='Waiting for next movie: '+Math.floor((now-started)/1000)+'s';
                  }
                  requestAnimationFrame(sample);return;
                }
                opened=now;
                openingFrameGapMs=lastWaitingFrame===null?null:now-lastWaitingFrame;
                if(openingFrameGapMs!==null)maxFrameGapMs=openingFrameGapMs;
                document.getElementById('result').textContent='Observing next movie';
              }
              if(!value.movieVisible)return finish('closed-before-observation-finished');
              if(previousFrame!==null)maxFrameGapMs=Math.max(maxFrameGapMs,now-previousFrame);
              previousFrame=now;samples.push(value);
              if(!transitions.length||transitions[transitions.length-1].text!==value.movieText){
                transitions.push({atMs:now-opened,text:value.movieText});
              }
              if(value.movieComplete&&completed===null)completed=now;
              if(completed!==null&&now-completed>=1000)return finish('complete');
              if(now-opened>=45000)return finish('completion-timeout');
              requestAnimationFrame(sample);
            }
            requestAnimationFrame(sample);
          }
          document.getElementById('observe').onclick=()=>observe(4000);
          document.getElementById('observeStory').onclick=()=>observe(9000);
          document.getElementById('observeMovie').onclick=()=>observe(32000);
          </script></html>`);
      });
    },
  };
}

module.exports = visualQaPlugin;
