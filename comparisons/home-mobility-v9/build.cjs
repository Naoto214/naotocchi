'use strict';

const fs = require('node:fs');
const path = require('node:path');
const {listFiles, hashFiles} = require('../home-finish-v5/build.cjs');
const {digest, replaceExact} = require('../home-finish-v5/native-hooks.cjs');
const baselineHash = '8612640d1b70a37c622a3416f23fbef7ae981084b3c811dd6903ead3b9907820';
const baselineCount = 3976;

// Keep the longest observed failure even after the observer's small example buffer fills.
function observe(source) {
  const fields = 'goalWalks:0,longestResolvedFailure:0,_ownGoal:null,failureEpisodes:0,';
  let body = replaceExact(source, 'failureEpisodes:0,', fields);
  body = replaceExact(body, 'if(r.recoverySamples.length<8)',
    'r.longestResolvedFailure=Math.max(r.longestResolvedFailure,t-r._episode.start);\n        if(r.recoverySamples.length<8)');
  body = replaceExact(body, "r[prefix+'Plans']++;", `if(prefix==='ambient'){
          const scale=model()?.scene?.navigation?.intentScale;
          r._ownGoal=scale&&!a.ambientEscape?{x:a.x,y:a.y,gx:q.goal.x,gy:q.goal.y,sx:scale.x,sy:scale.y}:null;
        }
        r[prefix+'Plans']++;`);
  return replaceExact(body, "if(a.source==='ambient'&&a.ambientEscape)r.escapeArrivals++;", `if(a.source==='ambient'&&a.ambientEscape)r.escapeArrivals++;
      const g=r._ownGoal;
      if(a.source==='ambient'&&!a.ambientEscape&&g){
        const pixels=(dx,dy)=>Math.hypot(dx*g.sx,dy*g.sy);
        if(pixels(a.x-g.x,a.y-g.y)>=8 && pixels(g.gx-g.x,g.gy-g.y)-pixels(g.gx-a.x,g.gy-a.y)>.75)r.goalWalks++;
      }
      r._ownGoal=null;`);
}

function prepare(base) {
  const {patchMovement} = require('./movement.cjs');
  const {patchRender} = require('./render.cjs');
  const {patchSeats} = require('./seats.cjs');
  const read = name => fs.readFileSync(path.join(base, name), 'utf8');
  const local = name => fs.readFileSync(path.join(__dirname, name), 'utf8');
  const files = new Map();
  function script(html, prior, name, body) {
    files.set('game/' + name, body);
    return replaceExact(html, prior + '?v=' + digest(read('game/' + prior)).slice(0, 12),
      name + '?v=' + digest(body).slice(0, 12));
  }
  function inGame(name, body) { files.set('game/mobility-' + name + '.html', body); }
  const v8 = read('game/mobility-v8.html');
  const oldObserver = 'telemetry-mobility-v8.js';
  const newObserver = 'telemetry-mobility-v9.js';
  const observed = observe(read('game/' + oldObserver));
  const stage = script(v8, oldObserver, newObserver, observed);
  inGame('v9-replay-v8', stage);
  inGame('v9-replay-v7', script(read('game/mobility-v7.html'), 'telemetry.js', 'telemetry-mobility-v9-replay-v7.js', observe(read('game/telemetry.js'))));
  const controller = 'home-production-diorama-mobility-v8.js';
  const rendered = script(stage, controller, 'home-production-diorama-mobility-v9.js', patchRender(read('game/' + controller), 'diorama'));
  const oldModel = 'home-production-model-mobility-v8.js';
  const movement = patchMovement(read('game/' + oldModel));
  function model(label, body) {
    return script(rendered, oldModel, 'home-production-model-mobility-' + label + '.js', replaceExact(body, "bindModel('v8',", "bindModel('" + label + "',"));
  }
  inGame('v9', model('v9', movement));
  const bridge = 'drag-trial-hooks.js';
  inGame('v9-seats', script(model('v9-seats', patchSeats(movement)), bridge, 'drag-trial-hooks-mobility-v9-seats.js',
    replaceExact(read('game/' + bridge), 'sync(rows,scene);\n        controller.repaint();', 'sync(rows,{...scene,compareFreshSeats:true});\n        controller.repaint();')));
  const shell = read('v8/index.html').split('\n').map(line => {
    const arm = line.match(/data-arm="(v[678])"/)?.[1];
    if (!arm) return line;
    const next = 'v' + (Number(arm.slice(1)) + 1);
    return line.replaceAll(arm, next).replaceAll(arm.toUpperCase(), next.toUpperCase());
  }).join('\n');
  const seats = '<label for="seats">初期配置<select id="seats"><option value="original">従来の配置</option><option value="trial">配置の比較案（V9）</option></select></label>';
  files.set('v9/index.html', replaceExact(shell, '      <p class="instructions">', '      ' + seats + '\n      <p class="instructions">'));
  files.set('v9/shell-model.mjs', local('shell-model.mjs'));
  files.set('v9/controls.mjs', replaceExact(replaceExact(replaceExact(read('v8/controls.mjs'),
    "  byId('toolbar-count').textContent", "  byId('seats').value = scene.arm === 'v9' ? scene.seats : 'original';\n  byId('seats').disabled = scene.arm !== 'v9';\n  byId('toolbar-count').textContent"),
    "['arm','region','count','time']", "['arm','region','count','time','seats']"),
    "byId('restart').addEventListener", "byId('seats').addEventListener('change', event => change({seats:event.target.value}));\nbyId('restart').addEventListener"));
  const measures = `  ['目的の方向に8px以上歩き終えた回数','goalWalks'], ['通常歩行の到着（全距離）','normalArrivals'], ['自律経路の成立率','successPercent'],
  ['総移動距離','actualDistance'], ['自分の通常歩行距離','normalDistance'],
  ['退避で歩いた距離','escapeDistance'], ['ほかの住民に譲った距離','yieldDistance'],
  ['経路失敗から再び歩くまでの最長時間（継続中を含む）','failedFor'],`;
  files.set('v9/diagnostics.mjs', replaceExact(replaceExact(read('v8/diagnostics.mjs'),
    'const metrics = [', 'const metrics = [\n' + measures),
    "    metrics.forEach(([,key],i)=>{fields[i].textContent=key==='lastMovedAgo'?secs(row[key]):String(row[key]??'—');});",
    local('diagnostic-values.js').trimEnd()));
  return files;
}

function build(destination, baseline) {
  const base=fs.realpathSync(baseline), out=path.resolve(destination);
  const inside=(parent,child)=>parent===child || child.startsWith(parent+path.sep);
  let ancestor=out;
  while(!fs.existsSync(ancestor)) ancestor=path.dirname(ancestor);
  if(fs.realpathSync(ancestor)!==ancestor || [base,__dirname].some(dir=>inside(dir,out)||inside(out,dir)))
    throw Error('Use a separate output directory');
  const originals=listFiles(base);
  if(originals.length!==baselineCount || hashFiles(base,originals)!==baselineHash)
    throw Error('Expected the complete pinned PR #578 bundle');
  const files=prepare(base);
  for(const name of files.keys()) if(originals.includes(name))throw Error('Existing V8 path: '+name);
  const existing=fs.existsSync(out)?listFiles(out):[];
  if(existing.length) {
    const allowed=new Set([...originals,...files.keys()]);
    if(existing.some(name=>!allowed.has(name)) || hashFiles(out,originals)!==baselineHash)
      throw Error('Unexpected files in the build destination');
  } else fs.cpSync(base,out,{recursive:true,mode:fs.constants.COPYFILE_FICLONE});
  for(const [name,body] of files){
    const target=path.join(out,name);
    fs.mkdirSync(path.dirname(target),{recursive:true});
    fs.writeFileSync(target+'.tmp',body);
    fs.renameSync(target+'.tmp',target);
  }
  return files.size;
}

if(require.main===module){
  const [out,flag,base,...rest]=process.argv.slice(2);
  if (!out || flag!=='--baseline' || !base || rest.length)throw Error('Usage: node build.cjs OUT --baseline V8_DIST');
  console.log('Added %d comparison files; preserved %d V8 files.', build(out,base), baselineCount);
}
module.exports={build,prepare,baselineHash,baselineCount};
