'use strict';
const fs = require('node:fs');
const path = require('node:path');
const {listFiles, hashFiles} = require('../home-finish-v5/build.cjs');
const {digest, replaceExact} = require('../home-finish-v5/native-hooks.cjs');
const {patchObserver} = require('./observer.cjs');
const baselineHash = '52eaa0e4f313355867190804459a136767eda6ea5986ec3c0631e5c86173a529';
const baselineCount = 3990;

function prepare(base) {
  const {patchMovement} = require('./movement.cjs');
  const {patchSeats} = require('./seats.cjs');
  const {patchRender} = require('./render.cjs');
  const files = new Map();
  const read = name => fs.readFileSync(path.join(base,name),'utf8');
  const game = name => read('game/'+name);
  function script(html, previous, next, transform, versioned=true) {
    const old = game(previous), contents = transform(old);
    const filename = 'game/'+next;
    if(files.has(filename) && files.get(filename)!==contents) throw Error('Conflicting script: '+next);
    files.set(filename,contents);
    const oldRef = previous + (versioned ? '?v='+digest(old).slice(0,12) : '');
    return replaceExact(html,'src="'+oldRef+'"','src="'+next+'?v='+digest(contents).slice(0,12)+'"');
  }
  const v9Telemetry='telemetry-mobility-v9.js', v10Telemetry='telemetry-mobility-v10.js';
  const observers = html => script(html,v9Telemetry,v10Telemetry,patchObserver);
  for (const arm of ['v8','v9','v9-seats','v10','v10-seats','v10-reference']) {
    const reference = arm === 'v10-reference';
    const seats = arm.endsWith('-seats') || reference;
    const v10 = arm.startsWith('v10');
    const old = arm==='v8'?'v9-replay-v8':(seats?'v9-seats':'v9');
    let html = observers(game('mobility-'+old+'.html'));
    if(v10) {
      html=script(html,'home-production-model-mobility-'+old+'.js','home-production-model-mobility-'+arm+'.js',source=>{
        const moved=patchMovement(source);
        const scoped=reference ? replaceExact(moved,'next.compareFreshSeats === true && actors.length','next.compareFreshSeats === true && next.region === "forest" && actors.length') : seats ? patchSeats(moved) : moved;
        return replaceExact(scoped,"bindModel('"+old+"',","bindModel('"+arm+"',");
      });
      html=script(html,'home-production-diorama-mobility-v9.js','home-production-diorama-mobility-v10.js',source=>patchRender(source));
      // Native entry for direct testing uses the exact seeded V9 fixture.
      files.set('game/mobility-'+arm+'.html',html);
    }
    // Only the owner comparison shell uses the selectable actor random seed.
    // No simulation clock or original save is imported into the native game.
    const bridge=seats?'drag-trial-hooks-mobility-v9-seats.js':'drag-trial-hooks.js';
    const seed="Number(new URLSearchParams(location.search).get('trialSeed')==='937' ? 937 : 214)";
    html=script(html,bridge,seats?'drag-trial-hooks-v10-compare-seats.js':'drag-trial-hooks-v10-compare.js',source=>replaceExact(source,'let seed = 214;','let seed = '+seed+';'));
    html=script(html,'population-beauty.js','population-beauty-v10-compare.js',source=>replaceExact(source,'let actorSeed=214;','let actorSeed='+seed+';'),false);
    html=script(html,'beauty/fixture.js','beauty/fixture-v10-compare.js',source=>replaceExact(source,'let seed=214;','let seed='+seed+';'),false);
    files.set('game/mobility-v10-compare-'+arm+'.html',html);
  }
  let shell=read('v9/index.html').replace(/(data-arm="v|aria-label="V|>V)([789])(?=["の<])/g,
    (_,prefix,number)=>prefix+(Number(number)+1));
  shell=replaceExact(shell,'<option value="trial">配置の比較案（V9）</option>', '<option value="reference">V9で検証した初期配置を再現</option>');
  shell=replaceExact(shell,'      <p class="instructions">','      <label for="seed">比較する乱数<select id="seed"><option>214</option><option>937</option></select></label>\n      <p class="instructions">');
  shell=replaceExact(shell,'      </details>', '        <p><a href="./episode.html">犬が経路を得られなかった385秒の記録</a></p>\n      </details>');
  files.set('v10/index.html',shell);
  for (const name of ['episode.html','episode.mjs']) files.set('v10/'+name,fs.readFileSync(path.join(__dirname,name),'utf8'));
  const episode=JSON.parse(fs.readFileSync(path.join(__dirname,'dog-episode.json'),'utf8'));
  const ticks=episode.requests.map(r=>({
    seconds:r.clock,dog:r.from,goal:r.goal,accepted:r.accepted,
    feet:r.peers.filter(p=>p[0]!==r.key).map(p=>p.slice(1,3)),
    rays8:r.directions ? (r.directions.reachable[8]?.length??0) : null,
    ground:r.nativeRefusal?.terrain??null,
  }));
  files.set('v10/episode-data.json',JSON.stringify({scale:episode.summary.scale,recoveryCss:episode.summary.recoveryArrival.cssDistance,ticks}));
  files.set('v10/shell-model.mjs',fs.readFileSync(path.join(__dirname,'shell-model.mjs'),'utf8'));
  let controls=replaceExact(read('v9/controls.mjs'),'{readScene, sceneQuery, gameURL}','{readScene, sceneQuery, gameURL, offersSeats}');
  controls=replaceExact(controls,"scene.arm === 'v9' ? scene.seats", "offersSeats(scene) ? scene.seats");
  controls=replaceExact(controls,"scene.arm !== 'v9';", "!offersSeats(scene);\n  byId('seed').value = scene.seed;");
  controls=replaceExact(controls,"'time','seats']","'time','seats','seed']");
  controls=replaceExact(controls,"byId('seats').addEventListener","byId('seed').addEventListener('change', event => change({seed:event.target.value}));\nbyId('seats').addEventListener");
  files.set('v10/controls.mjs',controls);
  let diagnostics=replaceExact(read('v9/diagnostics.mjs'), 'const metrics = [',`const metrics = [
  ['本人の経路が成立しなかった最長時間','strictFailedFor'],
  ['本人の経路が再び成立した割合','ownRecoveryRate'],
  ['目的の方向に歩いた1回の平均変位','meanStrictDistance'],`);
  diagnostics=replaceExact(diagnostics,'const values = {',`const values = {
      strictFailedFor: secs(Math.max(row.longestRejected,row.firstRejectedAt===null?0:report.modelSeconds-row.firstRejectedAt)),
      ownRecoveryRate: row.ownRejections ? row.ownRecoveries+' / '+row.ownRejections+' 回' : '経路不成立なし',
      meanStrictDistance: row.goalWalks ? (row.strictDistanceCss/row.goalWalks).toFixed(1)+' CSS px' : '通常歩行待ち',`);
  files.set('v10/diagnostics.mjs',diagnostics);
  return files;
}

function build(destination, baseline) {
  const base=fs.realpathSync(baseline), out=path.resolve(destination);
  const contains=(a,b)=>a===b || b.startsWith(a+path.sep);
  let ancestor=out;
  while(!fs.existsSync(ancestor)) ancestor=path.dirname(ancestor);
  if(fs.realpathSync(ancestor)!==ancestor || [base,__dirname].some(dir=>contains(dir,out)||contains(out,dir))) throw Error('Use separate build directories');
  const originals=listFiles(base);
  if(originals.length!==baselineCount || hashFiles(base,originals)!==baselineHash) throw Error('Expected complete PR #579 private game');
  const files=prepare(base);
  const allowed=new Set([...originals,...files.keys()]);
  if(allowed.size!==originals.length+files.size) throw Error('Output collides with protected paths');
  const existing=fs.existsSync(out)?listFiles(out):[];
  if(existing.length) {
    if(existing.some(name=>!allowed.has(name)) || hashFiles(out,originals)!==baselineHash) throw Error('Unexpected previous build');
  } else fs.cpSync(base,out,{recursive:true,mode:fs.constants.COPYFILE_FICLONE});
  for(const [name,body] of files){
    const target=path.join(out,name);
    fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target+'.tmp',body);fs.renameSync(target+'.tmp',target);
  }
  return files.size;
}
if(require.main===module){
  const [out,flag,base,...rest]=process.argv.slice(2);
  if(!out||flag!=='--baseline'||!base||rest.length)throw Error('Usage: node build.cjs OUT --baseline V9_DIST');
  console.log('Added %d private files to %d protected files.',build(out,base),baselineCount);
}
module.exports={prepare,build,baselineCount,baselineHash};
