const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),cp=require('node:child_process'),crypto=require('node:crypto'),assert=require('node:assert/strict'),sharp=require('sharp');
const root=path.resolve(__dirname,'../../..'),site=path.resolve(root,'../site-step5/dist');
const names=require(root+'/tools/expression-stage-names.json'),expr=require(root+'/pet-expression.js'),{buildSheet}=require(root+'/tools/expression-contact-sheet.cjs');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const context={};vm.runInNewContext(fs.readFileSync(site+'/mark-review/data.js','utf8')+';globalThis.names=STAGE_NAMES;',context);
assert.equal(JSON.stringify(context.names),JSON.stringify(names));
const files=cp.execFileSync('git',['ls-files','assets'],{cwd:root,encoding:'utf8'}).trim().split('\n');
let compared=0;for(const p of files){assert(fs.existsSync(site+'/'+p),p);assert.equal(hash(fs.readFileSync(root+'/'+p)),hash(fs.readFileSync(site+'/'+p)),p);compared++;}
for(const p of ['pet-expression.js','pet-expression.css','character-world-master.v1.js','script.js','emotion-state.js','care-attention.css'])assert.equal(hash(fs.readFileSync(root+'/'+p)),hash(fs.readFileSync(site+'/'+p)),p);
const previous=cp.execFileSync('git',['show','df628e6f04802ea1fde21e0088c890e3084fa35b:pet-expression.js'],{cwd:root,encoding:'utf8'});
function placements(s){const b=s.match(/const MARK_PLACEMENT = (\{[\s\S]*?\n  \});/);assert(b);return JSON.parse(b[1]);}
const before=placements(previous),now=placements(fs.readFileSync(root+'/pet-expression.js','utf8'));
const differences=Object.keys(now).filter(k=>JSON.stringify(now[k].marks.hungry)!==JSON.stringify(before[k].marks.hungry));assert.deepEqual(differences,['mushroom/07']);assert.deepEqual(now['mushroom/07'].marks.hungry,[-23,-9]);
(async()=>{
 const records=[];
 for(const [line,labels] of Object.entries(names))for(let i=1;i<=8;i++){
  const stage=String(i).padStart(2,'0'),p=`mark-review/assets/${line}${stage}.png`;
  const wanted=await sharp(Buffer.from(buildSheet(line,stage,labels[i-1]))).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const actual=await sharp(site+'/'+p).ensureAlpha().raw().toBuffer({resolveWithObject:true});assert.deepEqual(actual.info,wanted.info);
  let changed=0;
  // Exclude labels/fonts only; compare full artwork panels for all ten expressions.
  for(let row=0;row<5;row++)for(let col=0;col<2;col++)for(let y=170+row*328;y<428+row*328;y++){
   const a=(y*736+40+col*356)*4,b=(y*736+350+col*356)*4;
   if(!actual.data.subarray(a,b).equals(wanted.data.subarray(a,b)))changed++;
  }
  records.push({line,stage,path:p,artwork_changed_rows:changed});
 }
 const report={site_source:cp.execFileSync('git',['rev-parse','HEAD'],{cwd:path.dirname(site),encoding:'utf8'}).trim(),canonical_names:31,stages:248,formal_expressions:2480,production_assets_identical:compared,position_unchanged:247,position_changed_only:differences,mushroom07:[-23,-9],gallery_artwork_mismatches:records.filter(r=>r.artwork_changed_rows),records};
 fs.writeFileSync(__dirname+'/site-source-verification.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({...report,records:undefined}));
})();
