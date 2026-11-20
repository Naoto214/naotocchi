'use strict';

const fs = require('node:fs');
const path = require('node:path');
const {listFiles, hashFiles} = require('../home-finish-v5/build.cjs');
const {digest, replaceExact} = require('../home-finish-v5/native-hooks.cjs');

const baselineHash = 'c943da8849e9903ce4ab691e8d0d665a0c18c27efecd7cb0d4c9d13e76ff19ab';
const baselineCount = 3968;

function prepare(base) {
  const {patchMovement} = require('./movement.cjs');
  const {patchRender} = require('./render.cjs');
  const read = name => fs.readFileSync(path.join(base,name),'utf8');
  const files = new Map();
  let html = read('game/mobility-v7.html');
  function nativeAlias(kind, transform) {
    const prior = kind+'-mobility-v7.js';
    const name = kind+'-mobility-v8.js';
    const original = read('game/'+prior);
    const updated = transform(original);
    files.set('game/'+name,updated);
    html = replaceExact(html,prior+'?v='+digest(original).slice(0,12),name+'?v='+digest(updated).slice(0,12));
  }
  nativeAlias('home-production-model',source=>replaceExact(patchMovement(source),"bindModel('v7',","bindModel('v8',"));
  nativeAlias('home-production-diorama',source=>patchRender(source,'diorama'));
  const observer = read('game/telemetry.js');
  const counters = 'ambientSingleOffers:0,ambientSequentialOffers:0,ambientYieldStages:0,';
  const ambient = `    ambientYield(a,b,clock,stages,stage){
      const owner=row(a.key),helper=row(b.key);
      if(stage===1)owner[stages===1?'ambientSingleOffers':'ambientSequentialOffers']++;
      owner.ambientYieldStages++;
      helper._yieldHopPending=true;
      timeline(clock,'ambient-yield-offer',a.key,{peer:b.key,stages,stage});
    },`;
  const observed = replaceExact(replaceExact(observer,'yieldOffers:0,',counters+'yieldOffers:0,'),
    '    yielded(a,b,clock,kind,stage){',ambient+'\n    yielded(a,b,clock,kind,stage){');
  files.set('game/telemetry-mobility-v8.js',observed);
  html = replaceExact(html,'telemetry.js?v='+digest(observer).slice(0,12),
    'telemetry-mobility-v8.js?v='+digest(observed).slice(0,12));
  files.set('game/mobility-v8.html',html);

  // All arms share the V7 controls, clock, initial seats and painted-artwork readiness gate.
  const page = read('v7/index.html');
  const buttons = {v5:'v6',v6:'v7',v7:'v8'};
  const shell = page.split('\n').map(line=>{
    const arm = line.match(/data-arm="(v[567])"/)?.[1];
    return arm ? line.replaceAll(arm,buttons[arm]).replaceAll(arm.toUpperCase(),buttons[arm].toUpperCase()) : line;
  }).join('\n');
  files.set('v8/index.html',replaceExact(shell,'href="./style.css"','href="../v7/style.css"'));
  files.set('v8/controls.mjs',read('v7/controls.mjs'));
  files.set('v8/shell-model.mjs',replaceExact(read('v7/shell-model.mjs'),
    "['v5','v6'].includes(query.get('arm')) ? query.get('arm') : 'v7'",
    "['v6','v7'].includes(query.get('arm')) ? query.get('arm') : 'v8'"));
  const labels = "  ['退避歩行の開始（全距離）','escapeStarts'], ['退避歩行の到着（全距離）','escapeArrivals'],\n"+
    "  ['ドラッグ・1体の道譲り','singleOffers'], ['ドラッグ・2体の順次道譲り','sequentialOffers'],\n"+
    "  ['自律移動・1体の道譲り','ambientSingleOffers'], ['自律移動・2体の順次道譲り','ambientSequentialOffers'],\n"+
    "  ['道を譲る歩行の開始','yieldPhysicalStarts'], ['道を譲る歩行の到着','yieldArrivals'],";
  files.set('v8/diagnostics.mjs',replaceExact(read('v7/diagnostics.mjs'),'const metrics = [','const metrics = [\n'+labels));
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
    throw Error('Expected the complete pinned PR #576 bundle');
  const files=prepare(base);
  for(const name of files.keys()) if(originals.includes(name))throw Error('Existing V7 path: '+name);
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
  if (!out || flag!=='--baseline' || !base || rest.length)throw Error('Usage: node build.cjs OUT --baseline V7_DIST');
  console.log('Added %d comparison files; preserved %d V7 files.', build(out,base), baselineCount);
}
module.exports={build,prepare,baselineHash,baselineCount};
