const fs = require('node:fs');
const vm = require('node:vm');

// Reuse the existing game harness only to create complete saves. The browser
// loads the unmodified index, stylesheet and game scripts from this checkout.
function createFixtures() {
  const harness = fs.readFileSync('tests/dialogue-test.js', 'utf8');
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
      make('alone',0,{partner:null});
      make('egg',0,{stage:'egg',ageTicks:0,sodachi:0,maxSodachi:0,partner:null});
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
  `, { require, console:{log() {}} });
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
          <label>Scene <select id="scene">${Object.keys(fixtures).map(k=>'<option>'+k+'</option>').join('')}</select></label>
          <label>Width <select id="width"><option>320</option><option selected>390</option><option>768</option></select></label>
          <label>Height <select id="height"><option>640</option><option selected>844</option><option>1000</option></select></label>
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
          function loadScene(watchMovie=false){
            observationToken++;
            // Let the old game finish its unload save before installing the fixture.
            mount.replaceChildren();
            setTimeout(()=>{
              localStorage.setItem('naotocchi-save-v1',JSON.stringify(fixtures[document.getElementById('scene').value]));
              const frame=document.createElement('iframe');frame.title='Game preview';frame.id='game';
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
            const actorOverlap=actors.some((r,i)=>actors.slice(i+1).some(other=>intersects(r,other)));
            const overlapPairs=actors.flatMap((r,i)=>actors.slice(i+1).flatMap((other,j)=>intersects(r,other)?[[i,i+j+1]]:[]));
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
            const layoutChecksPass=outside.length===0&&!speechOverlap&&!actorOverlap&&!detached&&!panelOverflow.length&&!storyOutsideViewport&&!storyTextOverflow&&!movieOverflow&&!movieClipped&&!movieCaptionOverlap&&!movieCaptionOverflow&&!movieCaptionOutside&&!movieOutsideViewport&&doc.documentElement.scrollWidth<=doc.documentElement.clientWidth;
            const result={scene:document.getElementById('scene').value,width:doc.documentElement.clientWidth,
              height:doc.documentElement.clientHeight,pageHeight:doc.documentElement.scrollHeight,
              stylesheet:doc.querySelector('link[rel="stylesheet"]').getAttribute('href'),
              gameScript:doc.querySelector('script[src^="script.js"]').getAttribute('src'),
              heroAsset:doc.querySelector('#petSprite img')?.getAttribute('src')||null,
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
              pendingImages:images.filter(e=>!e.complete).length,
              brokenImages:images.filter(e=>e.complete&&!e.naturalWidth).length,
              horizontalOverflow:doc.documentElement.scrollWidth>doc.documentElement.clientWidth,
              layoutChecksPass,checksPass:layoutChecksPass&&images.every(e=>e.complete&&e.naturalWidth)};
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
