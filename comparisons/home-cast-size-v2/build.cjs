// Assemble an owner-only preview. The pinned #570 home and its archive are
// copied once. The final home loads only new sibling scripts and HTML.
const fs = require('node:fs');
const path = require('node:path');
const {createHash} = require('node:crypto');
const {hashGame} = require('../home-cast-size-v1/build.cjs');
const {replaceOnce} = require('../home-cast-size-v1/rewrite.cjs');

const referenceCommit = 'e7d881b825622efddac61857075c2c1658da706f';
const referenceGame = '39aae86b5961166f97eace2d9e3c9086d616c2bc4182e9beeb51167fef7a3484';
const referenceShell = {
  'index.html':'af7318a329618ebf30abd07a97a1a60aea293eb5e61de5a3e94cbc15e26072ef',
  'controls.mjs':'08b9c7cd39cfb2d6bf022b6bc2a10a1dade3778b959d4cf549bb06bda8fe096b',
  'style.css':'62111560ad540a84210dd859f76e3d2dac4108691b2e1a0c0549e7a239fcde15',
};
const outerFiles = ['index.html','style.css','shell-model.mjs','controls.mjs'];
function isInside(parent, child) {
  return parent===child || child.startsWith(parent+path.sep);
}
function replaceScript(html,original,replacement) {
  const anchor='src="'+original;
  return replaceOnce(html,anchor, 'src="'+replacement);
}
function approvedRoles(bridge) {
  // All entry paths (including direct iframe links) choose the approved ratios.
  return replaceOnce(bridge,'function apply(input = {}) {','function apply(input = {}) {\n    input = {...input, preset:"custom", hero:120, partner:120, companions:105};');
}

function build(destination, baseline) {
  const out=path.resolve(destination), source=fs.realpathSync(baseline);
  const repo=path.resolve(__dirname,'../..');
  if(isInside(source,out)||isInside(out,source)||isInside(repo,out)||isInside(out,repo)||
      (fs.existsSync(out) && fs.realpathSync(out)!==out))
    throw Error('Use a separate trial output directory.');
  if(fs.existsSync(out) && fs.readdirSync(out).length && !fs.existsSync(path.join(out,'game/final.html')))
    throw Error('Destination must be empty or a prior final cast trial.');
  if(hashGame(path.join(source,'game'))!==referenceGame)
    throw Error('Expected the exact built game from #570 '+referenceCommit);
  const archive=path.join(out,'v1');
  fs.mkdirSync(path.join(archive,'game'),{recursive:true});
  for(const [name,expected] of Object.entries(referenceShell)){
    const file=fs.readFileSync(path.join(source,name));
    if(createHash('sha256').update(file).digest('hex')!==expected)throw Error('Unexpected #570 shell '+name);
    fs.writeFileSync(path.join(archive,name),file);
  }
  fs.writeFileSync(path.join(archive,'game/index.html'),
    '<!doctype html><html lang="ja"><meta charset="utf-8"><title>なおとっち</title><script>location.replace("../../game/index.html"+location.search+location.hash);</script>');
  const game=path.join(out,'game'), oldGame=path.join(source,'game');
  fs.cpSync(oldGame,game,{recursive:true,mode:fs.constants.COPYFILE_FICLONE});
  const read=name=>fs.readFileSync(path.join(oldGame,name),'utf8');
  function write(name,body){
    if(path.basename(name)!==name || fs.existsSync(path.join(oldGame,name)))throw Error('Expected a new game sibling: '+name);
    fs.writeFileSync(path.join(game,name),body);
  }
  write('cast-final.js',approvedRoles(read('cast-trial.js')));
  const {adaptFinalGame}=require('./adapter.cjs');
  const {replacements,extraScripts=[]}=adaptFinalGame({game,read,write});
  let html=read('index.html');
  for(const [name,alternate] of Object.entries(replacements))html=replaceScript(html,name,alternate);
  html=replaceOnce(html,'<script src="cast-trial.js"></script>',
    [...extraScripts,'cast-final.js'].map(name=>'<script src="'+name+'"></script>').join(''));
  write('final.html',html);
  for(const name of outerFiles)fs.copyFileSync(path.join(__dirname,name),path.join(out,name));
}
if(require.main===module){
  const [dest,flag,ref]=process.argv.slice(2);
  if(!dest||flag!=='--baseline'||!ref)throw Error('Usage: node build.cjs DEST --baseline BUILT_570');
  build(dest,ref);
}
module.exports={build,approvedRoles,replaceScript,referenceCommit,referenceGame};
