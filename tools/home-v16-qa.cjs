// Explicit disposable QA, never shipped in the production allowlist.
const fs=require('fs'),path=require('path');const out=path.resolve(process.argv[2]);
const old=fs.readFileSync(path.join(out,'qa-v15-script.js'),'utf8');
const extras=`
window.HomeV16QA=HomeV15QA;
HomeV16QA.dispose=()=>homeDiorama.destroy();
const prep16=HomeV16QA.prepare;HomeV16QA.prepare=function(){if(individualityDialogOpen)closeIndividualityDialog();prep16.call(this);this.freeze();hideSpeechBubble();el.speechSlot.scrollTop=0;};
Object.assign(HomeV16QA,{
 sayText(text){this.prepare();setSpeechBubble(text,petSpeaker(),{holdMs:600000});},
 shortJP(){this.sayText('もうむり。ねる');},mediumJP(){this.sayText('あくびに返事とられた');},
 noticeShort(){this.prepare();setMessage('おやすみモード');},
 noticeMedium(){this.prepare();setMessage('びょうきではないのに、くすりを飲ませた');},
 noticeEnglish(){this.prepare();setMessage('A very long English notification, with enough words to wrap safely inside the fixed notice area.');},
 questionLong(){this.question();if(conv2Unit?.question){el.speechText.textContent='長い質問も全文を読むことができます。'.repeat(4);for(const b of el.speechChoices.children)b.textContent+='：この選択肢も省略せずに読むための長い文章です。';}},
 sampleFrame(ms){for(const a of el.petSprite.querySelector('.pet-expression-accent--sleeping')?.getAnimations({subtree:true})||[]){a.pause();a.currentTime=ms;}},
 stage(n){this.prepare();state.ageTicks=stageMinsForLine(state.speciesLine)[n]*AGE_TICKS_PER_YEAR;state.sodachi=10+n*10;state.isSleeping=true;render();homeDiorama.sync();},
 inspect(){const rect=n=>n?.getBoundingClientRect().toJSON();return{state:JSON.stringify(state),scene:homeDiorama.inspectScene(),actors:homeDiorama.model.snapshot().map(a=>({key:a.key,x:a.x,y:a.y})),bounds:homeDiorama.model.snapshot().map(a=>({key:a.key,...homeDiorama.model.bounds(a)})),slots:Object.fromEntries(['homeInformation','homeEventSlot','castStage','speechSlot','careMeters','lifeMeterRow','careActions'].map(id=>[id,rect(document.getElementById(id))]))};}
});
`;
for(const f of ['home-diorama.js','home-diorama.css','qa-v15-script.js','qa-v15-diorama.js'])if(!fs.existsSync(path.join(out,'v16-before-'+f)))fs.copyFileSync(path.join(out,f),path.join(out,'v16-before-'+f));
fs.writeFileSync(path.join(out,'v16-before-qa-v15-script.js'),old.replace(/\}\)\(\);\s*$/,"HomeV15QA.noticeShort=function(){this.prepare();setMessage('おやすみモード');};\n})();"));
let before=fs.readFileSync(path.join(out,'qa-v15-game.html'),'utf8').replaceAll('qa-v15-script.js','v16-before-qa-v15-script.js').replaceAll('qa-v15-diorama.js','v16-before-qa-v15-diorama.js').replaceAll('home-diorama.css','v16-before-home-diorama.css');fs.writeFileSync(path.join(out,'v16-before.html'),before);
let fixture=old.slice(old.indexOf('  const qp=new URLSearchParams')).replace(/\}\)\(\);\s*$/,extras+'\n})();');
let src=fs.readFileSync('script.js','utf8').replaceAll('naotocchi-save-v1','naotocchi-home-v15-qa-v1').replace('function scheduleCompanionEncounter() {','function scheduleCompanionEncounter() { return;').replace('setInterval(loop, TICK_MS);','/* Disposable QA clock paused. */').replace(/\}\)\(\);\s*$/,fixture);
fs.writeFileSync(path.join(out,'qa-v16-script.js'),src);
fs.writeFileSync(path.join(out,'qa-v16-diorama.js'),fs.readFileSync('home-diorama.js','utf8').replace('return {model,update,sync,interrupt,','return {inspectScene:()=>scene,model,update,sync,interrupt,'));
for(const f of ['home-diorama.js','home-diorama.css'])fs.copyFileSync(f,path.join(out,f));
fs.writeFileSync(path.join(out,'script.js'),fs.readFileSync('script.js','utf8').replaceAll('naotocchi-save-v1','naotocchi-home-diorama-preview-v1'));
fs.copyFileSync('index.html',path.join(out,'game.html'));
let game=fs.readFileSync('index.html','utf8').replace(/src="script.js[^\"]*"/,'src="qa-v16-script.js"').replace(/src="home-diorama.js[^\"]*"/,'src="qa-v16-diorama.js"').replace(/src="home-diorama-model.js[^\"]*"/,'src="qa-v15-model.js"');fs.writeFileSync(path.join(out,'qa-v16-game.html'),game);
let page=fs.readFileSync(path.join(out,'v15-qa.html'),'utf8').replaceAll('qa-v15-game.html','qa-v16-game.html').replaceAll('v15-before-qa.html','v16-before.html').replaceAll('V15確認','V16確認').replaceAll('V14比較','V15比較');
page=page.replace("async function start(){","async function start(){try{document.getElementById('game').contentWindow.HomeV16QA?.dispose();}catch(_){}");
page=page.replace("old.onload=resolve;old.src='about:blank';","old.onload=resolve;old.src='about:blank';setTimeout(resolve,500);");
page=page.replace('<script src="home-v15-browser-check.js"></script>','<script src="home-v16-browser-check.js"></script>');
page=page.replace('<pre id="qaMetrics"','<nav>'+['shortJP','mediumJP','noticeShort','noticeMedium','noticeEnglish','questionLong'].map(a=>'<button data-action="'+a+'">'+a+'</button>').join('')+'</nav><pre id="qaMetrics"');
page=page.replace('</style>','nav{gap:3px;padding:3px}button,select{padding:3px}p{margin:4px}#qaMetrics:empty{display:none}</style>');
page=page.replace('<pre id="qaMetrics"','<nav>'+[0,900,1800,2700,3600].map(n=>'<button data-frame="'+n+'">Frame '+n+'ms</button>').join('')+[0,1,2,3,4,5,6,7].map(n=>'<button data-stage="'+n+'">Stage '+n+'</button>').join('')+'</nav><pre id="qaMetrics"');
page+=`<script>document.querySelectorAll('[data-frame]').forEach(b=>b.onclick=()=>{const d=document.getElementById('game').contentDocument;for(const a of d.querySelector('#petSprite .pet-expression-accent--sleeping')?.getAnimations({subtree:true})||[]){a.pause();a.currentTime=+b.dataset.frame;}});document.querySelectorAll('[data-stage]').forEach(b=>b.onclick=()=>document.getElementById('game').contentWindow.HomeV16QA.stage(+b.dataset.stage));</script>`;
fs.writeFileSync(path.join(out,'v16-qa.html'),page);fs.copyFileSync('tools/home-v16-browser-check.js',path.join(out,'home-v16-browser-check.js'));
console.log('Prepared v16 QA and exact v15 baseline. Preview save families unchanged.');
