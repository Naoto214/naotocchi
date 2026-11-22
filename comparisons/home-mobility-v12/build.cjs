'use strict';
const fs = require('node:fs');
const path = require('node:path');
const {listFiles, hashFiles} = require('../home-finish-v5/build.cjs');
const {digest, replaceExact} = require('../home-finish-v5/native-hooks.cjs');
const {patchFootDiagnostics} = require('../home-mobility-v11/foot.cjs');
const {patchCurve} = require('./curve.cjs');
const {patchReflow,patchReflowWorld,patchReflowPainter} = require('./reflow.cjs');

const baseHash = '7d66d2be995b4df351c67cb6aa1f07f55ac5661e2bfad77df9fd9d6c955a492d';
const local = name => fs.readFileSync(path.join(__dirname,name),'utf8');
const tag = (name,content) => '<script src="'+name+'?v='+digest(content).slice(0,12)+'"></script>';
const modelFile = arm => 'home-production-model-mobility-'+arm+'.js';

function prepare(baseline) {
  const read = name => fs.readFileSync(path.join(baseline,name),'utf8');
  const game = name => read('game/'+name);
  const files = new Map();
  function add(name,contents) {
    if (files.has(name) || fs.existsSync(path.join(baseline,name))) throw Error('Conflicting asset: '+name);
    files.set(name,contents);
  }
  const oldPainter='home-production-diorama-mobility-v11.js';
  const painter='home-production-diorama-mobility-v12.js';
  const worlds={};
  for (const kind of ['finish','mobility']) {
    const name='home-production-world-v12-'+kind+'.mjs';
    const source=patchReflowWorld(game('home-production-world-'+kind+'.mjs'));
    add('game/'+name,source);
    worlds[kind]=name+'?v='+digest(source).slice(0,12);
  }
  const rendererSource=patchReflowPainter(game(oldPainter),worlds);
  add('game/'+painter,rendererSource);
  const audit='mobility-v12-owner-events.js';
  add('game/'+audit,local('owner-events.js'));
  const swap=(html,oldName,newName)=>replaceExact(html,tag(oldName,game(oldName)),tag(newName,files.get('game/'+newName)));
  for (const suffix of ['','-reference']) {
    const oldArm='v11-foot'+suffix,arm='v12'+suffix;
    const old=modelFile(oldArm),model=modelFile(arm);
    const modelSource=replaceExact(patchReflow(patchCurve(game(old))),"bindModel('"+oldArm+"',","bindModel('"+arm+"',");
    add('game/'+model,modelSource);
    let direct=swap(game('mobility-'+oldArm+'.html'),old,model);
    add('game/mobility-'+arm+'.html',swap(direct,oldPainter,painter));
    const named=modelFile('v12-owner-'+arm);
    add('game/'+named,patchFootDiagnostics(modelSource));
    let owner=swap(game('mobility-v11-compare-'+oldArm+'.html'),modelFile('v11-owner-'+oldArm),named);
    owner=swap(owner,oldPainter,painter);
    const token=tag(named,files.get('game/'+named));
    add('game/mobility-v12-compare-'+arm+'.html',replaceExact(owner,token,tag(audit,local('owner-events.js'))+'\n'+token));
  }
  const markup=read('v10/index.html').replace(/(data-arm="v|aria-label="V|>V)(8|9|10)(?=["の<])/g,
    (_,prefix,number)=>prefix+(Number(number)+2));
  const links=[
    ['./yield.html','もりでタヌキに道を譲る'],
    ['./growth.html','成長する住民の足位置を比べる'],
    ['./corridor.html','やま・もりで主人公の退路を歩く'],
    ['../v11/replay.html','通知時のパンダの足元を再現する'],
    ['../v11/space.html','幅ごとの森の歩行地図を見る'],
    ['https://naotocchi-mobility-v8-evidence.kerzion214.chatgpt.site/v12/forest.html','28体の10分間の記録を見る'],
  ];
  let html=replaceExact(markup,'<p><a href="./episode.html">犬が経路を得られなかった385秒の記録</a></p>',
    links.map(([href,label])=>'<p><a href="'+href+'">'+label+'</a></p>').join('\n'));
  html=replaceExact(html,'<p id="recent"></p>','<p id="recent"></p><p id="foot-events"></p><p id="help-events"></p>');
  html=replaceExact(html,'aria-label="V11の動作"','aria-label="V11 足元修正のみ"');
  html=replaceExact(html,'住民から行き先までドラッグして、','V11は足元修正のみです。住民から行き先までドラッグして、');
  add('v12/index.html',html);
  add('v12/controls.mjs',read('v10/controls.mjs'));
  add('v12/shell-model.mjs',local('shell-model.mjs'));
  add('v12/diagnostics.mjs',"import {showResidentChanges} from './readout.mjs';\n"+
    replaceExact(read('v10/diagnostics.mjs'),'    if(!row)return;','    if(!row)return;\n    showResidentChanges(root,frame,row.key);'));
  add('v12/readout.mjs',local('readout.mjs'));
  const replay = {add,baseline,modelSource:files.get('game/'+modelFile('v12')),rendererSource};
  require('./yield-replay.cjs').addYieldReplay(replay);
  require('./reflow-pages.cjs').addReflowPages(replay);
  return files;
}

function build(destination,baseline) {
  const base=fs.realpathSync(baseline);
  const out=path.resolve(destination);
  let existing=out;
  while (!fs.existsSync(existing)) existing=path.dirname(existing);
  const contains=(a,b)=>a===b || b.startsWith(a+path.sep);
  if (fs.realpathSync(existing)!==existing || [__dirname,base].some(p=>contains(p,out)||contains(out,p))) throw Error('Use an independent output directory');
  const originals=listFiles(base);
  if (originals.length!==4092 || hashFiles(base, originals)!==baseHash) throw Error('Expected the complete owner build from #581 at 5f899a2d');
  const additions=prepare(base);
  const present=fs.existsSync(out)?listFiles(out):[];
  if (present.length) {
    const allowed=new Set([...originals,...additions.keys()]);
    if (present.some(p=>!allowed.has(p)) || hashFiles(out,originals)!==baseHash) throw Error('Output contains unrelated files or a different baseline');
  } else {
    fs.cpSync(base,out,{recursive:true,mode:fs.constants.COPYFILE_FICLONE});
  }
  for (const [name,data] of additions) {
    const file=path.join(out,name);
    fs.mkdirSync(path.dirname(file),{recursive:true});
    fs.writeFileSync(file+'.tmp',data);
    fs.renameSync(file+'.tmp',file);
  }
  return additions.size;
}
if (require.main===module) {
  const [out,flag,base,...other]=process.argv.slice(2);
  if (!out || flag!=='--baseline' || !base || other.length) throw Error('Usage: node build.cjs OUTPUT --baseline V11_DIST');
  console.log('Built %d V12 comparison files over 4,092 protected assets.',build(out,base));
}
module.exports={prepare,build,baseHash};
