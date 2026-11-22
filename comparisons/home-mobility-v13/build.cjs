'use strict';
const fs = require('node:fs');
const path = require('node:path');
const {listFiles, hashFiles} = require('../home-finish-v5/build.cjs');
const {digest, replaceExact} = require('../home-finish-v5/native-hooks.cjs');
const {patchReflow} = require('../home-mobility-v12/reflow.cjs');

const baselineHash = '63570f281e8cb5e1acec1bfd119c7fc2765e027ae44edba30a475edf4e17b64e';
const models = ['a','b','c','d','d-curve'];
const nativeModel = arm => 'home-production-model-mobility-'+arm+'.js';
const local = name => fs.readFileSync(path.join(__dirname,name),'utf8');
const ref = (name,source) => name+'?v='+digest(source).slice(0,12);

function prepare(baseline,{gameplayOnly=false}={}) {
  const read = name => fs.readFileSync(path.join(baseline,name),'utf8');
  const game = name => read('game/'+name);
  const files = new Map();
  function add(name,body) {
    if (files.has(name) || fs.existsSync(path.join(baseline,name))) throw Error('Filename already in use: '+name);
    files.set(name,body);
  }
  const geometry = require('./geometry.cjs');
  const navigation = 'home-visible-ground-navigation-v13.mjs';
  add('game/'+navigation,geometry.patchNavigation(game('home-visible-ground-navigation-finish.mjs')));
  const painter = 'home-production-diorama-mobility-v12.js';
  const basePainter = game(painter);
  // D with curved assistance uses the same terrain, painter and seats as D.
  const painters = new Map();
  for (const arm of ['a','b','c','d']) {
    let paint = basePainter;
    for (const kind of ['finish','mobility']) {
      const original = 'home-production-world-v12-'+kind+'.mjs';
      const source = game(original);
      const result = geometry.patchWorld(source,arm);
      if(result===source) continue;
      const name = 'home-production-world-v13-'+arm+'-'+kind+'.mjs';
      add('game/'+name,result);
      paint=replaceExact(paint,ref(original,source),ref(name,result));
    }
    const name=paint===basePainter?painter:'home-production-diorama-mobility-v13-'+arm+'.js';
    if(name!==painter)add('game/'+name,paint);
    painters.set(arm,ref(name,paint));
  }
  for(const candidate of models) {
    const [arm,extended] = candidate.split('-');
    for(const reference of [false,true]) {
      const suffix=reference?'-reference':'';
      const id='v13-'+candidate+suffix;
      const baseArm=(extended?'v12':'v11-foot')+suffix;
      const input=game(nativeModel(baseArm));
      const standard=extended?input:patchReflow(input);
      const model=replaceExact(geometry.patchModel(standard,arm,{curve:!!extended,reference}),
        "bindModel('"+baseArm+"',","bindModel('"+id+"',");
      add('game/'+nativeModel(id),model);
      const template=game('mobility-v12'+suffix+'.html');
      const old=nativeModel('v12'+suffix);
      let html=replaceExact(template,ref(old,game(old)),ref(nativeModel(id),model));
      html=replaceExact(html,ref(painter,basePainter),painters.get(arm));
      add('game/mobility-'+id+'.html',html);
      if(!gameplayOnly){
        const ownerId='v13-owner-'+candidate+suffix;
        const ownerModel=require('../home-mobility-v11/foot.cjs').patchFootDiagnostics(model);
        add('game/'+nativeModel(ownerId),ownerModel);
        const before=nativeModel('v12-owner-v12'+suffix);
        const ownerTemplate=game('mobility-v12-compare-v12'+suffix+'.html');
        let owner=replaceExact(ownerTemplate,ref(before,game(before)),ref(nativeModel(ownerId),ownerModel));
        owner=replaceExact(owner,ref(painter,basePainter),painters.get(arm));
        add('game/mobility-'+ownerId+'.html',owner);
      }
    }
  }
  if(!gameplayOnly){
    require('./foot.cjs').addFootEntries({add,baseline});
    let controls=read('v12/controls.mjs');
    controls=replaceExact(controls,"from './diagnostics.mjs'","from '../v12/diagnostics.mjs'");
    controls=replaceExact(controls,"  byId('seed').value = scene.seed;","  byId('version').value = scene.arm;\n  byId('seed').value = scene.seed;");
    controls=replaceExact(controls,"byId('restart').addEventListener","byId('version').addEventListener('change', event => change({arm:event.target.value}));\nbyId('restart').addEventListener");
    add('v13/compare.mjs',controls);
    for(const name of ['index.html','shell-model.mjs','style.css','map.html','map.mjs','map.css','forest.html','forest-summary.json'])add('v13/'+name,local(name));
    for(const n of listFiles(path.join(__dirname,'map-data')))add('v13/map-data/'+n,fs.readFileSync(path.join(__dirname,'map-data',n)));
  }
  return files;
}

function build(destination,baseline,options) {
  const base=fs.realpathSync(baseline),out=path.resolve(destination);
  const contains=(a,b)=>a===b||b.startsWith(a+path.sep);
  let parent=out;while(!fs.existsSync(parent))parent=path.dirname(parent);
  if(fs.realpathSync(parent)!==parent||[base,__dirname].some(dir=>contains(dir,out)||contains(out,dir)))throw Error('Use a separate output directory');
  const originals=listFiles(base);
  if(originals.length!==4143||hashFiles(base,originals)!==baselineHash)throw Error('Expected the complete #582 owner bundle');
  const files=prepare(base,options);
  if(fs.existsSync(out)&&listFiles(out).length){
    if(hashFiles(out,originals)!==baselineHash)throw Error('Output has a different baseline');
  }else{
    // The original files are immutable; separate links avoid duplicating 52 artworks per measurement.
    for(const name of originals){
      const src=path.join(base,name),dest=path.join(out,name);
      fs.mkdirSync(path.dirname(dest),{recursive:true});
      try{fs.linkSync(src,dest);}catch(e){if(e.code!=='EXDEV')throw e;fs.copyFileSync(src,dest);}
    }
  }
  for(const [name,body] of files){
    const dest=path.join(out,name);fs.mkdirSync(path.dirname(dest),{recursive:true});
    fs.writeFileSync(dest+'.tmp',body);fs.renameSync(dest+'.tmp',dest);
  }
  return files.size;
}
if(require.main===module){
  const [out,flag,baseline,mode,...rest]=process.argv.slice(2);
  if(!out||flag!=='--baseline'||!baseline||rest.length||(mode&&mode!=='--gameplay-only'))throw Error('Usage: node build.cjs OUTPUT --baseline V12_DIR [--gameplay-only]');
  console.log('Built',build(out,baseline,{gameplayOnly:mode==='--gameplay-only'}),'V13 files');
}
module.exports={prepare,build,baselineHash};
