const fs = require('node:fs');
const path = require('node:path');
const {listFiles,hashFiles} = require('../home-finish-v5/build.cjs');
const {digest,replaceExact} = require('../home-finish-v5/native-hooks.cjs');

const referenceBundle = '387767cc468cb804710f15b74c37f64b7ad0706e7e16977c8f3f6f3d57138816';
const nativeFiles = [
  ['home-production-model','home-production-model-finish.js','home-production-model-drag-v6.js'],
  ['home-production-diorama','home-production-diorama-finish.js','home-production-diorama-drag-v6.js'],
  ['script-v2','script-v2.js','script-v2-drag-v6.js'],
];
const shellFiles = ['index.html','style.css','controls.mjs','shell-model.mjs','diagnostics.mjs'];

function prepare(baseline) {
  const {patchModel} = require('./mobility-model.cjs');
  const {patchSelection} = require('./selection.cjs');
  const {patchTelemetry} = require('./telemetry.cjs');
  const {patchRuntime} = require('./mobility-perf.cjs');
  const files = new Map();
  const read = name => fs.readFileSync(path.join(baseline,'game',name),'utf8');
  const local = name => fs.readFileSync(path.join(__dirname,name),'utf8');
  const telemetry = local('telemetry.js');
  files.set('game/telemetry.js',telemetry);
  for (const arm of ['v5','v6','v7']) {
    let html = read(arm === 'v5' ? 'drag-v5.html' : 'drag-v6.html');
    for (const [kind,prior,accepted] of nativeFiles) {
      const source = arm === 'v5' ? prior : accepted;
      let code = read(source);
      if (arm === 'v7') {
        if (kind === 'home-production-model') code = patchModel(code);
        code = patchSelection(source,code,arm);
      }
      code = patchTelemetry(source,code,arm);
      const alias = kind+'-mobility-'+arm+'.js';
      files.set('game/'+alias,code);
      const matches = [...html.matchAll(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g)].filter(m=>m[1]===source);
      if (matches.length!==1) throw Error('Expected one native script '+source);
      const tag = '<script src="'+alias+'?v='+digest(code).slice(0,12)+'"></script>';
      const monitor = '<script src="telemetry.js?v='+digest(telemetry).slice(0,12)+'"></script>\n';
      html = replaceExact(html,matches[0][0],(kind==='home-production-model'?monitor:'')+tag);
    }
    if(arm==='v7') {
      const source='home-production-touch-finish.js', alias='home-production-touch-mobility-v7.js';
      const code=patchRuntime(source,read(source));
      const originalTag=html.match(/<script src="home-production-touch-finish\.js\?v=[a-f0-9]+"><\/script>/)?.[0];
      if(!originalTag)throw Error('Missing V6 viewport helper');
      html=replaceExact(html,originalTag,'<script src="'+alias+'?v='+digest(code).slice(0,12)+'"></script>');
      files.set('game/'+alias,code);
    }
    files.set('game/mobility-'+arm+'.html',html);
  }
  for (const name of shellFiles) files.set('v7/'+name,local(name));
  return files;
}

function build(destination, baseline) {
  const base=fs.realpathSync(baseline), out=path.resolve(destination);
  const inside=(parent,child)=>parent===child || child.startsWith(parent+path.sep);
  let ancestor=out;
  while(!fs.existsSync(ancestor)) ancestor=path.dirname(ancestor);
  if(fs.realpathSync(ancestor)!==ancestor||[base,__dirname].some(parent=>inside(parent,out)||inside(out,parent)))
    throw Error('Use a separate build directory');
  const originals=listFiles(base);
  if(originals.length!==3948 || hashFiles(base,originals)!==referenceBundle) throw Error('Expected the complete #575 V6 distribution');
  const additions=prepare(base);
  for(const name of additions.keys()) if(originals.includes(name)) throw Error('V6 path collision: '+name);
  const prior=fs.existsSync(out)?listFiles(out):[];
  if(prior.length) {
    const expected=new Set([...originals,...additions.keys()]);
    if(prior.some(name=>!expected.has(name))||hashFiles(out,originals)!==referenceBundle) throw Error('Unexpected destination content');
  } else fs.cpSync(base,out,{recursive:true,mode:fs.constants.COPYFILE_FICLONE});
  for(const [name,body] of additions) {
    const dest=path.join(out,name);
    fs.mkdirSync(path.dirname(dest),{recursive:true});
    fs.writeFileSync(dest+'.tmp',body);
    fs.renameSync(dest+'.tmp',dest);
  }
  return additions.size;
}
if(require.main===module) {
  const [out,flag,base,...extra]=process.argv.slice(2);
  if(!out||flag!=='--baseline'||!base||extra.length) throw Error('Usage: node build.cjs DEST --baseline V6_DIST');
  console.log('Added %d files, preserved all 3948 V6 paths.',build(out,base));
}
module.exports={build,prepare,referenceBundle,shellFiles};
