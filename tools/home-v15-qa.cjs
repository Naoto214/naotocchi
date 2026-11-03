// QA-only instrumentation. Not part of the production package.
const fs=require('fs'),path=require('path');const out=path.resolve(process.argv[2]);
const old=fs.readFileSync(path.join(out,'qa-v14-script.js'),'utf8');
for(const f of ['home-diorama.js','home-diorama.css','care-status.js','script.js'])if(!fs.existsSync(path.join(out,'v15-before-'+f)))fs.copyFileSync(path.join(out,f),path.join(out,'v15-before-'+f));
if(!fs.existsSync(path.join(out,'v15-before.html'))){let h=fs.readFileSync(path.join(out,'game.html'),'utf8');for(const f of ['home-diorama.js','home-diorama.css','care-status.js','script.js'])h=h.replaceAll('"'+f,'"v15-before-'+f);fs.writeFileSync(path.join(out,'v15-before.html'),h);}
for(const f of ['home-diorama.js','home-diorama.css','care-status.js'])fs.copyFileSync(f,path.join(out,f));
let source=fs.readFileSync('script.js','utf8').replaceAll('naotocchi-save-v1','naotocchi-home-diorama-preview-v1');fs.writeFileSync(path.join(out,'script.js'),source);fs.copyFileSync('index.html',path.join(out,'game.html'));
let fixture=old.slice(old.indexOf('  const qp=new URLSearchParams')).replaceAll('home-v14-qa-v1','home-v15-qa-v1');
const extra=`
window.HomeV15QA=HomeV14QA;
const choiceResult15=showHomeChoiceResult;showHomeChoiceResult=function(text){choiceResult15(text);clearTimeout(homeChoiceResultTimer);homeChoiceResultTimer=null;};
const prepare15=HomeV15QA.prepare;HomeV15QA.prepare=function(){prepare15.call(this);closeCompanionInvite();pendingCompanionId=null;hideHomeChoiceResult();clearTimeout(storyFlashTimer);storyFlashTimer=null;homeNoticeQueue.length=0;clearTimeout(messageTimer);message='';clearCareFeedback();state.deathMeter=0;state.isSleeping=false;render();};
Object.assign(HomeV15QA,{
 async observe(seconds=30){
  this.prepare();this.live();const scene=homeDiorama.inspectScene(),samples=[],frames=[];let previous=performance.now(),running=true;
  const frame=t=>{frames.push(t-previous);previous=t;if(running)requestAnimationFrame(frame);};requestAnimationFrame(frame);
  for(let n=0;n<seconds;n++){await new Promise(r=>setTimeout(r,1000));samples.push({second:n+1,...this.metrics(),sameScene:scene===homeDiorama.inspectScene(),heap:performance.memory?.usedJSHeapSize||null});if(n%6===0)this.both();if(n%6===3){hideSpeechBubble();message='';render();}}
  running=false;frames.sort((a,b)=>a-b);return{seconds,frames:frames.length,medianFrameMs:frames[Math.floor(frames.length*.5)],p95FrameMs:frames[Math.floor(frames.length*.95)],samples};
 },
 sick(){this.prepare();state.isSick=true;render();},
 multiple(){this.sick();state.deathMeter=90;render();},
 sickEvent(){this.sick();showStoryEvent({emoji:'🏆',message:'重要な実績を達成！コイン +50'});},
 cure(){state.isSick=false;state.deathMeter=0;message='';render();},
 deltas(){this.prepare();setMessage('そだち＋1 / おとろえ−2 / げんき＋2');},
 sadLeft(){this.prepare();state.happiness=5;render();homeDiorama.model.setFacing('pet',-1);homeDiorama.sync();},
 sadRight(){this.sadLeft();homeDiorama.model.setFacing('pet',1);homeDiorama.sync();},
 sickLeft(){this.sick();homeDiorama.model.setFacing('pet',-1);homeDiorama.sync();},
 sickRight(){this.sick();homeDiorama.model.setFacing('pet',1);homeDiorama.sync();},
 happyLeft(){this.prepare();startPetExpression('happy',600000);render();homeDiorama.model.setFacing('pet',-1);homeDiorama.sync();},
 happyRight(){this.happyLeft();homeDiorama.model.setFacing('pet',1);homeDiorama.sync();},
 married(){this.prepare();if(state.partner){state.partner.married=true;state.partner.label='とても長い名前のもりのクマさん';state.partner.affection=98;}state.lifetime.endingTiersReached=[0,1,2,3,4];state.lifetime.clears=1;render();},
 noPartner(){this.prepare();state.partner=null;render();},
 infinite(){this.prepare();state.infinite=true;render();},
 angry(){this.prepare();startPetExpression('strained',600000);render();},
 surprised(){this.prepare();castMotion?.speak({event:'surprise',speaker:petSpeaker()});},
 gauges(){this.prepare();state.hunger=1;state.happiness=100;state.energy=2;state.health=99;state.deathMeter=99;state.decline=100;render();},
});
`;
fixture=fixture.replace(/\}\)\(\);\s*$/,extra+'\n})();');
source=source.replaceAll('naotocchi-home-diorama-preview-v1','naotocchi-home-v15-qa-v1').replace('function scheduleCompanionEncounter() {','function scheduleCompanionEncounter() { return; /* QA excludes random invite overlays. */').replace('setInterval(loop, TICK_MS);','/* QA clock paused, RAF lives. */').replace(/\}\)\(\);\s*$/,fixture);
fs.writeFileSync(path.join(out,'qa-v15-script.js'),source);
fs.writeFileSync(path.join(out,'qa-v15-diorama.js'),fs.readFileSync('home-diorama.js','utf8').replace('return {model,update,sync,interrupt,','return {inspectScene:()=>scene,model,update,sync,interrupt,'));
fs.copyFileSync(path.join(out,'qa-v14-model.js'),path.join(out,'qa-v15-model.js'));
let html=require('./home-preview-entry.cjs')().replace(/src="script.js[^\"]*"/,'src="qa-v15-script.js"').replace(/src="home-diorama.js[^\"]*"/,'src="qa-v15-diorama.js"').replace(/src="home-diorama-model.js[^\"]*"/,'src="qa-v15-model.js"');fs.writeFileSync(path.join(out,'qa-v15-game.html'),html);
let page=fs.readFileSync(path.join(out,'v14-qa.html'),'utf8').replaceAll('HomeV14QA','HomeV15QA').replaceAll('home-v14-qa-v1','home-v15-qa-v1').replaceAll('qa-v14-game.html','qa-v15-game.html').replaceAll('V14確認','V15確認');
page=page.replace('<pre id="qaMetrics"','<nav>'+['sick','multiple','sickEvent','cure','deltas','sadLeft','sadRight','sickLeft','sickRight','happyLeft','happyRight','married','noPartner','gauges','infinite','angry','surprised'].map(a=>'<button data-action="'+a+'">'+a+'</button>').join('')+'</nav><pre id="qaMetrics"');page=page.replace('<option value="qa-v14-baseline.html">V13修正前</option>','<option value="v15-before-qa.html">V14比較</option>');fs.writeFileSync(path.join(out,'v15-qa.html'),page);
let landing=fs.readFileSync(path.join(out,'index.html'),'utf8').replaceAll('V14','V15').replaceAll('version 14','version 15').replaceAll('v14-qa.html','v15-qa.html');fs.writeFileSync(path.join(out,'index.html'),landing);
console.log('V15 QA and separated preview prepared');

fs.copyFileSync('tools/home-v15-browser-check.js',path.join(out,'home-v15-browser-check.js'));fs.appendFileSync(path.join(out,'v15-qa.html'),'<script src="home-v15-browser-check.js"></script>');

// Reproducible v14 baseline uses the same disposable QA seed, never the real preview save.
let before=fs.readFileSync(path.join(out,'v15-before.html'),'utf8');
before=before.replace(/src="v15-before-script.js[^\"]*"/,'src="qa-v15-before-script.js"').replace(/src="home-diorama-model.js[^\"]*"/,'src="qa-v14-model.js"');
fs.writeFileSync(path.join(out,'v15-before-qa.html'),before);
fs.writeFileSync(path.join(out,'qa-v15-before-script.js'),old.replaceAll('home-v14-qa-v1','home-v15-qa-v1')+'\nwindow.HomeV15QA=window.HomeV14QA;');
