const fs = require('node:fs');
const path = require('node:path');
const {listFiles,hashFiles} = require('../home-finish-v5/build.cjs');
const {digest,replaceExact} = require('../home-finish-v5/native-hooks.cjs');
const {applyChange} = require('./native-source.cjs');

const referenceBundle = 'f6890f54972be66698b9ac5d53938969333d71cc7e3eacc1c018c43539329c7d';
const scripts = [
  ['home-production-model-finish.js','home-production-model-drag-v6.js','home-production-model.js'],
  ['home-production-diorama-finish.js','home-production-diorama-drag-v6.js','home-production-diorama-finish.js'],
  ['script-v2.js','script-v2-drag-v6.js','script-v2.js'],
];

function prepare(baseline) {
  const files = new Map();
  const get = name => fs.readFileSync(path.join(baseline, 'game', name),'utf8');
  const local = name => fs.readFileSync(path.join(__dirname, name),'utf8');
  const hook = local('trial-hooks.js');
  files.set('game/drag-trial-hooks.js', hook);
  const v5 = get('finish.html');
  const modelTag = v5.match(/<script src="home-production-model-finish\.js\?v=[a-f0-9]+"><\/script>/)?.[0];
  if (!modelTag) throw Error('V5 native model script is missing');
  const oldHTML = replaceExact(v5, modelTag, modelTag+'\n<script src="drag-trial-hooks.js?v='+digest(hook).slice(0,12)+'"></script>');
  files.set('game/drag-v5.html',oldHTML);
  let html = oldHTML;
  for (const [source, name, patch] of scripts) {
    const body = applyChange(patch, get(source));
    files.set('game/' + name, body);
    const match = [...html.matchAll(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g)].filter(m => m[1]===source);
    if (match.length!==1) throw Error('Expected one V5 script tag for ' + source);
    html = replaceExact(html, match[0][0], '<script src="' + name + '?v=' + digest(body).slice(0,12) + '"></script>');
  }
  files.set('game/drag-v6.html', html);
  for (const name of ['index.html','controls.mjs','shell-model.mjs','style.css']) files.set('v6/'+name,local(name));
  return files;
}

function contains(parent, child) { return parent===child || child.startsWith(parent+path.sep); }

function build(destination, baseline) {
  const out = path.resolve(destination), base = fs.realpathSync(baseline);
  let ancestor = out;
  while (!fs.existsSync(ancestor)) ancestor = path.dirname(ancestor);
  if (fs.realpathSync(ancestor)!==ancestor || [base,path.resolve(__dirname)].some(root=>contains(root,out)||contains(out,root)))
    throw Error('Use an independent output directory');
  const originals = listFiles(base);
  if (originals.length!==3938 || hashFiles(base,originals)!==referenceBundle)
    throw Error('Expected the exact V5 distribution from a0df9061');
  const extra = prepare(base);
  if ([...extra.keys()].some(name=>originals.includes(name))) throw Error('New path collides with V5 distribution');
  const existing = fs.existsSync(out) ? listFiles(out) : [];
  if (existing.length) {
    const names = new Set([...originals,...extra.keys()]);
    if (existing.length!==names.size || existing.some(name=>!names.has(name)) || hashFiles(out,originals)!==referenceBundle)
      throw Error('Destination must be empty or a previously verified V6 build');
  } else fs.cpSync(base, out, {recursive:true, mode:fs.constants.COPYFILE_FICLONE});
  for (const [name,body] of extra) {
    const file=path.join(out,name);
    fs.mkdirSync(path.dirname(file),{recursive:true});
    fs.writeFileSync(file+'.tmp',body);
    fs.renameSync(file+'.tmp',file);
  }
  return extra.size;
}

if (require.main===module) {
  const [out,flag,baseline,...rest]=process.argv.slice(2);
  if (!out || flag!=='--baseline' || !baseline || rest.length) throw Error('Usage: node build.cjs OUT --baseline V5_DIST');
  console.log('Added %d files to the verified V5 game',build(out,baseline));
}
module.exports={build,prepare,referenceBundle};
