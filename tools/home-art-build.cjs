// Additive owner-only experiment. The v22 runtime in Git remains untouched.
const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const out=path.resolve(process.argv[2]);fs.mkdirSync(out,{recursive:true});
if(!fs.existsSync(path.join(out,'meguru.js')))execFileSync('python',['tools/home-art-base.py',out],{stdio:'inherit'});
execFileSync(process.execPath,['tools/home-v22-qa.cjs',out],{stdio:'inherit'});
for(const f of ['home-art-manifest.mjs','home-art-navigation.mjs','home-art-world.mjs','home-art.css'])fs.copyFileSync(f,path.join(out,f));
fs.cpSync('assets/home-art-v1',path.join(out,'assets/home-art-v1'),{recursive:true});
const read=f=>fs.readFileSync(path.join(out,f),'utf8'),write=(f,s)=>fs.writeFileSync(path.join(out,f),s);
const extra='<link rel="stylesheet" href="home-art.css">';
// Real play: original script including normal clock/rules, distinct save family.
write('art-play-script.js',fs.readFileSync('script.js','utf8').replaceAll('naotocchi-save-v1','naotocchi-art25d-play-v1'));
write('art-play-diorama.js',fs.readFileSync('home-diorama.js','utf8').replace("import('./home-world.mjs')","import('./home-art-world.mjs')"));
write('play.html',require('./home-preview-entry.cjs')().replaceAll('naotocchi-save-v1','naotocchi-art25d-play-v1').replace(/src="script.js[^\"]*"/,'src="art-play-script.js"').replace(/src="home-diorama.js[^\"]*"/,'src="art-play-diorama.js"').replace('</head>',extra+'</head>'));
// Synthetic QA A and B share the same seed, formal actors and frozen gameplay.
write('qa-art-script.js',read('qa-v22-script.js').replaceAll('naotocchi-home-v22-qa-v1','naotocchi-art25d-qa-v1'));
write('qa-art-diorama.js',read('qa-v22-diorama.js').replace("import('./home-world.mjs')","import('./home-art-world.mjs')"));
write('qa-art-game.html',read('qa-v22-game.html').replaceAll('naotocchi-home-v22-qa-v1','naotocchi-art25d-qa-v1').replace('qa-v22-script.js','qa-art-script.js').replace('qa-v22-diorama.js','qa-art-diorama.js').replace('</head>',extra+'</head>'));
write('qa-v22-script.js',read('qa-v22-script.js').replaceAll('naotocchi-home-v22-qa-v1','naotocchi-art25d-baseline-v1'));
write('qa-v22-game.html',read('qa-v22-game.html').replaceAll('naotocchi-home-v22-qa-v1','naotocchi-art25d-baseline-v1'));
write('home-v22-browser-check.js',read('home-v22-browser-check.js').replaceAll('naotocchi-home-v22-qa-v1','naotocchi-art25d-baseline-v1'));
write('home-art-browser-check.js',read('home-v22-browser-check.js').replaceAll('naotocchi-art25d-baseline-v1','naotocchi-art25d-qa-v1').replaceAll('qa-v22-game.html','qa-art-game.html').replace("['city', 'countryside', 'forest', 'mountain', 'snow', 'sea', 'deepsea', 'river_lake', 'jungle', 'desert', 'star_stop', 'memory_lake', 'home']","['forest','river_lake','city']"));
write('home-art-qa.html',read('home-v22-qa.html').replace('home-v22-browser-check.js','home-art-browser-check.js').replace('Home v22 景観比較','Home art 2.5D 検証'));
for(const [src,dest]of [['tools/home-art-gallery.html','index.html'],['tools/home-art-gallery.js','home-art-gallery.js']])fs.copyFileSync(src,path.join(out,dest));
console.log('Built independent art experiment; real play and both QA save families isolated.');

fs.copyFileSync('tools/home-art-report.html',path.join(out,'report.html'));
if(fs.existsSync('docs/design/home-art-evidence'))fs.cpSync('docs/design/home-art-evidence',path.join(out,'comparison'),{recursive:true});

// Wait for actual art navigation readiness, not a fixed cold-load delay.
// The complete failure still surfaces if image or model initialization stalls.
write('home-art-browser-check.js',read('home-art-browser-check.js').replace('await wait(1500);',`await wait(1500);let artReady=false;for(let n=0;n<150;n++){const q=frame.contentWindow.HomeV22QA,e=q.environment(),d=q.detail();if(e?.mode==='art-25d'&&e.loaded&&d.region===$('region').value&&d.actors.length===Number($('count').value)&&d.actors.every(a=>a.ground)){artReady=true;break;}await wait(100);}if(!artReady)throw Error('Art navigation did not become ready');`));

// Changing an unapplied selector during a cold load must not change that load's readiness target.
write('home-art-browser-check.js',read('home-art-browser-check.js').replace("frame.contentWindow.HomeV22QA.scene($('region').value,Number($('count').value),$('time').value);", "const appliedRegion=$('region').value,appliedCount=Number($('count').value);frame.contentWindow.HomeV22QA.scene(appliedRegion,appliedCount,$('time').value);").replace("d.region===$('region').value&&d.actors.length===Number($('count').value)","d.region===appliedRegion&&d.actors.length===appliedCount"));
