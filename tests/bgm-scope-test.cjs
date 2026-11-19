const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const scope=require('./helpers/approved-bgm-scope.cjs');
test('only exact BGM hooks differ from latest approved game bytes',()=>scope.verify());
test('unrelated script, UI and game changes cannot pass the BGM scope exception',()=>{for(const [file,hash] of Object.entries(scope.baseline)){const text=fs.readFileSync(file,'utf8');assert.notEqual(scope.restoredBlob(file,text+'\n// unrelated edit\n'),hash);assert.throws(()=>scope.restoredBlob(file,text.replace(/BGM V2|data-app=/,'unexpected')));}});
const cardFile='prototypes/card-game/index.html';
const css='<link rel="stylesheet" href="card-design/cards.css">';
const bootstrap='<script type="module" src="card-design/bootstrap.mjs"></script>';
const cardText=fs.readFileSync(cardFile,'utf8');
const withoutDesign=cardText.replace(css,'').replace(bootstrap,'');
const withDesign=withoutDesign.replace('</head>',css+'</head>').replace('<dialog id="life-clock-dialog"',bootstrap+'<dialog id="life-clock-dialog"');
test('exact approved card design includes preserve the original BGM baseline',()=>{
 assert.equal(scope.restoredBlob(cardFile,withoutDesign),scope.baseline[cardFile]);
 assert.equal(scope.restoredBlob(cardFile,withDesign),scope.baseline[cardFile]);
});
test('card design exception rejects partial, duplicate, changed, moved and unrelated includes',()=>{
 const variants=[withDesign.replace(css,''),withDesign.replace(bootstrap,''),withDesign.replace(css,css+css),withDesign.replace(bootstrap,bootstrap+bootstrap),withDesign.replace('cards.css','other.css'),withDesign.replace('bootstrap.mjs','other.mjs'),withDesign.replace(css,'')+css,withDesign.replace(bootstrap,'')+bootstrap,withDesign+'<script src="unrelated.js"></script>',withDesign+'<link rel="stylesheet" href="unrelated.css">',withDesign.replace('<title>','<title>changed '),withDesign.replace('src="app.mjs"','src="other.mjs"')];
 for(const text of variants){
  let hash;try{hash=scope.restoredBlob(cardFile,text);}catch(error){assert.equal(error.code,'ERR_ASSERTION');continue;}
  assert.notEqual(hash,scope.baseline[cardFile]);
 }
});
