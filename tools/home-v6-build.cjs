const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const out=path.resolve(process.argv[2]);
execFileSync(process.execPath,['tools/home-c-build.cjs',out],{stdio:'inherit'});
const read=f=>fs.readFileSync(path.join(out,f),'utf8'),write=(f,s)=>fs.writeFileSync(path.join(out,f),s);
fs.cpSync('assets/home-v6-20261029/runtime',path.join(out,'assets/home-v6-20261029/runtime'),{recursive:true});
for(const f of ['home-v6-manifest.mjs','home-v6-egg.mjs','home-v6-capture.mjs','home-v6-frame.mjs'])fs.copyFileSync(f,path.join(out,f));
write('home-v6-world.mjs',read('home-recovered-world.mjs').replace('{ART_CANDIDATES,selectRecoveredScene}','{WORLD_CANDIDATES as ART_CANDIDATES,selectRecoveredScene}').replace('./home-recovered-manifest.mjs','./home-v6-manifest.mjs'));
const {scopeConversation}=require('./home-ab-storage.cjs');
for(const [file,content] of Object.entries(require('./home-v6-baseline.cjs').baselineFiles(read)))write(file,content);
for(const scope of ['qa','sheet','play']){
 const origin=scope!=='play'?'qa-home-ab-a':'home-ab-play',stem=scope==='qa'?'qa-home-v6':scope==='sheet'?'qa-home-v6-sheet':'home-v6-play',oldKey=scope!=='play'?'naotocchi-home-ab-a-qa-v1':'naotocchi-home-ab-play-v1',key='naotocchi-home-v6-'+scope+'-v1';
 let script=read(origin+'-script.js').replaceAll(oldKey,key);
 script=script.replace('function renderHomeDiorama() {',`window.addEventListener('home-v6-egg-ready',()=>renderHomeCast());
  function renderHomeDiorama() {`);
 const marker='homeDiorama?.update(currentEnvironment(),{tier:mgPerfTier,available:![STAGE.EGG,STAGE.DEAD,STAGE.FAREWELL].includes(state.stage)});';
 if(!script.includes(marker))throw Error('v6 adapter: original presentation bridge missing');
 script=script.replace(marker,marker+`\nwindow.HomeV6Egg?.update({active:state.stage===STAGE.EGG&&currentEnvironment().region==='home',stage:el.castStage,sprite:el.petSprite,asset:currentVisualStage().asset,...currentEnvironment()});`);
 if(scope!=='play')script=script.replace(/\}\)\(\);\s*$/,`\nconst v6Scene=HomeV22QA.scene;HomeV22QA.scene=function(...args){state.stage=STAGE.GROWING;return v6Scene.apply(this,args);};
HomeV22QA.egg=function(){this.prepare();state.stage=STAGE.EGG;state.regionId='home';state.companions=[];state.partner=null;homeCastLayoutKey='';render();};
HomeV22QA.captureBackground=()=>homeDiorama.captureBackground();
HomeV22QA.eggState=()=>({stage:state.stage,asset:currentVisualStage().asset,growth:state.growth,hatchGrowth:HATCH_GROWTH,hosts:document.querySelectorAll('.home-v6-egg-world').length});
})();`);
 write(stem+'-script.js',script);write(stem+'-diorama.js',read(origin+'-diorama.js').replaceAll('home-ab-world.mjs','home-v6-world.mjs').replace('return {inspectScene:', 'return {captureBackground:()=>window.HomeV6Capture(worldHost,world),inspectScene:'));
 let html=read(origin+(scope!=='play'?'-game.html':'.html')).replaceAll(oldKey,key).replaceAll(origin+'-script.js',stem+'-script.js').replaceAll(origin+'-diorama.js',stem+'-diorama.js');
 for(const name of ['conversation-director','conversation-away']){const old='home-ab-'+(scope!=='play'?'a-qa':'play')+'-'+name+'.js',file='home-v6-'+scope+'-'+name+'.js';write(file,scopeConversation(fs.readFileSync(name+'.js','utf8'),'play').replaceAll('naotocchi-home-ab-play:','naotocchi-home-v6-'+scope+':'));html=html.replaceAll(old,file);}
 html=html.replace('</head>','<style>body[data-home-v6-egg] .world-scene{display:none}body[data-home-v6-egg] .device{position:relative;z-index:1}.home-v6-egg-world{pointer-events:none;overflow:hidden}.home-v6-egg-world img{max-width:none}body[data-home-v6-egg] #petSprite{filter:drop-shadow(0 3px 2px #36230c55)}</style><script type="module" src="home-v6-egg.mjs"></script><script type="module" src="home-v6-capture.mjs"></script></head>').replace('href="recovered.html"','href="home-v6.html"');
 write(stem+(scope!=='play'?'-game.html':'.html'),html);
}
write('home-v6-browser-check.js',read('home-recovered-browser-check.js').replaceAll('naotocchi-recovered-qa-v1','naotocchi-home-v6-qa-v1').replaceAll('qa-recovered-game.html','qa-home-v6-game.html').replace("e?.mode==='art-25d'&&e.loaded","(e?.mode==='art-25d'?e.loaded:['3d','canvas-3d'].includes(e?.mode))"));
write('home-v6-qa.html',read('home-recovered-qa.html').replaceAll('home-recovered-browser-check.js','home-v6-browser-check.js'));
if(fs.existsSync('tools/home-v6-gallery.html')){fs.copyFileSync('tools/home-v6-gallery.html',path.join(out,'home-v6.html'));fs.copyFileSync('tools/home-v6-gallery.js',path.join(out,'home-v6-gallery.js'));}
console.log('V6 additive C connection built. Previous runtime and storage preserved.');

for(const entry of ['index.html','home-c.html','home-ab.html'])write(entry,read(entry).replace('<body>','<body><nav style=\"padding:12px\"><a href=\"home-v6.html\">全13地域・C案操作版 version 6</a></nav>'));
