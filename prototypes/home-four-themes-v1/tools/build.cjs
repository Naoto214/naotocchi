// Packages existing production assets unchanged; fixture instrumentation stays in output only.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const ROOT=path.resolve(__dirname,'../../..'),SELF=path.resolve(__dirname,'..');
const out=path.resolve(process.argv[2]||'');if(!process.argv[2]||out===ROOT||out.startsWith(ROOT+'/'))throw Error('Choose an external output directory');
fs.mkdirSync(out,{recursive:true});const files=JSON.parse(fs.readFileSync(path.join(ROOT,'tools/pages/allowlist.json'))).files;
const sources=[];function copy(rel){const from=path.join(ROOT,rel),to=path.join(out,rel);fs.mkdirSync(path.dirname(to),{recursive:true});fs.copyFileSync(from,to);sources.push({path:rel,sha256:crypto.createHash('sha256').update(fs.readFileSync(from)).digest('hex')});}
for(const file of files)copy(file);
for(const dir of ['main-theme-20261108','main-theme-v2-20261108','main-theme-v3-morning-20261108','main-theme-favorites-20261108'])for(const file of fs.readdirSync(path.join(ROOT,'prototypes',dir)))if(file.endsWith('.js'))copy('prototypes/'+dir+'/'+file);
for(const file of ['index.html','style.css','selection.js','player.js','app.js','fixture.js'])copy('prototypes/home-four-themes-v1/'+file);
let html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
html=html.replace('<head>','<head>\n<script src="prototypes/home-four-themes-v1/fixture.js"></script>');
if(!/src="script\.js\?/.test(html))throw Error('Production script tag changed');
html=html.replace(/src="script\.js\?[^\"]*"/,'src="home-audition-runtime.js"');
fs.writeFileSync(path.join(out,'home-audition.html'),html);
let runtime=fs.readFileSync(path.join(ROOT,'script.js'),'utf8');
// Freeze care progression and unsolicited encounters in this disposable fixture.
// The original animation/render/motion timers and interaction handlers remain intact.
for(const anchor of ['setInterval(loop, TICK_MS);','  scheduleEnvironmentMoment();\n  scheduleIdleGreeting();\n  scheduleCompanionEncounter();']){
 if(!runtime.includes(anchor))throw Error('Fixture scheduler anchor changed');
 runtime=runtime.replace(anchor,'/* audition fixture: care progression / unsolicited events paused */');
}
const bridge=`
  // Isolated preview fixture; sample state and original renderer.
  state=freshState();Object.assign(state,{stage:STAGE.GROWING,speciesLine:'cat',stageIndex:3,ageTicks:32*AGE_TICKS_PER_YEAR,hunger:95,happiness:95,energy:95,health:100});
  Object.assign(state.lifetime,{soundBgm:false,soundSfx:false,timeMode:'morning',weatherMode:'sunny',seasonMode:'spring'});
  state.regionId='home';
  window.HomeAuditionFixture={setScene(region,time){
    if(!['home','forest','river_lake','city','countryside','mountain','snow','sea','jungle','desert','deepsea','star_stop','memory_lake'].includes(region)||!['morning','day','evening','night'].includes(time))return;
    state.regionId=region;state.lifetime.timeMode=time;
    window.NaotocchiDaypartsQA={region,time,weather:'sunny',season:'spring'};
    render();
    window.dispatchEvent(new Event('dayparts-qa-change'));
  }};
  render();window.parent.postMessage('home-audition-ready',location.origin);
`;
if(!/\}\)\(\);\s*$/.test(runtime))throw Error('Runtime fixture anchor missing');
runtime=runtime.replace(/\}\)\(\);\s*$/,bridge+'})();\n');
fs.writeFileSync(path.join(out,'home-audition-runtime.js'),runtime);
fs.writeFileSync(path.join(out,'index.html'),'<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="0;url=prototypes/home-four-themes-v1/"><title>なおとっち 音楽と風景</title><a href="prototypes/home-four-themes-v1/">試聴室を開く</a></html>');
fs.writeFileSync(path.join(out,'audition-source-manifest.json'),JSON.stringify({main:'e0120c58f36394c9acff6507d72ceb3a1f48e1e2',music:'740225ef3188dd6258be2f9293c7bc469421016c',sources},null,2));
console.log(JSON.stringify({out,files:sources.length}));
